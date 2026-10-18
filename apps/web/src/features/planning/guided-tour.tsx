import type { DemoLocale } from "@kavach/contracts";
import { guidedTourCopy } from "./guided-tour-copy";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { usePlanning, cls as c } from "./state";
import { seasonCopy } from "./season-copy";
const KEY = "kavach.walkthrough.readiness.v1";
export function GuidedTour() {
  const app = usePlanning(),
    navigate = useNavigate(),
    copy = guidedTourCopy[app.locale],
    steps = copy.steps;
  const [open, setOpen] = useState(() => {
      try {
        return localStorage.getItem(KEY) !== "done";
      } catch {
        return true;
      }
    }),
    [step, setStep] = useState(0),
    [rect, setRect] = useState<DOMRect | null>(null);
  const dialog = useRef<HTMLDivElement>(null),
    previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open || !app.season.data) return;
    previous.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current
      ?.querySelector<HTMLElement>(
        "select:not(:disabled), button:not(:disabled)",
      )
      ?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous.current?.focus();
    };
  }, [open, app.season.data]);
  useEffect(() => {
    if (!open || !app.season.data) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    app.setSeasonView("season-summary");
    const findTarget = () => {
      const container = Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-tour="${steps[step]!.target}"]`,
        ),
      ).find(
        (e) =>
          e.getBoundingClientRect().width > 0 &&
          e.getBoundingClientRect().height > 0,
      );
      return (
        container?.querySelector<HTMLElement>("[data-tour-focus]") || container
      );
    };
    const update = () => {
      if (!cancelled) setRect(findTarget()?.getBoundingClientRect() || null);
    };
    void navigate({ to: "/situation" }).then(() => {
      if (cancelled) return;
      findTarget()?.scrollIntoView({
        block: "start",
        inline: "nearest",
        behavior: "instant",
      });
      timer = setTimeout(update, 80);
    });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step, app.season.data, app.setSeasonView, steps, navigate]);
  const finish = () => {
    try {
      localStorage.setItem(KEY, "done");
    } catch {
      /* A storage restriction must not block the app. */
    }
    setRect(null);
    setOpen(false);
  };
  const t = seasonCopy[app.locale];
  return (
    <>
      <button
        className={c("tour-replay")}
        onClick={() => {
          setRect(null);
          app.setSeasonView("season-summary");
          setStep(0);
          setOpen(true);
        }}
      >
        {t.tour}
      </button>
      {open && app.season.data ? (
        <div
          className={c("tour-overlay")}
          onKeyDown={(e) => {
            if (e.key === "Escape") finish();
            if (e.key === "Tab") {
              const buttons = dialog.current?.querySelectorAll<HTMLElement>(
                "select:not(:disabled), button:not(:disabled)",
              );
              if (!buttons?.length) return;
              const first = buttons[0]!,
                last = buttons[buttons.length - 1]!;
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }
          }}
        >
          {rect ? (
            <div
              className={c("tour-highlight")}
              style={{
                top: Math.max(4, rect.top - 6),
                left: Math.max(4, rect.left - 6),
                width: Math.min(rect.width + 12, window.innerWidth - 8),
                height: Math.max(
                  0,
                  Math.min(rect.bottom + 6, window.innerHeight - 4) -
                    Math.max(4, rect.top - 6),
                ),
              }}
            />
          ) : null}
          <div
            ref={dialog}
            tabIndex={-1}
            className={c("tour-dialog")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            aria-describedby="tour-description"
            style={
              rect && rect.top > window.innerHeight * 0.5
                ? { top: 20, bottom: "auto" }
                : undefined
            }
          >
            <div className={c("tour-progress")}>
              <span>
                {step + 1} / {steps.length}
              </span>
              <select
                aria-label="Walkthrough language / भाषा"
                value={app.locale}
                onChange={(event) =>
                  app.setLocale(event.target.value as DemoLocale)
                }
              >
                <option value="en-IN">English</option>
                <option value="hi-IN">हिन्दी</option>
                <option value="mr-IN">मराठी</option>
              </select>
              <button onClick={finish}>{copy.skip}</button>
            </div>
            <h2 id="tour-title">{steps[step]!.title}</h2>
            <p id="tour-description">{steps[step]!.body}</p>
            <div className={c("tour-controls")}>
              <button
                disabled={step === 0}
                onClick={() => {
                  setRect(null);
                  setStep((v) => v - 1);
                }}
              >
                {copy.back}
              </button>
              <button
                className={c("primary")}
                onClick={() => {
                  if (step === steps.length - 1) finish();
                  else {
                    setRect(null);
                    setStep((v) => v + 1);
                  }
                }}
              >
                {step === steps.length - 1 ? copy.finish : copy.next}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
