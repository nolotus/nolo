import React, { useEffect, useState, useRef } from "react";
import * as stylex from "@stylexjs/stylex";
import { useTranslation } from "react-i18next";
import { LuMic, LuMicOff, LuPhone, LuPhoneOff } from "react-icons/lu";
import { liveVoicePanelStyles } from "./liveVoicePanelStyles";
import "./chatStylexEscapeHatch.css";

/**
 * Status values aligned with the server's LiveVoiceStatus type:
 * connecting | listening | thinking | speaking | disconnected
 *
 * "listening" = server is ready and listening for audio
 * "thinking"  = server sent end_turn, model is generating
 * "speaking"  = server is streaming audio back
 */
type LiveVoiceStatus = "connecting" | "listening" | "thinking" | "speaking" | "disconnected";

interface LiveVoicePanelProps {
  agentId: string;
  dialogId: string;
  onClose: () => void;
}

/**
 * Web live voice panel.
 *
 * Auth: relies on same-origin `nolo_auth_token` cookie, which the browser
 * sends automatically for WebSocket connections to the same host. No explicit
 * Authorization header is needed. This is intentional — the server's
 * `authenticateRequest` reads the cookie as a fallback when no Authorization
 * header is present (see `packages/auth/utils.ts`).
 */
export const LiveVoicePanel: React.FC<LiveVoicePanelProps> = ({ agentId, dialogId, onClose }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<LiveVoiceStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isMutedRef = useRef(false);
  const nextPlaybackTimeRef = useRef<number>(0);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    // 1. Initialize WebSocket
    // Auth is via same-origin nolo_auth_token cookie — no explicit header needed.
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/v1/agent/live-voice?agentId=${encodeURIComponent(agentId)}&dialogId=${encodeURIComponent(dialogId)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onerror = (event) => {
      // The browser does not surface the underlying failure reason here;
      // log it for debugging and let onclose update the visible status.
      console.error("[LiveVoicePanel] WebSocket error", { event, agentId, dialogId });
    };

    ws.onopen = () => {
      // Do not set "connected" — wait for the server status event.
      // The server sends { type: "status", status: "connecting" } then
      // { type: "status", status: "listening" } after setupComplete.

      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
         mediaStreamRef.current = stream;
         const audioCtx = new AudioContext({ sampleRate: 16000 });
         audioContextRef.current = audioCtx;
         const source = audioCtx.createMediaStreamSource(stream);
         // AudioWorklet 是标准方案但需要独立处理器文件；
         // ScriptProcessor 已废弃但兼容所有主流浏览器，在此处暂用。
         // 注意：不要 connect(destination)，否则麦克风输入会从扬声器回放。
         const processor = audioCtx.createScriptProcessor(4096, 1, 1);
         source.connect(processor);
         // 不连接 destination，避免扬声器反馈回音
         // processor.connect(audioCtx.destination);

         processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN || isMutedRef.current) return;
            const inputData = e.inputBuffer.getChannelData(0);
            // Convert Float32Array to Int16Array
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.min(1, Math.max(-1, inputData[i])) * 0x7FFF;
            }
            // Chunked String.fromCharCode to avoid stack overflow on large frames (>125kB).
            // Spread limit in V8 is ~65536; current 4096-samples mono = 8192 bytes, safe,
            // but stereo / larger buffers would hit it.
            const uint8 = new Uint8Array(pcm16.buffer);
            const CHUNK = 32768;
            let binary = "";
            for (let i = 0; i < uint8.length; i += CHUNK) {
              binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK));
            }
            const base64 = btoa(binary);
            ws.send(JSON.stringify({ type: "audio", data: base64 }));
         };
      }).catch(err => {
         console.error("Microphone access denied:", err);
      });
    };

    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "status") {
        // Accept all server statuses: connecting, listening, thinking, speaking, disconnected
        if (msg.status !== "disconnected") {
          setErrorMessage(null);
        }
        setStatus(msg.status);
      } else if (msg.type === "error") {
        console.error("[LiveVoicePanel] server error", msg);
        setErrorMessage(msg.message ?? msg.code ?? "Live voice error");
        setStatus("disconnected");
      } else if (msg.type === "audio" && msg.data) {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;
        const binaryStr = atob(msg.data);
        const buffer = new ArrayBuffer(binaryStr.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binaryStr.length; i++) {
          view[i] = binaryStr.charCodeAt(i);
        }

        const playBuffer = (audioBuffer: AudioBuffer) => {
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);

          const currentTime = ctx.currentTime;
          if (nextPlaybackTimeRef.current < currentTime) {
            nextPlaybackTimeRef.current = currentTime + 0.05;
          }
          source.start(nextPlaybackTimeRef.current);
          nextPlaybackTimeRef.current += audioBuffer.duration;
        };

        if (msg.mimeType === "audio/pcm;rate=24000") {
          const int16Array = new Int16Array(buffer);
          const float32Array = new Float32Array(int16Array.length);
          for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 0x8000;
          }
          const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
          audioBuffer.getChannelData(0).set(float32Array);
          playBuffer(audioBuffer);
        } else if (msg.mimeType === "audio/wav") {
          try {
            // Must copy buffer because decodeAudioData detaches it
            const decoded = await ctx.decodeAudioData(buffer.slice(0));
            playBuffer(decoded);
          } catch (err) {
            console.error("Failed to decode WAV", err);
          }
        }
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
    };

    return () => {
      ws.close();
      if (audioContextRef.current) audioContextRef.current.close();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [agentId, dialogId]);

  const statusLabel =
    status === "listening"
      ? t("liveVoice.listening", "Listening...")
      : status === "thinking"
        ? t("liveVoice.thinking", "Thinking...")
        : status === "speaking"
          ? t("liveVoice.speaking", "Speaking...")
          : status === "connecting"
            ? t("liveVoice.connecting", "Connecting...")
            : t("liveVoice.disconnected", "Disconnected");

  const isActive = status === "listening" || status === "thinking" || status === "speaking";

  return (
    <div {...stylex.props(liveVoicePanelStyles.panel)}>
      <div {...stylex.props(liveVoicePanelStyles.header)}>
        <LuPhone {...stylex.props(liveVoicePanelStyles.pulseIcon)} aria-hidden="true" />
        <span className="status-text">{statusLabel}</span>
      </div>
      {errorMessage && status === "disconnected" ? (
        <div
          {...stylex.props(liveVoicePanelStyles.error)}
          role="status"
          aria-live="polite"
          title={errorMessage}
        >
          {errorMessage}
        </div>
      ) : null}
      <div {...stylex.props(liveVoicePanelStyles.waveformContainer)}>
        {isActive && !isMuted ? (
          <div
            data-hook="chat-esc-lv-bars"
            {...stylex.props(liveVoicePanelStyles.waveformAnimation)}
            aria-hidden="true"
          >
            <span data-hook="chat-esc-lv-bar" {...stylex.props(liveVoicePanelStyles.bar)}></span>
            <span data-hook="chat-esc-lv-bar" {...stylex.props(liveVoicePanelStyles.bar)}></span>
            <span data-hook="chat-esc-lv-bar" {...stylex.props(liveVoicePanelStyles.bar)}></span>
            <span data-hook="chat-esc-lv-bar" {...stylex.props(liveVoicePanelStyles.bar)}></span>
            <span data-hook="chat-esc-lv-bar" {...stylex.props(liveVoicePanelStyles.bar)}></span>
          </div>
        ) : (
          <div {...stylex.props(liveVoicePanelStyles.waveformIdle)} aria-hidden="true" />
        )}
      </div>
      <div {...stylex.props(liveVoicePanelStyles.controls)}>
        <button
          data-hook={`chat-esc-lv-control-btn${isMuted ? " chat-esc-lv-control-muted" : ""}`}
          {...stylex.props(liveVoicePanelStyles.controlBtn)}
          onClick={() => setIsMuted((muted) => !muted)}
          title={isMuted ? t("liveVoice.unmute", "Unmute") : t("liveVoice.mute", "Mute")}
          aria-label={isMuted ? t("liveVoice.unmute", "Unmute") : t("liveVoice.mute", "Mute")}
          type="button"
        >
          {isMuted ? <LuMicOff aria-hidden="true" /> : <LuMic aria-hidden="true" />}
        </button>
        <button
          data-hook="chat-esc-lv-control-btn chat-esc-lv-control-hangup"
          {...stylex.props(liveVoicePanelStyles.controlBtn)}
          onClick={onClose}
          title={t("liveVoice.hangUp", "Hang up")}
          aria-label={t("liveVoice.hangUp", "Hang up")}
          type="button"
        >
          <LuPhoneOff aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
