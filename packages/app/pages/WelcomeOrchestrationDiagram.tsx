import React from "react";
import type { TFunction } from "i18next";
import {
  LuMessageSquare,
  LuAppWindow,
  LuBrain,
  LuZap,
  LuVideo,
  LuLayoutDashboard,
} from "react-icons/lu";
import OpenAIMono from "@lobehub/icons/es/OpenAI/components/Mono";
import ClaudeMono from "@lobehub/icons/es/Claude/components/Mono";
import GeminiMono from "@lobehub/icons/es/Gemini/components/Mono";
import GrokMono from "@lobehub/icons/es/Grok/components/Mono";
import MinimaxMono from "@lobehub/icons/es/Minimax/components/Mono";
import AntigravityMono from "@lobehub/icons/es/Antigravity/components/Mono";
import CodexMono from "@lobehub/icons/es/Codex/components/Mono";

export type OrchestrationDiagramTab = "coding" | "brainstorm" | "consensus" | "video";

export type VideoAgentLabels = {
  orchestrator: string;
  script: string;
  storyboard: string;
  visual: string;
  editor: string;
  deliver: string;
};

export type ConsensusOutputLabels = {
  consensus: string;
  disagreements: string;
  nextStep: string;
};

export type WelcomeOrchestrationDiagramProps = {
  tab: OrchestrationDiagramTab;
  t: TFunction;
  videoAgentLabels: VideoAgentLabels;
  consensusOutputLabels: ConsensusOutputLabels;
};

type IconKind =
  | "message-square"
  | "layout-dashboard"
  | "brain"
  | "zap"
  | "video"
  | "app-window"
  | "openai"
  | "claude"
  | "gemini"
  | "grok"
  | "minimax"
  | "antigravity"
  | "codex";

type DiagramTrack = {
  d: string;
  className?: string;
};

type DiagramPacket = {
  d: string;
  className: string;
};

type DiagramSvgLabel = {
  x: number;
  y: number;
  className?: string;
  textKey: string;
};

type DiagramNodeLabel =
  | { type: "t"; key: string }
  | { type: "videoAgent"; key: keyof VideoAgentLabels }
  | { type: "text"; value: string };

type DiagramNode = {
  className: string;
  top: string;
  left: string;
  label: DiagramNodeLabel;
  icon: IconKind;
  iconSize?: number;
  iconClassName?: string;
};

type DiagramTabConfig = {
  stageModifier?: "brainstorm" | "consensus" | "video";
  viewBox: string;
  svgAriaHidden?: boolean;
  briefKey?: string;
  tracks: DiagramTrack[];
  tracksClassName?: string;
  packets: DiagramPacket[];
  packetsClassName?: string;
  svgLabels?: DiagramSvgLabel[];
  nodes: DiagramNode[];
  showConsensusOutput?: boolean;
};

