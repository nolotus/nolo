import "./AgentInboxPage.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "app/routing";
import { LuArrowLeft, LuInbox, LuMail, LuRefreshCw, LuX } from "react-icons/lu";
import { useAppSelector } from "app/store";
import { selectById } from "database/dbSlice";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useToken } from "identity";
import { useFetchData } from "app/hooks";
import { Agent } from "app/types";
import Button from "render/web/ui/Button";
import PageLoading from "render/web/ui/PageLoading";
import type { EmailRecord } from "database/email";
import {
  buildAgentEmailBindingSummary,
  formatDateValue,
} from "./agentDisplayUtils";
import { listAgentInboxEmails } from "app/email/agentEmailRpc";
import { toErrorMessage } from "core/errorMessage";
import { isRecord } from "core/isRecord";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedString } from "core/trimmedString";

interface AgentInboxPageProps {
  agentKey?: string;
}

const formatParticipant = (value?: { email?: string; name?: string }) => {
  const email = asTrimmedString(value?.email);
  const name = asTrimmedString(value?.name);
  if (name && email) return `${name} <${email}>`;
  return email || name || "—";
};

const isEmailRecord = (value: unknown): value is EmailRecord =>
  isRecord(value) && typeof value.subject === "string";

const AgentInboxPage = ({ agentKey: agentKeyProp }: AgentInboxPageProps) => {
  const params = useParams() as Record<string, string | undefined>;
  const agentPageKey = params.agentPageKey;
  const agentKey =
    asOptionalTrimmedString(agentKeyProp) ??
    asOptionalTrimmedString(agentPageKey) ??
    "";
  const server = useAppSelector(selectCurrentServer);
  const token = useToken();
  const item = useAppSelector((state) => selectById(state, agentKey)) as Agent | undefined;

  const { isLoading: isAgentLoading } = useFetchData<Agent>(agentKey);

  const agentAuthorityServer =
    item?.authorityServer || item?.originServer || server || "";
  const emailBinding = useMemo(
    () =>
      buildAgentEmailBindingSummary(
        item as Agent & { meta?: Record<string, unknown> }
      ),
    [item]
  );
  const primaryMailbox = emailBinding.primaryEmail || emailBinding.identities[0]?.emailAddress;

  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);

  const loadInbox = useCallback(async () => {
    if (!primaryMailbox) return;
    if (!agentAuthorityServer || !token) {
      setInboxError("请先登录后再查看收件箱。");
      return;
    }
    setInboxLoading(true);
    setInboxError(null);
    try {
      const payload = await listAgentInboxEmails({
        serverOrigin: agentAuthorityServer,
        token,
        agentId: agentKey,
        limit: 50,
      });
      const rows = Array.isArray(payload) ? payload.filter(isEmailRecord) : [];
      setEmails(rows);
    } catch (error: unknown) {
      setInboxError(toErrorMessage(error));
      setEmails([]);
    } finally {
      setInboxLoading(false);
    }
  }, [agentAuthorityServer, agentKey, primaryMailbox, token]);

  useEffect(() => {
    if (!primaryMailbox) return;
    void loadInbox();
  }, [loadInbox, primaryMailbox]);

  if (!agentKey) {
    return (
      <div className="agent-inbox-page">
        <div className="agent-inbox-page__container">
          <p>无效的 Agent 链接。</p>
        </div>
      </div>
    );
  }

  if (isAgentLoading && !item) {
    return (
      <div className="agent-inbox-page">
        <PageLoading />
      </div>
    );
  }

  const agentName = asOptionalTrimmedString(item?.name) ?? agentKey;

  return (
    <div className="agent-inbox-page">
      <div className="agent-inbox-page__container">
        <header className="agent-inbox-page__header">
          <Link to={`/${agentKey}`} className="agent-inbox-page__back">
            <LuArrowLeft size={16} aria-hidden="true" />
            <span>返回 Agent</span>
          </Link>
          <div className="agent-inbox-page__title-row">
            <LuInbox size={20} aria-hidden="true" />
            <div>
              <h1 className="agent-inbox-page__title">{agentName} · 收件箱</h1>
              {primaryMailbox ? (
                <p className="agent-inbox-page__mailbox">{primaryMailbox}</p>
              ) : null}
            </div>
          </div>
          {primaryMailbox ? (
            <Button
              variant="secondary"
              size="small"
              onClick={() => void loadInbox()}
              disabled={inboxLoading}
              icon={<LuRefreshCw size={14} />}
            >
              {inboxLoading ? "刷新中…" : "刷新"}
            </Button>
          ) : null}
        </header>

        {!primaryMailbox ? (
          <section className="agent-inbox-page__empty">
            <LuMail size={28} aria-hidden="true" />
            <p>该 Agent 尚未绑定受控域名邮箱，绑定后才会出现收件箱。</p>
            <Link to={`/${agentKey}`}>回到 Agent 详情查看邮箱绑定</Link>
          </section>
        ) : inboxError ? (
          <section className="agent-inbox-page__empty agent-inbox-page__empty--error">
            <p>{inboxError}</p>
            <Button variant="secondary" size="small" onClick={() => void loadInbox()}>
              重试
            </Button>
          </section>
        ) : inboxLoading && emails.length === 0 ? (
          <PageLoading />
        ) : emails.length === 0 ? (
          <section className="agent-inbox-page__empty">
            <p>收件箱暂无邮件。</p>
          </section>
        ) : (
          <ul className="agent-inbox-page__list">
            {emails.map((mail) => (
              <li key={mail.dbKey}>
                <button
                  type="button"
                  className="agent-inbox-page__item agent-inbox-page__item--clickable"
                  onClick={() => setSelectedEmail(mail)}
                >
                  <div className="agent-inbox-page__item-head">
                    <span className="agent-inbox-page__subject">
                      {asOptionalTrimmedString(mail.subject) ?? "（无主题）"}
                    </span>
                    <time className="agent-inbox-page__time">
                      {formatDateValue(mail.updatedAt || mail.createdAt, "MM-dd HH:mm")}
                    </time>
                  </div>
                  <p className="agent-inbox-page__from">
                    来自 {formatParticipant(mail.from)}
                  </p>
                  {mail.text?.trim() ? (
                    <p className="agent-inbox-page__preview">{mail.text.trim()}</p>
                  ) : mail.html?.trim() ? (
                    <p className="agent-inbox-page__preview">（HTML 邮件）</p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedEmail ? (
          <div className="agent-inbox-page__detail">
            <div className="agent-inbox-page__detail-toolbar">
              <button
                type="button"
                className="agent-inbox-page__back"
                onClick={() => setSelectedEmail(null)}
              >
                <LuArrowLeft size={16} aria-hidden="true" />
                <span>返回列表</span>
              </button>
              <button
                type="button"
                className="agent-inbox-page__detail-close"
                onClick={() => setSelectedEmail(null)}
                aria-label="关闭详情"
              >
                <LuX size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="agent-inbox-page__detail-head">
              <h2 className="agent-inbox-page__detail-subject">
                {asOptionalTrimmedString(selectedEmail.subject) ?? "（无主题）"}
              </h2>
              <div className="agent-inbox-page__detail-meta">
                <span className="agent-inbox-page__detail-from">
                  来自 {formatParticipant(selectedEmail.from)}
                </span>
                <time className="agent-inbox-page__detail-time">
                  {formatDateValue(selectedEmail.updatedAt || selectedEmail.createdAt, "yyyy-MM-dd HH:mm")}
                </time>
              </div>
              {selectedEmail.to?.length ? (
                <p className="agent-inbox-page__detail-to">
                  收件人 {selectedEmail.to.map(formatParticipant).join(", ")}
                </p>
              ) : null}
            </div>
            <div className="agent-inbox-page__detail-body">
              {selectedEmail.text?.trim() ? (
                <pre className="agent-inbox-page__detail-text">{selectedEmail.text}</pre>
              ) : selectedEmail.html?.trim() ? (
                <iframe
                  className="agent-inbox-page__detail-html"
                  title={
                    asOptionalTrimmedString(selectedEmail.subject) ?? "邮件正文"
                  }
                  sandbox=""
                  srcDoc={selectedEmail.html}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <p className="agent-inbox-page__detail-empty">（无正文内容）</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AgentInboxPage;