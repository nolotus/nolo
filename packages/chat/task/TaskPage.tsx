import React, { useEffect } from "react";
import { Link, useParams } from "app/routing";
import { useAppDispatch, useAppSelector } from "app/store";
import type { AgentAutomationConfig } from "app/types";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { read, selectById } from "database/dbSlice";
import { buildDialogUrl } from "chat/dialog/dialogUrl";

const formatTime = (value?: number) => {
  const ms = asOptionalFiniteNumber(value);
  return ms !== undefined ? new Date(ms).toLocaleString() : "未安排";
};

const TaskPage: React.FC<{ taskKey: string }> = ({ taskKey }) => {
  const { spaceId } = useParams<"spaceId">();
  const dispatch = useAppDispatch();
  const automation = useAppSelector((state) =>
    selectById(state, taskKey)
  ) as AgentAutomationConfig | null;

  useEffect(() => {
    if (taskKey) {
      void (dispatch as any)(read({ dbKey: taskKey }));
    }
  }, [dispatch, taskKey]);

  if (!automation) {
    return <div style={{ padding: 24 }}>正在加载自动化...</div>;
  }

  return (
    <main style={{ padding: 24, maxWidth: 920 }}>
      <header style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <div style={{ color: "#64748b", fontSize: 13 }}>自动化</div>
        <h1 style={{ margin: 0, fontSize: 28 }}>{automation.title}</h1>
        <div style={{ color: "#475569" }}>
          {automation.status} · {automation.runStatus ?? "idle"} ·{" "}
          {automation.trigger?.type === "cron" ? automation.trigger.expression : ""}
        </div>
      </header>

      <section style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <div>下次执行：{formatTime(automation.trigger?.nextWakeAt)}</div>
        <div>上次执行：{formatTime(automation.lastRunAt)}</div>
        {automation.lastRunDialogKey && (
          <div>
            最近一次运行：
            <Link to={buildDialogUrl(automation.lastRunDialogKey, spaceId)}>
              {automation.lastRunDialogKey}
            </Link>
          </div>
        )}
        {automation.lastRunError && (
          <div style={{ color: "#b91c1c" }}>最近错误：{automation.lastRunError}</div>
        )}
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>指令</h2>
        <div style={{ whiteSpace: "pre-wrap", color: "#334155" }}>
          {automation.instruction}
        </div>
      </section>
    </main>
  );
};

export default TaskPage;