const DIAGRAM_CONFIGS: Record<OrchestrationDiagramTab, DiagramTabConfig> = {
  coding: {
    viewBox: "0 0 940 360",
    tracks: [
      { d: "M 120 120 C 190 120, 190 180, 260 180" },
      { d: "M 120 240 C 190 240, 190 180, 260 180" },
      { d: "M 260 180 C 330 180, 330 120, 400 120" },
      { d: "M 260 180 C 330 180, 330 240, 400 240" },
      { d: "M 400 120 C 470 120, 470 180, 540 180" },
      { d: "M 400 240 C 470 240, 470 180, 540 180" },
      { d: "M 540 180 L 700 180" },
      { d: "M 700 180 L 840 180" },
      { d: "M 540 160 Q 470 60 400 90", className: "t-reject" },
      { d: "M 540 200 Q 470 300 400 270", className: "t-reject" },
    ],
    packets: [
      { d: "M 120 120 C 190 120, 190 180, 260 180", className: "wf-data-packet p-chat" },
      { d: "M 120 240 C 190 240, 190 180, 260 180", className: "wf-data-packet p-form" },
      { d: "M 260 180 C 330 180, 330 120, 400 120", className: "wf-data-packet p-pm-fe" },
      { d: "M 260 180 C 330 180, 330 240, 400 240", className: "wf-data-packet p-pm-be" },
      { d: "M 400 120 C 470 120, 470 180, 540 180", className: "wf-data-packet p-fe-rev1" },
      { d: "M 400 240 C 470 240, 470 180, 540 180", className: "wf-data-packet p-be-rev1" },
      { d: "M 540 160 Q 470 60 400 90", className: "wf-data-packet p-reject-fe" },
      { d: "M 540 200 Q 470 300 400 270", className: "wf-data-packet p-reject-be" },
      { d: "M 400 120 C 470 120, 470 180, 540 180", className: "wf-data-packet p-fe-rev2" },
      { d: "M 400 240 C 470 240, 470 180, 540 180", className: "wf-data-packet p-be-rev2" },
      { d: "M 540 180 L 700 180", className: "wf-data-packet p-release" },
      { d: "M 700 180 L 840 180", className: "wf-data-packet p-website" },
    ],
    svgLabels: [
      { x: 180, y: 135, textKey: "welcomeSection.showcase.input" },
      { x: 310, y: 130, textKey: "welcomeSection.showcase.dispatch" },
      { x: 460, y: 130, textKey: "welcomeSection.showcase.submit" },
      { x: 610, y: 170, className: "text-pass", textKey: "welcomeSection.showcase.pass" },
      { x: 470, y: 70, className: "text-refactor", textKey: "welcomeSection.showcase.refactor" },
    ],
    nodes: [
      {
        className: "n-start-chat",
        top: "120px",
        left: "120px",
        label: { type: "t", key: "welcomeSection.showcase.chat" },
        icon: "message-square",
        iconSize: 18,
      },
      {
        className: "n-start-form",
        top: "240px",
        left: "120px",
        label: { type: "t", key: "welcomeSection.showcase.taskboard" },
        icon: "layout-dashboard",
        iconSize: 18,
      },
      {
        className: "n-pm",
        top: "180px",
        left: "260px",
        label: { type: "t", key: "welcomeSection.showcase.pm" },
        icon: "minimax",
        iconSize: 22,
      },
      {
        className: "n-fe",
        top: "120px",
        left: "400px",
        label: { type: "t", key: "welcomeSection.showcase.fe" },
        icon: "antigravity",
        iconSize: 22,
      },
      {
        className: "n-be",
        top: "240px",
        left: "400px",
        label: { type: "t", key: "welcomeSection.showcase.be" },
        icon: "codex",
        iconSize: 22,
      },
      {
        className: "n-rev",
        top: "180px",
        left: "540px",
        label: { type: "t", key: "welcomeSection.showcase.reviewer" },
        icon: "codex",
        iconSize: 22,
      },
      {
        className: "n-rel",
        top: "180px",
        left: "700px",
        label: { type: "t", key: "welcomeSection.showcase.release" },
        icon: "zap",
        iconSize: 20,
      },
      {
        className: "n-web",
        top: "180px",
        left: "840px",
        label: { type: "t", key: "welcomeSection.showcase.website" },
        icon: "app-window",
        iconSize: 20,
      },
    ],
  },
  brainstorm: {
    stageModifier: "brainstorm",
    viewBox: "0 0 780 300",
    svgAriaHidden: true,
    briefKey: "welcomeSection.showcaseBrainstorm.question",
    tracks: [
      { d: "M 118 168 C 220 168, 280 98, 337 98" },
      { d: "M 118 168 H 337" },
      { d: "M 118 168 C 220 168, 280 238, 337 238" },
    ],
    packets: [
      { d: "M 118 168 C 220 168, 280 98, 337 98", className: "wf-data-packet p-b-gpt" },
      { d: "M 118 168 H 337", className: "wf-data-packet p-b-grok" },
      { d: "M 118 168 C 220 168, 280 238, 337 238", className: "wf-data-packet p-b-gemini" },
    ],
    packetsClassName: "wf-packets--brainstorm",
    nodes: [
      {
        className: "n-b-orchestrator",
        top: "168px",
        left: "95px",
        label: { type: "videoAgent", key: "orchestrator" },
        icon: "minimax",
        iconSize: 22,
      },
      {
        className: "n-b-gpt",
        top: "98px",
        left: "360px",
        label: { type: "text", value: "GPT" },
        icon: "openai",
        iconSize: 20,
        iconClassName: "is-brand-openai",
      },
      {
        className: "n-b-grok",
        top: "168px",
        left: "360px",
        label: { type: "text", value: "Grok" },
        icon: "grok",
        iconSize: 20,
        iconClassName: "is-brand-grok",
      },
      {
        className: "n-b-gemini",
        top: "238px",
        left: "360px",
        label: { type: "text", value: "Gemini" },
        icon: "gemini",
        iconSize: 20,
        iconClassName: "is-brand-gemini",
      },
    ],
  },
  consensus: {
    stageModifier: "consensus",
    viewBox: "0 0 780 300",
    svgAriaHidden: true,
    briefKey: "welcomeSection.showcaseConsensus.question",
    tracks: [
      { d: "M 173 108 C 250 108, 320 150, 367 175" },
      { d: "M 390 131 V 175" },
      { d: "M 607 108 C 530 108, 460 150, 413 175" },
      { d: "M 390 221 V 255" },
    ],
    packets: [
      { d: "M 173 108 C 250 108, 320 150, 367 175", className: "wf-data-packet p-c-gpt" },
      { d: "M 390 131 V 175", className: "wf-data-packet p-c-grok" },
      { d: "M 607 108 C 530 108, 460 150, 413 175", className: "wf-data-packet p-c-gemini" },
      { d: "M 390 221 V 255", className: "wf-data-packet p-c-output" },
    ],
    packetsClassName: "wf-packets--consensus",
    showConsensusOutput: true,
    nodes: [
      {
        className: "n-c-gpt",
        top: "108px",
        left: "150px",
        label: { type: "text", value: "GPT" },
        icon: "openai",
        iconSize: 20,
        iconClassName: "is-brand-openai",
      },
      {
        className: "n-c-grok",
        top: "108px",
        left: "390px",
        label: { type: "text", value: "Grok" },
        icon: "grok",
        iconSize: 20,
        iconClassName: "is-brand-grok",
      },
      {
        className: "n-c-gemini",
        top: "108px",
        left: "630px",
        label: { type: "text", value: "Gemini" },
        icon: "gemini",
        iconSize: 20,
        iconClassName: "is-brand-gemini",
      },
      {
        className: "n-c-brain",
        top: "198px",
        left: "390px",
        label: { type: "videoAgent", key: "orchestrator" },
        icon: "brain",
        iconSize: 20,
        iconClassName: "is-orchestrator",
      },
    ],
  },
  video: {
    stageModifier: "video",
    viewBox: "0 0 780 300",
    svgAriaHidden: true,
    briefKey: "welcomeSection.showcaseVideo.brief",
    tracks: [
      { d: "M 118 158 C 165 158, 185 118, 217 88" },
      { d: "M 118 158 H 402" },
      { d: "M 118 158 C 165 158, 185 198, 287 228" },
      { d: "M 263 88 C 360 88, 430 120, 562 158" },
      { d: "M 448 158 H 562" },
      { d: "M 333 228 C 430 228, 430 188, 562 158" },
      { d: "M 608 158 H 687" },
    ],
    tracksClassName: "wf-tracks--video",
    packets: [
      { d: "M 118 158 C 165 158, 185 118, 217 88", className: "wf-data-packet p-v-script" },
      { d: "M 118 158 H 402", className: "wf-data-packet p-v-storyboard" },
      { d: "M 118 158 C 165 158, 185 198, 287 228", className: "wf-data-packet p-v-visual" },
      { d: "M 263 88 C 360 88, 430 120, 562 158", className: "wf-data-packet p-v-script-edit" },
      { d: "M 448 158 H 562", className: "wf-data-packet p-v-storyboard-edit" },
      { d: "M 333 228 C 430 228, 430 188, 562 158", className: "wf-data-packet p-v-visual-edit" },
      { d: "M 608 158 H 687", className: "wf-data-packet p-v-deliver" },
    ],
    packetsClassName: "wf-packets--video",
    nodes: [
      {
        className: "n-video-orchestrator",
        top: "158px",
        left: "95px",
        label: { type: "videoAgent", key: "orchestrator" },
        icon: "minimax",
        iconSize: 22,
      },
      {
        className: "n-video-script",
        top: "88px",
        left: "240px",
        label: { type: "videoAgent", key: "script" },
        icon: "claude",
        iconSize: 22,
      },
      {
        className: "n-video-storyboard",
        top: "158px",
        left: "425px",
        label: { type: "videoAgent", key: "storyboard" },
        icon: "gemini",
        iconSize: 22,
      },
      {
        className: "n-video-visual",
        top: "228px",
        left: "310px",
        label: { type: "videoAgent", key: "visual" },
        icon: "openai",
        iconSize: 22,
      },
      {
        className: "n-video-editor",
        top: "158px",
        left: "585px",
        label: { type: "videoAgent", key: "editor" },
        icon: "zap",
        iconSize: 20,
      },
      {
        className: "n-video-deliver",
        top: "158px",
        left: "710px",
        label: { type: "videoAgent", key: "deliver" },
        icon: "video",
        iconSize: 20,
        iconClassName: "is-deliver",
      },
    ],
  },
};

