const en = [
  {
    target: "profile",
    title: "Start with your district and crop",
    body: "Choose your district and crop. This is a synthetic example, not a saved farm.",
  },
  {
    target: "intent",
    title: "Choose what you want to do",
    body: "Choose sowing, growing or water checks. Field details you haven’t checked can stay unknown.",
  },
  {
    target: "evidence",
    title: "Understand your season",
    body: "These dated regional records do not measure your field or prove that sowing is safe.",
  },
  {
    target: "actions",
    title: "See the checks that apply",
    body: "Open source-linked checks for your crop. Current local advice still needs confirmation.",
  },
  {
    target: "options",
    title: "Explore your water options",
    body: "Compare two areas for one illustrative application, not whole-season water needs.",
  },
  {
    target: "talk",
    title: "Ask and see the evidence",
    body: "Type for text and cards. Tap to speak, then tap to finish for audio too. Evidence works when AI is unavailable.",
  },
] as const;
const translated = {
  "hi-IN": [
    [
      "अपना जिला और फसल चुनें",
      "अपना जिला और फसल चुनें। यह एक काल्पनिक उदाहरण है, सहेजा हुआ खेत नहीं।",
    ],
    [
      "अपना काम चुनें",
      "बुवाई, खड़ी फसल या पानी की जाँच चुनें। जिन बातों की जाँच नहीं हुई है, उन्हें अज्ञात रहने दें।",
    ],
    [
      "मौसम की जानकारी समझें",
      "ये पुराने क्षेत्रीय रिकॉर्ड हैं। इनसे आपके खेत की नमी या बुवाई सुरक्षित होने की पुष्टि नहीं होती।",
    ],
    [
      "लागू जाँच देखें",
      "अपनी फसल की जाँच और मूल स्रोत देखें। वर्तमान स्थानीय सलाह की पुष्टि अभी आवश्यक है।",
    ],
    [
      "पानी के विकल्प देखें",
      "एक उदाहरण की सिंचाई के लिए दो क्षेत्रों की तुलना करें। यह पूरे मौसम की पानी की ज़रूरत नहीं है।",
    ],
    [
      "पूछें और जानकारी देखें",
      "लिखने पर पाठ और कार्ड मिलते हैं। बोलने के लिए माइक दबाएँ, फिर पूरा होने पर दोबारा दबाएँ। AI न मिले, तब भी जानकारी उपलब्ध रहती है।",
    ],
  ],
  "mr-IN": [
    [
      "तुमचा जिल्हा आणि पीक निवडा",
      "तुमचा जिल्हा आणि पीक निवडा. हे काल्पनिक उदाहरण आहे; जतन केलेली शेताची नोंद नाही.",
    ],
    [
      "तुम्हाला काय करायचे आहे ते निवडा",
      "पेरणी, उभे पीक किंवा पाण्याची तपासणी निवडा. न तपासलेली माहिती अज्ञात राहू द्या.",
    ],
    [
      "हंगामाची माहिती समजून घ्या",
      "या जुन्या प्रादेशिक नोंदी आहेत. यावरून तुमच्या शेतातील ओलावा किंवा पेरणी सुरक्षित असल्याची खात्री होत नाही.",
    ],
    [
      "लागू तपासण्या पहा",
      "तुमच्या पिकासाठी तपासण्या आणि मूळ स्रोत पहा. सध्याच्या स्थानिक सल्ल्याची खात्री करणे आवश्यक आहे.",
    ],
    [
      "पाण्याचे पर्याय पहा",
      "एका उदाहरणातील सिंचनासाठी दोन क्षेत्रांची तुलना करा. ही संपूर्ण हंगामाची पाण्याची गरज नाही.",
    ],
    [
      "प्रश्न विचारा आणि माहिती पहा",
      "लिहिल्यास मजकूर आणि कार्डे मिळतात. बोलण्यासाठी माइक दाबा आणि बोलून झाल्यावर पुन्हा दाबा. AI उपलब्ध नसले तरी माहिती पाहता येते.",
    ],
  ],
} as const;
export const guidedTourCopy = {
  "en-IN": {
    steps: en,
    skip: "Skip",
    back: "Back",
    next: "Next",
    finish: "Start using Kavach",
  },
  "hi-IN": {
    steps: en.map((step, i) => ({
      ...step,
      title: translated["hi-IN"][i]![0],
      body: translated["hi-IN"][i]![1],
    })),
    skip: "छोड़ें",
    back: "पीछे",
    next: "आगे",
    finish: "कवच इस्तेमाल करें",
  },
  "mr-IN": {
    steps: en.map((step, i) => ({
      ...step,
      title: translated["mr-IN"][i]![0],
      body: translated["mr-IN"][i]![1],
    })),
    skip: "वगळा",
    back: "मागे",
    next: "पुढे",
    finish: "कवच वापरा",
  },
};
