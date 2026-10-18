import {
  waterPlanningInputSchema,
  waterPlanningResultSchema,
  type WaterPlanningInput,
  type WaterPlanningResult,
} from "@kavach/contracts";
/** One application, conditional on supplied inputs; never a crop-water recommendation. */
export function calculateWaterPlan(
  raw: WaterPlanningInput,
): WaterPlanningResult {
  const inputs = waterPlanningInputSchema.parse(raw);
  const base = {
    inputs,
    methodVersion: "water-volume/1" as const,
    assumptionsStatus: "illustrative" as const,
    agronomicReview: "unreviewed" as const,
  };
  const missingInputs: ("usable-water" | "application-depth" | "efficiency")[] =
    [];
  if (inputs.usableWaterLitres === null) missingInputs.push("usable-water");
  if (inputs.netApplicationMm === null) missingInputs.push("application-depth");
  if (inputs.efficiencyPct === null) missingInputs.push("efficiency");
  if (missingInputs.length)
    return { ...base, status: "needs-input", missingInputs };
  const water = inputs.usableWaterLitres!,
    depth = inputs.netApplicationMm!,
    efficiency = inputs.efficiencyPct! / 100;
  const litresPerAcre = ((0.40468564224 * depth * 10) / efficiency) * 1000;
  return waterPlanningResultSchema.parse({
    ...base,
    status: "available",
    coveredAreaAcres: water / litresPerAcre,
    options: (["planned", "alternative"] as const).map((id) => {
      const areaAcres =
        id === "planned"
          ? inputs.plannedAreaAcres
          : inputs.alternativeAreaAcres;
      const requiredWaterLitres = areaAcres * litresPerAcre;
      return {
        id,
        areaAcres,
        requiredWaterLitres,
        balanceLitres: water - requiredWaterLitres,
        coverageFraction: Math.min(1, water / requiredWaterLitres),
      };
    }),
  });
}