const resolveNodeLabel = (
  label: DiagramNodeLabel,
  t: TFunction,
  videoAgentLabels: VideoAgentLabels
) => {
  if (label.type === "t") {
    return t(label.key);
  }
  if (label.type === "videoAgent") {
    return videoAgentLabels[label.key];
  }
  return label.value;
};

const DiagramIcon = ({ kind, size }: { kind: IconKind; size: number }) => {
  switch (kind) {
    case "message-square":
      return <LuMessageSquare size={size} aria-hidden="true" />;
    case "layout-dashboard":
      return <LuLayoutDashboard size={size} aria-hidden="true" />;
    case "brain":
      return <LuBrain size={size} aria-hidden="true" />;
    case "zap":
      return <LuZap size={size} aria-hidden="true" />;
    case "video":
      return <LuVideo size={size} aria-hidden="true" />;
    case "app-window":
      return <LuAppWindow size={size} aria-hidden="true" />;
    case "openai":
      return <OpenAIMono size={size} />;
    case "claude":
      return <ClaudeMono size={size} />;
    case "gemini":
      return <GeminiMono size={size} />;
    case "grok":
      return <GrokMono size={size} />;
    case "minimax":
      return <MinimaxMono size={size} />;
    case "antigravity":
      return <AntigravityMono size={size} />;
    case "codex":
      return <CodexMono size={size} />;
    default:
      return null;
  }
};

