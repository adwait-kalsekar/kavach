import { EvidenceLearning } from "./evidence-learning";
import { CropOptions } from "./crop-options";
import { localizedAction } from "./season-action-copy";
import { Link } from "@tanstack/react-router";
import type {
  WaterPlan,
  SeasonAssessment,
  SeasonView,
} from "@kavach/contracts";
import { usePlanning, useFormat, cls as c } from "./state";
import { seasonCopy } from "./season-copy";
export function SeasonCards({
  assessment: a,
  views,
  waterPlan,
}: {
  assessment: SeasonAssessment;
  views: SeasonView[];
  waterPlan?: WaterPlan;
}) {
  const { locale } = usePlanning(),
    t = seasonCopy[locale],
    f = useFormat(),
    rain = a.evidence.rainfall;
  return (
    <div className={c("season-cards")}>
      {views.map((view) => (
        <section key={view} className={c("season-card")}>
          {view === "season-summary" ? (
            <>
              <div className={c("season-card-title")}>
                <span className={c("season-symbol")}>☂</span>
                <h2>{t.rain}</h2>
              </div>
              <p className={c("period")}>
                1 June–30 September 2026 · {a.evidence.name}
              </p>
              <div className={c("regional-stress")} data-level={a.stress.level}>
                <strong>
                  {locale === "mr-IN"
                    ? "प्रादेशिक पाणी-ताण संकेत"
                    : locale === "hi-IN"
                      ? "क्षेत्रीय जल-तनाव संकेत"
                      : "Regional water-stress signal"}
                  :{" "}
                  {locale === "mr-IN"
                    ? { high: "जास्त", moderate: "मध्यम", lower: "कमी" }[
                        a.stress.level
                      ]
                    : locale === "hi-IN"
                      ? { high: "अधिक", moderate: "मध्यम", lower: "कम" }[
                          a.stress.level
                        ]
                      : a.stress.level}
                </strong>
                <span>
                  {locale === "mr-IN"
                    ? "प्रायोगिक · हा शेतातील नुकसानीच्या संभाव्यतेचा अंदाज नाही"
                    : locale === "hi-IN"
                      ? "प्रायोगिक · यह खेत में नुकसान की संभावना का अनुमान नहीं है"
                      : "Experimental indicator · not a farm-loss probability"}
                </span>
                <details>
                  <summary>{t.more}</summary>
                  <p>
                    Rainfall dry-rank: {f(a.stress.rainDryRankPct, 1)} / 100.
                    Modeled surface-moisture dry-rank:{" "}
                    {f(a.stress.surfaceDryRankPct, 1)} / 100.
                  </p>
                  <p>{a.stress.limitation}</p>
                </details>
              </div>
              <div className={c("rain-pair")}>
                <div>
                  <span>{t.current}</span>
                  <strong>
                    {f(rain.totalMm)} <small>mm</small>
                  </strong>
                </div>
                <span aria-hidden="true">/</span>
                <div>
                  <span>{t.normal}</span>
                  <strong>
                    {f(rain.baselineMeanMm)} <small>mm</small>
                  </strong>
                </div>
              </div>
              <p className={c("rain-meaning")}>
                {f(Math.abs(rain.departurePct), 1)}%{" "}
                {rain.departurePct < 0 ? t.below : t.above}
              </p>
              <p className={c("small muted")}>
                1991–2020 · {rain.source.resolution} · {rain.source.scope}
              </p>
              <p className={c("small section-gap")}>{t.context}</p>
            </>
          ) : null}
          {view === "rain-history" ? (
            <>
              <h2>{t.history}</h2>
              <p className={c("muted section-gap")}>{t.historyIntro}</p>
              <div
                className={c("history-chart")}
                role="img"
                aria-label={`${t.normal}: ${f(rain.baselineMeanMm)} mm. ${rain.history.map((v) => `${v.year}: ${f(v.totalMm)} mm`).join("; ")}. 2026: ${f(rain.totalMm)} mm.`}
              >
                {[
                  { year: 0, totalMm: rain.baselineMeanMm, departurePct: 0 },
                  ...rain.history,
                  {
                    year: 2026,
                    totalMm: rain.totalMm,
                    departurePct: rain.departurePct,
                  },
                ].map((r) => (
                  <div className={c("history-row")} key={r.year}>
                    <span>{r.year || t.normal}</span>
                    <div className={c("history-track")}>
                      <i
                        data-current={r.year === 2026}
                        style={{
                          width:
                            (100 * r.totalMm) /
                              Math.max(
                                rain.baselineMeanMm,
                                ...rain.history.map((h) => h.totalMm),
                                rain.totalMm,
                              ) +
                            "%",
                        }}
                      />
                    </div>
                    <strong>
                      {f(r.totalMm)} <small>mm</small>
                    </strong>
                  </div>
                ))}
              </div>
              <details>
                <summary>{t.sources}</summary>
                <p className={c("small")}>
                  June–September each year. 1991–2020 mean; all 122 days
                  complete in each sample. Historical ONI (JJA):{" "}
                  {rain.history
                    .map((h) => `${h.year}: ${h.oni.toFixed(2)} °C`)
                    .join(" · ")}
                  . Selected examples, not all events or a causal study.
                </p>
                <SourceLink url={rain.source.url} title={rain.source.title} />
              </details>
            </>
          ) : null}
          {view === "surface-context" ? (
            <>
              <h2>{t.surface}</h2>
              <p className={c("muted section-gap")}>{t.surfaceIntro}</p>
              <dl className={c("evidence-values")}>
                <div>
                  <dt>{t.surfaceWater}</dt>
                  <dd>
                    {f(a.evidence.surface.moisture, 3)} m³/m³{" "}
                    <small>
                      · 1991–2020: {f(a.evidence.surface.baselineMoisture, 3)}
                    </small>
                  </dd>
                </div>
                <div>
                  <dt>{t.heat}</dt>
                  <dd>
                    {f(a.evidence.surface.meanDailyMaxC, 1)} °C{" "}
                    <small>
                      · 1991–2020: {f(a.evidence.surface.baselineDailyMaxC, 1)}{" "}
                      °C
                    </small>
                  </dd>
                </div>
              </dl>
              <p className={c("small muted")}>
                1–30 September 2026 · {a.evidence.surface.source.resolution}
              </p>
              <SourceLink
                url={a.evidence.surface.source.url}
                title="ERA5-Land · Google Earth Engine"
              />
            </>
          ) : null}
          {view === "water-comparison" ? (
            <>
              <h2>{t.options}</h2>
              {waterPlan?.calculation.status === "available" ? (
                <>
                  <p className={c("muted section-gap")}>
                    One illustrative application ·{" "}
                    {f(waterPlan.calculation.inputs.netApplicationMm!)} mm /{" "}
                    {f(waterPlan.calculation.inputs.efficiencyPct!)}% efficiency
                  </p>
                  <dl className={c("evidence-values")}>
                    {waterPlan.calculation.options.map((o) => (
                      <div key={o.id}>
                        <dt>{f(o.areaAcres, 2)} acres</dt>
                        <dd>
                          {f(o.requiredWaterLitres)} L{" "}
                          <small>
                            {o.balanceLitres < 0
                              ? "Water gap"
                              : "Water remaining"}
                            : {f(Math.abs(o.balanceLitres))} L
                          </small>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p>
                  Usable water, depth or efficiency is not checked. Enter those
                  assumptions in water options.
                </p>
              )}
              <p className={c("small muted")}>
                Not whole-season demand or a crop recommendation.
              </p>
              <Link to="/compare" className={c("secondary button-link")}>
                {t.options} →
              </Link>
            </>
          ) : null}
          {view === "crop-actions" ? (
            <>
              <h2>{t.next}</h2>
              <CropOptions assessment={a} />
              <div className={c("action-list")}>
                {a.actions
                  .map((raw) => localizedAction(a, raw, locale))
                  .map((action, i) => (
                    <article key={action.id}>
                      <span className={c("action-number")}>{i + 1}</span>
                      <div>
                        <h3>{action.title}</h3>
                        <p>{action.detail}</p>
                        <span className={c("action-when")}>{action.when}</span>
                        <details>
                          <summary>{t.more}</summary>
                          <p>{action.reason}</p>
                          <p className={c("small muted")}>
                            {t.unreviewed} · {action.sourceTitle}, p
                            {action.sourcePage}
                          </p>
                          <SourceLink
                            url={
                              action.sourceUrl + "#page=" + action.sourcePage
                            }
                            title={t.original}
                          />
                        </details>
                      </div>
                    </article>
                  ))}
              </div>
              <Link to="/talk" className={c("secondary button-link")}>
                {t.talk}
              </Link>
            </>
          ) : null}
          <EvidenceLearning assessment={a} view={view} waterPlan={waterPlan} />
        </section>
      ))}
    </div>
  );
}
function SourceLink({ url, title }: { url: string; title: string }) {
  return (
    <a className={c("source-link")} href={url} target="_blank" rel="noreferrer">
      {title} ↗
    </a>
  );
}
