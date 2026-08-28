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
  | "path-byo"
  | "path-membership";

const LOCAL_CREATE = `/${CreateRoutePaths.CREATE_LOCAL_AGENT}`;

/**
 * Desktop first-run: two buckets (Nolo / BYO), four cards into local create or auth.
 * Path query pre-selects LocalQuickCreateAgent step.
 */
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
        <h1
          id="desktop-agent-onboarding-title"
          className="desktop-agent-onboarding__title"
        >
          {t("localFirst.onboarding.title", "怎么开始？")}
        </h1>
        <p className="desktop-agent-onboarding__description">
          {t(
            "localFirst.onboarding.description",
            "用 Nolo 最快上手，或本地直连自己的源——都不用绕弯。",
          )}
        </p>

        <ul
          className="desktop-agent-onboarding__options"
          data-testid="desktop-onboarding-options"
        >
          <li className="desktop-agent-onboarding__options-meta">
            <p className="desktop-agent-onboarding__group-label">
              {t("localFirst.onboarding.group.nolo", "用 Nolo · 零配置最快")}
            </p>
          </li>
          <li>
            <Link
              to="/signup"
              className="desktop-agent-onboarding__option"
              data-testid="desktop-onboarding-signup"
              onClick={() => dismiss("signup")}
            >
              <span className="desktop-agent-onboarding__option-num">1</span>
              <span className="desktop-agent-onboarding__option-body">
                <span className="desktop-agent-onboarding__option-title">
                  {t(
                    "localFirst.onboarding.path.signup",
                    "注册即用（送额度）",
                  )}
                </span>
                <span className="desktop-agent-onboarding__option-hint">
                  {t(
                    "localFirst.onboarding.path.signupHint",
                    "创建账号即可开始，无需先配模型",
                  )}
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              to="/login"
              className="desktop-agent-onboarding__option"
              data-testid="desktop-onboarding-login"
              onClick={() => dismiss("login")}
            >
              <span className="desktop-agent-onboarding__option-num">2</span>
              <span className="desktop-agent-onboarding__option-body">
                <span className="desktop-agent-onboarding__option-title">
                  {t(
                    "localFirst.onboarding.path.login",
                    "已有 Nolo 账号 · 登录",
                  )}
                </span>
                <span className="desktop-agent-onboarding__option-hint">
                  {t(
                    "localFirst.onboarding.path.loginHint",
                    "同步你已有的助手与额度",
                  )}
                </span>
              </span>
            </Link>
          </li>

          <li className="desktop-agent-onboarding__options-meta">
            <p className="desktop-agent-onboarding__group-label desktop-agent-onboarding__group-label--spaced">
              {t(
                "localFirst.onboarding.group.byo",
                "用我自己的 · 本地直连免登录",
              )}
            </p>
          </li>
          <li>
            <Link
              to={`${LOCAL_CREATE}?path=membership`}
              className="desktop-agent-onboarding__option"
              data-testid="desktop-onboarding-path-membership"
              onClick={() => dismiss("path-membership")}
            >
              <span className="desktop-agent-onboarding__option-num">3</span>
              <span className="desktop-agent-onboarding__option-body">
                <span className="desktop-agent-onboarding__option-title">
                  {t(
                    "localFirst.onboarding.path.membership",
                    "我在用某家 AI 会员/订阅",
                  )}
                </span>
                <span className="desktop-agent-onboarding__option-hint">
                  {t(
                    "localFirst.onboarding.path.membershipHint",
                    "Claude、ChatGPT、Grok、Token Plan…",
                  )}
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              to={`${LOCAL_CREATE}?path=byo`}
              className="desktop-agent-onboarding__option"
              data-testid="desktop-onboarding-path-byo"
              onClick={() => dismiss("path-byo")}
            >
              <span className="desktop-agent-onboarding__option-num">4</span>
              <span className="desktop-agent-onboarding__option-body">
                <span className="desktop-agent-onboarding__option-title">
                  {t(
                    "localFirst.onboarding.path.byo",
                    "我有 API Key / 本地模型",
                  )}
                </span>
                <span className="desktop-agent-onboarding__option-hint">
                  {t(
                    "localFirst.onboarding.path.byoHint",
                    "OpenAI Key、Ollama、LM Studio、兼容端点",
                  )}
                </span>
              </span>
            </Link>
          </li>
        </ul>

        <div className="desktop-agent-onboarding__footer">
          <button
            type="button"
            className="desktop-agent-onboarding__link"
            onClick={() => dismiss("skip")}
            data-testid="desktop-onboarding-skip"
          >
            {t("localFirst.onboarding.skipCta", "先随便看看")}
          </button>
        </div>
      </div>
    </section>
  );
};

export default DesktopAgentOnboarding;
