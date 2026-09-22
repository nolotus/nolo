import { NavLink } from "app/routing";
import { LuDownload } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import "./WelcomeBrandLanding.css";

type BrandCopy = {
  kicker: string;
  title: string;
  description: string;
  continuity: string;
  primaryCta: string;
  secondaryCta: string;
  contrasts: string[];
  principles: Array<{ title: string; description: string }>;
  balanceTitle: string;
  balanceDescription: string;
  systemLabel: string;
  systemItems: string[];
  youLabel: string;
  youItems: string[];
  closingLead: string;
  closingLines: string[];
  closingEnd: string;
};

const zhCN: BrandCopy = {
  kicker: "Nolo · Agent Harness",
  title: "让 AI 适应你的工作方式",
  description:
    "Nolo 让 Agent 记住你的工作，在任务之间延续上下文，并根据能力、质量、速度和价格，把工作交给更合适的模型和工具。",
  continuity: "模型会变。你的工作方式不必重来。",
  primaryCta: "免费开始",
  secondaryCta: "下载 Nolo",
  contrasts: [
    "不是另一个聊天框",
    "不是绑定某一个模型",
    "不是每次从零开始",
    "不是替你包办一切",
  ],
  principles: [
    {
      title: "好的合作会积累",
      description:
        "真正的工作有历史、有规则、有文件，也有踩过的坑。Agent 会保留长期记忆和有价值的上下文，合作越久，越顺手。",
    },
    {
      title: "合适的智能，做合适的工作",
      description:
        "没有一个模型适合所有任务。重要判断用更强的模型，常规执行用更快、更便宜的 Agent；新的模型出现，也可以随时成为新的能力。",
    },
    {
      title: "尊重你的判断，也挑战你的盲区",
      description:
        "Nolo 不只埋头执行。它尊重你的创意和选择，也会在值得的时候提出不同方案、指出风险、补充你没有看到的可能性。",
    },
  ],
  balanceTitle: "该自动的自动，该选择的由你选择",
  balanceDescription:
    "注意力是有限的。Nolo 尽量把可以被系统判断的复杂性放到背后，只在真正需要你的判断时打扰你。",
  systemLabel: "Nolo 尽量处理",
  systemItems: ["模型选择", "Agent 调度", "上下文整理", "成本与速度", "重复执行"],
  youLabel: "留给你决定",
  youItems: ["目标", "风险", "审美", "方向", "真正想创造什么"],
  closingLead: "AI 可以研究、执行、比较、检查和并行推进。",
  closingLines: ["你为什么做。", "什么是好的。", "你真正想创造什么。"],
  closingEnd: "始终是你。",
};

const en: BrandCopy = {
  kicker: "Nolo · Agent Harness",
  title: "Let AI adapt to the way you work",
  description:
    "Nolo gives agents persistent context and routes each task to the model and tools that fit its quality, capability, speed, and cost requirements.",
  continuity: "Models change. Your way of working should not have to start over.",
  primaryCta: "Start free",
  secondaryCta: "Download Nolo",
  contrasts: [
    "Not another chat box",
    "Not locked to one model",
    "Not starting from zero every time",
    "Not an AI that decides everything for you",
  ],
  principles: [
    {
      title: "Good collaboration compounds",
      description:
        "Real work has history, rules, files, and lessons learned. Agents keep useful long-term context, so working together gets smoother over time.",
    },
    {
      title: "Use the right intelligence for the right work",
      description:
        "No model is best at everything. Use stronger models for important judgment, faster and cheaper agents for routine execution, and adopt new models as they improve.",
    },
    {
      title: "Respect your judgment. Challenge your blind spots.",
      description:
        "Nolo does more than execute. It respects your intent and choices while surfacing alternatives, risks, and possibilities worth considering.",
    },
  ],
  balanceTitle: "Automate what should be automated. Keep the choices that matter.",
  balanceDescription:
    "Attention is finite. Nolo keeps routine complexity in the background and asks for your attention when your judgment actually matters.",
  systemLabel: "Nolo can handle",
  systemItems: ["Model selection", "Agent routing", "Context", "Cost and speed", "Repeat execution"],
  youLabel: "You decide",
  youItems: ["Goals", "Risk", "Taste", "Direction", "What is worth creating"],
  closingLead: "AI can research, execute, compare, review, and work in parallel.",
  closingLines: ["Why you do it.", "What good looks like.", "What you actually want to create."],
  closingEnd: "That remains yours.",
};

const WelcomeBrandLanding = () => {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? i18n.language ?? "en").toLowerCase();
  const copy = language.startsWith("zh") ? zhCN : en;

  return (
    <div className="welcome-brand-landing">
      <section className="wbl-hero" aria-labelledby="wbl-title">
        <div className="wbl-shell">
          <div className="wbl-kicker">{copy.kicker}</div>
          <h1 id="wbl-title" className="wbl-title">
            {copy.title}
          </h1>
          <p className="wbl-description">{copy.description}</p>
          <p className="wbl-continuity">{copy.continuity}</p>

          <div className="wbl-actions">
            <NavLink to="/signup" className="wbl-btn wbl-btn-primary">
              {copy.primaryCta}
            </NavLink>
            <NavLink to="/downloads" className="wbl-btn wbl-btn-secondary">
              <LuDownload size={16} aria-hidden="true" />
              <span>{copy.secondaryCta}</span>
            </NavLink>
          </div>

          <ul className="wbl-contrasts" aria-label="Nolo principles">
            {copy.contrasts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="wbl-principles" aria-label="How Nolo works with you">
        <div className="wbl-shell wbl-principles-grid">
          {copy.principles.map((principle) => (
            <article key={principle.title} className="wbl-principle-card">
              <h2>{principle.title}</h2>
              <p>{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wbl-balance">
        <div className="wbl-shell wbl-balance-layout">
          <div className="wbl-balance-copy">
            <h2>{copy.balanceTitle}</h2>
            <p>{copy.balanceDescription}</p>
          </div>
          <div className="wbl-balance-columns">
            <div className="wbl-balance-column">
              <h3>{copy.systemLabel}</h3>
              <ul>
                {copy.systemItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="wbl-balance-column wbl-balance-column-human">
              <h3>{copy.youLabel}</h3>
              <ul>
                {copy.youItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="wbl-closing">
        <div className="wbl-shell wbl-closing-inner">
          <p className="wbl-closing-lead">{copy.closingLead}</p>
          <div className="wbl-closing-lines">
            {copy.closingLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          <strong>{copy.closingEnd}</strong>
        </div>
      </section>
    </div>
  );
};

export default WelcomeBrandLanding;
