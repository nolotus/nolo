// packages/chat/web/CreateTaskModal.tsx

import * as stylex from "@stylexjs/stylex";
import { messageInputStyles } from "./messageInputStyles";
import "./chatStylexEscapeHatch.css";
import React, { useState, useCallback, useEffect, useId, useMemo } from "react";
import { useNavigate } from "app/routing";
import { useAppDispatch } from "app/store";
import { useUserId } from "identity";
import { Dialog } from "render/web/ui/modal/Dialog";
import Button from "render/web/ui/Button";
import { createAgentAutomation } from "chat/dialog/dialogSlice";
import { buildRoutableContentPath } from "create/space/contentKeyUtils";
import { useUserData } from "database/hooks/useUserData";
import { DataType } from "create/types";
import type { Agent } from "app/types";
import { LuCalendarClock, LuRefreshCw } from "react-icons/lu";
import { Select, SelectItem } from "render/web/ui/Select";

// ── 类型 ────────────────────────────────────────────────────────────────────

type Frequency = "hourly" | "daily" | "weekly" | "custom";

const WEEKDAYS = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 0, label: "周日" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// ── Cron 生成 ────────────────────────────────────────────────────────────────

function buildCron(freq: Frequency, hour: number, minute: number, weekday: number, raw: string): string {
  switch (freq) {
    case "hourly":  return `${minute} * * * *`;
    case "daily":   return `${minute} ${hour} * * *`;
    case "weekly":  return `${minute} ${hour} * * ${weekday}`;
    case "custom":  return raw;
  }
}

function describeSchedule(freq: Frequency, hour: number, minute: number, weekday: number): string {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const wdLabel = WEEKDAYS.find(w => w.value === weekday)?.label ?? "周一";
  switch (freq) {
    case "hourly":  return `每小时第 ${mm} 分钟执行`;
    case "daily":   return `每天 ${hh}:${mm} 执行`;
    case "weekly":  return `每${wdLabel} ${hh}:${mm} 执行`;
    case "custom":  return "自定义 Cron 表达式";
  }
}

