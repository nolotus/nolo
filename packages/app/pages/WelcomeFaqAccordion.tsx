import { useId, useState } from "react";
import { LuChevronDown } from "react-icons/lu";

type FaqItem = {
  question: string;
  answer: string;
};

type WelcomeFaqAccordionProps = {
  items: FaqItem[];
  className?: string;
};

/**
 * 零依赖手风琴，替代 react-aria-components 的 Disclosure 组（后者会把整套 react-aria
 * 带进访客首屏，约 101.5KB br），而这只是页面底部的折叠 FAQ。
 *
 * 保留原语义与体验：单开（旧 DisclosureGroup 未设 allowsMultipleExpanded）、首项默认展开、
 * Tab 可达 + Enter/Space 切换、aria-expanded/aria-controls/region 关系齐全。
 * 展开高度过渡改由 CSS `grid-template-rows: 0fr → 1fr` 实现，不依赖任何库注入的高度变量，
 * 因此不再有 `--disclosure-panel-height` 缺失导致动画失效的问题。
 */
const WelcomeFaqAccordion = ({ items, className = "" }: WelcomeFaqAccordionProps) => {
  const groupId = useId();
  const [openQuestion, setOpenQuestion] = useState<string | null>(
    items.length > 0 ? items[0].question : null
  );

  return (
    <div className={`ws-faq-accordion ${className}`.trim()}>
      {items.map((item, index) => {
        const isOpen = openQuestion === item.question;
        const triggerId = `${groupId}-faq-trigger-${index}`;
        const panelId = `${groupId}-faq-panel-${index}`;
        return (
          <div
            key={item.question}
            className="ws-faq-item"
            data-expanded={isOpen ? "" : undefined}
          >
            <button
              type="button"
              id={triggerId}
              className="ws-faq-trigger"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenQuestion(isOpen ? null : item.question)}
            >
              {item.question}
              <LuChevronDown size={16} aria-hidden="true" className="ws-faq-trigger-icon" />
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              aria-hidden={!isOpen}
              // aria-hidden 不阻止后代进入 Tab 序列；inert 才能在折叠态一起挡掉。
              // 答案目前只有文本，但这样以后加链接也不会出现「看不见却可聚焦」。
              inert={!isOpen}
              className="ws-faq-panel"
            >
              <div className="ws-faq-panel-inner">
                <p>{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WelcomeFaqAccordion;
