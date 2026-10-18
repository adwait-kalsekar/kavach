import {
  seasonInputSchema,
  seasonAssessmentSchema,
  type SeasonInput,
  type RegionEvidence,
  type CropRulePack,
  type SeasonAssessment,
} from "@kavach/contracts";
/** Pure, auditable prerequisites. No calibrated yield-loss or sowing-safety score. */
export function assessSeason(
  input: SeasonInput,
  evidence: RegionEvidence,
  rules: CropRulePack,
  now: string,
): SeasonAssessment {
  input = seasonInputSchema.parse(input);
  if (
    rules.guidance.some(
      (g) =>
        g.crop !== input.crop || (g.regionId && g.regionId !== input.regionId),
    )
  )
    throw Error("Mismatched crop guidance");
  if (
    input.regionId !== evidence.regionId ||
    input.regionId !== rules.regionId ||
    input.crop !== rules.crop
  )
    throw new Error("Region/crop evidence mismatch");
  const date = new Date(new Date(now).getTime() + 330 * 60000)
      .toISOString()
      .slice(0, 10),
    bulletin = rules.bulletin;
  const validThrough = bulletin
    ? input.intent === "sowing"
      ? bulletin.sowingWindowThrough
      : bulletin.forecastThrough
    : null;
  const guidanceStatus = !bulletin
    ? "historical-only"
    : validThrough! < date
      ? "expired-bulletin"
      : "dated-bulletin";
  const missing: SeasonAssessment["missing"] = [
    ...(input.moisture === "unknown" ? ["field-moisture" as const] : []),
    ...(input.soil === "unknown" ? ["soil-depth" as const] : []),
    ...(input.irrigation === "unknown"
      ? ["irrigation-certainty" as const]
      : []),
    "current-reviewed-guidance",
  ];
  const crop = { chickpea: "gram", sorghum: "rabi jowar", wheat: "wheat" }[
    input.crop
  ];
  const source = {
    sourceUrl: rules.source.url,
    sourceTitle: rules.source.title,
    sourcePage: rules.source.pdfPage,
    status: "verification-needed" as const,
  };
  const actions: SeasonAssessment["actions"] = [
    {
      ...source,
      id: "field-moisture",
      kind: "field-check",
      title:
        input.stage === "pre-sowing"
          ? "Check moisture where you plan to sow"
          : "Check moisture around your crop",
      detail:
        input.moisture === "unknown"
          ? "Regional rainfall and modeled surface moisture cannot tell us whether your field has enough moisture. Check the field and discuss the soil depth with your local adviser."
          : `You described the field as ${input.moisture}. This is your observation, not a satellite measurement. Confirm what it means for ${crop} at the ${input.stage} stage before acting.`,
      when:
        input.intent === "sowing"
          ? "Before buying seed or deciding to sow"
          : "Before changing crop care",
      reason:
        "Field conditions and crop stage determine which local contingency applies.",
    },
    {
      ...source,
      id: "water-certainty",
      kind: "water-check",
      title:
        input.irrigation === "none"
          ? "Check the rainfed option for this crop"
          : "Confirm what water you can rely on",
      detail:
        input.irrigation === "unknown"
          ? "Tell us whether irrigation is unavailable, limited or assured. A nearby reservoir does not establish your access."
          : input.irrigation === "none"
            ? rules.rainfedWindow
              ? `This district’s historical plan includes a rainfed ${crop} calendar. That is context to discuss locally, not confirmation that this season or your field is suitable.`
              : `A rainfed ${crop} calendar is not listed in this district’s historical table. Ask the local adviser about a supported option before committing seed or money.`
            : `You selected ${input.irrigation} irrigation. Confirm usable supply and timing with the person who manages it. The water comparison checks one illustrative application, not whole-season demand.`,
      when: "Before committing an area",
      reason: "Rainfed and irrigated contexts differ by district and crop.",
    },
    {
      ...source,
      id: "crop-context",
      kind: "crop-check",
      title:
        input.crop === "sorghum"
          ? "Confirm the rabi jowar context"
          : input.crop === "wheat"
            ? "Check the local wheat calendar"
            : "Check the local gram calendar",
      detail:
        input.stage !== "pre-sowing"
          ? `Your crop is at the ${input.stage} stage. A sowing calendar is not a care instruction for an established crop; ask for stage-specific ${crop} guidance.`
          : input.crop === "sorghum"
            ? "This pack concerns rabi jowar. Kharif sorghum instructions are different. Confirm soil depth, crop purpose and a current local recommendation."
            : `The historical ${evidence.name} calendar differs between rainfed and irrigated ${crop}. Open the source context and ask for the current recommendation; do not reuse historical dates as a prescription.`,
      when:
        input.stage === "pre-sowing"
          ? "Before choosing seed or timing"
          : "Before the next crop operation",
      reason: `Matched ${input.crop}, ${input.stage}, ${input.soil} soil context; independent agronomic review is still pending.`,
    },
    {
      ...source,
      id: "current-guidance",
      kind: "source-check",
      title: "Confirm the latest local advisory",
      detail: !bulletin
        ? "A current district bulletin has not been acquired for this pack. The available contingency calendar is historical. Request current crop- and stage-specific guidance from the local KVK/AMFU."
        : guidanceStatus === "expired-bulletin"
          ? `The acquired bulletin was issued ${bulletin.issued}; the relevant ${input.intent === "sowing" ? "sowing window" : "forecast period"} ended ${validThrough}. It cannot answer a new operation date. Ask for the latest district bulletin.`
          : `The acquired bulletin was issued ${bulletin.issued}, with forecasts through ${bulletin.forecastThrough}. Confirm its crop/stage applicability locally; the app has not independently reviewed agronomic prescriptions.`,
      ...(bulletin
        ? {
            sourceUrl: bulletin.url,
            sourceTitle: "VNMKV district advisory · 13 October 2026",
            sourcePage: bulletin.pdfPage,
          }
        : {}),
      when: "Before acting on a date or recommendation",
      reason:
        "Only applicable, current and reviewed advice can support a prescription.",
    },
  ];
  const dryRank = (values: number[], current: number) =>
    (100 *
      (values.filter((v) => v < current).length +
        0.5 * values.filter((v) => v === current).length)) /
    values.length;
  const rainDryRankPct = dryRank(
    evidence.rainfall.baselineTotals.map((v) => v.totalMm),
    evidence.rainfall.totalMm,
  );
  const surfaceDryRankPct = dryRank(
    evidence.surface.baselineMoistureTotals.map((v) => v.value),
    evidence.surface.moisture,
  );
  const lowRain = rainDryRankPct <= 20,
    lowMoisture = surfaceDryRankPct <= 20;
  const stress = {
    methodVersion: "experimental-regional-stress/1" as const,
    level:
      lowRain && lowMoisture
        ? ("high" as const)
        : lowRain || lowMoisture
          ? ("moderate" as const)
          : ("lower" as const),
    rainDryRankPct,
    surfaceDryRankPct,
    limitation:
      "Experimental regional water-stress indicator: high means rainfall and modeled surface moisture are both in the driest fifth of their matched 1991–2020 baselines; moderate means one is. Not a farm-loss probability, validated agronomic risk or sowing approval.",
  };
  const cropOptions = rules.guidance.map((rule) => {
    const missing: string[] = [...rule.confirmationChecks];
    if (rule.requiresDryField && input.moisture === "unknown")
      missing.push("field-moisture");
    if (input.irrigation === "unknown") missing.push("irrigation-availability");
    if (rule.requiresBlackDeepSoil) {
      if (input.soil === "unknown") missing.push("soil-depth");
      if (input.soilType === "unknown") missing.push("soil-type");
    }
    if (rule.requiresLowWellRecharge && input.wellRecharge === "unknown")
      missing.push("well-recharge");
    if (rule.requiresTwoStageSupply && input.irrigation !== "assured")
      missing.push("two-stage-water-supply");
    const different =
      !rule.stages.includes(input.stage) ||
      (input.irrigation !== "unknown" &&
        !rule.irrigation.includes(input.irrigation)) ||
      (rule.requiresDryField && input.moisture === "moist") ||
      (rule.requiresBlackDeepSoil &&
        (input.soil === "shallow" || input.soilType === "other")) ||
      (rule.requiresLowWellRecharge && input.wellRecharge === "not-applicable");
    const status = different
      ? ("different-context" as const)
      : missing.length
        ? ("needs-input" as const)
        : ("reported-context-matches" as const);
    return {
      rule,
      status,
      missing,
      reason: different
        ? "Your selected crop stage or reported field/water situation differs from this source condition."
        : missing.length
          ? "Required field facts are not yet checked. This option is not selected for your situation."
          : "The checked input categories match this source option. Confirm all source conditions and current local suitability with an adviser; independent rule review is pending.",
    };
  });
  return seasonAssessmentSchema.parse({
    demo: true,
    persisted: false,
    methodVersion: "season-readiness/1",
    assessedAt: now,
    input,
    evidence,
    cropContext: rules,
    stress,
    cropOptions,
    regionalSignal:
      evidence.rainfall.departurePct < 0
        ? "below-baseline"
        : "at-or-above-baseline",
    readiness:
      input.moisture === "unknown"
        ? "needs-field-check"
        : input.irrigation === "unknown" || input.irrigation === "none"
          ? "needs-water-check"
          : "needs-current-guidance",
    missing,
    actions,
    guidanceStatus,
    limitations: [
      "Regional indicators and conditional checks, not a calibrated farm risk score or sowing approval.",
      "All sampling locations are approximate town-centre grids, not district averages or observations of your field.",
      "Rainfall covers June–September; modeled moisture and heat cover September. Neither is today’s weather or a forecast.",
      "Historical source calendars are from 2011. Independent agronomic review is pending; no crop/variety/date/chemical prescription is made.",
      "Selected El Niño years are historical examples, not proof of causation or a prediction of crop loss.",
    ],
  });
}