const parseViewBoxSize = (viewBox: string) => {
  const [, , width = 780, height = 300] = viewBox.trim().split(/\s+/).map(Number);
  return { width, height };
};

const stageClassName = (modifier?: DiagramTabConfig["stageModifier"]) =>
  modifier ? `wf-stage-tech wf-stage-tech--${modifier}` : "wf-stage-tech";

const stageCanvasStyle = (viewBox: string): React.CSSProperties => {
  const { width, height } = parseViewBoxSize(viewBox);
  return {
    "--wf-stage-width": `${width}px`,
    "--wf-stage-height": `${height}px`,
    "--wf-stage-aspect": `${width} / ${height}`,
  } as React.CSSProperties;
};

const nodePositionStyle = (top: string, left: string, viewBox: string): React.CSSProperties => {
  const { width, height } = parseViewBoxSize(viewBox);
  const topPx = Number.parseFloat(top);
  const leftPx = Number.parseFloat(left);
  return {
    top: `${(topPx / height) * 100}%`,
    left: `${(leftPx / width) * 100}%`,
  };
};

const ConsensusOutput = ({ labels }: { labels: ConsensusOutputLabels }) => (
  <div className="wf-consensus-output">
    <span className="wf-consensus-pill wf-consensus-pill-primary">{labels.consensus}</span>
    <span className="wf-consensus-pill">{labels.disagreements}</span>
    <span className="wf-consensus-pill">{labels.nextStep}</span>
  </div>
);

const DesktopTracksSvg = ({
  config,
  t,
}: {
  config: DiagramTabConfig;
  t: TFunction;
}) => (
  <svg
    className="wf-svg-lines"
    viewBox={config.viewBox}
    aria-hidden={config.svgAriaHidden ? true : undefined}
  >
    <g className={config.tracksClassName ? `wf-tracks ${config.tracksClassName}` : "wf-tracks"}>
      {config.tracks.map((track) => (
        <path key={track.d} d={track.d} className={track.className} />
      ))}
    </g>
    <g className={config.packetsClassName ? `wf-packets ${config.packetsClassName}` : "wf-packets"}>
      {config.packets.map((packet) => (
        <path key={`${packet.className}-${packet.d}`} d={packet.d} className={packet.className} />
      ))}
    </g>
    {config.svgLabels ? (
      <g className="wf-svg-labels">
        {config.svgLabels.map((label) => (
          <text
            key={`${label.textKey}-${label.x}-${label.y}`}
            x={label.x}
            y={label.y}
            className={label.className ? `wf-svg-text ${label.className}` : "wf-svg-text"}
          >
            {t(label.textKey)}
          </text>
        ))}
      </g>
    ) : null}
  </svg>
);

