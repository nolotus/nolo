import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Agent } from "app/types";
import { TextArea } from "render/web/form/TextArea";
import { NumberField } from "render/web/form/NumberField";
import Button from "render/web/ui/Button";
import { Dialog } from "render/web/ui/modal/Dialog";
import { Switch } from "render/web/ui/Switch";
import {
  LuCircleAlert,
  LuCircleCheck,
  LuCoins,
  LuEye,
  LuGlobe,
  LuLockKeyhole,
  LuMessageSquare,
  LuRocket,
  LuShieldCheck,
  LuUsers,
} from "react-icons/lu";
import WhitelistInput from "./WhitelistInput";
import AgentAvatar from "./AgentAvatar";
import "./AgentPublishDialog.css";

export interface AgentPublishSettings {
  isPublic: boolean;
  whitelist: string[];
  introduction: string;
  inputPrice: number;
  outputPrice: number;
}

interface AgentPublishDialogProps {
  agent: Agent;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (settings: AgentPublishSettings) => Promise<void>;
}

type PreflightItem = {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
};

export default function AgentPublishDialog({
  agent,
  isOpen,
  isSaving,
  onClose,
  onSave,
}: AgentPublishDialogProps) {
  const { t } = useTranslation("ai");
  const [isPublic, setIsPublic] = useState(false);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [introduction, setIntroduction] = useState("");
  const [inputPrice, setInputPrice] = useState(0);
  const [outputPrice, setOutputPrice] = useState(0);

  const canPublishPublic = agent.apiSource === "platform";
  const showPricing = agent.apiSource !== "cli";

  useEffect(() => {
    if (!isOpen) return;
    setIsPublic(Boolean(agent.isPublic));
    setWhitelist(agent.whitelist ?? []);
    setIntroduction(agent.introduction ?? "");
    setInputPrice(Number(agent.inputPrice) || 0);
    setOutputPrice(Number(agent.outputPrice) || 0);
  }, [agent, isOpen]);

  const preflightItems = useMemo<PreflightItem[]>(
    () => [
      {
        id: "name",
        label: t("publish.preflight.name.label", "展示名称"),
        detail: agent.name?.trim()
          ? t("publish.preflight.name.configured", "名称已配置")
          : t("publish.preflight.name.missing", "请先在模型设置中填写名称"),
        passed: Boolean(agent.name?.trim()),
      },
      {
        id: "introduction",
        label: t("publish.preflight.introduction.label", "公开介绍"),
        detail: introduction.trim()
          ? t("publish.preflight.introduction.chars", "{{count}} 个字符", {
              count: introduction.trim().length,
            })
          : t(
              "publish.preflight.introduction.missing",
              "发布前需要一段清楚的公开介绍",
            ),
        passed: Boolean(introduction.trim()),
      },
      {
        id: "runtime",
        label: t("publish.preflight.runtime.label", "公开运行渠道"),
        detail: canPublishPublic
          ? t("publish.preflight.runtime.platform", "平台 API 可由其他用户直接使用")
          : t(
              "publish.preflight.runtime.local",
              "本机 CLI 或自定义 API 无法公开到市场",
            ),
        passed: canPublishPublic,
      },
    ],
    [agent.name, canPublishPublic, introduction, t],
  );

  const failedChecks = preflightItems.filter((item) => !item.passed).length;
  const publicReady = failedChecks === 0;

  const previewPriceLabel =
    outputPrice > 0
      ? t("publish.preview.price", "输出 1M / {{price}} 积分", {
          price: outputPrice,
        })
      : t("publish.preview.free", "免费使用");

  const actions = (
    <>
      <span className="agent-publish-dialog__footer-note">
        {t("publish.footer.note", "保存后立即更新访问方式与计费信息")}
      </span>
      <div className="agent-publish-dialog__footer-actions">
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          {t("publish.footer.cancel", "取消")}
        </Button>
        <Button
          variant="primary"
          onClick={() =>
            onSave({
              isPublic,
              whitelist,
              introduction: introduction.trim(),
              inputPrice,
              outputPrice,
            })
          }
          loading={isSaving}
          disabled={isSaving}
          icon={<LuRocket size={16} />}
        >
          {t("publish.footer.save", "保存发布设置")}
        </Button>
      </div>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("publish.title", "发布设置")}
      icon={<LuRocket size={16} />}
      className="agent-publish-dialog"
      bodyClassName="agent-publish-dialog__body"
      width="min(980px, calc(100vw - 48px))"
      actions={actions}
    >
      <div className="agent-publish-dialog__layout">
        <div className="agent-publish-dialog__form-column">
          {/* 1. 谁可以使用 */}
          <section className="agent-publish-dialog__section">
            <div className="agent-publish-dialog__status-card">
              <span
                className={`agent-publish-dialog__status-icon ${
                  isPublic ? "is-public" : "is-private"
                }`}
                aria-hidden="true"
              >
                {isPublic ? <LuGlobe size={20} /> : <LuLockKeyhole size={20} />}
              </span>
              <div className="agent-publish-dialog__status-copy">
                <strong>
                  {isPublic
                    ? t("publish.status.public", "已公开到市场")
                    : t("publish.status.private", "仅自己可见")}
                </strong>
                <span>
                  {isPublic
                    ? t(
                        "publish.status.publicHint",
                        "登录用户可以搜索、查看并使用这个智能体。",
                      )
                    : t(
                        "publish.status.privateHint",
                        "设置可以先保存，准备好后再公开。",
                      )}
                </span>
              </div>
              <Switch
                checked={isPublic}
                onChange={setIsPublic}
                disabled={!canPublishPublic}
                aria-label={t("publish.status.switchAria", "公开到智能体市场")}
              >
                {isPublic
                  ? t("publish.status.publicLabel", "公开")
                  : t("publish.status.privateLabel", "私有")}
              </Switch>
            </div>
            {!canPublishPublic && (
              <div className="agent-publish-dialog__runtime-note" role="note">
                <LuCircleAlert size={16} aria-hidden="true" />
                <span>
                  {t(
                    "publish.status.runtimeNote",
                    "当前运行方式（本机 CLI / 自定义 API）只能私有使用，切换到平台 API 后才可以公开。",
                  )}
                </span>
              </div>
            )}
          </section>

          {/* 2. 公开介绍 */}
          <section className="agent-publish-dialog__section">
            <div className="agent-publish-dialog__section-heading">
              <span className="agent-publish-dialog__section-icon">
                <LuGlobe size={16} />
              </span>
              <div>
                <h3>{t("publish.introduction.heading", "公开介绍")}</h3>
                <p>
                  {t(
                    "publish.introduction.hint",
                    "这段文字会直接出现在右侧的市场卡片上。",
                  )}
                </p>
              </div>
            </div>
            <TextArea
              aria-label={t("publish.introduction.label", "公开介绍")}
              value={introduction}
              onChange={(event) => setIntroduction(event.target.value)}
              placeholder={t(
                "publish.introduction.placeholder",
                "一句话说明它擅长什么、适合谁使用…",
              )}
              rows={4}
              maxLength={500}
              helperText={`${introduction.length} / 500`}
            />
          </section>

          {/* 3. 使用计费 */}
          {showPricing && (
            <section className="agent-publish-dialog__section">
              <div className="agent-publish-dialog__section-heading">
                <span className="agent-publish-dialog__section-icon">
                  <LuCoins size={16} />
                </span>
                <div>
                  <h3>{t("publish.pricing.heading", "使用计费")}</h3>
                  <p>
                    {t(
                      "publish.pricing.hint",
                      "按每百万 Token 设置积分价格，0 表示免费。",
                    )}
                  </p>
                </div>
              </div>
              <div className="agent-publish-dialog__price-grid">
                <NumberField
                  label={t("publish.pricing.inputLabel", "输入价格")}
                  value={inputPrice}
                  onChange={(value) => setInputPrice(Math.max(0, value))}
                  minValue={0}
                  step={0.01}
                  formatOptions={{ maximumFractionDigits: 4 }}
                  description={t(
                    "publish.pricing.unit",
                    "积分 / 百万 Token",
                  )}
                  aria-label={t(
                    "publish.pricing.inputAria",
                    "输入 Token 价格，积分每百万 Token",
                  )}
                />
                <NumberField
                  label={t("publish.pricing.outputLabel", "输出价格")}
                  value={outputPrice}
                  onChange={(value) => setOutputPrice(Math.max(0, value))}
                  minValue={0}
                  step={0.01}
                  formatOptions={{ maximumFractionDigits: 4 }}
                  description={t(
                    "publish.pricing.unit",
                    "积分 / 百万 Token",
                  )}
                  aria-label={t(
                    "publish.pricing.outputAria",
                    "输出 Token 价格，积分每百万 Token",
                  )}
                />
              </div>
            </section>
          )}

          {/* 4. 访问控制 */}
          <section className="agent-publish-dialog__section">
            <div className="agent-publish-dialog__section-heading">
              <span className="agent-publish-dialog__section-icon">
                <LuUsers size={16} />
              </span>
              <div>
                <h3>{t("publish.access.heading", "访问控制")}</h3>
                <p>
                  {t(
                    "publish.access.hint",
                    "留空代表所有可见用户都能使用；添加后仅名单内用户可用。",
                  )}
                </p>
              </div>
            </div>
            <WhitelistInput value={whitelist} onChange={setWhitelist} />
          </section>
        </div>

        <aside
          className="agent-publish-dialog__side"
          aria-label={t("publish.preview.aside", "发布预览与检查")}
        >
          {/* 市场卡片实时预览：所见即所得 */}
          <div className="agent-publish-dialog__preview">
            <div className="agent-publish-dialog__preview-label">
              <LuEye size={14} aria-hidden="true" />
              <span>{t("publish.preview.label", "市场卡片预览")}</span>
            </div>
            <div
              className={`agent-publish-dialog__preview-card ${
                isPublic ? "" : "is-dimmed"
              }`}
            >
              <div className="agent-publish-dialog__preview-head">
                <AgentAvatar agent={agent} size={40} avatarSize="large" />
                <div className="agent-publish-dialog__preview-title">
                  <strong>
                    {agent.name?.trim() ||
                      t("publish.preview.unnamed", "未命名智能体")}
                  </strong>
                  <span className="agent-publish-dialog__preview-price">
                    {previewPriceLabel}
                  </span>
                </div>
              </div>
              <p className="agent-publish-dialog__preview-intro">
                {introduction.trim() ||
                  t(
                    "publish.preview.emptyIntro",
                    "公开介绍还没填写，卡片上会显示为空白。",
                  )}
              </p>
              <span
                className="agent-publish-dialog__preview-cta"
                aria-hidden="true"
              >
                <LuMessageSquare size={13} />
                {t("publish.preview.cta", "开聊")}
              </span>
            </div>
            {!isPublic && (
              <p className="agent-publish-dialog__preview-hint">
                {t(
                  "publish.preview.privateHint",
                  "当前为私有，市场里不会出现这张卡片。",
                )}
              </p>
            )}
          </div>

          <div
            className="agent-publish-dialog__preflight"
            aria-label={t("publish.preflight.aside", "发布前检查")}
          >
            <div className="agent-publish-dialog__preflight-heading">
              <span className="agent-publish-dialog__section-icon">
                <LuShieldCheck size={16} />
              </span>
              <div>
                <h3>{t("publish.preflight.heading", "发布前检查")}</h3>
                <p>{t("publish.preflight.hint", "基于当前设置实时更新。")}</p>
              </div>
            </div>

            <div className="agent-publish-dialog__check-list">
              {preflightItems.map((item) => (
                <div
                  key={item.id}
                  className={`agent-publish-dialog__check ${
                    item.passed ? "is-passed" : "is-pending"
                  }`}
                >
                  {item.passed ? (
                    <LuCircleCheck size={16} aria-hidden="true" />
                  ) : (
                    <LuCircleAlert size={16} aria-hidden="true" />
                  )}
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`agent-publish-dialog__summary ${
                publicReady ? "is-ready" : "is-pending"
              }`}
            >
              <strong>
                {publicReady
                  ? t("publish.summary.ready", "可以公开发布")
                  : t("publish.summary.pending", "建议先处理 {{count}} 项", {
                      count: failedChecks,
                    })}
              </strong>
              <span>
                {publicReady
                  ? t("publish.summary.readyHint", "开启公开后，保存即可更新市场状态。")
                  : t(
                      "publish.summary.pendingHint",
                      "这些提示不会阻止保存，公开前补齐会有更好的展示效果。",
                    )}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </Dialog>
  );
}
