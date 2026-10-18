import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { usePlanning, useFormat, cls as c } from "./state";
import { planningCopy, cropNames } from "./planning-copy";
import { InputDialog } from "./input-dialog";
import { HelpDialog } from "./help-dialog";
import { Icon, Landscape } from "../demo/ui";
import type { DemoLocale } from "@kavach/contracts";
import "./planning.css";
export function PlanningLayout() {
  const app = usePlanning(),
    t = planningCopy[app.locale],
    path = useLocation({ select: (l) => l.pathname }),
    [help, setHelp] = useState(false),
    [edit, setEdit] = useState(false);
  const region = app.catalog.data?.data.regions.find(
    (r) => r.id === app.input.regionId,
  );
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [path]);
  const nav = (
    <>
      {(
        [
          { to: "/situation", label: t.situation, icon: "sample" },
          { to: "/compare", label: t.compare, icon: "water" },
          { to: "/next-steps", label: t.steps, icon: "check" },
        ] as const
      ).map((v) => (
        <Link
          className={c("nav-button")}
          activeProps={{ "aria-current": "page" }}
          to={v.to}
          key={v.to}
        >
          <Icon name={v.icon} />
          <span>{v.label}</span>
        </Link>
      ))}
    </>
  );
  return (
    <div className="planning-app">
      <a className="skip-link" href="#planning-main">
        Skip to content
      </a>
      <div className={c("shell")}>
        <aside className={c("rail")}>
          <Link to="/situation" className={c("brand")}>
            <span className={c("brand-shield")}>
              <Icon name="leaf" />
            </span>
            Kavach
          </Link>
          <nav aria-label="Main navigation">{nav}</nav>
          <button className={c("secondary")} onClick={() => setHelp(true)}>
            <Icon name="talk" size={20} /> {t.help}
          </button>
          <div className={c("rail-foot")}>{t.sample}</div>
        </aside>
        <div className={c("workspace")}>
          <header className={c("topbar")}>
            <Link to="/situation" className={c("brand mobile-brand")}>
              <Icon name="leaf" />
              Kavach
            </Link>
            <span className={c("sample-label")}>
              {region?.name || "Maharashtra"} · {t.example}
            </span>
            <label className={c("language")}>
              <span className="sr-only">Language</span>
              <select
                aria-label="Language"
                value={app.locale}
                onChange={(e) => app.setLocale(e.target.value as DemoLocale)}
              >
                <option value="en-IN">English</option>
                <option value="hi-IN">हिन्दी</option>
                <option value="mr-IN">मराठी</option>
              </select>
            </label>
          </header>
          <main id="planning-main" ref={main} className={c("main")}>
            <Outlet />
            <div className={c("context-actions no-print")}>
              <button className={c("help-entry")} onClick={() => setHelp(true)}>
                <Icon name="mic" size={19} />
                {t.help}
              </button>
              {path !== "/situation" && (
                <button className={c("link")} onClick={() => setEdit(true)}>
                  {t.edit}
                </button>
              )}
            </div>
          </main>
          <nav className={c("bottomnav")} aria-label="Mobile navigation">
            {nav}
          </nav>
        </div>
      </div>
      {help && (
        <HelpDialog
          key={app.locale + JSON.stringify(app.input)}
          close={() => setHelp(false)}
        />
      )}{" "}
      {edit && <InputDialog close={() => setEdit(false)} />}
    </div>
  );
}
function Intro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={c("intro")}>
      <h1>{title}</h1>
      <p className={c("muted")}>{children}</p>
    </div>
  );
}
function EditButton() {
  const app = usePlanning(),
    [open, setOpen] = useState(false);
  return (
    <>
      <button className={c("secondary")} onClick={() => setOpen(true)}>
        {planningCopy[app.locale].edit}
      </button>
      {open && <InputDialog close={() => setOpen(false)} />}
    </>
  );
}
export function SituationPage() {
  const app = usePlanning(),
    t = planningCopy[app.locale],
    f = useFormat(),
    region = app.catalog.data?.data.regions.find(
      (r) => r.id === app.input.regionId,
    );
  return (
    <>
      <Intro title={t.title}>{t.intro}</Intro>
      <div className={c("split")}>
        <section className={c("surface farm")}>
          <div className={c("form-grid")}>
            <label>
              {t.location}
              <select
                aria-label={t.location}
                value={app.input.regionId}
                disabled={!app.catalog.data}
                onChange={(e) =>
                  app.confirm({
                    ...app.input,
                    regionId: e.target.value as typeof app.input.regionId,
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
                    crop: e.target.value as typeof app.input.crop,
                  })
                }
              >
                {Object.entries(cropNames[app.locale]).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={c("crop-caption")}>
            <Icon name="leaf" size={22} />
            <strong>
              {cropNames[app.locale][app.input.crop]} ·{" "}
              {region?.name || "Latur"}
            </strong>
            <span>{t.before}</span>
          </div>
          <div className={c("farm-scene")} data-crop={app.input.crop}>
            <Landscape />
          </div>
          <div className={c("facts")}>
            <div className={c("fact")}>
              <span className={c("small muted")}>{t.area}</span>
              <strong>{f(app.input.plannedAreaAcres, 2)}</strong>
            </div>
            <div className={c("fact")}>
              <span className={c("small muted")}>{t.water}</span>
              <strong>
                {app.input.usableWaterLitres === null
                  ? t.notChecked
                  : f(app.input.usableWaterLitres)}
              </strong>
            </div>
          </div>
          <Link to="/compare" className={c("primary button-link")}>
            {t.start}
          </Link>
          <div className={c("cta-row")}>
            <EditButton />
            <span className={c("small muted")}>{t.before}</span>
          </div>
          <p className={c("small muted")}>{t.sample}</p>
        </section>
        <div className={c("stack side-stack")}>
          <div className={c("notice")}>
            <strong>{t.checkField}</strong>
            {t.fieldDetail}
          </div>
          <section className={c("surface")}>
            <h2>{t.rain}</h2>
            <p className={c("small muted section-gap")}>
              {region?.climate.status === "available"
                ? `${t.recent} · NASA POWER`
                : t.unavailable}
            </p>
            <Link className={c("link button-link")} to="/evidence">
              {t.source}
            </Link>
          </section>
          <div className={c("side-note")}>
            <h3>{t.assumptions}</h3>
            <p>{t.caution}</p>
          </div>
        </div>
      </div>
      {app.catalog.isError && (
        <div role="alert" className={c("notice section-gap")}>
          {t.failed}
          <button onClick={() => void app.catalog.refetch()}>{t.retry}</button>
        </div>
      )}
    </>
  );
}
export function ComparePage() {
  const app = usePlanning(),
    t = planningCopy[app.locale],
    f = useFormat(),
    result = app.plan.data?.data.calculation;
  return (
    <>
      <Intro title={t.compareTitle}>{t.compareIntro}</Intro>
      <div className={c("comparison-layout")}>
        <section className={c("surface input-summary")}>
          <div>
            <h2>{t.inputs}</h2>
            <p className={c("small muted")}>
              {cropNames[app.locale][app.input.crop]}
            </p>
          </div>
          <p>
            {f(app.input.plannedAreaAcres, 2)} /{" "}
            {f(app.input.alternativeAreaAcres, 2)} acres ·{" "}
            {app.input.usableWaterLitres === null
              ? t.notChecked
              : f(app.input.usableWaterLitres) + " L"}
          </p>
          <EditButton />
          <div className={c("notice small")}>
            {t.caution} {app.input.netApplicationMm ?? "—"} mm /{" "}
            {app.input.efficiencyPct ?? "—"}%.
          </div>
        </section>
        {app.plan.isPending ? (
          <div className={c("surface")} role="status">
            {t.loading}
          </div>
        ) : app.plan.isError ? (
          <div className={c("surface empty")} role="alert">
            <h2>{t.failed}</h2>
            <button
              className={c("primary")}
              onClick={() => void app.plan.refetch()}
            >
              {t.retry}
            </button>
            <EditButton />
          </div>
        ) : result?.status === "needs-input" ? (
          <div className={c("surface empty")}>
            <h2>{t.missing}</h2>
            <p>{t.missingDetail}</p>
            <EditButton />
          </div>
        ) : result?.status === "available" ? (
          <section className={c("surface")} aria-label={t.result}>
            <div className={c("calc-heading")}>
              <h2>{t.result}</h2>
              <span className={c("badge")}>{t.units}</span>
            </div>
            <div className={c("water-graphic")}>
              <p className={c("small")}>{t.one}</p>
              <div className={c("big")}>
                {f(result.coveredAreaAcres, 2)} <span>{t.covered}</span>
              </div>
              <div className={c("plot")} aria-hidden="true">
                {Array.from({ length: 12 }, (_, i) => (
                  <i key={i}>
                    <b
                      style={{
                        height:
                          Math.max(
                            0,
                            Math.min(
                              1,
                              Math.min(
                                1,
                                result.coveredAreaAcres /
                                  app.input.plannedAreaAcres,
                              ) *
                                12 -
                                i,
                            ),
                          ) *
                            100 +
                          "%",
                      }}
                    />
                  </i>
                ))}
              </div>
              <p className={c("small muted")}>{t.notMap}</p>
            </div>
            <div className={c("options")}>
              {result.options.map((option) => (
                <div
                  key={option.id}
                  className={c(
                    "option" + (app.selected === option.id ? " chosen" : ""),
                  )}
                >
                  <div className={c("option-head")}>
                    <strong>{f(option.areaAcres, 2)} acres</strong>
                    <span className={c("small muted")}>
                      {option.id === "planned" ? t.planned : t.alternativeLabel}
                    </span>
                  </div>
                  <div className={c("bar")} aria-hidden="true">
                    <span
                      style={{ width: option.coverageFraction * 100 + "%" }}
                    />
                  </div>
                  <p>
                    {t.needs}
                    <br />
                    <strong>{f(option.requiredWaterLitres)} L</strong>
                  </p>
                  <p className={c("muted")}>
                    {f(Math.abs(option.balanceLitres))}{" "}
                    {option.balanceLitres < 0 ? t.short : t.remain} {t.under}.
                  </p>
                  <button
                    className={c(
                      app.selected === option.id
                        ? "selected-option"
                        : "secondary",
                    )}
                    aria-pressed={app.selected === option.id}
                    onClick={() => app.setSelected(option.id)}
                  >
                    {app.selected === option.id ? t.selected : t.choose}
                  </button>
                </div>
              ))}
            </div>
            <div className={c("result-footer stack")}>
              <p className={c("small muted")}>{t.notAdvice}</p>
              {app.selected ? (
                <Link className={c("primary button-link")} to="/next-steps">
                  {t.next}
                </Link>
              ) : (
                <button className={c("primary")} disabled>
                  {t.next}
                </button>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
export function NextStepsPage() {
  const app = usePlanning(),
    t = planningCopy[app.locale],
    f = useFormat(),
    plan = app.plan.data?.data,
    result = plan?.calculation,
    option =
      result?.status === "available"
        ? result.options.find((o) => o.id === app.selected)
        : null;
  return (
    <>
      <Intro title={t.stepsTitle}>{t.stepsIntro}</Intro>
      {!option || !plan ? (
        <section className={c("surface empty")}>
          <h2>{t.first}</h2>
          <p>{t.firstDetail}</p>
          <Link className={c("primary button-link")} to="/compare">
            {t.start}
          </Link>
        </section>
      ) : (
        <div className={c("split")}>
          <section className={c("surface")}>
            <h2>{t.checks}</h2>
            {[
              [t.checkWater, t.waterDetail],
              [t.checkField, t.fieldDetail],
              [t.checkApplication, t.applicationDetail],
            ].map(([title, detail], i) => (
              <div key={title} className={c("step")}>
                <span className={c("number")}>{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
              </div>
            ))}
            <div className={c("notice section-gap")}>
              <strong>{t.unreviewed}</strong>
              {t.unreviewedDetail}
            </div>
          </section>
          <section className={c("surface receipt")}>
            <p className={c("small muted")}>{t.sheet}</p>
            <h2>
              {cropNames[app.locale][app.input.crop]} · {plan.regionName}
            </h2>
            <dl>
              {[
                [t.area, f(option.areaAcres, 2)],
                [t.water, f(app.input.usableWaterLitres!) + " L"],
                [t.needs, f(option.requiredWaterLitres) + " L"],
                [
                  option.balanceLitres < 0 ? t.short : t.remain,
                  f(Math.abs(option.balanceLitres)) + " L",
                ],
                [t.depth, f(app.input.netApplicationMm!) + " mm"],
                [t.efficiency, f(app.input.efficiencyPct!) + "%"],
                [t.moisture, t.notChecked],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className={c("small muted")}>{t.noSave}</p>
            <p className={c("small muted")}>
              {t.one} {t.caution}
            </p>
            <details className={c("section-gap")}>
              <summary>{t.method}</summary>
              <p className={c("small")}>
                m³ = acres × 0.40468564224 × mm × 10 ÷ (efficiency / 100). L =
                m³ × 1,000.
              </p>
              <p className={c("small muted")}>{result?.methodVersion}</p>
              <a href={plan.method.url} target="_blank" rel="noreferrer">
                {plan.method.title}
              </a>
            </details>
            <div className={c("stack section-gap no-print")}>
              <button className={c("primary")} onClick={() => window.print()}>
                {t.print}
              </button>
              <Link className={c("secondary button-link")} to="/compare">
                {t.edit}
              </Link>
            </div>
            <p className={c("print-only small")}>
              {t.sample} · {new Date().toLocaleString(app.locale)}
              <br />
              {result?.methodVersion} · {plan.method.title}
              <br />
              m³ = acres × 0.40468564224 × mm × 10 ÷ (efficiency / 100). L = m³
              × 1,000.
              <br />
              {plan.method.url}
              <br />
              {t.unreviewedDetail}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
export function EvidencePage() {
  const app = usePlanning(),
    t = planningCopy[app.locale],
    f = useFormat(),
    climate = app.catalog.data?.data.regions.find(
      (r) => r.id === app.input.regionId,
    )?.climate;
  return (
    <>
      <Intro title={t.rain}>{t.unavailable}</Intro>
      <section className={c("surface stack")}>
        <h2>
          {app.input.regionId[0]!.toUpperCase() + app.input.regionId.slice(1)}
        </h2>
        {climate?.status === "available" ? (
          <>
            <div className={c("source-bars")}>
              {[
                [t.recent, climate.totalMm],
                [t.baseline, climate.baseline.meanMm],
              ].map(([label, value]) => (
                <div className={c("source-row")} key={label}>
                  <strong>
                    {label}: {f(Number(value), 2)} mm
                  </strong>
                  <div className={c("bar")}>
                    <span
                      style={{
                        width:
                          (Number(value) /
                            Math.max(
                              climate.totalMm,
                              climate.baseline.meanMm,
                            )) *
                            100 +
                          "%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p>
              <strong>
                {f(Math.abs(climate.departurePct), 1)}%{" "}
                {climate.departurePct < 0 ? t.less : t.more} {t.historical}
              </strong>
            </p>
            <div className={c("notice")}>{t.fieldDetail}</div>
            <dl className={c("evidence-meta")}>
              <dt>{t.from}</dt>
              <dd>
                {climate.provider} · {climate.product}
              </dd>
              <dt>Period</dt>
              <dd>
                {climate.period.start} – {climate.period.end}
              </dd>
              <dt>Retrieved</dt>
              <dd>
                {new Date(climate.retrievedAt).toLocaleString(app.locale)}
              </dd>
              <dt>Grid</dt>
              <dd>{climate.location.resolution}</dd>
              <dt>Point</dt>
              <dd>
                {climate.location.latitude}° N, {climate.location.longitude}° E
                · {climate.location.scope}
              </dd>
            </dl>
            <p className={c("small muted")}>
              {t.one} {t.notAdvice}
            </p>
            <details>
              <summary>{t.details}</summary>
              <ul>
                {climate.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <p>
                Each historical total uses the same complete 92-day period.
                Values are reanalysis grid averages, not field observations.
              </p>
            </details>
            <a href={climate.sourceUrl} target="_blank" rel="noreferrer">
              NASA POWER · Daily API
            </a>
          </>
        ) : (
          <>
            <p>{t.failed}</p>
            <button onClick={() => void app.catalog.refetch()}>
              {t.retry}
            </button>
          </>
        )}
      </section>
    </>
  );
}