const DesktopNodes = ({
  nodes,
  t,
  videoAgentLabels,
  viewBox,
}: {
  nodes: DiagramNode[];
  t: TFunction;
  videoAgentLabels: VideoAgentLabels;
  viewBox: string;
}) => (
  <>
    {nodes.map((node) => (
      <div
        key={node.className}
        className={`wf-node-tech ${node.className}`}
        style={nodePositionStyle(node.top, node.left, viewBox)}
      >
        <div className="wf-glass-ring" />
        <div className={`wf-icon-core${node.iconClassName ? ` ${node.iconClassName}` : ""}`}>
          <DiagramIcon kind={node.icon} size={node.iconSize ?? 20} />
        </div>
        <div className="wf-node-label">{resolveNodeLabel(node.label, t, videoAgentLabels)}</div>
      </div>
    ))}
  </>
);

const MobileTracksSvg = ({ config }: { config: DiagramTabConfig }) => (
  <svg
    className="wf-svg-lines wf-svg-lines--mobile"
    viewBox={config.viewBox}
    aria-hidden={config.svgAriaHidden ?? true}
    preserveAspectRatio="xMidYMid meet"
  >
    <g className={config.tracksClassName ? `wf-tracks ${config.tracksClassName}` : "wf-tracks"}>
      {config.tracks.map((track) => (
        <path key={track.d} d={track.d} className={track.className} />
      ))}
    </g>
  </svg>
);

const MobileNodes = ({
  nodes,
  t,
  videoAgentLabels,
  viewBox,
}: {
  nodes: DiagramNode[];
  t: TFunction;
  videoAgentLabels: VideoAgentLabels;
  viewBox: string;
}) => (
  <>
    {nodes.map((node) => (
      <div
        key={node.className}
        className={`wf-node-tech wf-node-tech--mobile ${node.className}`}
        style={nodePositionStyle(node.top, node.left, viewBox)}
      >
        <div className={`wf-icon-core${node.iconClassName ? ` ${node.iconClassName}` : ""}`}>
          <DiagramIcon kind={node.icon} size={node.iconSize ? Math.max(14, node.iconSize - 6) : 16} />
        </div>
        <div className="wf-node-label">{resolveNodeLabel(node.label, t, videoAgentLabels)}</div>
      </div>
    ))}
  </>
);

export const WelcomeOrchestrationDiagram = ({
  tab,
  t,
  videoAgentLabels,
  consensusOutputLabels,
}: WelcomeOrchestrationDiagramProps) => {
  const config = DIAGRAM_CONFIGS[tab];
  const brief = config.briefKey ? t(config.briefKey) : null;

  return (
    <>
      <div className="wf-stage-scroll wf-stage-scroll--desktop">
        <div className={stageClassName(config.stageModifier)} style={stageCanvasStyle(config.viewBox)}>
          {brief ? <p className="ws-orchestration-brief">{brief}</p> : null}
          <DesktopTracksSvg config={config} t={t} />
          <DesktopNodes
            nodes={config.nodes}
            t={t}
            videoAgentLabels={videoAgentLabels}
            viewBox={config.viewBox}
          />
          {config.showConsensusOutput ? <ConsensusOutput labels={consensusOutputLabels} /> : null}
        </div>
      </div>

      <div className="wf-stage-mobile">
        <div className={stageClassName(config.stageModifier)} style={stageCanvasStyle(config.viewBox)}>
          {brief ? <p className="ws-orchestration-brief">{brief}</p> : null}
          <div className="wf-stage-mobile-canvas" style={stageCanvasStyle(config.viewBox)}>
            <MobileTracksSvg config={config} />
            <MobileNodes
              nodes={config.nodes}
              t={t}
              videoAgentLabels={videoAgentLabels}
              viewBox={config.viewBox}
            />
          </div>
          {config.showConsensusOutput ? <ConsensusOutput labels={consensusOutputLabels} /> : null}
        </div>
      </div>
    </>
  );
};