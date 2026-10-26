// packages/app/settings/web/EmailPreferences.tsx
//
// 邮件偏好独立设置页。首屏只放四样东西：
//   ① 总控块（暂停可选邮件；块内一行小字说明账户/交易通知不受该开关影响）
//   ② 回归邀请开关  ③ 余额不足提醒开关  ④ 余额提醒门槛输入
// 底部另有「高级：自定义标签」折叠区（真实可用的控制能力，默认收起）。
// 不可关闭的通知（充值结果、账号状态、欢迎邮件）不提供任何清单/说明区——
// 它们没有可操作项，不改变任何决定；唯一会误导用户的是总控开关"覆盖全部邮件"
// 的措辞，所以只在那个开关旁边给一句纠正。

import React, { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuWallet,
  LuClipboard,
  LuChevronRight,
  LuPencil,
  LuCheck,
  LuX,
} from "react-icons/lu";

import { useAppSelector } from "app/store";
import { selectRemoteServer } from "app/settings/settingSlice";
import { useCurrentUser, useToken } from "identity";
import { toast } from "app/utils/toast";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import {
  EMAIL_NOTIFICATION_TAGS,
  isLockedEmailTag,
  isTransactionalEmailTag,
  type EmailNotificationTagDefinition,
} from "core/emailNotificationTags";
import { USER_EMAIL_PREFERENCE_ENDPOINTS } from "app/email/emailApiRoutes";
import "./EmailPreferences.css";

// 余额提醒门槛：0–100 积分（user.balance 同为积分，口径 ¥1 = 1 积分），null = 沿用全局默认
// 默认值不在前端硬编码：GET 响应里的 lowBalanceThresholdDefault 才是当前生效值，
// 显示与说明都从它来，避免界面承诺的「默认 X」与服务端实际行为脱钩。
const LOW_BALANCE_THRESHOLD_MIN = 0;
const LOW_BALANCE_THRESHOLD_MAX = 100;

type EmailPrefs = {
  emailOptOutAll: boolean;
  emailOptOutTags: string[];
  emailLowBalanceThreshold: number | null;
};

// 积分不是货币：只做数值格式化，不加货币符号
const formatCreditsAmount = (amount: number): string => {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};

// 服务端返回的门槛：null/缺失 = 未覆盖（沿用默认）；无法解析的数字按未覆盖处理
const fromServerThreshold = (raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(value) ? value : null;
};

type ThresholdInputResult =
  | { ok: true; value: number | null }
  | { ok: false; reason: "invalid" | "outOfRange" };

// 用户输入解析：留空 → null（恢复默认）；否则必须是 0–100 的十进制积分数
const parseLowBalanceThresholdInput = (raw: string): ThresholdInputResult => {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  // 只接受纯十进制，避免 Number("")/Number("1e3")/Number("5abc") 之类的宽松解析
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) return { ok: false, reason: "invalid" };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < LOW_BALANCE_THRESHOLD_MIN || value > LOW_BALANCE_THRESHOLD_MAX) {
    return { ok: false, reason: "outOfRange" };
  }
  return { ok: true, value };
};

// 后端尚未回传该字段时（例如并行上线期），保留当前值，避免刚保存就被显示回默认
const toEmailPrefs = (data: any, fallback?: EmailPrefs): EmailPrefs => ({
  emailOptOutAll: Boolean(data?.emailOptOutAll),
  emailOptOutTags: Array.isArray(data?.emailOptOutTags) ? data.emailOptOutTags : [],
  emailLowBalanceThreshold:
    data && typeof data === "object" && "emailLowBalanceThreshold" in data
      ? fromServerThreshold(data.emailLowBalanceThreshold)
      : fallback?.emailLowBalanceThreshold ?? null,
});

// ── 邮件通知开关 ──────────────────────────────────────────
// 标签清单唯一真值在 core/emailNotificationTags.ts：这里只做分组标题映射，
// 不复制任何 tag 字符串数组，避免界面开关与退订白名单漂移。
const EMAIL_GROUP_ORDER = ["onboarding", "retention"] as const;

type SwitchableEmailGroup = (typeof EMAIL_GROUP_ORDER)[number];

