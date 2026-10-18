import { optionDetails, missingFacts } from "./crop-option-copy";
import type { SeasonAssessment } from "@kavach/contracts";
import { usePlanning, cls as c } from "./state";
export function CropOptions({
  assessment: a,
}: {
  assessment: SeasonAssessment;
}) {
  const { locale } = usePlanning(),
    mr = locale === "mr-IN",
    hi = locale === "hi-IN";
  const heading = mr
    ? "पिकासाठी स्रोताधारित पर्याय"
    : hi
      ? "फसल के लिए स्रोत आधारित विकल्प"
      : "Crop-specific options to discuss";
  const labels: Record<string, [string, string]> = {
    "gram-sprinkler-stages": [
      "फांद्या व शेंगा भरण्याच्या अवस्थेसाठी तुषार सिंचनाची चर्चा करा",
      "शाखा और फली विकास के लिए स्प्रिंकलर योजना पर चर्चा करें",
    ],
    "jowar-one-irrigation": [
      "मर्यादित सिंचनासाठी ज्वारीची योग्य अवस्था तपासा",
      "सीमित सिंचाई के लिए ज्वार की अवस्था की पुष्टि करें",
    ],
    "wheat-one-irrigation": [
      "एका सिंचनासाठी गव्हाची मुकुटमुळे अवस्था तपासा",
      "एक सिंचाई के लिए गेहूँ की शीर्ष-जड़ अवस्था जाँचें",
    ],
    "wheat-critical-stage": [
      "गव्हाच्या ओलाव्यास संवेदनशील अवस्थेची चर्चा करा",
      "गेहूँ की नमी-संवेदनशील अवस्था पर चर्चा करें",
    ],
    "ahilyanagar-low-recharge-wheat": [
      "जिल्ह्याच्या गहू / हरभरा पर्यायांची चर्चा करा",
      "जिले के गेहूँ / चना विकल्पों पर चर्चा करें",
    ],
    "sambhajinagar-low-recharge-gram": [
      "जिल्ह्याच्या जुन्या हरभरा पर्यायांचा संदर्भ पाहा",
      "जिले के पुराने चना विकल्प देखें",
    ],
    "hingoli-low-recharge-wheat": [
      "जिल्ह्याचा मर्यादित पाण्याचा पर्याय तपासा",
      "जिले की सीमित-पानी योजना पर चर्चा करें",
    ],
  };
  const ordered = [...a.cropOptions].sort(
    (x, y) =>
      ({
        "reported-context-matches": 0,
        "needs-input": 1,
        "different-context": 2,
      })[x.status] -
      {
        "reported-context-matches": 0,
        "needs-input": 1,
        "different-context": 2,
      }[y.status],
  );
  const card = (o: SeasonAssessment["cropOptions"][number]) => (
    <article
      key={o.rule.id}
      className={c("crop-option")}
      data-status={o.status}
    >
      <span className={c("option-status")}>
        {o.status === "reported-context-matches"
          ? mr
            ? "निवडलेले प्रकार जुळतात · इतर अटींची खात्री बाकी"
            : hi
              ? "चुनी श्रेणियाँ मिलती हैं · अन्य शर्तों की पुष्टि बाकी"
              : "Selected categories match · other conditions unverified"
          : o.status === "needs-input"
            ? mr
              ? "अधिक माहिती आवश्यक"
              : hi
                ? "और जानकारी चाहिए"
                : "More field information needed"
            : mr
              ? "सध्याच्या निवडीपेक्षा वेगळी परिस्थिती"
              : hi
                ? "वर्तमान चयन से अलग परिस्थिति"
                : "Different from your current selection"}
      </span>
      <h3>
        {mr
          ? labels[o.rule.id]?.[0] || o.rule.title
          : hi
            ? labels[o.rule.id]?.[1] || o.rule.title
            : o.rule.title}
      </h3>
      <p>
        {locale === "en-IN"
          ? o.rule.detail
          : optionDetails[o.rule.id]?.[mr ? 0 : 1] || o.rule.detail}
      </p>
      {o.missing.length ? (
        <p className={c("small")}>
          <strong>
            {mr
              ? "अजून तपासायचे: "
              : hi
                ? "अभी जाँचना है: "
                : "Still to verify: "}
          </strong>
          {o.missing
            .map((key) => missingFacts[key]?.[mr ? 0 : hi ? 1 : 2] || key)
            .join("; ")}
        </p>
      ) : null}
      <details>
        <summary>
          {mr
            ? "अटी आणि मूळ मार्गदर्शन"
            : hi
              ? "शर्तें और मूल मार्गदर्शन"
              : "Conditions & original guidance"}
        </summary>
        <p>{o.rule.sourceCondition}</p>
        <p>{o.rule.timing}</p>

        {locale !== "en-IN" ? <p>{o.rule.detail}</p> : null}
        <p className={c("small muted")}>
          {o.rule.source.scope === "district-contingency"
            ? "Historical district contingency · 2011"
            : "General crop guidance · not a current district advisory"}
        </p>
        <a
          href={
            o.rule.source.url +
            (o.rule.source.pdfPage ? "#page=" + o.rule.source.pdfPage : "")
          }
          target="_blank"
          rel="noreferrer"
        >
          {o.rule.source.title}{" "}
          {o.rule.source.pdfPage ? "· p" + o.rule.source.pdfPage : ""} ↗
        </a>
        <p className={c("small muted")}>{o.reason}</p>
      </details>
    </article>
  );
  const relevant = ordered.filter((o) => o.status !== "different-context"),
    other = ordered.filter((o) => o.status === "different-context");
  return (
    <div className={c("crop-options")}>
      <h3>{heading}</h3>
      <p className={c("small muted")}>
        {mr
          ? "स्रोताधारित चर्चा करण्याचे पर्याय; सध्याची स्थानिक उपयुक्तता आणि सर्व अटींची खात्री आवश्यक."
          : hi
            ? "स्रोत आधारित चर्चा के विकल्प; वर्तमान स्थानीय उपयुक्तता और सभी शर्तों की पुष्टि जरूरी है।"
            : "These options depend on your crop stage, field moisture and available water. Confirm remaining conditions and current suitability with a local adviser."}
      </p>
      {relevant.length ? (
        relevant.map(card)
      ) : (
        <p>
          {mr
            ? "या निवडीसाठी थेट पीक-पर्याय जुळलेला नाही. खालील शेत तपासण्या पूर्ण करा."
            : hi
              ? "इस चयन के लिए सीधा फसल-विकल्प नहीं मिला। नीचे खेत की जाँच पूरी करें।"
              : "No direct crop-option match for the selected stage and water situation. Complete the field checks below; do not apply a different scenario’s guidance."}
        </p>
      )}
      {other.length ? (
        <details>
          <summary>
            {mr
              ? "इतर अवस्थांसाठी स्रोत पर्याय"
              : hi
                ? "अन्य अवस्थाओं के स्रोत विकल्प"
                : "Source options for other situations"}
          </summary>
          {other.map(card)}
        </details>
      ) : null}
    </div>
  );
}
