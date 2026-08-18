import { LuChevronDown } from "react-icons/lu";
import { Disclosure, DisclosureGroup, DisclosurePanel, Button } from "react-aria-components";

type FaqItem = {
  question: string;
  answer: string;
};

type WelcomeFaqAccordionProps = {
  items: FaqItem[];
  className?: string;
};

const WelcomeFaqAccordion = ({ items, className = "" }: WelcomeFaqAccordionProps) => {
  return (
    <DisclosureGroup
      className={`ws-faq-accordion ${className}`.trim()}
      defaultExpandedKeys={items.length > 0 ? new Set([items[0].question]) : undefined}
    >
      {items.map((item) => (
        <Disclosure key={item.question} id={item.question} className="ws-faq-item">
          <Button slot="trigger" className="ws-faq-trigger">
            {item.question}
            <LuChevronDown size={18} aria-hidden="true" className="ws-faq-trigger-icon" />
          </Button>
          <DisclosurePanel className="ws-faq-panel">
            <p>{item.answer}</p>
          </DisclosurePanel>
        </Disclosure>
      ))}
    </DisclosureGroup>
  );
};

export default WelcomeFaqAccordion;