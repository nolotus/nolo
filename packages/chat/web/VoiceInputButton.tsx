import * as stylex from "@stylexjs/stylex";
import { messageInputStyles } from "./messageInputStyles";
import { withLiteralClass } from "./withLiteralClass";
import "./chatStylexEscapeHatch.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LuMic } from "react-icons/lu";
import { toast } from "app/utils/toast";
import { useAppSelector } from "app/store";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import { useCurrentDialogKey } from "chat/dialog/dialogSlice";
import { extractCustomId } from "core/prefix";
import { asTrimmedString } from "core/trimmedString";

// 静音检测参数
const VAD_SILENCE_THRESHOLD = 0.012; // RMS 能量阈值
const VAD_SILENCE_DURATION = 1500;   // 连续静音 ms 后自动停止
const VAD_MIN_RECORDING = 800;       // 最短录音时间 ms，防止误触
const TRANSCRIPTION_ENDPOINTS = ["/api/cf-speech-to-text", "/api/whisper-turbo"] as const;
const RETRYABLE_CF_TRANSCRIPTION_ERROR_CODES = new Set([
  "CF_FREE_BUDGET_EXCEEDED",
  "CF_NOT_CONFIGURED",
  "CF_AI_ERROR",
  "CF_AI_FAILED",
]);

function shouldRetryTranscriptionEndpoint(
  endpoint: (typeof TRANSCRIPTION_ENDPOINTS)[number],
  status: number,
  errorCode?: string
): boolean {
  if (endpoint !== "/api/cf-speech-to-text") return false;
  if (typeof errorCode === "string" && RETRYABLE_CF_TRANSCRIPTION_ERROR_CODES.has(errorCode)) {
    return true;
  }
  return status >= 500;
}

