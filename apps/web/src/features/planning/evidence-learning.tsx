import { useId, useState, useRef } from "react";
import type {
  DemoLocale,
  SeasonAssessment,
  SeasonView,
  WaterPlan,
} from "@kavach/contracts";
import { usePlanning, useFormat, cls as c } from "./state";

type Topic =
  "baseline" | "enso" | "limits" | "field" | "guidance" | "water" | "source";
const copy = {
  "en-IN": {
    title: "Make sense of this",
    baseline: "What does normal mean?",
    enso: "What is El Niño?",
    limits: "Can this predict my crop?",
    field: "Is this my field’s moisture?",
    guidance: "Why confirm locally?",
    water: "What is being compared?",
    source: "Show the source",
    baselineText:
      "Normal is the average June–September rainfall in the same sampled grid over 1991–2020. Each year uses the same rainfall product and seasonal window. Below normal describes this comparison; it does not measure crop loss.",
    year: "Choose a year",
    normal: "Matching baseline",
    total: "Recorded rainfall",
    departure: "Difference from baseline",
    below: "below",
    above: "at or above",
    example: "A dated comparison, not a prediction for this field.",
    steps: [
      "Pacific waters warm",
      "Air circulation changes",
      "Rain patterns can shift",
    ],
    stepText: [
      "El Niño is a warm phase of the tropical Pacific climate cycle.",
      "Ocean warming and atmospheric circulation interact.",
      "Effects differ between places and events; local drought is not guaranteed.",
    ],
    general: "General climate explanation · not a local forecast",
    known: "What the records show",
    reported: "What you reported",
    cannot: "What this cannot tell you",
    knownText:
      "Dated regional rainfall history and modeled surface conditions. A town-centre grid is not a measurement of your farm.",
    unknown: "Current field moisture has not been checked.",
    dry: "Your field feels dry — a user observation, separate from the regional model.",
    moist:
      "Your field feels moist — a user observation, separate from the regional model.",
    cannotText:
      "Your crop-loss probability, future yield, or permission to sow. These need additional evidence and current local advice.",
    fieldText:
      "The model describes the upper 0–7 cm of soil in a regional grid during September. Your crop’s roots and today’s field conditions can differ. Check moisture on your field before acting.",
    guidanceText:
      "The crop calendars are historical, and source-based options are discussion prompts. Current local suitability, source conditions and unreviewed mappings still need confirmation. An old date is not a sowing instruction for this week.",
    waterText:
      "Two areas are compared for one application using your stated water, depth and efficiency. These are illustrative assumptions. Water left over does not prove that the crop is suitable or that a whole season is covered.",
    observed: "Observation period",
    retrieved: "Retrieved",
    close: "Close explanation",
  },
  "hi-IN": {
    title: "इसे आसान भाषा में समझें",
    baseline: "सामान्य बारिश का क्या मतलब है?",
    enso: "एल नीनो क्या है?",
    limits: "क्या इससे मेरी फसल का भविष्य पता चलता है?",
    field: "क्या यह मेरे खेत की नमी है?",
    guidance: "स्थानीय पुष्टि क्यों चाहिए?",
    water: "किसकी तुलना हो रही है?",
    source: "स्रोत देखें",
    baselineText:
      "सामान्य बारिश इसी नमूना क्षेत्र में 1991–2020 की जून–सितंबर बारिश का औसत है। हर वर्ष के लिए वही डेटा और वही अवधि है। औसत से कम बारिश फसल के नुकसान की माप नहीं है।",
    year: "वर्ष चुनें",
    normal: "समान अवधि का औसत",
    total: "दर्ज बारिश",
    departure: "औसत से अंतर",
    below: "कम",
    above: "बराबर या अधिक",
    example: "यह तारीख सहित तुलना है, आपके खेत का पूर्वानुमान नहीं।",
    steps: [
      "प्रशांत महासागर गर्म होता है",
      "वायु का संचार बदलता है",
      "बारिश का पैटर्न बदल सकता है",
    ],
    stepText: [
      "एल नीनो उष्णकटिबंधीय प्रशांत की जलवायु के चक्र का गर्म चरण है।",
      "महासागर की गर्मी और वायुमंडल एक-दूसरे को प्रभावित करते हैं।",
      "हर जगह और हर घटना का असर अलग हो सकता है; स्थानीय सूखा निश्चित नहीं है।",
    ],
    general: "सामान्य जलवायु की जानकारी · स्थानीय पूर्वानुमान नहीं",
    known: "रिकॉर्ड क्या बताते हैं",
    reported: "आपने क्या बताया",
    cannot: "इससे क्या नहीं पता चलता",
    knownText:
      "तारीख सहित क्षेत्रीय बारिश और मॉडल से मिली सतह की स्थिति। शहर के पास का नमूना आपके खेत की माप नहीं है।",
    unknown: "खेत की वर्तमान नमी अभी जाँची नहीं गई है।",
    dry: "आपको खेत सूखा लगता है — यह आपका अवलोकन है, क्षेत्रीय मॉडल से अलग।",
    moist: "आपको खेत नम लगता है — यह आपका अवलोकन है, क्षेत्रीय मॉडल से अलग।",
    cannotText:
      "आपकी फसल के नुकसान की संभावना, भविष्य की उपज या बुवाई की अनुमति। इनके लिए और प्रमाण तथा वर्तमान स्थानीय सलाह चाहिए।",
    fieldText:
      "यह मॉडल सितंबर में क्षेत्र की ऊपरी 0–7 सेमी मिट्टी बताता है। फसल की जड़ों और आज के खेत की नमी अलग हो सकती है। निर्णय से पहले खेत में नमी जाँचें।",
    guidanceText:
      "फसल कैलेंडर पुराने हैं और स्रोत आधारित विकल्प चर्चा के लिए हैं। वर्तमान स्थानीय उपयुक्तता, स्रोत की शर्तें और मार्गदर्शन की पुष्टि जरूरी है। पुरानी तारीख इस सप्ताह की बुवाई का निर्देश नहीं है।",
    waterText:
      "आपके बताए पानी, गहराई और दक्षता से दो क्षेत्रों में एक बार पानी देने की तुलना है। ये उदाहरण की मान्यताएँ हैं। बचा पानी फसल की उपयुक्तता या पूरे मौसम की जरूरत पूरी होने का प्रमाण नहीं है।",
    observed: "अवलोकन की अवधि",
    retrieved: "डेटा प्राप्त किया",
    close: "व्याख्या बंद करें",
  },
  "mr-IN": {
    title: "हे सोप्या भाषेत समजून घ्या",
    baseline: "नेहमीचा पाऊस म्हणजे काय?",
    enso: "एल निनो म्हणजे काय?",
    limits: "यावरून माझ्या पिकाचे भविष्य कळते का?",
    field: "हा माझ्या शेतातील ओलावा आहे का?",
    guidance: "स्थानिक खात्री का आवश्यक आहे?",
    water: "कशाची तुलना केली आहे?",
    source: "स्रोत पाहा",
    baselineText:
      "नेहमीचा पाऊस म्हणजे याच नमुना क्षेत्रातील 1991–2020 च्या जून–सप्टेंबर पावसाची सरासरी. प्रत्येक वर्षासाठी समान माहितीचा स्रोत आणि कालावधी आहे. सरासरीपेक्षा कमी पाऊस हे पिकाच्या नुकसानीचे मोजमाप नाही.",
    year: "वर्ष निवडा",
    normal: "समान कालावधीची सरासरी",
    total: "नोंदवलेला पाऊस",
    departure: "सरासरीपासून फरक",
    below: "कमी",
    above: "समान किंवा अधिक",
    example: "ही तारखेसह तुलना आहे; तुमच्या शेताचा अंदाज नाही.",
    steps: [
      "प्रशांत महासागर उबदार होतो",
      "वातावरणातील प्रवाह बदलतात",
      "पावसाचे स्वरूप बदलू शकते",
    ],
    stepText: [
      "एल निनो हा उष्णकटिबंधीय प्रशांतच्या हवामान चक्रातील उबदार टप्पा आहे.",
      "समुद्रातील उष्णता आणि वातावरण एकमेकांवर परिणाम करतात.",
      "ठिकाण आणि घटनेनुसार परिणाम बदलतात; स्थानिक दुष्काळ निश्चित नसतो.",
    ],
    general: "हवामानाची सर्वसाधारण माहिती · स्थानिक अंदाज नाही",
    known: "नोंदी काय सांगतात",
    reported: "तुम्ही काय सांगितले",
    cannot: "यावरून काय समजत नाही",
    knownText:
      "तारखेसह प्रादेशिक पाऊस आणि मॉडेलमधील पृष्ठभागाची स्थिती. शहराजवळील नमुना ही तुमच्या शेताची मोजणी नाही.",
    unknown: "शेतातील सध्याचा ओलावा अजून तपासलेला नाही.",
    dry: "तुम्हाला शेत कोरडे वाटते — हे तुमचे निरीक्षण आहे, प्रादेशिक मॉडेलपेक्षा वेगळे.",
    moist:
      "तुम्हाला शेतात ओलावा वाटतो — हे तुमचे निरीक्षण आहे, प्रादेशिक मॉडेलपेक्षा वेगळे.",
    cannotText:
      "तुमच्या पिकाच्या नुकसानीची शक्यता, पुढील उत्पादन किंवा पेरणीची परवानगी. यासाठी अधिक पुरावे आणि सध्याचा स्थानिक सल्ला आवश्यक आहे.",
    fieldText:
      "हे मॉडेल सप्टेंबरमध्ये प्रादेशिक क्षेत्रातील वरच्या 0–7 सेमी मातीची स्थिती दाखवते. पिकाची मुळे आणि आजच्या शेताचा ओलावा वेगळा असू शकतो. कृतीपूर्वी शेतातील ओलावा तपासा.",
    guidanceText:
      "पीक वेळापत्रके जुनी आहेत आणि स्रोताधारित पर्याय चर्चेसाठी आहेत. सध्याची स्थानिक उपयुक्तता, स्रोताच्या अटी आणि मार्गदर्शनाची खात्री आवश्यक आहे. जुनी तारीख ही या आठवड्याची पेरणी सूचना नाही.",
    waterText:
      "तुम्ही सांगितलेल्या पाणी, खोली आणि कार्यक्षमतेनुसार दोन क्षेत्रांवर एका सिंचनाची तुलना आहे. ही उदाहरणाची गृहितके आहेत. उरलेले पाणी म्हणजे पिकाची उपयुक्तता किंवा संपूर्ण हंगामाची गरज भागते याचा पुरावा नाही.",
    observed: "निरीक्षणाचा कालावधी",
    retrieved: "माहिती मिळवली",
    close: "स्पष्टीकरण बंद करा",
  },
} satisfies Record<DemoLocale, object>;

