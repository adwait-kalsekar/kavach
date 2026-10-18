import { Link } from "@tanstack/react-router";
import { useKavach } from "./state";
import { Icon } from "./ui";
export function SeasonPage() {
  const { t, scenarios, locale } = useKavach();
  const climate = scenarios.data?.data.climate;
  return (
    <div className="detail-screen season-screen">
      <header className="page-title">
        <p>{t.contextOnly}</p>
        <h1>{t.seasonTitle}</h1>
        <span>{t.seasonSubtitle}</span>
      </header>
      <section className="season-location">
        <Icon name="season" size={24} />
        <div>
          <h2>{t.place}</h2>
          <p>{t.seasonPeriod}</p>
        </div>
        <span>{t.contextOnly}</span>
      </section>
      {climate?.status === "available" ? (
        <>
          <section className="rainfall-insight">
            <span className="insight-label">{t.historical}</span>
            <div className="rain-stat">
              <strong>
                {Math.abs(climate.departurePct).toLocaleString(locale, {
                  maximumFractionDigits: 1,
                })}
                <small>%</small>
              </strong>
              <p>{t.below}</p>
            </div>
            <div className="rain-bar">
              <div>
                <span>{t.baseline}</span>
                <strong>
                  {climate.baseline.meanMm.toLocaleString(locale, {
                    maximumFractionDigits: 1,
                  })}{" "}
                  mm
                </strong>
              </div>
              <meter
                min={0}
                max={Math.max(climate.totalMm, climate.baseline.meanMm)}
                value={climate.baseline.meanMm}
                aria-label={t.baseline}
              />
            </div>
            <div className="rain-bar recent">
              <div>
                <span>{t.actual}</span>
                <strong>
                  {climate.totalMm.toLocaleString(locale, {
                    maximumFractionDigits: 1,
                  })}{" "}
                  mm
                </strong>
              </div>
              <meter
                min={0}
                max={Math.max(climate.totalMm, climate.baseline.meanMm)}
                value={climate.totalMm}
                aria-label={t.actual}
              />
            </div>
            <p className="rain-source">{t.seasonSource}</p>
          </section>
          <section className="context-explainer">
            <Icon name="info" size={24} />
            <div>
              <h2>{t.regional}</h2>
              <p>{t.sourceDesc}</p>
            </div>
          </section>
          <Link to="/sources" className="source-navigation">
            <div>
              <strong>{t.moreSources}</strong>
              <span>
                {t.date}:{" "}
                {new Date(climate.retrievedAt).toLocaleDateString(locale)}
              </span>
            </div>
            <Icon name="arrow" size={22} />
          </Link>
        </>
      ) : (
        <section className="empty-state" role="status">
          <p>{scenarios.isPending ? t.loading : t.loadError}</p>
          <button
            className="plain-button"
            onClick={() => void scenarios.refetch()}
          >
            {t.retry}
          </button>
        </section>
      )}
      <Link to="/sample" className="link-button">
        {t.goSample}
        <Icon name="sample" size={18} />
      </Link>
    </div>
  );
}
export function SourcesPage() {
  const { t, scenarios, locale } = useKavach();
  const climate = scenarios.data?.data.climate;
  const source = scenarios.data?.data.sources[0];
  return (
    <div className="detail-screen sources-screen">
      <Link to="/season" className="back-link">
        <Icon name="back" size={18} />
        {t.backToSeason}
      </Link>
      <header className="page-title">
        <h1>{t.sourceTitle}</h1>
        <span>{t.sourceIntro}</span>
      </header>
      <section className="source-section">
        <Icon name="season" />
        <h2>NASA POWER / MERRA-2</h2>
        <p>{t.sourceDesc}</p>
        {climate?.status === "available" && (
          <>
            <dl>
              <div>
                <dt>{t.historical}</dt>
                <dd>
                  {climate.period.start} — {climate.period.end}
                </dd>
              </div>
              <div>
                <dt>{t.baseline}</dt>
                <dd>
                  {climate.baseline.startYear} — {climate.baseline.endYear}
                </dd>
              </div>
              <div>
                <dt>{t.date}</dt>
                <dd>
                  {new Date(climate.retrievedAt).toLocaleDateString(locale)}
                </dd>
              </div>
            </dl>
            <a href={climate.sourceUrl} target="_blank" rel="noreferrer">
              NASA POWER documentation ↗
            </a>
          </>
        )}
      </section>
      <section className="source-section">
        <Icon name="sample" />
        <h2>ICAR-CRIDA · Latur, 2011</h2>
        <p>
          {locale === "en-IN"
            ? "Historical district context. These planning checks have not been reviewed by an agronomist."
            : t.limitBody}
        </p>
        {source && (
          <a href={source.url} target="_blank" rel="noreferrer">
            ICAR-CRIDA district plan ↗
          </a>
        )}
      </section>
      <section className="source-section">
        <Icon name="talk" />
        <h2>{t.talkTitle}</h2>
        <p>{t.voicePrivacy}</p>
        <p>{t.chatUnstored}</p>
        {locale === "mr-IN" && <p>{t.voicePreview}</p>}
      </section>
      <aside className="limits-panel">
        <h2>{t.limits}</h2>
        <p>{t.limitBody}</p>
      </aside>
    </div>
  );
}
