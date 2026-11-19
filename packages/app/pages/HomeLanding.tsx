import { useEffect } from "react";
import { NavLink } from "app/routing";
import { resolveCtaPosition, sendFunnelBeacon } from "app/analytics/funnelBeacon";
import { useTranslation } from "react-i18next";
import { LuArrowUpRight, LuCheck, LuDownload, LuMinus, LuRotateCcw } from "react-icons/lu";

import WelcomeFaqAccordion from "./WelcomeFaqAccordion";
import OrchestrationShowcase from "./OrchestrationShowcase";
import DeferredMount from "./DeferredMount";
import { guestHomeBandVars } from "render/layout/guestHomeTone";
import "render/layout/naturePalette.css";
import "render/layout/noloSerifFont.css";
import "./HomeLanding.css";

// Guest home. Visual direction (owner, 2026-10-04): nature over tech, simple,
// about people. Copy source of truth: docs/product-positioning.md §3.1.
// The relay replays a real cross-machine run recorded 2026-10-04 on production
// (plan gpt-6-luna @ Mac, build deepseek-v4.1-flash @ Linux, review
// gemini-3.8-flash @ Mac, APPROVE). Re-record before changing it.

const NS = "homeLandingV2";
const PUBLIC_SOURCE_URL = "https://github.com/nolotus/nolo";
/**
 * Public, read-only share page (/share/:token) of the run the relay replays.
 * Empty until the owner picks and authorizes one — the "view this run" link is
 * not rendered while empty. Never point it at a made-up or private dialog.
 */
const PUBLIC_RELAY_SHARE_URL: string = "";

type RelayStep = { role: string; model: string; machine: string; seconds: string };
type Pillar = { title: string; body: string; example?: string };
type FaqItem = { question: string; answer: string };
type WhyNowItem = { title: string; body: string };

