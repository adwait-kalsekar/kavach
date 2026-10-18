import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { createDemoClient } from "@kavach/api-client";
import type {
  SeasonInput,
  SeasonAssessment,
  SeasonView,
  WaterPlan,
  WaterPlanningInput,
  DemoLocale,
} from "@kavach/contracts";
export const planningApi = createDemoClient(
  window.__KAVACH_CONFIG__?.apiOrigin || "",
);
export const initialInput: WaterPlanningInput = {
  regionId: "latur",
  crop: "chickpea",
  plannedAreaAcres: 3,
  alternativeAreaAcres: 1.5,
  usableWaterLitres: 180000,
  netApplicationMm: 20,
  efficiencyPct: 70,
};
function useStateValue() {
  const [input, setInput] = useState(initialInput);
  const [seasonView, setSeasonView] = useState<SeasonView | "sources">(
    "season-summary",
  );
  const [locale, setLocale] = useState<DemoLocale>(() => {
    try {
      const saved = localStorage.getItem("kavach.locale.v1");
      if (saved === "en-IN" || saved === "hi-IN" || saved === "mr-IN")
        return saved;
    } catch {
      /* Browser storage may be unavailable. */
    }
    return "en-IN";
  });
  useEffect(() => {
    try {
      localStorage.setItem("kavach.locale.v1", locale);
    } catch {
      /* Language still works for the visit. */
    }
  }, [locale]);
  const [chat, setChat] = useState<
    {
      id: string;
      role: "user" | "assistant";
      text: string;
      locale: DemoLocale;
      model?: string;
      seasonAnswer?: {
        assessment: SeasonAssessment;
        views: SeasonView[];
        replyStyle?: "standard" | "one-line" | "simple";
        waterPlan?: WaterPlan;
      };
    }[]
  >([]);
  const [seasonFacts, setSeasonFacts] = useState<
    Omit<SeasonInput, "regionId" | "crop" | "contextVersion">
  >({
    intent: "sowing",
    stage: "pre-sowing",
    soil: "unknown",
    moisture: "unknown",
    irrigation: "unknown",
    soilType: "unknown",
    wellRecharge: "unknown",
  });
  const seasonInput: SeasonInput = {
    contextVersion: 2,
    regionId: input.regionId,
    crop: input.crop,
    ...seasonFacts,
  };
  const season = useQuery({
    queryKey: ["planning", "readiness", seasonInput],
    queryFn: ({ signal }) => planningApi.readiness(seasonInput, signal),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const updateSeason = (patch: Partial<typeof seasonFacts>) => {
    setSeasonFacts((v) => ({
      ...v,
      ...patch,
      ...(patch.stage && patch.intent === undefined && v.intent !== "water"
        ? {
            intent:
              patch.stage === "pre-sowing"
                ? ("sowing" as const)
                : ("growing" as const),
          }
        : {}),
    }));
    setChat([]);
    setSelected(null);
  };
  const [selected, setSelected] = useState<"planned" | "alternative" | null>(
    null,
  );
  const catalog = useQuery({
    queryKey: ["planning", "catalog"],
    queryFn: ({ signal }) => planningApi.planning(signal),
    staleTime: Infinity,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const plan = useQuery({
    queryKey: ["planning", "water", input],
    queryFn: ({ signal }) => planningApi.waterPlan(input, signal),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const confirm = (value: WaterPlanningInput) => {
    if (value.regionId !== input.regionId)
      setSeasonFacts((v) => ({
        ...v,
        soil: "unknown",
        soilType: "unknown",
        wellRecharge: "unknown",
        moisture: "unknown",
        irrigation: "unknown",
        intent: "sowing",
        stage: "pre-sowing",
      }));
    else if (value.crop !== input.crop)
      setSeasonFacts((v) => ({ ...v, intent: "sowing", stage: "pre-sowing" }));
    setSelected(null);
    setChat([]);
    setInput(value);
  };
  return {
    input,
    seasonInput,
    seasonView,
    setSeasonView,
    season,
    updateSeason,
    confirm,
    locale,
    setLocale,
    chat,
    setChat,
    selected,
    setSelected,
    catalog,
    plan,
  };
}
const Context = createContext<ReturnType<typeof useStateValue> | null>(null);
export function PlanningProvider({ children }: { children: ReactNode }) {
  const value = useStateValue();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePlanning() {
  const v = useContext(Context);
  if (!v) throw new Error("Planning provider required");
  return v;
}
export const cls = (names: string) =>
  names
    .split(" ")
    .map((n) => "fp-" + n)
    .join(" ");
export function useFormat() {
  const { locale } = usePlanning();
  return (n: number, digits = 0) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n);
}
