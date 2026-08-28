// 文件路径: app/pages/widgets/UsageWidget.tsx
// 首页自定义 Tab —— 用量统计小卡片（删除按钮由父级 toolbar 处理）
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "app/routing";
import { LuWallet, LuChevronRight } from "react-icons/lu";
import { useSessionSnapshot } from "app/sessionSnapshot";
import { useRecords } from "ai/token/hooks/useRecords";
import { formatCredits } from "app/utils/credits";
import { utcToZonedTime } from "date-fns-tz";
import "./UsageWidget.css";

const USER_TIMEZONE =
  typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "UTC";

interface UsageWidgetProps {
  isEditing?: boolean;
}

const UsageWidget: React.FC<UsageWidgetProps> = ({ isEditing }) => {
  const { t } = useTranslation(["translation", "chat"]);
  const { balance } = useSessionSnapshot();
  const creditsUnit = t("chat:creditsUnit", "credits");

  // 本卡片语义 = 本地时区的「今天」。
  const recordsFilter = useMemo(() => {
    const today = utcToZonedTime(new Date(), USER_TIMEZONE);
    const localDayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const localNextDayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );
    return {
      startTime: localDayStart.getTime(),
      endTime: localNextDayStart.getTime() - 1,
      model: "全部模型",
    };
  }, []);
  const { records, loading } = useRecords(recordsFilter, { all: true });

  const todayCost = useMemo(
    () => records.reduce((sum, r) => sum + (r.cost ?? 0), 0),
    [records]
  );

  const content = (
    <>
      <div className="usage-widget__icon">
        <LuWallet size={20} aria-hidden="true" />
      </div>
      <div className="usage-widget__body">
        <span className="usage-widget__label">
          {t("widgets.usage.title", "用量统计")}
        </span>
        <span className="usage-widget__balance">
          {formatCredits(balance, creditsUnit)}
        </span>
        <span className="usage-widget__sub">
          {loading
            ? t("widgets.usage.loading", "统计中…")
            : t("widgets.usage.todayCost", "今日消耗 {{cost}}", {
                cost: todayCost.toFixed(4),
              })}
        </span>
      </div>
      <LuChevronRight size={16} className="usage-widget__chevron" aria-hidden="true" />
    </>
  );

  if (isEditing) {
    return (
      <div className="usage-widget" aria-label={t("widgets.usage.title", "用量统计")}>
        {content}
      </div>
    );
  }

  return (
    <NavLink to="/life/usage" className="usage-widget" aria-label={t("widgets.usage.title", "用量统计")}>
      {content}
    </NavLink>
  );
};

export default UsageWidget;