const EMAIL_GROUP_TITLES: Record<SwitchableEmailGroup, { key: string; title: string }> = {
  onboarding: { key: "userProfile.emailNotifications.groups.onboarding", title: "产品引导" },
  retention: { key: "userProfile.emailNotifications.groups.retention", title: "挽回与提醒" },
};

// ── 首屏开关的筛选（UI 唯一真值） ────────────────────────
// 标签清单唯一真值仍在 core/emailNotificationTags.ts：这里不复制 tag 数组，
// 只按清单属性筛出「关掉它会真的改变后续行为」的标签，避免 UI 里散落
// `id === "..."` 判断：只有可关闭 + 会重复发生的标签才配一个常驻开关；
// 交易性、locked（注册欢迎邮件）与一次性通知都不进首屏（没有可操作项）。
const isSwitchableEmailTag = (tag: EmailNotificationTagDefinition): boolean =>
  !tag.transactional && !tag.locked && tag.recurring;

// 首屏可管理的开关（按分组）；分组内没有开关则整组不渲染
const SWITCHABLE_EMAIL_GROUPS = EMAIL_GROUP_ORDER.map((group) => ({
  group,
  tags: EMAIL_NOTIFICATION_TAGS.filter(
    (tag) => isSwitchableEmailTag(tag) && tag.group === group
  ),
})).filter((entry) => entry.tags.length > 0);

// 唯一例外：余额门槛输入要挂在「余额不足提醒」这一项下面
const LOW_BALANCE_REMINDER_TAG = "low-balance-reminder";

// tag → i18n key 前缀：signup-welcome → userProfile.emailTags.signup-welcome
const emailTagKey = (tagId: string): string => "userProfile.emailTags." + tagId;

