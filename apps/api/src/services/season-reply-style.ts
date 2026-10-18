import type { SeasonExplainInput } from "@kavach/contracts";
/** Presentation requests change wording, never the canonical farm facts or rules. */
export function seasonReplyStyle(
  input: SeasonExplainInput,
): "standard" | "one-line" | "simple" {
  if (!input.history?.some((row) => row.role === "assistant"))
    return "standard";
  const text = input.text || "";
  if (
    /one[\s-]*liner|(?:one|single)[\s-]+(?:line|sentence)|एक\s*(?:लाइन|पंक्ति|वाक्य)|एका\s*(?:ओळीत|वाक्यात)/iu.test(
      text,
    )
  )
    return "one-line";
  if (
    /\bsimpl(?:e|y|er|ify)\b|\bshorter\b|\bplain\s+(?:words|language)\b|सरल|आसान|सोप्या|सोपे|थोडक्यात/iu.test(
      text,
    )
  )
    return "simple";
  return "standard";
}
