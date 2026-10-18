import type { ProtectionAssessment } from "@kavach/contracts";
import { usePlanning, cls as c } from "./state";

const copy = {
  "en-IN": {
    title: "Protect this season",
    label: "Published insurance calendar",
    unknown: "Your eligibility is not confirmed",
    crops: {
      chickpea: "Gram / chickpea",
      sorghum: "Rabi jowar",
      wheat: "Irrigated wheat",
    },
    intro:
      "Check whether your village and crop are notified before applying. This date is from the state policy, not a confirmed personal deadline.",
    warning:
      "This calendar entry is for irrigated wheat. Your irrigation information does not establish that category; confirm it with the bank or official portal.",
    statuses: {
      "verify-eligibility":
        "Check the current portal calendar before using this date.",
      "irrigation-context-differs":
        "You reported no irrigation. Do not assume this wheat entry covers your crop.",
      "published-date-passed":
        "The published date has passed. Check the portal for extensions; this does not confirm that enrollment is closed.",
      "source-recheck-needed":
        "This saved policy needs rechecking. Confirm amendments and current dates on the official portal.",
      "source-not-issued-yet":
        "The assessment date precedes this notification. Do not use it for that date.",
    },
    steps: [
      [
        "Confirm your village and crop",
        "Ask the bank or CSC to check the notified village, crop and irrigation category, and the current application date.",
      ],
      [
        "Prepare your records",
        "Check the applicable land or tenancy and sowing records, plus Aadhaar-linked bank details. Keep personal documents with the official application channel.",
      ],
      [
        "Apply through an official channel",
        "Use the official portal, bank or CSC. If you have a crop loan, ask your bank how participation applies before making another application.",
      ],
      [
        "Keep the acknowledgment",
        "Retain the application copy or premium receipt. Kavach does not submit an application or confirm enrollment.",
      ],
    ],
    portal: "Check on PMFBY",
    source: "Read the state notification",
    issued: "Issued",
    checked: "Snapshot checked",
    page: "p",
    limit:
      "The portal cutoff time and later amendments are not confirmed here. Eligibility, premium and claim approval require official verification.",
  },
  "hi-IN": {
    title: "इस मौसम की सुरक्षा",
    label: "प्रकाशित फसल बीमा कैलेंडर",
    unknown: "आपकी पात्रता की पुष्टि नहीं हुई है",
    crops: { chickpea: "चना", sorghum: "रबी ज्वार", wheat: "सिंचित गेहूँ" },
    intro:
      "आवेदन से पहले जाँचें कि आपका गाँव और फसल अधिसूचित हैं। यह राज्य नीति में प्रकाशित तारीख है, आपकी व्यक्तिगत अंतिम तारीख की पुष्टि नहीं।",
    warning:
      "यह प्रविष्टि सिंचित गेहूँ के लिए है। आपकी सिंचाई की जानकारी से यह श्रेणी तय नहीं होती; बैंक या आधिकारिक पोर्टल से पुष्टि करें।",
    statuses: {
      "verify-eligibility":
        "इस तारीख का उपयोग करने से पहले पोर्टल का वर्तमान कैलेंडर जाँचें।",
      "irrigation-context-differs":
        "आपने सिंचाई उपलब्ध नहीं बताई है। यह न मानें कि गेहूँ की यह प्रविष्टि आपकी फसल पर लागू है।",
      "published-date-passed":
        "प्रकाशित तारीख बीत चुकी है। समय-विस्तार के लिए पोर्टल जाँचें; इससे नामांकन बंद होने की पुष्टि नहीं होती।",
      "source-recheck-needed":
        "इस सहेजी नीति को फिर जाँचना आवश्यक है। पोर्टल पर संशोधन और वर्तमान तारीखें देखें।",
      "source-not-issued-yet":
        "आकलन की तारीख इस अधिसूचना से पहले है। उस तारीख के लिए इसका उपयोग न करें।",
    },
    steps: [
      [
        "गाँव और फसल की पुष्टि करें",
        "बैंक या CSC से अधिसूचित गाँव, फसल, सिंचाई श्रेणी और वर्तमान आवेदन तारीख जँचवाएँ।",
      ],
      [
        "दस्तावेज तैयार रखें",
        "लागू भूमि या किरायेदारी, बुवाई के रिकॉर्ड और आधार से जुड़े बैंक विवरण जाँचें। निजी दस्तावेज केवल आधिकारिक आवेदन माध्यम पर दें।",
      ],
      [
        "आधिकारिक माध्यम से आवेदन करें",
        "आधिकारिक पोर्टल, बैंक या CSC का उपयोग करें। फसल ऋण होने पर दूसरा आवेदन करने से पहले बैंक से भागीदारी की प्रक्रिया पूछें।",
      ],
      [
        "पावती सँभालकर रखें",
        "आवेदन की प्रति या प्रीमियम रसीद रखें। कवच आवेदन नहीं करता और नामांकन की पुष्टि नहीं करता।",
      ],
    ],
    portal: "PMFBY पर जाँचें",
    source: "राज्य अधिसूचना पढ़ें",
    issued: "जारी",
    checked: "स्रोत जाँचा गया",
    page: "पृ",
    limit:
      "पोर्टल का अंतिम समय और बाद के संशोधन यहाँ पुष्ट नहीं हैं। पात्रता, प्रीमियम और दावा स्वीकृति आधिकारिक माध्यम से जाँचें।",
  },
  "mr-IN": {
    title: "या हंगामाचे संरक्षण",
    label: "प्रकाशित पीक विमा दिनदर्शिका",
    unknown: "तुमची पात्रता निश्चित झालेली नाही",
    crops: { chickpea: "हरभरा", sorghum: "रब्बी ज्वारी", wheat: "बागायती गहू" },
    intro:
      "अर्ज करण्यापूर्वी तुमचे गाव आणि पीक अधिसूचित आहेत का ते तपासा. ही राज्य धोरणातील तारीख आहे; तुमची वैयक्तिक अंतिम तारीख निश्चित झालेली नाही.",
    warning:
      "ही नोंद बागायती गव्हासाठी आहे. तुमच्या सिंचनाच्या माहितीवरून हा प्रकार निश्चित होत नाही; बँक किंवा अधिकृत पोर्टलवर खात्री करा.",
    statuses: {
      "verify-eligibility":
        "ही तारीख वापरण्यापूर्वी पोर्टलवरील सध्याची दिनदर्शिका तपासा.",
      "irrigation-context-differs":
        "तुम्ही सिंचन उपलब्ध नसल्याचे सांगितले आहे. गव्हाची ही नोंद तुमच्या पिकाला लागू आहे असे समजू नका.",
      "published-date-passed":
        "प्रकाशित तारीख निघून गेली आहे. मुदतवाढीसाठी पोर्टल तपासा; यावरून नोंदणी बंद असल्याची खात्री होत नाही.",
      "source-recheck-needed":
        "हे जतन केलेले धोरण पुन्हा तपासणे आवश्यक आहे. पोर्टलवर सुधारणा आणि सध्याच्या तारखा तपासा.",
      "source-not-issued-yet":
        "मूल्यांकनाची तारीख या अधिसूचनेच्या आधीची आहे. त्या तारखेसाठी ही माहिती वापरू नका.",
    },
    steps: [
      [
        "गाव आणि पिकाची खात्री करा",
        "बँक किंवा CSC कडून अधिसूचित गाव, पीक, सिंचन प्रकार आणि सध्याची अर्जाची तारीख तपासून घ्या.",
      ],
      [
        "कागदपत्रे तयार ठेवा",
        "लागू जमीन किंवा भाडेपट्टा, पेरणीचे पुरावे आणि आधार-संलग्न बँक तपशील तपासा. वैयक्तिक कागदपत्रे केवळ अधिकृत अर्ज माध्यमावर द्या.",
      ],
      [
        "अधिकृत माध्यमातून अर्ज करा",
        "अधिकृत पोर्टल, बँक किंवा CSC वापरा. पीक कर्ज असल्यास दुसरा अर्ज करण्यापूर्वी बँकेकडून सहभागाची प्रक्रिया समजून घ्या.",
      ],
      [
        "पोचपावती जपून ठेवा",
        "अर्जाची प्रत किंवा विमा हप्त्याची पावती ठेवा. कवच अर्ज करत नाही किंवा नोंदणी निश्चित करत नाही.",
      ],
    ],
    portal: "PMFBY वर तपासा",
    source: "राज्य अधिसूचना वाचा",
    issued: "जारी",
    checked: "स्रोत तपासला",
    page: "पृ",
    limit:
      "पोर्टलवरील अंतिम वेळ आणि नंतरचे बदल येथे निश्चित नाहीत. पात्रता, हप्ता आणि दावा मंजुरी अधिकृत माध्यमातून तपासा.",
  },
};
export function protectionLabel(locale: keyof typeof copy) {
  return locale === "en-IN"
    ? "Crop insurance"
    : locale === "hi-IN"
      ? "फसल बीमा"
      : "पीक विमा";
}
export function ProtectionCard({
  assessment: a,
}: {
  assessment: ProtectionAssessment;
}) {
  const { locale } = usePlanning();
  const t = copy[locale];
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value + "T00:00:00Z"));
  return (
    <div className={c("protection")}>
      <div className={c("season-card-title")}>
        <span className={c("season-symbol")} aria-hidden="true">
          ◇
        </span>
        <h2>{t.title}</h2>
      </div>
      <p className={c("period")}>
        {a.policy.season} · {t.crops[a.crop]}
      </p>
      <div className={c("protection-date")}>
        <span>{t.label}</span>
        <strong>{date(a.publishedDeadline)}</strong>
        <p>{t.statuses[a.status]}</p>
      </div>
      <p className={c("protection-eligibility")}>
        <strong>{t.unknown}</strong>
        <span>{t.intro}</span>
      </p>
      {a.crop === "wheat" ? <p className={c("notice")}>{t.warning}</p> : null}
      <ol className={c("protection-steps")}>
        {a.policy.actions.map((action, i) => (
          <li key={action.id}>
            <h3>{t.steps[i]![0]}</h3>
            <p>{t.steps[i]![1]}</p>
            <a
              className={c("source-link")}
              href={a.policy.source.url + "#page=" + action.sourcePages[0]}
              target="_blank"
              rel="noreferrer"
            >
              {t.source} · {t.page} {action.sourcePages.join(", ")} ↗
            </a>
          </li>
        ))}
      </ol>
      <a
        className={c("primary button-link")}
        href={a.policy.portalUrl}
        target="_blank"
        rel="noreferrer"
      >
        {t.portal} ↗
      </a>
      <details className={c("protection-source")}>
        <summary>{t.source}</summary>
        <p>{a.policy.source.title}</p>
        <p>
          {t.issued}: {date(a.policy.source.issued)} · {t.checked}:{" "}
          {date(a.policy.checkedOn)}
        </p>
        <a
          className={c("source-link")}
          href={a.policy.source.url + "#page=" + a.policy.source.calendarPage}
          target="_blank"
          rel="noreferrer"
        >
          {t.source} · {t.page} {a.policy.source.calendarPage} ↗
        </a>
        <p className={c("small muted")}>{t.limit}</p>
      </details>
    </div>
  );
}
