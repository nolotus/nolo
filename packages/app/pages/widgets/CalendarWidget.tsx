// 文件路径: app/pages/widgets/CalendarWidget.tsx
// 首页自定义 Tab 日历小部件（删除按钮由父级 toolbar 处理）
import {
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  Button,
} from "react-aria-components";
import { useTranslation } from "react-i18next";
import "./CalendarWidget.css";

interface CalendarWidgetProps {
  isEditing?: boolean;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ isEditing }) => {
  const { t } = useTranslation();

  return (
    <div className="calendar-widget" aria-label={t("widgets.calendar.title", "日历")}>
      <Calendar aria-label={t("widgets.calendar.ariaLabel", "日期选择")}>
        <header className="calendar-widget__header">
          <Button slot="previous" className="calendar-widget__nav-btn">◀</Button>
          <Heading className="calendar-widget__heading" />
          <Button slot="next" className="calendar-widget__nav-btn">▶</Button>
        </header>
        <CalendarGrid className="calendar-widget__grid">
          <CalendarGridHeader className="calendar-widget__grid-header">
            {(day) => (
              <CalendarHeaderCell className="calendar-widget__header-cell">
                {day}
              </CalendarHeaderCell>
            )}
          </CalendarGridHeader>
          <CalendarGridBody className="calendar-widget__grid-body">
            {(date) => (
              <CalendarCell
                date={date}
                className="calendar-widget__cell"
              />
            )}
          </CalendarGridBody>
        </CalendarGrid>
      </Calendar>
    </div>
  );
};

export default CalendarWidget;
