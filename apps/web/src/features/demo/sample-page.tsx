import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { Assessment } from "@kavach/contracts";
import { demoApi, scenarioId, useKavach, type Water } from "./state";
import { Icon, Landscape } from "./ui";
export function CheckList({ actions }: { actions: Assessment["actions"] }) {
  const { t } = useKavach();
  const labels: Record<string, { title: string; detail: string }> = {
    "check-moisture": { title: t.field, detail: t.fieldBody },
    "limited-water": { title: t.one, detail: t.oneBody },
    "rainfed-check": { title: t.none, detail: t.noneBody },
    "irrigated-check": { title: t.assured, detail: t.assuredBody },
  };
  return (
    <div className="check-list">
      {actions.map((action) => (
        <article className="planning-check" key={action.id}>
          <span
            className={
              "check-symbol " +
              (action.id === "check-moisture" ? "check-caution" : "")
            }
          >
            <Icon
              name={action.id === "check-moisture" ? "info" : "water"}
              size={21}
            />
          </span>
          <div>
            <h3>{labels[action.id]?.title || action.title}</h3>
            <p>{labels[action.id]?.detail || action.detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
export function SamplePage() {
  const app = useKavach();
  const { t } = app;
  const current =
    app.assessment.data?.data.comparison || app.assessment.data?.data.baseline;
  return (
    <div className="detail-screen">
      <header className="page-title">
        <p>{t.sampleOnly}</p>
        <h1>{t.sampleTitle}</h1>
        <span>{t.synthetic}</span>
      </header>
      <section className="sample-identity">
        <Landscape />
        <div>
          <span className="sample-label">{t.sampleOnly}</span>
          <h2>{t.place}</h2>
          <p>{t.crop}</p>
          <div className="identity-pills">
            <span>
              <Icon name="water" size={16} />
              {t[app.water]}
            </span>
            <span>
              <Icon name="info" size={16} />
              {t.moisture}
            </span>
          </div>
        </div>
      </section>
      <section className="current-checks">
        <div className="section-title">
          <h2>{t.checks}</h2>
        </div>
        {current ? (
          <CheckList actions={current.actions} />
        ) : (
          <div role="status">
            <p>{app.assessment.isError ? t.loadError : t.loading}</p>
            {app.assessment.isError && (
              <button
                className="plain-button"
                onClick={() => void app.assessment.refetch()}
              >
                {t.retry}
              </button>
            )}
          </div>
        )}
        <Link className="primary-button full-button" to="/sample/compare">
          {t.compare}
          <Icon name="arrow" size={18} />
        </Link>
        <Link className="link-button" to="/talk">
          {t.askAbout}
          <Icon name="talk" size={18} />
        </Link>
      </section>
      <Link className="subtle-source-link" to="/sources">
        {t.sourcesNav}
        <Icon name="info" size={16} />
      </Link>
    </div>
  );
}
export function ComparePage() {
  const app = useKavach();
  const { t } = app;
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Water>(app.water);
  const [previewWater, setPreviewWater] = useState<Water | null>(null);
  const preview = useQuery({
    queryKey: ["demo", "preview", previewWater],
    queryFn: ({ signal }) =>
      demoApi.assess(
        { scenarioId, changes: { irrigation: previewWater! } },
        signal,
      ),
    enabled: previewWater !== null,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const comparison =
    preview.data?.data.comparison || preview.data?.data.baseline;
  const base = preview.data?.data.baseline;
  const common =
    base?.actions.filter((action) =>
      comparison?.actions.some((next) => next.id === action.id),
    ) || [];
  const commonIds = new Set(common.map((action) => action.id));
  return (
    <div className="detail-screen compare-screen">
      <Link to="/sample" className="back-link">
        <Icon name="back" size={18} />
        {t.sampleNav}
      </Link>
      <header className="page-title">
        <h1>{previewWater === null ? t.compare : t.previewTitle}</h1>
        <span>{t.sampleSubtitle}</span>
      </header>
      {previewWater === null ? (
        <section className="water-editor">
          <h2>{t.chooseWater}</h2>
          <div className="water-options" role="radiogroup" aria-label={t.water}>
            {(["none", "one", "assured"] as Water[]).map((value) => (
              <label key={value} className={draft === value ? "selected" : ""}>
                <input
                  type="radio"
                  name="irrigation"
                  value={value}
                  checked={draft === value}
                  onChange={() => setDraft(value)}
                />
                <span>{t[value]}</span>
                <Icon name={draft === value ? "check" : "water"} size={20} />
              </label>
            ))}
          </div>
          <button
            className="primary-button full-button"
            onClick={() => setPreviewWater(draft)}
          >
            {t.previewButton}
            <Icon name="arrow" size={18} />
          </button>
          <p className="muted small-copy">{t.previewOnly}</p>
        </section>
      ) : (
        <section className="comparison-panel" aria-live="polite">
          {preview.isPending ? (
            <p role="status">{t.loading}</p>
          ) : preview.isError ? (
            <div role="alert">
              <p>{t.previewFailed}</p>
              <button
                className="plain-button"
                onClick={() => void preview.refetch()}
              >
                {t.retry}
              </button>
            </div>
          ) : base && comparison ? (
            <>
              <div className="comparison-columns">
                <div>
                  <span>{t.baselineTitle}</span>
                  <strong>{t.one}</strong>
                  <CheckList
                    actions={base.actions.filter(
                      (action) => !commonIds.has(action.id),
                    )}
                  />
                </div>
                <div className="candidate-column">
                  <span>{t.candidateTitle}</span>
                  <strong>{t[previewWater]}</strong>
                  <CheckList
                    actions={comparison.actions.filter(
                      (action) => !commonIds.has(action.id),
                    )}
                  />
                </div>
              </div>
              {common.length > 0 && (
                <div className="common-check">
                  <h3>{t.stillNeeded}</h3>
                  <CheckList actions={common} />
                </div>
              )}
              <p className="muted small-copy">{t.previewOnly}</p>
              <button
                className="primary-button full-button"
                disabled={preview.isFetching}
                onClick={() => {
                  app.applyWater(previewWater);
                  void navigate({ to: "/sample" });
                }}
              >
                <Icon name="check" size={18} />
                {t.applyPreview}
              </button>
            </>
          ) : null}
          <button
            className="plain-button full-button change-comparison"
            onClick={() => setPreviewWater(null)}
          >
            {t.cancel}
          </button>
        </section>
      )}
      <p className="page-limit">
        <Icon name="info" size={16} />
        {t.limitIntro}
      </p>
    </div>
  );
}