// 可编辑行：与 UserProfile.tsx 的 EditableProfileItem 同构，本地保留副本，
// 避免两个懒加载设置页互相静态依赖（见 UserProfile 顶部 chunk 事故注释）。
const EditableEmailItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  /** 只用于非编辑态的展示文案（如空值显示「默认 X」），不进入输入框 */
  displayValue?: string;
  /** 常显说明（解释留空/默认的含义），编辑态也显示 */
  hint?: string;
  /** 返回错误文案时不提交、保持编辑态，并把文案显示在输入框下方 */
  validate?: (raw: string) => string | null;
  /** 其它保存请求进行中时禁用本行，避免并发整份快照互覆盖 */
  disabled?: boolean;
}> = ({ icon, label, value, onSave, placeholder, displayValue, hint, validate, disabled = false }) => {
  const { t } = useTranslation();
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 错误与说明都挂到输入框上，读屏聚焦时能念出来；错误优先，两者并存时都念
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  useEffect(() => {
    setTempValue(value || "");
  }, [value]);

  const handleSave = async () => {
    if (tempValue === (value || "")) {
      setIsEditing(false);
      setError(null);
      return;
    }
    // 先校验再提交：非法输入保持编辑态并就地报错，不静默丢弃用户输入
    const validationError = validate ? validate(tempValue) : null;
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave(tempValue);
      setIsEditing(false);
    } catch {
      // onSave 内部已 toast 反馈；这里保持编辑态，避免用户输入被吞掉
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-item">
      <div className="profile-item-main">
        <div className="profile-item-icon">{icon}</div>
        <div className="profile-item-content">
          <span className="profile-item-label">{label}</span>
          {isEditing ? (
            <>
              <input
                autoFocus
                id={fieldId}
                className="profile-item-input"
                value={tempValue}
                onChange={(e) => {
                  setTempValue(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder={placeholder}
                disabled={isSaving || disabled}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
              />
              {error && (
                <span
                  id={errorId}
                  className="profile-item-subtext media-allowance-error"
                  role="alert"
                >
                  {error}
                </span>
              )}
              {hint && (
                <span id={hintId} className="profile-item-subtext">
                  {hint}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="profile-item-value">
                {displayValue ?? (value || placeholder || t("userProfile.profileItem.notSet", "未设置"))}
              </span>
              {hint && (
                <span id={hintId} className="profile-item-subtext">
                  {hint}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="profile-item-actions">
        {isEditing ? (
          <>
            <button
              type="button"
              className="action-btn save"
              onClick={handleSave}
              disabled={isSaving || disabled}
              title={t("userProfile.profileItem.save", "保存")}
              aria-label={t("userProfile.profileItem.save", "保存")}
            >
              {isSaving ? (
                <div className="spinner-small" aria-hidden="true" />
              ) : (
                <LuCheck size={18} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="action-btn cancel"
              onClick={() => setIsEditing(false)}
              disabled={isSaving || disabled}
              title={t("userProfile.profileItem.cancel", "取消")}
              aria-label={t("userProfile.profileItem.cancel", "取消")}
            >
              <LuX size={18} aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="action-btn"
            onClick={() => setIsEditing(true)}
            disabled={disabled}
            title={t("userProfile.profileItem.edit", "编辑")}
            aria-label={t("userProfile.profileItem.edit", "编辑")}
          >
            <LuPencil size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

// 开关：原生 button + role="switch"，键盘/读屏可用；样式内联，避免新增 CSS 文件
const NotificationSwitch: React.FC<{
  label: string;
  checked: boolean;
  onChange: () => void;
  pending?: boolean;
  disabled?: boolean;
}> = ({ label, checked, onChange, pending = false, disabled = false }) => {
  const blocked = pending || disabled;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={pending || undefined}
      disabled={blocked}
      onClick={onChange}
      style={{
        width: 44,
        height: 24,
        flexShrink: 0,
        borderRadius: 999,
        border: "none",
        padding: 2,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        cursor: blocked ? "not-allowed" : "pointer",
        opacity: blocked ? 0.6 : 1,
        backgroundColor: checked
          ? "var(--primary, #2563eb)"
          : "var(--backgroundTertiary, #d4d4d8)",
        transition: "background-color 0.2s ease",
      }}
    >
      <span
        style={{
          display: "block",
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: "#fff",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.25)",
          transform: checked ? "translateX(20px)" : "none",
          transition: "transform 0.2s ease",
        }}
      />
    </button>
  );
};

const NotificationRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  pending: boolean;
  failed: boolean;
  /** 任一保存进行中：其它开关一并禁用，避免两次整份快照 PUT 互相覆盖 */
  disabled?: boolean;
  onToggle: () => void;
}> = ({ label, description, checked, pending, failed, disabled = false, onToggle }) => {
  const { t } = useTranslation();
  return (
    <div className="profile-item" style={{ flexWrap: "wrap", gap: 12 }}>
      <div className="profile-item-main">
        <div className="profile-item-content">
          <span className="profile-item-label">{label}</span>
          <span className="profile-item-subtext">{description}</span>
          {pending && (
            <span className="profile-item-subtext" role="status">
              {t("userProfile.emailNotifications.saving", "保存中…")}
            </span>
          )}
          {failed && !pending && (
            <span className="profile-item-subtext media-allowance-error" role="alert">
              {t("userProfile.emailNotifications.saveFailed", "没保存成功，开关已恢复原样，请再试一次。")}
            </span>
          )}
        </div>
      </div>
      <div className="profile-item-actions">
        <NotificationSwitch
          label={label}
          checked={checked}
          pending={pending}
          disabled={pending || disabled}
          onChange={onToggle}
        />
      </div>
    </div>
  );
};

const EmailPreferences: React.FC = () => {
  const user = useCurrentUser();
  const { t } = useTranslation();
  const currentServer = useAppSelector(selectRemoteServer);
  const currentToken = useToken();

  const userId = user?.userId;

  const [emailPrefs, setEmailPrefs] = useState<EmailPrefs>({
    emailOptOutAll: false,
    emailOptOutTags: [],
    emailLowBalanceThreshold: null,
  });
  const [emailPrefsLoading, setEmailPrefsLoading] = useState(false);
  const [emailPrefsSaving, setEmailPrefsSaving] = useState(false);
  // GET 返回的「当前生效」默认阈值：前端不硬编码，也不猜
  const [lowBalanceThresholdDefault, setLowBalanceThresholdDefault] = useState<number | null>(
    null
  );
  // 任一保存进行中 → 全页控件禁用（后端 PUT 提交整份快照，并发必丢更新）
  const emailPrefsBusy = emailPrefsLoading || emailPrefsSaving;
  const savingRef = useRef(false);
  const [pendingEmailTags, setPendingEmailTags] = useState<string[]>([]);
  const [failedEmailTag, setFailedEmailTag] = useState<string | null>(null);
  const [isAdvancedTagsOpen, setIsAdvancedTagsOpen] = useState(false);

  // 服务端给出的是「当前生效」的默认阈值；字段缺失/非法时保持 null，界面不编造数字
  const applyThresholdDefaultFromResponse = (data: any) => {
    const parsed = fromServerThreshold(data?.lowBalanceThresholdDefault);
    if (parsed !== null) setLowBalanceThresholdDefault(parsed);
  };

  useEffect(() => {
    if (!currentServer || !userId || !currentToken) return;
    let cancelled = false;
    const loadEmailPrefs = async () => {
      setEmailPrefsLoading(true);
      try {
        const res = await fetch(
          `${currentServer}${USER_EMAIL_PREFERENCE_ENDPOINTS.get.path}`,
          {
            method: USER_EMAIL_PREFERENCE_ENDPOINTS.get.method,
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setEmailPrefs(toEmailPrefs(data));
        applyThresholdDefaultFromResponse(data);
      } finally {
        if (!cancelled) setEmailPrefsLoading(false);
      }
    };
    void loadEmailPrefs();
    return () => {
      cancelled = true;
    };
  }, [currentServer, userId, currentToken]);

  const handleUpdateEmailPrefs = async (changes: Record<string, any>): Promise<boolean> => {
    // 兜底护栏：同一时刻只允许一个 PUT 在飞（控件已按 emailPrefsBusy 禁用，
    // 这里防的是同一 tick 内的连点，两次整份快照后到者会抹掉先到者）
    if (savingRef.current) return false;
    if (!currentServer || !currentToken) {
      toast.error(t("userProfile.saveFailed", "保存失败"));
      return false;
    }
    setEmailPrefsSaving(true);
    savingRef.current = true;
    try {
      const res = await fetch(
        `${currentServer}${USER_EMAIL_PREFERENCE_ENDPOINTS.update.path}`,
        {
          method: USER_EMAIL_PREFERENCE_ENDPOINTS.update.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify(changes),
        }
      );
      if (!res.ok) {
        throw new Error("update_email_preferences_failed");
      }
      const data = await res.json();
      setEmailPrefs((prev) => toEmailPrefs(data, prev));
      applyThresholdDefaultFromResponse(data);
      toast.success(t("userProfile.saveSuccess", "保存成功"));
      return true;
    } catch {
      toast.error(t("userProfile.saveFailed", "保存失败"));
      return false;
    } finally {
      savingRef.current = false;
      setEmailPrefsSaving(false);
    }
  };

  // 单个通知开关：先乐观切换，失败回滚并就地报错
  const handleToggleEmailTag = async (tag: string) => {
    if (emailPrefsBusy) return;
    const wasOptedOut = emailPrefs.emailOptOutTags.includes(tag);
    const nextTags = wasOptedOut
      ? emailPrefs.emailOptOutTags.filter((item) => item !== tag)
      : [...emailPrefs.emailOptOutTags, tag];
    // 不可关闭的通知（交易性 + locked）不写进 emailOptOutTags：
    // 顺带剔除历史遗留的这些标签
    const payload = nextTags.filter(
      (item) => !isTransactionalEmailTag(item) && !isLockedEmailTag(item)
    );

    setFailedEmailTag(null);
    setPendingEmailTags((pending) => (pending.includes(tag) ? pending : [...pending, tag]));
    setEmailPrefs((prev) => ({ ...prev, emailOptOutTags: payload }));

    try {
      const saved = await handleUpdateEmailPrefs({ emailOptOutTags: payload });
      if (!saved) {
        // 只回滚这一项，避免覆盖用户同时改动的其它开关
        setEmailPrefs((prev) => {
          const rest = prev.emailOptOutTags.filter((item) => item !== tag);
          return { ...prev, emailOptOutTags: wasOptedOut ? [...rest, tag] : rest };
        });
        setFailedEmailTag(tag);
      }
    } finally {
      setPendingEmailTags((pending) => pending.filter((item) => item !== tag));
    }
  };

  // 生效中的默认阈值（用于「留空则按默认 X」）；服务端没给就显示非数字表述
  const thresholdDefaultAmount =
    lowBalanceThresholdDefault === null ? null : formatCreditsAmount(lowBalanceThresholdDefault);

  const describeThresholdError = (reason: "invalid" | "outOfRange") =>
    reason === "outOfRange"
      ? t("userProfile.lowBalanceThreshold.outOfRange", "请输入 0 到 100 之间的积分")
      : t("userProfile.lowBalanceThreshold.invalid", "请输入积分数量，例如 5");

  return (
    <div className="email-preferences-page">
      <header className="email-preferences__header">
        <h1 className="page-title">
          {t("settings.emailPreferences.title", "邮件偏好")}
        </h1>
        <p className="email-preferences__subtitle">
          {t(
            "settings.emailPreferences.subtitle",
            "选择接收哪些邮件，或调整余额提醒门槛。"
          )}
        </p>
      </header>

      <div className="profile-section">
        {/* 总控：暂停所有可选邮件，压成一块紧凑区域（不再各占一个大行） */}
        <div className="section-group email-master-bar">
          <h3 className="email-master-bar__title">
            {t("userProfile.emailNotifications.groups.master", "总控")}
          </h3>
          <div className="email-master-bar__row">
            <span className="email-master-bar__label">
              {t("userProfile.emailNotifications.master.pauseLabel", "暂停所有可选邮件")}
            </span>
            <NotificationSwitch
              label={t("userProfile.emailNotifications.master.pauseLabel", "暂停所有可选邮件")}
              checked={emailPrefs.emailOptOutAll}
              pending={emailPrefsSaving}
              disabled={emailPrefsLoading || emailPrefsSaving}
              onChange={() => handleUpdateEmailPrefs({ emailOptOutAll: !emailPrefs.emailOptOutAll })}
            />
          </div>
          {/* 全页唯一保留的通知说明：总控开关写着"暂停所有可选邮件"，会让用户以为
              关了什么都收不到；这一行只负责纠正那个误解，不是通知清单。 */}
          <p className="email-master-bar__hint">
            {t(
              "userProfile.emailNotifications.master.accountNotice",
              "账户与交易通知（充值结果、账号状态）仍会发送，不受此开关影响。"
            )}
          </p>
        </div>

        {emailPrefs.emailOptOutAll && (
          <p className="profile-item-subtext" role="status">
            {t(
              "userProfile.emailNotifications.master.pausedHint",
              "所有可选邮件已暂停。下面的开关会照样保存，但要等总开关重新打开才生效。"
            )}
          </p>
        )}

        {/* 首屏可管理的项：按分组只渲染 switch 形态的标签 */}
        {SWITCHABLE_EMAIL_GROUPS.map((group) => (
          <div key={group.group} className="section-group">
            <h3 className="profile-item-label">
              {t(EMAIL_GROUP_TITLES[group.group].key, EMAIL_GROUP_TITLES[group.group].title)}
            </h3>
            {group.tags.map((item) => (
              <React.Fragment key={item.id}>
                <NotificationRow
                  label={t(emailTagKey(item.id) + ".label", item.id)}
                  description={t(emailTagKey(item.id) + ".description", item.id)}
                  checked={!emailPrefs.emailOptOutTags.includes(item.id)}
                  pending={pendingEmailTags.includes(item.id)}
                  failed={failedEmailTag === item.id}
                  disabled={emailPrefsBusy}
                  onToggle={() => handleToggleEmailTag(item.id)}
                />
                {item.id === LOW_BALANCE_REMINDER_TAG && (
                  <EditableEmailItem
                    icon={<LuWallet size={18} aria-hidden="true" />}
                    label={t("userProfile.lowBalanceThreshold.label", "余额提醒门槛（积分）")}
                    value={
                      emailPrefs.emailLowBalanceThreshold === null
                        ? ""
                        : String(emailPrefs.emailLowBalanceThreshold)
                    }
                    displayValue={
                      emailPrefs.emailLowBalanceThreshold === null
                        ? thresholdDefaultAmount === null
                          ? t(
                              "userProfile.lowBalanceThreshold.defaultValueUnknown",
                              "默认（系统设定）"
                            )
                          : t(
                              "userProfile.lowBalanceThreshold.defaultValue",
                              "默认 {{amount}}",
                              { amount: thresholdDefaultAmount }
                            )
                        : formatCreditsAmount(emailPrefs.emailLowBalanceThreshold)
                    }
                    hint={
                      thresholdDefaultAmount === null
                        ? t(
                            "userProfile.lowBalanceThreshold.hintNoDefault",
                            "余额低于这个积分值时给你发提醒；留空则按系统默认值。"
                          )
                        : t(
                            "userProfile.lowBalanceThreshold.hint",
                            "余额低于这个积分值时给你发提醒；留空就按默认 {{amount}}。",
                            { amount: thresholdDefaultAmount }
                          )
                    }
                    placeholder={t(
                      "userProfile.lowBalanceThreshold.placeholder",
                      "如 5（留空恢复默认）"
                    )}
                    disabled={emailPrefsBusy}
                    validate={(raw) => {
                      const parsed = parseLowBalanceThresholdInput(raw);
                      return parsed.ok ? null : describeThresholdError(parsed.reason);
                    }}
                    onSave={async (raw) => {
                      const parsed = parseLowBalanceThresholdInput(raw);
                      if (!parsed.ok) {
                        // 理论上 validate 已拦下，这里兜底避免把非法值提交给服务端
                        toast.error(describeThresholdError(parsed.reason));
                        throw new Error("invalid_low_balance_threshold");
                      }
                      // 留空 → 提交 null，清除覆盖、回到全局默认
                      const saved = await handleUpdateEmailPrefs({
                        emailLowBalanceThreshold: parsed.value,
                      });
                      if (!saved) throw new Error("update_low_balance_threshold_failed");
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        ))}

        {/* 高级：自定义标签（默认收起，视觉上明显次级） */}
        <div className="section-group email-advanced">
          <button
            type="button"
            className="email-advanced__toggle"
            aria-expanded={isAdvancedTagsOpen}
            aria-controls="email-advanced-tags"
            onClick={() => setIsAdvancedTagsOpen((open) => !open)}
          >
            <LuChevronRight
              size={16}
              aria-hidden="true"
              style={{
                transform: isAdvancedTagsOpen ? "rotate(90deg)" : "none",
                transition: "transform 0.2s ease",
              }}
            />
            {t("userProfile.emailNotifications.advancedOpen", "高级：自定义标签")}
          </button>

          {isAdvancedTagsOpen && (
            <>
              <p className="email-advanced__hint">
                {t(
                  "userProfile.emailNotifications.advancedHint",
                  "按标签逐个退订，一般不用手动改。"
                )}
              </p>
              <p className="email-advanced__hint">
                {t(
                  "userProfile.emailNotifications.advancedOneOffHint",
                  "退订一次性标签（新手指引、流程中断挽回）会真的拦住那一封；这类邮件一生只发一次，退订后不会再有别的变化。"
                )}
              </p>
              <div id="email-advanced-tags">
                <EditableEmailItem
                  icon={<LuClipboard size={18} aria-hidden="true" />}
                  label={t("userProfile.emailOptOutTags.label", "退订标签（逗号分隔）")}
                  value={emailPrefs.emailOptOutTags.join(",")}
                  onSave={async (value) => {
                    const tags = value
                      .split(",")
                      .map((tag) => asTrimmedLowercaseString(tag))
                      .filter(Boolean)
                      // 不可关闭的通知不接受退订（交易性通知 + 欢迎邮件）
                      .filter((tag) => !isTransactionalEmailTag(tag) && !isLockedEmailTag(tag));
                    const saved = await handleUpdateEmailPrefs({ emailOptOutTags: tags });
                    if (!saved) throw new Error("update_email_opt_out_tags_failed");
                  }}
                  placeholder={t("userProfile.emailOptOutTags.placeholder", "reengagement,onboarding-guide")}
                  disabled={emailPrefsBusy}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailPreferences;