export function EvidenceLearning({
  assessment: a,
  view,
  waterPlan,
}: {
  assessment: SeasonAssessment;
  view: SeasonView;
  waterPlan?: WaterPlan;
}) {
  const { locale } = usePlanning(),
    t = copy[locale],
    f = useFormat(),
    id = useId();
  const [topic, setTopic] = useState<Topic | null>(null),
    [year, setYear] = useState(2026),
    [step, setStep] = useState(0);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const rain = a.evidence.rainfall;
  const topics: Topic[] =
    view === "season-summary" || view === "rain-history"
      ? ["baseline", "enso", "limits"]
      : view === "surface-context"
        ? ["field", "limits", "source"]
        : view === "water-comparison"
          ? ["water", "limits", "source"]
          : ["guidance", "limits"];
  const selected =
    year === 2026
      ? { year, totalMm: rain.totalMm, departurePct: rain.departurePct }
      : rain.history.find((h) => h.year === year)!;
  const source =
    view === "surface-context"
      ? a.evidence.surface.source
      : view === "water-comparison"
        ? waterPlan?.method
        : rain.source;
  const period = view === "surface-context" ? a.evidence.surface : rain;
  return (
    <div className={c("learning")}>
      <h3>{t.title}</h3>
      <div className={c("learning-choices")}>
        {topics.map((key) => (
          <button
            key={key}
            type="button"
            aria-expanded={topic === key}
            aria-controls={id}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setTopic(topic === key ? null : key);
            }}
          >
            {t[key]}
          </button>
        ))}
      </div>
      <div id={id} hidden={!topic} className={c("learning-panel")}>
        {topic && (
          <>
            <h4>{t[topic]}</h4>
            {topic === "baseline" && (
              <>
                <p>{t.baselineText}</p>
                <label>
                  {t.year}
                  <select
                    aria-label={t.year}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  >
                    {[...rain.history.map((h) => h.year), 2026].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
                <dl className={c("learning-values")}>
                  <div>
                    <dt>{t.normal}</dt>
                    <dd>{f(rain.baselineMeanMm)} mm</dd>
                  </div>
                  <div>
                    <dt>
                      {selected.year} · {t.total}
                    </dt>
                    <dd>{f(selected.totalMm)} mm</dd>
                  </div>
                  <div>
                    <dt>{t.departure}</dt>
                    <dd>
                      {f(Math.abs(selected.departurePct), 1)}%{" "}
                      {selected.departurePct < 0 ? t.below : t.above}
                    </dd>
                  </div>
                </dl>
                <p className={c("small muted")}>{t.example}</p>
              </>
            )}
            {topic === "enso" && (
              <>
                <div
                  className={c("concept-steps")}
                  role="group"
                  aria-label={t.enso}
                >
                  {t.steps.map((label, i) => (
                    <button
                      type="button"
                      key={i}
                      aria-pressed={step === i}
                      onClick={() => setStep(i)}
                    >
                      <span>{i + 1}</span>
                      {label}
                    </button>
                  ))}
                </div>
                <p>{t.stepText[step]}</p>
                <p className={c("small muted")}>{t.general}</p>
                <a
                  href="https://www.noaa.gov/understanding-el-nino"
                  target="_blank"
                  rel="noreferrer"
                >
                  NOAA · ENSO ↗
                </a>
              </>
            )}
            {topic === "limits" && (
              <dl className={c("learning-limits")}>
                <div>
                  <dt>{t.known}</dt>
                  <dd>{t.knownText}</dd>
                </div>
                <div>
                  <dt>{t.reported}</dt>
                  <dd>
                    {a.input.moisture === "unknown"
                      ? t.unknown
                      : a.input.moisture === "dry"
                        ? t.dry
                        : t.moist}
                  </dd>
                </div>
                <div>
                  <dt>{t.cannot}</dt>
                  <dd>{t.cannotText}</dd>
                </div>
              </dl>
            )}
            {topic === "field" && (
              <>
                <p>{t.fieldText}</p>
                <p>
                  {a.input.moisture === "unknown"
                    ? t.unknown
                    : a.input.moisture === "dry"
                      ? t.dry
                      : t.moist}
                </p>
              </>
            )}
            {topic === "guidance" && <p>{t.guidanceText}</p>}
            {topic === "water" && <p>{t.waterText}</p>}
            {topic === "source" && source && (
              <>
                <p>{source.title}</p>
                {view !== "water-comparison" && (
                  <p>
                    {t.observed}: {period.start} – {period.end}
                  </p>
                )}
                {"retrievedAt" in source &&
                  typeof source.retrievedAt === "string" && (
                    <p>
                      {t.retrieved}:{" "}
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                      }).format(new Date(source.retrievedAt))}
                    </p>
                  )}
                {"limitation" in source && (
                  <p className={c("small muted")}>{source.limitation}</p>
                )}
                <a href={source.url} target="_blank" rel="noreferrer">
                  {t.source} ↗
                </a>
              </>
            )}
            <button
              type="button"
              className={c("learning-close")}
              onClick={() => {
                setTopic(null);
                trigger.current?.focus();
              }}
            >
              {t.close}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
