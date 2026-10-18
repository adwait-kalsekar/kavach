import type {
  DemoLocale,
  SeasonExplainInput,
  SeasonInput,
} from "@kavach/contracts";
import { cropNames } from "./planning-copy";
export function chatCopy(
  locale: DemoLocale,
  input: SeasonInput,
  region: string,
) {
  const crop = cropNames[locale][input.crop];
  const en = locale === "en-IN",
    mr = locale === "mr-IN";
  const irrigation = en
    ? {
        unknown: "Irrigation not checked",
        none: "No irrigation",
        one: "One irrigation",
        limited: "Limited irrigation",
        assured: "Assured irrigation",
      }[input.irrigation]
    : mr
      ? {
          unknown: "सिंचन तपासलेले नाही",
          none: "सिंचन नाही",
          one: "एक सिंचन",
          limited: "मर्यादित सिंचन",
          assured: "खात्रीचे सिंचन",
        }[input.irrigation]
      : {
          unknown: "सिंचाई की जाँच बाकी",
          none: "सिंचाई नहीं",
          one: "एक सिंचाई",
          limited: "सीमित सिंचाई",
          assured: "सुनिश्चित सिंचाई",
        }[input.irrigation];
  const suggestions: {
    question: SeasonExplainInput["question"];
    title: string;
    text: string;
    symbol: string;
  }[] = en
    ? [
        {
          question: "season",
          title: "Understand my season",
          text: `What does the seasonal evidence mean for ${crop} in ${region}, and what is still unknown about my field?`,
          symbol: "☂",
        },
        {
          question: "history",
          title: "Compare past El Niño years",
          text: `How did rainfall in ${region} vary in 2002, 2009, 2015 and 2023 compared with the baseline? Show me the differences.`,
          symbol: "↔",
        },
        {
          question: "actions",
          title: "Find my next crop checks",
          text: `For my selected ${crop} stage and irrigation access, which official-plan checks apply, and what must I verify before acting?`,
          symbol: "❧",
        },
        {
          question: "water",
          title: "See my water trade-off",
          text: `Compare the two areas in my water options. What fits the entered water, depth and efficiency assumptions, and what does this calculation leave out?`,
          symbol: "≈",
        },
        {
          question: "protection",
          title: "Check crop insurance",
          text: `Which published insurance date applies to the ${crop} calendar entry, and what must I check about village coverage and eligibility?`,
          symbol: "◇",
        },
      ]
    : mr
      ? [
          {
            question: "season",
            title: "माझा हंगाम समजून घ्या",
            text: `${region} येथील ${crop} पिकासाठी हंगामाची माहिती काय सांगते आणि शेताबद्दल काय अजून माहीत नाही?`,
            symbol: "☂",
          },
          {
            question: "history",
            title: "मागील एल निनो वर्षांची तुलना",
            text: `${region} येथे 2002, 2009, 2015 आणि 2023 मधील पाऊस संदर्भ सरासरीपेक्षा कसा वेगळा होता? फरक दाखवा.`,
            symbol: "↔",
          },
          {
            question: "actions",
            title: "पिकासाठी पुढील तपासण्या",
            text: `निवडलेल्या ${crop} पिकाच्या अवस्थेनुसार आणि सिंचनानुसार अधिकृत योजनेतील कोणत्या तपासण्या लागू आहेत? कृतीपूर्वी काय तपासावे?`,
            symbol: "❧",
          },
          {
            question: "water",
            title: "पाण्याच्या पर्यायांची तुलना",
            text: "पाण्याच्या पर्यायांतील दोन क्षेत्रांची तुलना करा. भरलेले पाणी, खोली आणि कार्यक्षमता यानुसार काय शक्य आहे आणि गणनेत काय समाविष्ट नाही?",
            symbol: "≈",
          },
          {
            question: "protection",
            title: "पीक विमा तपासा",
            text: `${crop} पिकाच्या दिनदर्शिकेत कोणती विम्याची तारीख आहे आणि गावाचे संरक्षण व पात्रतेबद्दल काय तपासावे?`,
            symbol: "◇",
          },
        ]
      : [
          {
            question: "season",
            title: "मेरा मौसम समझें",
            text: `${region} में ${crop} के लिए मौसमी जानकारी क्या बताती है और खेत के बारे में क्या अभी अज्ञात है?`,
            symbol: "☂",
          },
          {
            question: "history",
            title: "पिछले एल नीनो वर्षों की तुलना",
            text: `${region} में 2002, 2009, 2015 और 2023 की बारिश संदर्भ औसत से कैसे अलग थी? अंतर दिखाएँ।`,
            symbol: "↔",
          },
          {
            question: "actions",
            title: "फसल की अगली जाँच",
            text: `चुनी गई ${crop} की अवस्था और सिंचाई के अनुसार आधिकारिक योजना की कौन-सी जाँच लागू है? कदम उठाने से पहले क्या जाँचूँ?`,
            symbol: "❧",
          },
          {
            question: "water",
            title: "पानी के विकल्प देखें",
            text: "पानी के विकल्पों के दो क्षेत्रों की तुलना करें। दर्ज पानी, गहराई और दक्षता के अनुसार क्या संभव है और गणना में क्या शामिल नहीं है?",
            symbol: "≈",
          },
          {
            question: "protection",
            title: "फसल बीमा जाँचें",
            text: `${crop} की कैलेंडर प्रविष्टि के लिए बीमा की कौन-सी तारीख है? गाँव की अधिसूचना और पात्रता के बारे में क्या जाँचूँ?`,
            symbol: "◇",
          },
        ];
  return {
    irrigation,
    suggestions,
    recent: en
      ? "Questions this visit"
      : mr
        ? "या भेटीतील प्रश्न"
        : "इस विज़िट के प्रश्न",
    historyNote: en
      ? "Questions stay here during this visit. Refreshing or changing field details starts fresh."
      : mr
        ? "या भेटीतील प्रश्न इथे दिसतात. पान पुन्हा उघडल्यावर किंवा शेताची माहिती बदलल्यावर नवीन सुरुवात होते."
        : "इस विज़िट के प्रश्न यहाँ रहते हैं। पेज रीफ़्रेश करने या खेत की जानकारी बदलने पर नई शुरुआत होती है.",
    change: en
      ? "Change crop or field details"
      : mr
        ? "पीक किंवा शेताची माहिती बदला"
        : "फसल या खेत की जानकारी बदलें",
    next: en
      ? "Explore another question"
      : mr
        ? "आणखी एक प्रश्न विचारा"
        : "अगला प्रश्न पूछें",
    fallback: en
      ? "The AI explanation is unavailable. Your source-backed evidence cards are still below."
      : mr
        ? "स्पष्टीकरण उपलब्ध नाही. स्रोतांवर आधारित माहितीची कार्डे खाली आहेत."
        : "व्याख्या उपलब्ध नहीं है। स्रोत-आधारित जानकारी के कार्ड नीचे हैं।",
  };
}
