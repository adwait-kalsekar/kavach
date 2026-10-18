import { protectionLabel } from "./protection-card";
import { localizedAction } from "./season-action-copy";
import { Link } from "@tanstack/react-router";
import type { SeasonInput } from "@kavach/contracts";
import { usePlanning, cls as c, useFormat } from "./state";
import { cropNames } from "./planning-copy";
import { seasonCopy } from "./season-copy";
import { SeasonCards } from "./season-cards";
import { FarmIllustration } from "./farm-illustration";
export function SeasonPage() {
  const app = usePlanning(),
    t = seasonCopy[app.locale],
    f = useFormat(),
    a = app.season.data?.data;
  const view = app.seasonView,
    setView = app.setSeasonView;
  const select = (
    key:
      | "stage"
      | "soil"
      | "moisture"
      | "irrigation"
      | "soilType"
      | "wellRecharge",
    label: string,
    values: readonly (readonly [string, string])[],
  ) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={app.seasonInput[key]}
        onChange={(e) =>
          app.updateSeason({ [key]: e.target.value } as Partial<SeasonInput>)
        }
      >
        {values.map(([v, l]) => (
          <option value={v} key={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className={c("season-page")}>
      <header className={c("season-intro")}>
        <div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        <div className={c("season-art")} aria-hidden="true">
          <FarmIllustration />
        </div>
      </header>
      <section
        className={c("season-profile")}
        data-tour="profile"
        aria-label={t.field}
      >
        <div className={c("form-grid")} data-tour-focus>
          <label>
            {t.location}
            <select
              aria-label={t.location}
              value={app.input.regionId}
              onChange={(e) =>
                app.confirm({
                  ...app.input,
                  regionId: e.target.value as SeasonInput["regionId"],
                })
              }
            >
              {app.catalog.data?.data.regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.crop}
            <select
              aria-label={t.crop}
              value={app.input.crop}
              onChange={(e) =>
                app.confirm({
                  ...app.input,
                  crop: e.target.value as SeasonInput["crop"],
                })
              }
            >
              {Object.entries(cropNames[app.locale]).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className={c("small muted")}>{t.sample}</p>
      </section>
      <section className={c("intent-section")} data-tour="intent">
        <h2>{t.task}</h2>
        <div className={c("intent-options")} data-tour-focus>
          {(
            [
              ["sowing", t.sowing, "↗"],
              ["growing", t.growing, "❧"],
              ["water", t.water, "≈"],
            ] as const
          ).map(([intent, label, symbol]) => (
            <button
              key={intent}
              aria-pressed={app.seasonInput.intent === intent}
              onClick={() => {
                app.updateSeason({
                  intent,
                  stage:
                    intent === "sowing"
                      ? "pre-sowing"
                      : intent === "growing"
                        ? "vegetative"
                        : app.seasonInput.stage,
                });
                setView(
                  intent === "water" ? "surface-context" : "season-summary",
                );
                requestAnimationFrame(() =>
                  document
                    .querySelector(".fp-season-view-nav")
                    ?.scrollIntoView({ block: "start", behavior: "smooth" }),
                );
              }}
            >
              <span aria-hidden="true">{symbol}</span>
              {label}
            </button>
          ))}
        </div>
      </section>
      <details className={c("field-inputs")}>
        <summary>
          {t.field}{" "}
          <span>
            {app.seasonInput.moisture === "unknown"
              ? t.unknown
              : app.seasonInput.moisture === "dry"
                ? t.dry
                : t.moist}
          </span>
        </summary>
        <div className={c("form-grid")}>
          {select("moisture", t.moisture, [
            ["unknown", t.unknown],
            ["dry", t.dry],
            ["moist", t.moist],
          ])}
          {select("irrigation", t.irrigation, [
            ["unknown", t.unknown],
            ["none", t.none],
            [
              "one",
              app.locale === "mr-IN"
                ? "या पिकासाठी एक सिंचन"
                : app.locale === "hi-IN"
                  ? "इस फसल के लिए एक सिंचाई"
                  : "One irrigation for this crop",
            ],
            ["limited", t.limited],
            ["assured", t.assured],
          ])}
          {select("soil", t.soil, [
            ["unknown", t.unknown],
            ["shallow", t.shallow],
            ["medium-deep", t.deep],
          ])}
          {select("stage", t.stage, [
            ["pre-sowing", t.pre],
            ...(app.input.crop === "wheat"
              ? [
                  [
                    "crown-root",
                    app.locale === "mr-IN"
                      ? "मुकुटमुळे तयार होण्याची अवस्था"
                      : app.locale === "hi-IN"
                        ? "शीर्ष जड़ बनने की अवस्था"
                        : "Crown-root initiation",
                  ] as const,
                ]
              : []),
            ...(app.input.crop === "chickpea"
              ? [
                  [
                    "branching",
                    app.locale === "mr-IN"
                      ? "फांद्या फुटण्याची अवस्था"
                      : app.locale === "hi-IN"
                        ? "शाखाएँ निकलना"
                        : "Branching",
                  ] as const,
                ]
              : []),
            ["vegetative", t.vegetative],
            ...(app.input.crop === "sorghum"
              ? [
                  [
                    "boot-leaf",
                    app.locale === "mr-IN"
                      ? "पोटरीची अवस्था"
                      : app.locale === "hi-IN"
                        ? "बूट अवस्था"
                        : "Boot-leaf stage",
                  ] as const,
                ]
              : []),
            ["flowering", t.flowering],
            ...(app.input.crop === "chickpea"
              ? [
                  [
                    "pod-development",
                    app.locale === "mr-IN"
                      ? "शेंगा भरण्याची अवस्था"
                      : app.locale === "hi-IN"
                        ? "फली विकास"
                        : "Pod development",
                  ] as const,
                ]
              : [
                  [
                    "grain-filling",
                    app.locale === "mr-IN"
                      ? "दाणे भरण्याची अवस्था"
                      : app.locale === "hi-IN"
                        ? "दाना भरना"
                        : "Grain filling",
                  ] as const,
                ]),
            ["maturity", t.maturity],
          ])}
          {a?.cropContext.guidance.some((g) => g.regionId) ? (
            <>
              {select(
                "soilType",
                app.locale === "mr-IN"
                  ? "मातीचा प्रकार"
                  : app.locale === "hi-IN"
                    ? "मिट्टी का प्रकार"
                    : "Soil type",
                [
                  ["unknown", t.unknown],
                  [
                    "black",
                    app.locale === "mr-IN"
                      ? "काळी माती"
                      : app.locale === "hi-IN"
                        ? "काली मिट्टी"
                        : "Black soil",
                  ],
                  ["other", app.locale === "en-IN" ? "Other soil" : "इतर"],
                ],
              )}
              {select(
                "wellRecharge",
                app.locale === "mr-IN"
                  ? "मान्सूननंतर विहिरीतील पाणी"
                  : app.locale === "hi-IN"
                    ? "मानसून के बाद कुएँ का पानी"
                    : "Well recharge after monsoon",
                [
                  ["unknown", t.unknown],
                  [
                    "not-refilled",
                    app.locale === "mr-IN"
                      ? "विहीर पुरेशी भरली नाही"
                      : app.locale === "hi-IN"
                        ? "कुआँ पर्याप्त नहीं भरा"
                        : "My irrigation well has not refilled",
                  ],
                  [
                    "not-applicable",
                    app.locale === "en-IN" ? "Not my situation" : "लागू नहीं",
                  ],
                ],
              )}
            </>
          ) : null}
        </div>
      </details>
      <div className={c("season-view-nav")} aria-label="Season views">
        {(
          [
            ["season-summary", t.overview],
            ["rain-history", t.history],
            ["crop-actions", t.actions],
            ["insurance-check", protectionLabel(app.locale)],
            ["sources", t.sources],
          ] as const
        ).map(([v, l]) => (
          <button
            data-tour={v === "crop-actions" ? "actions" : undefined}
            key={v}
            aria-pressed={view === v}
            onClick={() => setView(v)}
          >
            {l}
          </button>
        ))}
      </div>
      {app.season.isPending ? (
        <p role="status" className={c("surface")}>
          {t.loading}
        </p>
      ) : app.season.isError ? (
        <div role="alert" className={c("notice")}>
          <p>{t.failed}</p>
          <button onClick={() => void app.season.refetch()}>{t.retry}</button>
        </div>
      ) : a ? (
        <div data-tour="evidence">
          {view === "season-summary" ? (
            <div className={c("season-overview")}>
              <div className={c("readiness-callout")}>
                <span className={c("sprout")} aria-hidden="true">
                  ❧
                </span>
                <div>
                  <h2>
                    {a.readiness === "needs-field-check"
                      ? t.needsField
                      : a.readiness === "needs-water-check"
                        ? t.needsWater
                        : t.needsAdvice}
                  </h2>
                  <p>
                    {a.actions[0]
                      ? localizedAction(a, a.actions[0], app.locale).detail
                      : null}
                  </p>
                  <button
                    onClick={() => {
                      setView("crop-actions");
                    }}
                  >
                    {t.next} →
                  </button>
                </div>
              </div>
              <SeasonCards assessment={a} views={["season-summary"]} />
              <div className={c("season-link-row")}>
                <button onClick={() => setView("insurance-check")}>
                  {protectionLabel(app.locale)} →
                </button>
                <button onClick={() => setView("surface-context")}>
                  {t.surface} →
                </button>
                <Link to="/talk" className={c("primary button-link")}>
                  {t.talk}
                </Link>
              </div>
            </div>
          ) : view === "sources" ? (
            <section className={c("season-card")}>
              <h2>{t.sources}</h2>
              <p>{t.sourceIntro}</p>
              {[
                a.evidence.rainfall.source,
                a.evidence.surface.source,
                a.evidence.enso.source,
              ].map((s) => (
                <article className={c("source-record")} key={s.id}>
                  <h3>{s.title}</h3>
                  <p>
                    {s.scope} · {s.resolution}
                  </p>
                  <p>{s.limitation}</p>
                  <p className={c("small muted")}>
                    Retrieved {s.retrievedAt.slice(0, 10)} · SHA256{" "}
                    {s.sha256.slice(0, 12)}…
                  </p>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {t.original} ↗
                  </a>
                </article>
              ))}
              <h3>{t.enso}</h3>
              <p>
                {a.evidence.enso.period}: +{f(a.evidence.enso.anomalyC, 2)} °C
              </p>
              <p>{a.evidence.enso.limitation}</p>
              <div className={c("source-record")}>
                <h3>{t.historical}</h3>
                <p>
                  {t.rainfed}: {a.cropContext.rainfedWindow || t.notListed}
                </p>
                <p>
                  {t.irrigated}: {a.cropContext.irrigatedWindow || t.notListed}
                </p>
                <strong>{t.calendarLimit}</strong>
                <a
                  href={
                    a.cropContext.source.url +
                    "#page=" +
                    a.cropContext.source.pdfPage
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.cropContext.source.title} · p{a.cropContext.source.pdfPage}{" "}
                  ↗
                </a>
              </div>
              <details>
                <summary>Method & limits</summary>
                {a.limitations.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </details>
            </section>
          ) : (
            <SeasonCards assessment={a} views={[view]} />
          )}
          {app.seasonInput.intent === "water" ? (
            <Link
              className={c("primary button-link section-gap")}
              to="/compare"
            >
              {t.options} →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
