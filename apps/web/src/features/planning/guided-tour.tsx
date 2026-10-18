import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { usePlanning, cls as c } from "./state";
import { seasonCopy } from "./season-copy";
const KEY = "kavach.walkthrough.readiness.v1";
const steps = [
  {
    target: "profile",
    title: "Start with your district and crop",
    body: "Choose any of the ten Maharashtra districts and gram, rabi jowar or wheat. This is a synthetic farm profile; no account is needed.",
  },
  {
    target: "intent",
    title: "Choose what you want to do",
    body: "Prepare for sowing, care for a growing crop, or explore water options. Add what you know about soil, moisture and irrigation; “I haven’t checked” is valid.",
  },
  {
    target: "evidence",
    title: "Understand your season",
    body: "Rainfall history and modeled moisture/heat are dated regional evidence. They do not measure your field or guarantee that sowing is safe.",
  },
  {
    target: "actions",
    title: "See the checks that apply",
    body: "Open field checks for crop- and situation-specific next steps and source pages. Historical calendars are reference material; current local advice still needs confirmation.",
  },
  {
    target: "options",
    title: "Explore your water options",
    body: "Compare two areas for one illustrative water application. This helps discuss a water gap; it is not a whole-season irrigation recommendation.",
  },
  {
    target: "talk",
    title: "Ask and see the evidence",
    body: "Type or tap the microphone, speak, then tap to finish. Hear a short reply and see relevant evidence cards. Google explanations can be unavailable; your evidence and checks still work.",
  },
] as const;
export function GuidedTour() {
  const app = usePlanning(),
    navigate = useNavigate();
  const [open, setOpen] = useState(() => {
      try {
        return !localStorage.getItem(KEY);
      } catch {
        return false;
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
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous.current?.focus();
    };
  }, [open, app.season.data]);
  useEffect(() => {
    if (!open || !app.season.data) return;
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-tour="${steps[step]!.target}"]`,
        ),
      ).find(
        (e) =>
          e.getBoundingClientRect().width > 0 &&
          e.getBoundingClientRect().height > 0,
      );
      if (target) {
        target.scrollIntoView({ block: "center", behavior: "instant" });
        setRect(target.getBoundingClientRect());
      }
    };
    void navigate({ to: "/situation" }).then(() => {
      timer = setTimeout(update, 80);
    });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step, app.season.data, navigate]);
  const finish = () => {
    try {
      localStorage.setItem(KEY, "done");
    } catch {
      /* A storage restriction must not block the app. */
    }
    setOpen(false);
  };
  const t = seasonCopy[app.locale];
  return (
    <>
      <button
        className={c("tour-replay")}
        onClick={() => {
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
              const buttons =
                dialog.current?.querySelectorAll<HTMLButtonElement>(
                  "button:not(:disabled)",
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
                height: Math.min(rect.height + 12, window.innerHeight - 8),
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
              <button onClick={finish}>
                {app.locale === "en-IN"
                  ? "Skip"
                  : app.locale === "hi-IN"
                    ? "छोड़ें"
                    : "वगळा"}
              </button>
            </div>
            <h2 id="tour-title">{steps[step]!.title}</h2>
            <p id="tour-description">{steps[step]!.body}</p>
            <div className={c("tour-controls")}>
              <button
                disabled={step === 0}
                onClick={() => setStep((v) => v - 1)}
              >
                {app.locale === "en-IN" ? "Back" : "मागे"}
              </button>
              <button
                className={c("primary")}
                onClick={() =>
                  step === steps.length - 1 ? finish() : setStep((v) => v + 1)
                }
              >
                {step === steps.length - 1
                  ? app.locale === "en-IN"
                    ? "Start using Kavach"
                    : "सुरू करें"
                  : app.locale === "en-IN"
                    ? "Next"
                    : "पुढे"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
