import { useState, useEffect, useRef } from "react";
import {
  waterPlanningInputSchema,
  type WaterPlanningInput,
} from "@kavach/contracts";
import { usePlanning, cls as c } from "./state";
import { planningCopy, cropNames } from "./planning-copy";
export function InputDialog({ close }: { close: () => void }) {
  const app = usePlanning(),
    t = planningCopy[app.locale],
    ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(app.input),
    [error, setError] = useState(""),
    [unknown, setUnknown] = useState(app.input.usableWaterLitres === null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const number = (key: keyof WaterPlanningInput, value: string) =>
    setDraft((v) => ({ ...v, [key]: value === "" ? null : Number(value) }));
  return (
    <dialog ref={ref} onClose={close} className={c("input-modal")}>
      <form
        className={c("dialog-inner")}
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = waterPlanningInputSchema.safeParse(draft);
          if (!parsed.success) {
            setError(t.invalid);
            return;
          }
          app.confirm(parsed.data);
          close();
        }}
      >
        <div className={c("dialog-title")}>
          <h2>{t.confirmTitle}</h2>
          <button type="button" aria-label={t.close} onClick={close}>
            ✕
          </button>
        </div>
        <div className={c("form-grid")}>
          <label>
            {t.location}
            <select
              aria-label={t.location}
              value={draft.regionId}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  regionId: e.target.value as WaterPlanningInput["regionId"],
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
              value={draft.crop}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  crop: e.target.value as WaterPlanningInput["crop"],
                })
              }
            >
              {Object.entries(cropNames[app.locale]).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ["plannedAreaAcres", t.area],
              ["alternativeAreaAcres", t.alternative],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min="0.1"
                max="100"
                step="any"
                required
                aria-label={label}
                value={draft[key] ?? ""}
                onChange={(e) => number(key, e.target.value)}
                inputMode="decimal"
              />
              <span className={c("small muted")}>0.1–100</span>
            </label>
          ))}
          <label className={c("full")}>
            {t.water}
            <input
              type="number"
              min="0"
              max="100000000"
              step="any"
              aria-label={t.water}
              value={draft.usableWaterLitres ?? ""}
              disabled={unknown}
              onChange={(e) => number("usableWaterLitres", e.target.value)}
              inputMode="decimal"
            />
            <span className={c("small muted")}>0–100,000,000 L</span>
          </label>
          <label className={c("check full")}>
            <input
              type="checkbox"
              checked={unknown}
              onChange={(e) => {
                setUnknown(e.target.checked);
                setDraft({ ...draft, usableWaterLitres: null });
              }}
            />
            {t.unknown}
          </label>
        </div>
        <div className={c("notice small")}>{t.caution}</div>
        <div className={c("form-grid")}>
          {(
            [
              ["netApplicationMm", t.depth, 300],
              ["efficiencyPct", t.efficiency, 100],
            ] as const
          ).map(([key, label, max]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min="1"
                max={max}
                step="any"
                aria-label={label}
                value={draft[key] ?? ""}
                onChange={(e) => number(key, e.target.value)}
                inputMode="decimal"
              />
              <span className={c("small muted")}>
                1–{max}. {t.optional}
              </span>
            </label>
          ))}
        </div>
        <p className={c("small muted")}>{t.one}</p>
        {error && <p role="alert">{error}</p>}
        <div className={c("cta-row")}>
          <button type="button" className={c("secondary")} onClick={close}>
            {t.cancel}
          </button>
          <button className={c("primary")}>{t.apply}</button>
        </div>
      </form>
    </dialog>
  );
}
