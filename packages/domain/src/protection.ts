import {
  protectionPolicySchema,
  protectionAssessmentSchema,
  type ProtectionPolicy,
  type SeasonInput,
} from "@kavach/contracts";
/** Published policy dates and missing eligibility checks, never an enrollment decision. */
export function assessProtection(
  input: SeasonInput,
  raw: ProtectionPolicy,
  now: string,
) {
  const policy = protectionPolicySchema.parse(raw);
  const timestamp = new Date(now).getTime();
  if (!Number.isFinite(timestamp)) throw Error("Invalid assessment time");
  const today = new Date(timestamp + 330 * 60000).toISOString().slice(0, 10);
  const crop = policy.crops.find((row) => row.crop === input.crop);
  if (!crop || new Set(policy.crops.map((c) => c.crop)).size !== 3)
    throw Error("Incomplete or duplicate protection crop calendar");
  const differs =
    crop.irrigationCondition === "irrigated-only" &&
    input.irrigation === "none";
  const days = Math.round(
    (Date.parse(crop.deadline) - Date.parse(today)) / 86400000,
  );
  const status =
    today < policy.source.issued
      ? "source-not-issued-yet"
      : days < 0
        ? "published-date-passed"
        : today >= policy.recheckOn
          ? "source-recheck-needed"
          : differs
            ? "irrigation-context-differs"
            : "verify-eligibility";
  return protectionAssessmentSchema.parse({
    policy,
    crop: input.crop,
    calendarCrop: crop.calendarCrop,
    publishedDeadline: crop.deadline,
    assessedOn: today,
    daysToPublishedDate: days,
    status,
    eligibility: "unverified",
    cropContext: differs
      ? "reported-irrigation-differs"
      : crop.irrigationCondition === "irrigated-only" &&
          input.irrigation === "unknown"
        ? "needs-irrigation-confirmation"
        : "category-requires-portal-confirmation",
    missing: [
      "notified-village-and-crop",
      "current-portal-calendar",
      ...(crop.irrigationCondition === "irrigated-only"
        ? ["irrigated-wheat-category" as const]
        : []),
      "land-and-sowing-records",
      "aadhaar-linked-bank-details",
    ],
    timingPrecision:
      "Published calendar date; portal cutoff time and later amendments are not confirmed.",
    limitation:
      "A state policy calendar does not establish personal eligibility, enrollment, premium or claim approval.",
  });
}