interface VoiceInputButtonProps {
  onTranscribed: (text: string) => void;
  /** 转录完成后自动调用发送 */
  onSend?: (transcript: string) => void;
  className?: string;
  iconSize?: number;
  /** 转录语言，默认 "zh"（中文）。传 undefined 则由模型自动检测 */
  language?: string;
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscribed,
  onSend,
  className = "",
  iconSize = 18,
  language = "zh",
}) => {
  const { currentServer, currentToken: token } =
    useAppSelector(selectRuntimeSnapshot);
  const currentDialogKey = useCurrentDialogKey();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadRafRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number>(0);

  // 清理 VAD / AudioContext
  const cleanupVad = useCallback(() => {
    if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current);
    vadRafRef.current = 0;
    silenceStartRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  // 停止录音（手动 or VAD）
  const stopRecording = useCallback(() => {
    cleanupVad();
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
  }, [cleanupVad]);

  const startRecording = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      toast.error("当前浏览器不支持麦克风录音");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      toast.error("当前环境不支持实时录音");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recordingStartRef.current = Date.now();

      // ── VAD 初始化 ──────────────────────────────────
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        const buf = new Float32Array(analyser.fftSize);
        const checkSilence = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getFloatTimeDomainData(buf);
          let rms = 0;
          for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
          rms = Math.sqrt(rms / buf.length);

          const elapsed = Date.now() - recordingStartRef.current;
          if (elapsed < VAD_MIN_RECORDING) {
            // 还没到最短录音时间，继续等
            vadRafRef.current = requestAnimationFrame(checkSilence);
            return;
          }

          if (rms < VAD_SILENCE_THRESHOLD) {
            if (silenceStartRef.current === null) {
              silenceStartRef.current = Date.now();
            } else if (Date.now() - silenceStartRef.current >= VAD_SILENCE_DURATION) {
              stopRecording();
              return;
            }
          } else {
            silenceStartRef.current = null;
          }
          vadRafRef.current = requestAnimationFrame(checkSilence);
        };
        vadRafRef.current = requestAnimationFrame(checkSilence);
      } catch {
        // AudioContext 不可用时降级为手动停止
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cleanupVad();
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        if (!chunksRef.current.length) {
          toast.error("未录到声音，请重试");
          return;
        }

        const locationOrigin =
          (globalThis as any)?.location?.origin
            ? String((globalThis as any).location.origin)
            : "";
        const serverOrigin = (locationOrigin || currentServer || "").replace(/\/$/, "");
        const dialogId = currentDialogKey ? extractCustomId(currentDialogKey) : null;
        if (!serverOrigin) {
          toast.error("当前服务器地址不可用");
          return;
        }

        setIsProcessing(true);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const reader = new FileReader();
        reader.onloadend = async () => {
          if (typeof reader.result !== "string") {
            toast.error("语音编码失败，请重试");
            setIsProcessing(false);
            return;
          }
          try {
            let data: any = null;
            let lastError: Error | null = null;

            for (const endpoint of TRANSCRIPTION_ENDPOINTS) {
              const res = await fetch(`${serverOrigin}${endpoint}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  audioUrl: reader.result,
                  language,
                  ...(dialogId ? { dialogId } : {}),
                }),
              });

              const contentType = res.headers.get("content-type") || "";
              const rawText = await res.text();
              let parsed: any = null;
              try { parsed = rawText ? JSON.parse(rawText) : null; } catch { parsed = null; }

              if (!contentType.includes("application/json")) {
                lastError = new Error("ASR 接口返回了非 JSON 响应");
                continue;
              }

              if (res.ok) {
                data = parsed;
                break;
              }

              const errorCode =
                typeof parsed?.error?.code === "string"
                  ? parsed.error.code
                  : undefined;
              lastError = new Error(
                parsed?.error?.message || parsed?.error || rawText.slice(0, 120) || `HTTP ${res.status}`
              );
              if (!shouldRetryTranscriptionEndpoint(endpoint, res.status, errorCode)) {
                break;
              }
            }

            if (!data) throw lastError ?? new Error("语音转文字失败");

            const transcript = asTrimmedString(data?.text);
            if (!transcript) {
              toast.error("未识别到语音内容");
              return;
            }
            onTranscribed(transcript);
            // 自动发送：先等 React 一帧更新 state，再调用发送
            if (onSend) {
              setTimeout(() => onSend(transcript), 0);
            }
          } catch (err) {
            console.error("[VoiceInput] transcription failed:", err);
            toast.error("语音转文字失败，请重试");
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("[VoiceInput] mic access denied:", err);
      toast.error("无法访问麦克风，请检查浏览器权限");
    }
  }, [currentDialogKey, currentServer, language, token, onTranscribed, onSend, stopRecording, cleanupVad]);

  // 组件卸载时清理
  useEffect(() => () => { cleanupVad(); }, [cleanupVad]);

  const handleClick = useCallback(() => {
    if (isProcessing) return;
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, isProcessing, stopRecording, startRecording]);

  const stateClass = isRecording
    ? "voice-btn--recording"
    : isProcessing
      ? "voice-btn--processing"
      : "voice-btn--idle";

  const label = isRecording ? "停止录音（或等待静音自动停止）" : isProcessing ? "转录中…" : "语音输入";

  return (
    <button
      type="button"
      data-hook={className.includes("voice-btn-in-send") ? "chat-esc-voice-btn-send" : undefined}
      onClick={handleClick}
      disabled={isProcessing}
      aria-label={label}
      title={label}
      {...withLiteralClass(
        `voice-btn ${stateClass} ${className}`,
        messageInputStyles.voiceBtn,
        isRecording
          ? messageInputStyles.voiceBtnRecording
          : isProcessing
            ? messageInputStyles.voiceBtnProcessing
            : messageInputStyles.voiceBtnIdle,
        className.includes("voice-btn--compact") &&
          messageInputStyles.voiceBtnCompact,
        className.includes("voice-btn-in-send") &&
          messageInputStyles.voiceBtnInSend
      )}
    >
      {isProcessing ? (
        <div aria-hidden="true" {...withLiteralClass("voice-dots", messageInputStyles.voiceDots)}>
          <span {...stylex.props(messageInputStyles.voiceDot)} />
          <span {...stylex.props(messageInputStyles.voiceDot)} />
          <span {...stylex.props(messageInputStyles.voiceDot)} />
        </div>
      ) : isRecording ? (
        <div aria-hidden="true" {...withLiteralClass("voice-bars", messageInputStyles.voiceBars)}>
          <span {...stylex.props(messageInputStyles.voiceBar)} />
          <span {...stylex.props(messageInputStyles.voiceBar)} />
          <span {...stylex.props(messageInputStyles.voiceBar)} />
          <span {...stylex.props(messageInputStyles.voiceBar)} />
          <span {...stylex.props(messageInputStyles.voiceBar)} />
        </div>
      ) : (
        <LuMic size={iconSize} aria-hidden="true" />
      )}
    </button>
  );
};

export default VoiceInputButton;
