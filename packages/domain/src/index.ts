import type { Assessment, Farm, Weather } from "@kavach/contracts";

export const RULE_VERSION = "latur-chickpea-planning-checks/1";
export const sourceReferences = [
  {
    id: "crida-latur",
    title: "ICAR-CRIDA Latur district plan",
    url: "https://www.icar-crida.res.in/CP-2012/statewiseplans/Maharastra%28Pdf%29/MAU%2C%20Parbhani/Maharashtra%2028%20-Latur-%2031-12-2011.pdf",
    applicability:
      "Historical district context, not a current field prescription. Local agronomic review pending.",
    reviewStatus: "unreviewed" as const,
  },
];

export function evaluate(input: {
  id: string;
  farm: Farm;
  weather: Weather;
  createdAt: string;
  basedOnAssessmentId?: string;
}): Assessment {
  const { farm, weather } = input;
  const c = farm.context;
  const reasons: string[] = [];
  const actions: Assessment["actions"] = [];
  const add = (
    id: string,
    title: string,
    detail: string,
    condition: string,
    kind: Assessment["actions"][number]["kind"],
  ) =>
    actions.push({
      id,
      title,
      detail,
      condition,
      kind,
      sourceIds: [],
      reviewStatus: "unreviewed",
    });
  if (c.moisture === "unknown") {
    reasons.push(
      "Field moisture has not been checked; regional forecasts cannot establish it.",
    );
    add(
      "check-moisture",
      "Confirm field moisture",
      "Record a local field observation before seeking a sowing decision. This app cannot infer a field measurement from district weather.",
      "Moisture unknown",
      "verify",
    );
  } else if (c.moisture === "dry") {
    reasons.push(
      "You reported dry soil; this is an unverified observation, not a measured moisture reading.",
    );
    add(
      "dry-soil",
      "Resolve the reported dry-soil constraint",
      "A local readiness check is required before committing further inputs. No exact sowing approval is issued.",
      "Self-reported dry soil",
      "blocked",
    );
  }
  if (c.irrigation === "none") {
    reasons.push(
      "Irrigation-dependent options are excluded because you reported no irrigation.",
    );
    add(
      "rainfed-check",
      "Check rain-fed feasibility",
      "Confirm the residual moisture and crop-stage requirements locally. No later rescue irrigation can be assumed.",
      "No irrigation available",
      "planning-check",
    );
  } else if (c.irrigation === "one") {
    reasons.push(
      "A single irrigation is a resource constraint; its timing is not established here.",
    );
    add(
      "limited-water",
      "Review the single-irrigation constraint",
      "Bring your crop stage and field observation to the local adviser. The prototype does not select a universal irrigation date or dose.",
      `One irrigation; stage ${c.stage}`,
      "planning-check",
    );
  } else {
    reasons.push(
      "Dependable irrigation is self-reported; correct timing and amount still require local guidance.",
    );
    add(
      "irrigated-check",
      "Confirm a locally applicable schedule",
      "Review your actual water access and crop stage before following an irrigation schedule.",
      "Dependable irrigation reported",
      "planning-check",
    );
  }
  if (c.stage === "planning" && !c.seedAvailable) {
    reasons.push("Suitable seed is not currently available to you.");
    add(
      "seed-access",
      "Resolve seed availability",
      "Confirm suitable seed availability before fixing a sowing plan. The app does not know current varieties, vendors or stock.",
      "Planning stage; seed unavailable",
      "blocked",
    );
  }
  const readiness =
    c.moisture === "unknown"
      ? "needs-check"
      : c.moisture === "dry" ||
          c.irrigation !== "assured" ||
          (c.stage === "planning" && !c.seedAvailable)
        ? "constrained"
        : "planning-review";
  return {
    id: input.id,
    schemaVersion: 1,
    farmId: farm.id,
    farmRevision: farm.revision,
    context: { ...c },
    ruleVersion: RULE_VERSION,
    createdAt: input.createdAt,
    mode: input.basedOnAssessmentId ? "hypothetical" : "confirmed",
    basedOnAssessmentId: input.basedOnAssessmentId || null,
    readiness,
    headline:
      readiness === "needs-check"
        ? "A field check comes first."
        : readiness === "constrained"
          ? "Plan around your resource constraints."
          : "Context is ready for a local planning review.",
    reasons,
    actions,
    weather,
    limitations: [
      "These are workflow checks, not agronomically reviewed recommendations.",
      "No exact sowing date, irrigation dose, yield estimate or crop-loss probability is calculated.",
      "Historical and seasonal climate do not determine these workflow checks.",
      ...(weather.status === "unavailable"
        ? [
            "Weather is unavailable; no weather-dependent conclusion has been calculated.",
          ]
        : [
            "Weather is a district-centre forecast, not a field observation or seasonal prediction.",
          ]),
    ],
  };
}

export { calculateWaterPlan } from "./water-planning.js";
