import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "app/routing";
import { CreateRoutePaths } from "create/routePaths";
import { localFirstLog } from "app/localFirst/localFirstLog";
import "./DesktopAgentOnboarding.css";

export type DesktopAgentOnboardingProps = {
  onDismiss: () => void;
};

export type DesktopOnboardingDismissReason =
  | "skip"
  | "login"
  | "signup"
  | "path-cli"
  | "path-byo"
  | "path-membership";

const LOCAL_CREATE = `/${CreateRoutePaths.CREATE_LOCAL_AGENT}`;

const DesktopAgentOnboarding = ({ onDismiss }: DesktopAgentOnboardingProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    localFirstLog("onboarding.shown", { surface: "desktop" });
  }, []);

  const dismiss = useCallback(
    (reason: DesktopOnboardingDismissReason) => {
      localFirstLog(
        reason === "skip" ? "onboarding.skip" : "onboarding.cta",
        reason === "skip"
          ? { surface: "desktop" }
          : { surface: "desktop", cta: reason },
      );
      onDismiss();
    },
    [onDismiss],
  );

  return (
    <section
      className="desktop-agent-onboarding"
      data-testid="desktop-agent-onboarding"
      aria-labelledby="desktop-agent-onboarding-title"
    >
      <div className="desktop-agent-onboarding__panel">
        <header className="desktop-agent-onboarding__header">
          <div>
            <h1
              id="desktop-agent-onboarding-title"
              className="desktop-agent-onboarding__title"
            >
              {t("localFirst.onboarding.title", "怎么开始？")}
            </h1>
            <p className="desktop-agent-onboarding__description">
              {t(
                "localFirst.onboarding.description",
                "用 Nolo 直接开始，或连接你已经在用的 AI。",
              )}
            </p>
          </div>
          <button
            type="button"
            className="desktop-agent-onboarding__skip"
            onClick={() => dismiss("skip")}
            data-testid="desktop-onboarding-skip"
          >
            {t("localFirst.onboarding.skipCta", "暂时跳过")}
          </button>
        </header>

        <div className="desktop-agent-onboarding__group">
          <p className="desktop-agent-onboarding__group-label">
            {t("localFirst.onboarding.group.nolo", "用 Nolo · 最快开始")}
          </p>
          <div className="desktop-agent-onboarding__options desktop-agent-onboarding__options--nolo">
            <Link
              to="/signup"
              className="desktop-agent-onboarding__option desktop-agent-onboarding__option--primary"
              data-testid="desktop-onboarding-signup"
              onClick={() => dismiss("signup")}
            >
              <span className="desktop-agent-onboarding__option-body">
                <span className="desktop-agent-onboarding__option-title">
                  {t("localFirst.onboarding.path.signup", "注册即用")}
                </span>
                <span className="desktop-agent-onboarding__option-hint">
                  {t("localFirst.onboarding.path.signupHint", "新账号有免费额度，无需配置模型")}
                </span>
              </span>
              <span className="desktop-agent-onboarding__arrow" aria-hidden="true">›</span>
            </Link>
            <Link
              to="/login"
              className="desktop-agent-onboarding__option"
              data-testid="desktop-onboarding-login"
              onClick={() => dismiss("login")}
            >
              <span className="desktop-agent-onboarding__option-body">
                <span className="desktop-agent-onboarding__option-title">
                  {t("localFirst.onboarding.path.login", "已有账号，登录 Nolo")}
                </span>
                <span className="desktop-agent-onboarding__option-hint">
                  {t("localFirst.onboarding.path.loginHint", "同步已有助手和额度")}
                </span>
              </span>
              <span className="desktop-agent-onboarding__arrow" aria-hidden="true">›</span>
            </Link>
          </div>
        </div>

        <div className="desktop-agent-onboarding__group">
          <p className="desktop-agent-onboarding__group-label">
            {t("localFirst.onboarding.group.byo", "连接我已有的 AI · 本地使用")}
          </p>
          <div className="desktop-agent-onboarding__options desktop-agent-onboarding__options--sources">
            <Link
              to={`${LOCAL_CREATE}?path=membership&access=cli`}
              className="desktop-agent-onboarding__option"
              data-testid="desktop-onboarding-path-cli"
              onClick={() => dismiss("path-cli")}
            >
              <span className="desktop-agent-onboarding__option-body">
                <span className="desktop-agent-onboarding__option-title">
                  {t("localFirst.onboarding.path.cli", "本机 CLI 已登录")}
                </span>
                <span className="desktop-agent-onboarding__option-hint">
                  {t("localFirst.onboarding.path.cliHint", "Claude Code、Codex、Grok CLI")}
                </span>
              </span>
              <span className="desktop-agent-onboarding__arrow" aria-hidden="true">›</span>
            </Link>
            <Link
              to={`${LOCAL_CREATE}?path=membership`}
              className="desktop-agent-onboarding__option"
              data-testid="desktop-onboarding-path-membership"
              onClick={() => dismiss("path-membership")}
            >
              <span className="desktop-agent-onboarding__option-body">
                <span className="desktop-agent-onboarding__option-title">
                  {t("localFirst.onboarding.path.membership", "我有 AI 会员或订阅")}
                </span>
                <span className="desktop-agent-onboarding__option-hint">
                  {t("localFirst.onboarding.path.membershipHint", "Claude、ChatGPT、Grok 等")}
                </span>
              </span>
              <span className="desktop-agent-onboarding__arrow" aria-hidden="true">›</span>
            </Link>
            <Link
              to={`${LOCAL_CREATE}?path=byo`}
              className="desktop-agent-onboarding__option"
              data-testid="desktop-onboarding-path-byo"
              onClick={() => dismiss("path-byo")}
            >
              <span className="desktop-agent-onboarding__option-body">
                <span className="desktop-agent-onboarding__option-title">
                  {t("localFirst.onboarding.path.byo", "我有 API Key 或本地模型")}
                </span>
                <span className="desktop-agent-onboarding__option-hint">
                  {t("localFirst.onboarding.path.byoHint", "OpenAI、Ollama、LM Studio、兼容端点")}
                </span>
              </span>
              <span className="desktop-agent-onboarding__arrow" aria-hidden="true">›</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DesktopAgentOnboarding;
