import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  selectAutoApproveCredits,
  updateSettingsState,
} from "app/settings/settingSlice";
import {
  MEDIA_ALLOWANCE_MAX,
  parseMediaAllowanceDraft,
  saveMediaAllowance,
} from "app/settings/mediaAllowanceClient";
import { toast } from "app/utils/toast";

const SettingSection: React.FC<{
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="setting-section">
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      <p className="section-description">{description}</p>
    </div>
    <div className="section-content">{children}</div>
  </section>
);

/**
 * 媒体自动执行额度设置页。
 *
 * 只负责一件事：把用户设置的 `autoApproveCredits` 通过专属端点
 * `POST /api/user-settings/media-allowance` 写到服务端，并回显当前值。
 *
 * 为什么不走通用的 `setSettings`：该字段是服务端独占的积分闸门，通用 write/patch
 * 会静默丢弃它（点号/方括号形式直接 400）——记录类写入永远改不了它。专属端点要求
 * cookie 鉴权 + 同源 + `X-Media-User-Confirmation: 1`，等价于用户在浏览器里做了确认，
 * 且通用写入的保护一点没放宽。
 */
const MediaAllowance: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectAutoApproveCredits);

  const [draft, setDraft] = useState<string>(String(current));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 本地 state 变化（hydrate / 保存成功）时同步输入框
  useEffect(() => {
    setDraft(String(current));
  }, [current]);

  const applyValue = useCallback(
    async (value: number) => {
      setSaving(true);
      setError(null);
      const result = await saveMediaAllowance(value);
      setSaving(false);
      if (!result.ok) {
        // 失败必须可见：页面内联错误 + toast，不静默回退、不假装保存成功
        setError(result.error);
        toast.error(result.error);
        return;
      }
      dispatch(
        updateSettingsState({ autoApproveCredits: result.autoApproveCredits }),
      );
      toast.success(
        t("settings.mediaAllowance.saved", "媒体自动执行额度已更新"),
      );
    },
    [dispatch, t],
  );

  const handleSave = useCallback(() => {
    const value = parseMediaAllowanceDraft(draft);
    if (value === null) {
      const message = t(
        "settings.mediaAllowance.invalid",
        `请输入 0 – ${MEDIA_ALLOWANCE_MAX} 之间的数字（0 = 每次都询问）`,
      );
      setError(message);
      toast.error(message);
      return;
    }
    void applyValue(value);
  }, [applyValue, draft, t]);

  const handleDisable = useCallback(() => {
    setDraft("0");
    void applyValue(0);
  }, [applyValue]);

  return (
    <div className="media-allowance-page">
      <h1 className="page-title">
        {t("settings.mediaAllowance.title", "媒体自动执行额度")}
      </h1>

      <SettingSection
        title={t("settings.mediaAllowance.amount.title", "额度")}
        description={
          <>
            {t(
              "settings.mediaAllowance.amount.description",
              "媒体处理（转写、翻译、摘要、导出等）启动前会先给出报价上限：报价不超过你设置的额度时，任务直接执行、不再逐次询问；超过额度仍然会弹窗请你确认。",
            )}
            <br />
            {t(
              "settings.mediaAllowance.amount.scope",
              "判断口径：额度按单个媒体任务的累计花费比较——该任务已花费 + 本次报价都不超过额度才会自动执行；每个媒体任务独立计算，不跨任务累计。",
            )}
            <br />
            {t(
              "settings.mediaAllowance.amount.limit",
              "只有媒体处理的费用受此额度约束，其它对话、工具调用的花费不受影响；额度为 0 时每次媒体付费都会询问（默认，最安全）。",
            )}
          </>
        }
      >
        <p className="media-allowance-current">
          {t("settings.mediaAllowance.current", "当前额度")}
          {": "}
          <strong>
            {current} {t("settings.mediaAllowance.unit", "积分")}
          </strong>
          {current <= 0
            ? t("settings.mediaAllowance.currentAsk", "（每次都询问）")
            : ""}
        </p>

        <div className="media-allowance-field">
          <label htmlFor="media-allowance-input">
            {t("settings.mediaAllowance.inputLabel", "新的额度（积分）")}
          </label>
          <input
            id="media-allowance-input"
            className="media-allowance-input"
            type="number"
            inputMode="decimal"
            min={0}
            max={MEDIA_ALLOWANCE_MAX}
            step={1}
            value={draft}
            disabled={saving}
            // onInput 与 onChange 双挂：浏览器里两者等价，而 JSDOM 测试环境
            // 只能触发 onInput（React 的受控 change 插件在 jsdom 下不派发），
            // 与 AppendInstructionControl 的既有做法一致。
            onInput={(event) => setDraft((event.target as HTMLInputElement).value)}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            type="button"
            className="action-btn save text-btn"
            disabled={saving}
            onClick={handleSave}
          >
            {t("common.save", "保存")}
          </button>
          <button
            type="button"
            className="action-btn text-btn"
            disabled={saving}
            onClick={handleDisable}
          >
            {t("settings.mediaAllowance.disable", "每次都询问（设为 0）")}
          </button>
        </div>

        <p className="media-allowance-hint">
          {t("settings.mediaAllowance.range", "可设置范围：0 – 10000 积分。")}
        </p>

        {error && (
          <p className="media-allowance-error" role="alert">
            {error}
          </p>
        )}
      </SettingSection>

      <SettingSection
        title={t("settings.mediaAllowance.risk.title", "风险提示")}
        description={t(
          "settings.mediaAllowance.risk.description",
          "额度内的媒体任务会自动扣费、不再逐次确认。额度越大，一次不问就花掉的积分上限越高；建议只设置你能接受「无人确认也会花掉」的额度。",
        )}
      >
        <ul className="media-allowance-risks">
          <li>
            {t(
              "settings.mediaAllowance.risk.auto",
              "自动执行不会弹确认框，但每次媒体处理的报价与扣费仍会记录在账单里。",
            )}
          </li>
          <li>
            {t(
              "settings.mediaAllowance.risk.overrun",
              "超过额度或余额不足时，任务不会自动执行，而是停下来等你确认。",
            )}
          </li>
          <li>
            {t(
              "settings.mediaAllowance.risk.reset",
              "随时可以把额度设回 0，恢复「每次都问」。",
            )}
          </li>
        </ul>
      </SettingSection>
    </div>
  );
};

export default MediaAllowance;