const HomeLanding = () => {
  const { t } = useTranslation();
  useEffect(() => sendFunnelBeacon({ event: "landing_view" }), []);
  const relay = t(`${NS}.relay.steps`, { returnObjects: true }) as RelayStep[];
  const pillars = t(`${NS}.pillars.items`, { returnObjects: true }) as Pillar[];
  const faqItems = t(`${NS}.faq.items`, { returnObjects: true }) as FaqItem[];
  const trust = t(`${NS}.closing.trust`, { returnObjects: true }) as string[];
  const closingLines = t(`${NS}.closing.lines`, { returnObjects: true }) as string[];
  const handItems = t(`${NS}.compare.handItems`, { returnObjects: true }) as string[];
  const noloItems = t(`${NS}.compare.noloItems`, { returnObjects: true }) as string[];
  const whyNow = t(`${NS}.whyNow.items`, { returnObjects: true }) as WhyNowItem[];

  const actions = (
    <div className="hl-actions">
      <NavLink
        to="/signup"
        className="hl-btn hl-btn-primary"
        onClick={(e) =>
          sendFunnelBeacon({ event: "cta_click", which: "signup", position: resolveCtaPosition(e.currentTarget) })
        }
      >
        {t(`${NS}.cta.primary`)}
      </NavLink>
      <NavLink
        to="/downloads"
        className="hl-btn hl-btn-secondary"
        onClick={(e) =>
          sendFunnelBeacon({ event: "cta_click", which: "download", position: resolveCtaPosition(e.currentTarget) })
        }
      >
        <LuDownload size={16} aria-hidden="true" />
        <span>{t(`${NS}.cta.download`)}</span>
      </NavLink>
    </div>
  );

  return (
    <div
      className="home-landing"
      // Bands come from guestHomeTone.ts so the topbar can follow them exactly.
      style={guestHomeBandVars()}
    >
      <section className="hl-hero" aria-labelledby="hl-title">
        <div className="hl-shell">
          <p className="hl-kicker">{t(`${NS}.hero.tag`)}</p>
          <h1 id="hl-title" className="hl-title">
            {t(`${NS}.hero.title`)}
          </h1>
          <p className="hl-lead">{t(`${NS}.hero.lead`)}</p>
          {actions}

          {/* Replay without JS: toggling this checkbox swaps the keyframes name,
              which restarts the CSS animation (works before hydration). */}
          <input type="checkbox" id="hl-relay-replay" className="hl-replay-toggle" />
          <ol className="hl-relay" aria-label={t(`${NS}.relay.label`)}>
            {relay.map((step, index) => (
              <li key={step.role} className="hl-relay-step" style={{ ["--i" as string]: index }}>
                <span className={`hl-dot hl-dot-${index}`} aria-hidden="true" />
                <span className="hl-relay-who">
                  <b>{step.role}</b> {step.model}
                </span>
                <span className="hl-relay-where">
                  {step.machine} · {step.seconds}
                </span>
              </li>
            ))}
            <li className="hl-relay-done" style={{ ["--i" as string]: relay.length }}>
              ✓ {t(`${NS}.relay.done`)}
            </li>
          </ol>
          <div className="hl-relay-meta">
            <p className="hl-relay-note">{t(`${NS}.relay.note`)}</p>
            <label htmlFor="hl-relay-replay" className="hl-replay">
              <LuRotateCcw size={14} aria-hidden="true" />
              <span>{t(`${NS}.relay.replay`)}</span>
            </label>
            {PUBLIC_RELAY_SHARE_URL && (
              <a className="hl-relay-run" href={PUBLIC_RELAY_SHARE_URL}>
                <span>{t(`${NS}.relay.viewRun`)}</span>
                <LuArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="hl-section" aria-labelledby="hl-compare-title">
        <div className="hl-shell">
          <h2 id="hl-compare-title" className="hl-h2">
            {t(`${NS}.compare.title`)}
          </h2>
          <p className="hl-section-lead">{t(`${NS}.compare.lead`)}</p>
          <div className="hl-compare">
            <article className="hl-compare-card">
              <h3>{t(`${NS}.compare.handLabel`)}</h3>
              <ul>
                {handItems.map((item) => (
                  <li key={item}>
                    <LuMinus size={15} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="hl-compare-card hl-compare-card-nolo">
              <h3>Nolo</h3>
              <ul>
                {noloItems.map((item) => (
                  <li key={item}>
                    <LuCheck size={15} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="hl-section" aria-labelledby="hl-pillars-title">
        <div className="hl-shell">
          <h2 id="hl-pillars-title" className="hl-h2">
            {t(`${NS}.pillars.title`)}
          </h2>
          <div className="hl-pillars">
            {pillars.map((pillar, index) => (
              <article key={pillar.title} className="hl-pillar">
                <span className={`hl-dot hl-dot-${index}`} aria-hidden="true" />
                <h3>{pillar.title}</h3>
                <p>{pillar.body}</p>
                {pillar.example && <p className="hl-pillar-example">{pillar.example}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="hl-section hl-section-center" aria-labelledby="hl-orch-title">
        <div className="hl-shell">
          <h2 id="hl-orch-title" className="hl-h2">
            {t(`${NS}.orchestration.title`)}
          </h2>
          <p className="hl-section-lead">{t(`${NS}.orchestration.lead`)}</p>
          {/* 编排演示挂载即拉 3 套 SVG + 7 个图标并起动画；它在首屏之下，
              进视口前不挂载。标题与 lead 仍参与 SSR；占位高度由
              .hl-orch-deferred 按断点给出，避免挂载瞬间的布局偏移。 */}
          <DeferredMount className="hl-orch-deferred">
            <OrchestrationShowcase className="hl-orch" />
          </DeferredMount>
        </div>
      </section>

      <section className="hl-section hl-why" aria-labelledby="hl-why-title">
        <div className="hl-shell">
          <h2 id="hl-why-title" className="hl-h2">
            {t(`${NS}.whyNow.title`)}
          </h2>
          <p className="hl-section-lead">{t(`${NS}.whyNow.lead`)}</p>
          <ol className="hl-why-list">
            {whyNow.map((item, index) => (
              <li key={item.title} className="hl-why-item">
                <span className={`hl-dot hl-dot-${index}`} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="hl-closing" aria-label={t(`${NS}.closing.label`)}>
        <div className="hl-shell">
          <p className="hl-closing-lead">{t(`${NS}.closing.lead`)}</p>
          <p className="hl-closing-lines">
            {closingLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          <p className="hl-closing-end">{t(`${NS}.closing.end`)}</p>
          {actions}
          <p className="hl-trust">
            {trust.join(" · ")} ·{" "}
            <a href={PUBLIC_SOURCE_URL} target="_blank" rel="noreferrer">
              {t(`${NS}.closing.source`)}
            </a>
          </p>
        </div>
      </section>

      <section className="hl-section hl-faq-section" aria-labelledby="hl-faq-title">
        <div className="hl-shell hl-shell-narrow">
          <h2 id="hl-faq-title" className="hl-h2">
            {t(`${NS}.faq.title`)}
          </h2>
          <WelcomeFaqAccordion items={faqItems} className="hl-faq" />
        </div>
      </section>
    </div>
  );
};

export default HomeLanding;
