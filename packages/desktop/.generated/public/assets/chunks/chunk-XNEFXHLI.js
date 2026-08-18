import {
  LuMic,
  LuMicOff,
  LuPhone,
  LuPhoneOff
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/chat/web/LiveVoicePanel.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var LiveVoicePanel = ({ agentId, dialogId, onClose }) => {
  const { t } = useTranslation();
  const [status, setStatus] = (0, import_react.useState)("connecting");
  const [errorMessage, setErrorMessage] = (0, import_react.useState)(null);
  const [isMuted, setIsMuted] = (0, import_react.useState)(false);
  const wsRef = (0, import_react.useRef)(null);
  const audioContextRef = (0, import_react.useRef)(null);
  const mediaStreamRef = (0, import_react.useRef)(null);
  const isMutedRef = (0, import_react.useRef)(false);
  const nextPlaybackTimeRef = (0, import_react.useRef)(0);
  (0, import_react.useEffect)(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  (0, import_react.useEffect)(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/v1/agent/live-voice?agentId=${encodeURIComponent(agentId)}&dialogId=${encodeURIComponent(dialogId)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onerror = (event) => {
      console.error("[LiveVoicePanel] WebSocket error", { event, agentId, dialogId });
    };
    ws.onopen = () => {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        mediaStreamRef.current = stream;
        const audioCtx = new AudioContext({ sampleRate: 16e3 });
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN || isMutedRef.current) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.min(1, Math.max(-1, inputData[i])) * 32767;
          }
          const uint8 = new Uint8Array(pcm16.buffer);
          const CHUNK = 32768;
          let binary = "";
          for (let i = 0; i < uint8.length; i += CHUNK) {
            binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK));
          }
          const base64 = btoa(binary);
          ws.send(JSON.stringify({ type: "audio", data: base64 }));
        };
      }).catch((err) => {
        console.error("Microphone access denied:", err);
      });
    };
    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "status") {
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
        const playBuffer = (audioBuffer) => {
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
            float32Array[i] = int16Array[i] / 32768;
          }
          const audioBuffer = ctx.createBuffer(1, float32Array.length, 24e3);
          audioBuffer.getChannelData(0).set(float32Array);
          playBuffer(audioBuffer);
        } else if (msg.mimeType === "audio/wav") {
          try {
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
  const statusLabel = status === "listening" ? t("liveVoice.listening", "Listening...") : status === "thinking" ? t("liveVoice.thinking", "Thinking...") : status === "speaking" ? t("liveVoice.speaking", "Speaking...") : status === "connecting" ? t("liveVoice.connecting", "Connecting...") : t("liveVoice.disconnected", "Disconnected");
  const isActive = status === "listening" || status === "thinking" || status === "speaking";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "live-voice-panel", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "live-voice-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuPhone, { className: "live-voice-pulse-icon", "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "status-text", children: statusLabel })
    ] }),
    errorMessage && status === "disconnected" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        className: "live-voice-error",
        role: "status",
        "aria-live": "polite",
        title: errorMessage,
        children: errorMessage
      }
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "waveform-container", children: isActive && !isMuted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "waveform-animation", "aria-hidden": "true", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "bar" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "bar" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "bar" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "bar" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "bar" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "waveform-idle", "aria-hidden": "true" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "live-voice-controls", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          className: `control-btn ${isMuted ? "muted" : ""}`,
          onClick: () => setIsMuted((muted) => !muted),
          title: isMuted ? t("liveVoice.unmute", "Unmute") : t("liveVoice.mute", "Mute"),
          "aria-label": isMuted ? t("liveVoice.unmute", "Unmute") : t("liveVoice.mute", "Mute"),
          type: "button",
          children: isMuted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMicOff, { "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMic, { "aria-hidden": "true" })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          className: "control-btn hangup",
          onClick: onClose,
          title: t("liveVoice.hangUp", "Hang up"),
          "aria-label": t("liveVoice.hangUp", "Hang up"),
          type: "button",
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuPhoneOff, { "aria-hidden": "true" })
        }
      )
    ] })
  ] });
};

export {
  LiveVoicePanel
};
