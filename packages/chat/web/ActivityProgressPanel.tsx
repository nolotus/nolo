import React, { memo, useMemo, useState } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";

import { StatusIcon } from "chat/messages/web/toolMessageShared";
import {
  buildActivityTimeline,
  type ActivityTimelinePhase,
} from "chat/messages/web/toolDisplayName";

type ActivityProgressPanelProps = {
  messages: any[];
  isActive?: boolean;
};

function getRecentTaskMessages(messages: any[]): any[] {
  const lastUserIndex = [...messages]
    .reverse()
    .findIndex((message) => message?.role === "user");
  const startIndex =
    lastUserIndex === -1 ? 0 : messages.length - 1 - lastUserIndex + 1;
  return messages.slice(startIndex);
}

const phaseStatusLabel = (phase: ActivityTimelinePhase) => {
  if (phase.status === "running") return "进行中";
  if (phase.status === "failed") return "失败";
  if (phase.status === "success") return "完成";
  return "待处理";
};

export const ActivityProgressPanel = memo(
  ({ messages, isActive = false }: ActivityProgressPanelProps) => {
    const [isMinimized, setIsMinimized] = useState(true);
    const [expandedPhaseIds, setExpandedPhaseIds] = useState<Set<string>>(() => new Set());
    const taskMessages = useMemo(() => getRecentTaskMessages(messages), [messages]);
    const timeline = useMemo(() => buildActivityTimeline(taskMessages), [taskMessages]);

    if (timeline.phases.length === 0 || timeline.totalPhases <= 1) return null;

    const overallStatus =
      timeline.phases.some((phase) => phase.status === "failed")
        ? "failed"
        : timeline.phases.some((phase) => phase.status === "running")
          ? "running"
          : timeline.completedPhases >= timeline.totalPhases
            ? "success"
            : "pending";

    // When the agent task run loop is inactive and it has completed successfully,
    // do not show the panel at all to avoid duplicate visuals with the timeline inside messages.
    if (!isActive && overallStatus === "success") return null;

    const togglePhase = (phaseId: string) => {
      setExpandedPhaseIds((prev) => {
        const next = new Set(prev);
        if (next.has(phaseId)) next.delete(phaseId);
        else next.add(phaseId);
        return next;
      });
    };

    const runningPhase = timeline.phases.find((phase) => phase.status === "running");
    const currentStepText = runningPhase ? ` / ${runningPhase.title}` : "";

    return (
      <div className={`activity-progress-panel activity-progress-panel--${overallStatus}${isMinimized ? " activity-progress-panel--minimized" : ""}`}>
        <button
          type="button"
          className="activity-progress-panel__head"
          onClick={() => setIsMinimized((value) => !value)}
          aria-expanded={!isMinimized}
        >
          <div className="activity-progress-panel__title">
            <span className="activity-progress-panel__status">
              <StatusIcon status={overallStatus} toolName="" />
            </span>
            <span className="activity-progress-panel__title-text">任务进度</span>
            <span className="activity-progress-panel__meta-text">
              {` / 已完成 ${timeline.completedPhases} / ${timeline.totalPhases}`}
              {currentStepText}
            </span>
          </div>
          <span className="activity-progress-panel__chevron" aria-hidden="true">
            {isMinimized ? <LuChevronRight size={15} /> : <LuChevronDown size={15} />}
          </span>
        </button>
        {!isMinimized && (
          <div className="activity-progress-panel__phases">
            {timeline.phases.map((phase) => {
              const isExpanded = expandedPhaseIds.has(phase.id) || phase.status === "running";
              const canExpand = phase.actions.length > 0;
              return (
                <div
                  key={phase.id}
                  className={`activity-progress-panel__phase activity-progress-panel__phase--${phase.status}${isExpanded ? " activity-progress-panel__phase--expanded" : ""}`}
                >
                  <button
                    type="button"
                    className="activity-progress-panel__phase-row"
                    onClick={() => {
                      if (canExpand) togglePhase(phase.id);
                    }}
                    aria-expanded={canExpand ? isExpanded : undefined}
                    disabled={!canExpand}
                  >
                    <span className="activity-progress-panel__phase-icon">
                      <StatusIcon status={phase.status} toolName="" />
                    </span>
                    <span className="activity-progress-panel__phase-title">{phase.title}</span>
                    {(isActive || phase.status === "running") && (
                      <span className="activity-progress-panel__phase-status">
                        {phaseStatusLabel(phase)}
                      </span>
                    )}
                    {canExpand && (
                      <span className="activity-progress-panel__phase-chevron" aria-hidden="true">
                        {isExpanded ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
                      </span>
                    )}
                  </button>
                  {isExpanded && canExpand && (
                    <div className="activity-progress-panel__actions">
                      {phase.actions.map((action) => (
                        <div key={action.id} className={`activity-progress-panel__action activity-progress-panel__action--${action.status}`}>
                          <span className={`activity-progress-panel__action-dot activity-progress-panel__action-dot--${action.status}`} />
                          <span className="activity-progress-panel__action-title">{action.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

export default ActivityProgressPanel;