// ── 主组件 ───────────────────────────────────────────────────────────────────

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId?: string | null;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, spaceId }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userId = useUserId();
  const titleId = useId();
  const taskPromptId = useId();
  const scheduleLabelId = useId();
  const agentLabelId = useId();
  const cronId = useId();

  // 表单字段
  const [title, setTitle]               = useState("");
  const [taskPrompt, setTaskPrompt]     = useState("");
  const [freq, setFreq]                 = useState<Frequency>("daily");
  const [hour, setHour]                 = useState(2);
  const [minute, setMinute]             = useState(0);
  const [weekday, setWeekday]           = useState(1);
  const [rawCron, setRawCron]           = useState("0 2 * * *");
  const [selectedAgentKey, setSelectedAgentKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const { data: agents = [], loading, reload } = useUserData(DataType.AGENT, userId || "", 50);

  // 派生 cron 字符串
  const cronExpr = useMemo(
    () => buildCron(freq, hour, minute, weekday, rawCron),
    [freq, hour, minute, weekday, rawCron]
  );
  const cronDesc = useMemo(
    () => describeSchedule(freq, hour, minute, weekday),
    [freq, hour, minute, weekday]
  );

  // 重置
  useEffect(() => {
    if (isOpen) {
      setTitle(""); setTaskPrompt(""); setFreq("daily");
      setHour(2); setMinute(0); setWeekday(1); setRawCron("0 2 * * *");
      setSelectedAgentKey(""); setError(null);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!taskPrompt.trim()) { setError("请填写任务描述"); return; }
    if (!selectedAgentKey)  { setError("请选择一个 Agent"); return; }
    setIsSubmitting(true); setError(null);
    try {
      const result = await dispatch(
        createAgentAutomation({
          agentKey: selectedAgentKey,
          title: title.trim() || `定时任务 ${new Date().toLocaleString("zh-CN")}`,
          schedule: cronExpr,
          taskPrompt: taskPrompt.trim(),
          ...(spaceId !== undefined ? { spaceId } : {}),
        } as any)
      ).unwrap();
      onClose();
      navigate(buildRoutableContentPath({
        contentKey: result.dbKey,
        type: result.type,
        spaceId: result.spaceId,
      }));
    } catch (err: any) {
      setError(err?.message || "创建失败");
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, navigate, onClose, title, taskPrompt, cronExpr, selectedAgentKey, spaceId]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={<span style={{ display:"flex", alignItems:"center", gap:8 }}><LuCalendarClock size={18} aria-hidden="true"/>新建定时任务</span>}
      size="medium"
    >
      <div {...stylex.props(messageInputStyles.ctm)}>

        {/* 任务名称 */}
        <div {...stylex.props(messageInputStyles.ctmField)}>
          <label
            htmlFor={titleId}
            {...stylex.props(messageInputStyles.ctmLabel)}
          >
            任务名称（可选）
          </label>
          <input
            id={titleId}
            type="text"
            placeholder="例：每日代码审查"
            value={title}
            onChange={e => setTitle(e.target.value)}
            {...stylex.props(messageInputStyles.ctmInput)}
          />
        </div>

        {/* 任务描述 */}
        <div {...stylex.props(messageInputStyles.ctmField)}>
          <label
            htmlFor={taskPromptId}
            {...stylex.props(messageInputStyles.ctmLabel)}
          >
            任务描述 *
          </label>
          <textarea
            id={taskPromptId}
            rows={3}
            placeholder="告诉 AI 要做什么。例：检查今天的代码提交，列出潜在风险点"
            value={taskPrompt}
            onChange={e => setTaskPrompt(e.target.value)}
            {...stylex.props(messageInputStyles.ctmTextarea)}
          />
        </div>

        {/* 执行时间 — multi-control group; structure forbids single htmlFor */}
        <div
          role="group"
          aria-labelledby={scheduleLabelId}
          {...stylex.props(messageInputStyles.ctmField)}
        >
          <div
            id={scheduleLabelId}
            {...stylex.props(messageInputStyles.ctmLabel)}
          >
            执行时间
          </div>

          {/* 频率选择 */}
          <div
            role="group"
            aria-label="频率"
            {...stylex.props(messageInputStyles.ctmFreqRow)}
          >
            {(["hourly", "daily", "weekly", "custom"] as Frequency[]).map(f => (
              <button key={f} type="button"
                onClick={() => setFreq(f)}
                aria-pressed={freq === f}
                {...stylex.props(
                  messageInputStyles.ctmFreqBtn,
                  freq === f && messageInputStyles.ctmFreqBtnActive
                )}
              >
                {{ hourly:"每小时", daily:"每天", weekly:"每周", custom:"自定义" }[f]}
              </button>
            ))}
          </div>

          {/* 时间细节 */}
          {freq !== "custom" && (
            <div
              {...stylex.props(messageInputStyles.ctmTimeRow)}
            >
              {/* 每周：星期选择 */}
              {freq === "weekly" && (
                <Select
                  selectedKey={String(weekday)}
                  onSelectionChange={(key) =>
                    setWeekday(key == null ? 0 : Number(key))
                  }
                  aria-label="星期"
                >
                  {WEEKDAYS.map((w) => (
                    <SelectItem
                      key={String(w.value)}
                      id={String(w.value)}
                      textValue={w.label}
                    >
                      {w.label}
                    </SelectItem>
                  ))}
                </Select>
              )}

              {/* 每小时：只选分钟 */}
              {freq === "hourly" ? (
                <>
                  <span
                    {...stylex.props(messageInputStyles.ctmTimeLabel)}
                  >
                    每小时
                  </span>
                  <Select
                    selectedKey={String(minute)}
                    onSelectionChange={(key) =>
                      setMinute(key == null ? 0 : Number(key))
                    }
                    aria-label="分钟"
                  >
                    {MINUTES.map((m) => (
                      <SelectItem
                        key={String(m)}
                        id={String(m)}
                        textValue={`:${String(m).padStart(2, "0")} 分`}
                      >
                        {`:${String(m).padStart(2, "0")} 分`}
                      </SelectItem>
                    ))}
                  </Select>
                  <span
                    {...stylex.props(messageInputStyles.ctmTimeLabel)}
                  >
                    执行
                  </span>
                </>
              ) : (
                /* 每天/每周：选时 + 分 */
                <>
                  <Select
                    selectedKey={String(hour)}
                    onSelectionChange={(key) =>
                      setHour(key == null ? 0 : Number(key))
                    }
                    aria-label="小时"
                  >
                    {HOURS.map((h) => (
                      <SelectItem
                        key={String(h)}
                        id={String(h)}
                        textValue={`${String(h).padStart(2, "0")} 时`}
                      >
                        {`${String(h).padStart(2, "0")} 时`}
                      </SelectItem>
                    ))}
                  </Select>
                  <Select
                    selectedKey={String(minute)}
                    onSelectionChange={(key) =>
                      setMinute(key == null ? 0 : Number(key))
                    }
                    aria-label="分钟"
                  >
                    {MINUTES.map((m) => (
                      <SelectItem
                        key={String(m)}
                        id={String(m)}
                        textValue={`${String(m).padStart(2, "0")} 分`}
                      >
                        {`${String(m).padStart(2, "0")} 分`}
                      </SelectItem>
                    ))}
                  </Select>
                </>
              )}
            </div>
          )}

          {/* 自定义：原始 cron */}
          {freq === "custom" && (
            <input
              id={cronId}
              type="text"
              placeholder="例：0 2 * * 1-5（工作日凌晨2点）"
              value={rawCron}
              onChange={e => setRawCron(e.target.value)}
              aria-label="Cron 表达式"
              {...stylex.props(
                messageInputStyles.ctmInput,
                messageInputStyles.ctmInputMono
              )}
            />
          )}

          {/* 人类可读描述 */}
          <div
            {...stylex.props(messageInputStyles.ctmCronPreview)}
          >
            <span
              {...stylex.props(messageInputStyles.ctmCronDesc)}
            >
              {cronDesc}
            </span>
            <code
              {...stylex.props(messageInputStyles.ctmCronCode)}
            >
              {cronExpr}
            </code>
          </div>
        </div>

        {/* Agent 选择 — button group; structure forbids single htmlFor */}
        <div
          role="group"
          aria-labelledby={agentLabelId}
          {...stylex.props(messageInputStyles.ctmField)}
        >
          <div
            {...stylex.props(messageInputStyles.ctmAgentHeader)}
          >
            <div
              id={agentLabelId}
              {...stylex.props(messageInputStyles.ctmLabel)}
            >
              选择 Agent *
            </div>
            <button
              type="button"
              onClick={() => reload()}
              title="刷新"
              aria-label="刷新"
              {...stylex.props(messageInputStyles.ctmReload)}
            >
              <LuRefreshCw size={13} aria-hidden="true" />
            </button>
          </div>
          {loading ? (
            <p {...stylex.props(messageInputStyles.ctmHint)}>加载中…</p>
          ) : agents.length === 0 ? (
            <p {...stylex.props(messageInputStyles.ctmHint)}>暂无 Agent，请先在"Agent"页面创建</p>
          ) : (
            <div
              {...stylex.props(messageInputStyles.ctmAgentList)}
            >
              {(agents as (Agent & { dbKey: string })[]).map(agent => (
                <button key={agent.dbKey} type="button"
                  onClick={() => setSelectedAgentKey(agent.dbKey)}
                  {...stylex.props(
                    messageInputStyles.ctmAgentBtn,
                    selectedAgentKey === agent.dbKey && messageInputStyles.ctmAgentBtnActive
                  )}
                >
                  <span
                    {...stylex.props(messageInputStyles.ctmAgentName)}
                  >
                    {agent.name || agent.dbKey}
                  </span>
                  {agent.apiSource === "cli" && (
                    <span
                      {...stylex.props(
                        messageInputStyles.ctmBadge,
                        messageInputStyles.ctmBadgeCli
                      )}
                    >
                      CLI
                    </span>
                  )}
                  {agent.apiSource === "custom" && (
                    <span
                      {...stylex.props(
                        messageInputStyles.ctmBadge,
                        messageInputStyles.ctmBadgeLocal
                      )}
                    >
                      本地
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p {...stylex.props(messageInputStyles.ctmError)}>{error}</p>}

        <div
          {...stylex.props(messageInputStyles.ctmActions)}
        >
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>取消</Button>
          <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>创建任务</Button>
        </div>
      </div>
    </Dialog>
  );
};

export default CreateTaskModal;
