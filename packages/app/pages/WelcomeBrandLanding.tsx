import { NavLink } from "app/routing";
import { LuDownload } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import "./WelcomeBrandLanding.css";

type Principle = { title: string; description: string };

const NS = "welcomeSection.brandLanding";

const WelcomeBrandLanding = () => {
  const { t } = useTranslation();
  const principles = t(`${NS}.principles`, { returnObjects: true }) as Principle[];
  const contrasts = t(`${NS}.contrasts`, { returnObjects: true }) as string[];
  const systemItems = t(`${NS}.systemItems`, { returnObjects: true }) as string[];
  const youItems = t(`${NS}.youItems`, { returnObjects: true }) as string[];
  const closingLines = t(`${NS}.closingLines`, { returnObjects: true }) as string[];

  return (
    <div className="welcome-brand-landing">
      <section className="wbl-hero" aria-labelledby="wbl-title">
        <div className="wbl-shell">
          <div className="wbl-kicker">{t(`${NS}.kicker`)}</div>
          <h1 id="wbl-title" className="wbl-title">
            {t(`${NS}.title`)}
          </h1>
          <p className="wbl-description">{t(`${NS}.description`)}</p>
          <p className="wbl-continuity">{t(`${NS}.continuity`)}</p>

          <div className="wbl-actions">
            <NavLink to="/signup" className="wbl-btn wbl-btn-primary">
              {t(`${NS}.primaryCta`)}
            </NavLink>
            <NavLink to="/downloads" className="wbl-btn wbl-btn-secondary">
              <LuDownload size={16} aria-hidden="true" />
              <span>{t(`${NS}.secondaryCta`)}</span>
            </NavLink>
          </div>

          <ul className="wbl-contrasts" aria-label="Nolo principles">
            {contrasts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="wbl-principles" aria-label="How Nolo works with you">
        <div className="wbl-shell wbl-principles-grid">
          {principles.map((principle) => (
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
            <h2>{t(`${NS}.balanceTitle`)}</h2>
            <p>{t(`${NS}.balanceDescription`)}</p>
          </div>
          <div className="wbl-balance-columns">
            <div className="wbl-balance-column">
              <h3>{t(`${NS}.systemLabel`)}</h3>
              <ul>
                {systemItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="wbl-balance-column wbl-balance-column-human">
              <h3>{t(`${NS}.youLabel`)}</h3>
              <ul>
                {youItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="wbl-closing">
        <div className="wbl-shell wbl-closing-inner">
          <p className="wbl-closing-lead">{t(`${NS}.closingLead`)}</p>
          <p className="wbl-closing-lines">
            {closingLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          <strong>{t(`${NS}.closingEnd`)}</strong>
        </div>
      </section>
    </div>
  );
};

export default WelcomeBrandLanding;
