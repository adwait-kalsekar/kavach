import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { createDemoClient } from "@kavach/api-client";
import type { WaterPlanningInput, DemoLocale } from "@kavach/contracts";
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
  const [locale, setLocale] = useState<DemoLocale>("en-IN");
  const [spoken, setSpoken] = useState(true);
  const [chat, setChat] = useState<
    {
      id: string;
      role: "user" | "assistant";
      text: string;
      locale: DemoLocale;
      model?: string;
    }[]
  >([]);
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
    setSelected(null);
    setChat([]);
    setInput(value);
  };
  return {
    input,
    confirm,
    locale,
    setLocale,
    spoken,
    setSpoken,
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
