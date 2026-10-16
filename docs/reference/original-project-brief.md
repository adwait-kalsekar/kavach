# Kavach — El Niño Readiness Copilot

> **Working name.** "Kavach" means *shield*. Rename freely.
> **Hackathon:** Google Cloud AI Builder Cup 2026 (Hack2skill) · Theme: **Sustainability & Social Impact**
> **Submission deadline:** 18 October 2026

---

## 1. The idea in one line

**We turn global El Niño warnings into a simple, personal answer for one farmer — "here is your risk this season, and here is what to do" — spoken in their own language.**

---

## 2. The basics (for anyone new to this)

- **El Niño** — every few years the Pacific Ocean near South America warms up. This shifts rain patterns
  worldwide. For India and Southeast Asia it usually means **less rain and more heat → drought risk**.
- **Why farmers suffer** — about half of India's farmland depends on rain, not irrigation. When rain fails,
  crops fail, and a family loses a year's income.
- **The odd part** — scientists see El Niño coming **months in advance**. But the farmer only hears
  "below-normal monsoon" on the news. Nobody tells them **what to change on their own field**.
- **What we build** — a translator between that early science and a farmer's decision:
  *"El Niño is strong"* → *"In your village, sow this variety, after this date, and save water for flowering."*

---

## 3. Problem statement

> El Niño-driven droughts cost Asian farmers billions, yet existing early warnings rarely reach farmers in a
> form they can act on: forecasts are generic, district-wide, delivered mostly through apps and portals, and do
> not say what to change. In 2026 a very strong El Niño left India's monsoon 12.6% short and 282 districts
> rain-deficient, putting the winter (rabi) crop at risk. **Kavach is an AI copilot that combines satellite
> climate data, past El Niño years and official agronomy contingency plans to give each farmer a crop-specific
> risk score and action plan — delivered through a voice conversation in their own language.**

---

## 4. Why now — the need

| Fact | What it means |
|---|---|
| A very strong El Niño is active (NOAA: >90% chance of "very strong"), lasting to ~May 2027 | A real, live crisis during judging |
| 2026 monsoon ended **12.6% deficient**; **282 districts (38%)** had deficient rain | Farmers are already hurting |
| Reservoirs are below the 10-year average; rabi sowing is happening **now** | Decisions are being made this month |
| India has **140M+ smallholder farming households** | Huge affected population |
| FAO: **every $1 spent on early action saves ~$7** in losses (FAO's own estimate) | Acting early pays — the economic case |

**The need in one sentence:** the warning comes months early, but the *action* doesn't, because nobody
translates the warning into farm-level decisions.

---

## 5. What already exists — and where we fit

| Existing tool | What it does | What it does *not* do |
|---|---|---|
| **Bharat-VISTAAR** (Govt, Feb 2026) | AI voice helpline (155261): crops, weather, pests, prices | No documented El Niño / seasonal-risk layer |
| **Kisan e-Mitra** (Govt + Wadhwani AI) | AI chatbot, 11 languages, mostly scheme queries | Not about climate risk |
| **Mausamgram** (IMD) | Village-level weather forecast, up to 10 days | Weather only — no "what to do" |
| **GKMS / Meghdoot** (IMD) | Twice-weekly agromet advisories | Generic; criticised as too broad |
| **Krishi-DSS** (Govt) | Satellite drought monitoring | Built for officials, limited outside access |
| **Google + UChicago monsoon pilot** (2025) | AI monsoon-onset forecast by SMS to 38M farmers | Onset only; one-way SMS |
| **Farmer.Chat**, **Farm Vaidya**, many hackathon "KrishiMitra" bots | General AI farm chatbots | Not El Niño / seasonal-risk specific |

**Our position:** a generic "AI farmer chatbot" is not new. What is missing is the **climate-risk layer** —
a 2026 MicroSave analysis *proposes* exactly such a layer for Bharat-VISTAAR, but it is not yet built.

> **We are not another farmer chatbot. We are the El Niño / seasonal-risk layer that existing platforms
> are missing — designed to plug into them, not compete with them.**

---

## 6. Who we help

- **Primary user:** a small farmer in a drought-prone, mostly rain-fed area.
  *Example persona (synthetic): Sunita, 3 acres in Latur, Maharashtra. Grows gram (chickpea) in winter. Weak borewell.*
- **Secondary users:** Farmer Producer Organisations (FPOs) and Krishi Vigyan Kendras (district farm centres),
  who pass advice on to many farmers.

---

## 7. What we solve — three gaps

1. **"What does El Niño mean for *my* farm?"** → We show what happened in *her area* in past El Niño years.
2. **"So what should I do?"** → 3–4 concrete, dated actions taken from **official contingency plans**.
3. **"I can't read this app."** → She speaks in Marathi/Hindi and hears the answer back.

---

## 8. What the farmer experiences

1. Sunita taps the mic: *"I want to sow gram next week. Is it safe?"*
2. Kavach knows her location and crop.
3. It replies by voice, with a simple card:
   - 🔴 **Risk: High** — "In the last 4 El Niño years, rain here was 18–31% below normal and crop greenness fell about a fifth."
   - 💧 "Your soil is drier than usual now; the nearby reservoir is at 48%."
   - ✅ **What to do:**
     1. Use a short-duration gram variety (named in the official plan)
     2. Sow after a specific date
     3. Save water for one irrigation at flowering
     4. Enrol in crop insurance (PMFBY) before the deadline
   - 📄 Every number shows its **source and date**.

*(Numbers above are illustrative for the pitch — the real app shows computed values.)*

---

## 9. How it works — four layers

```
 1. SENSE   ──▶  2. COMPARE   ──▶  3. DECIDE     ──▶  4. EXPLAIN
 (today's        (past El Niño      (tested code,       (Gemini voice
  data)           years)             not AI)             agent)
```

| Layer | What it does | Built with |
|---|---|---|
| **1. Sense** | Current rainfall, soil moisture, crop greenness, heat, reservoir level, El Niño strength | Google Earth Engine, NOAA ONI index, CWC reservoir bulletin |
| **2. Compare** | What happened here in past El Niño years (2002, 2009, 2015, 2023) | Earth Engine history → stored in BigQuery |
| **3. Decide** | Risk score + choose actions. **Plain, tested code — not AI** | Cloud Run service + ICAR-CRIDA District Contingency Plans |
| **4. Explain** | Gemini talks to the farmer in their language, answers follow-ups, cites only layer-3 numbers | Gemini (voice + text), agent with tools |

### The golden rule
**AI explains, code decides.** Gemini never invents a number or a recommendation. Every figure comes from
the engine and carries a source. This keeps it trustworthy for something as serious as a farmer's livelihood.

### Why this design
- **Past El Niño years** — El Niño doesn't hit every village the same; local history is the most honest evidence, and farmers remember those years.
- **Official contingency plans** — agronomists already wrote "if the monsoon fails, do X" for each district; using them builds trust.
- **Code decides** — a model can sound confident and be wrong; numbers must be checkable.
- **Voice-first** — many farmers find typing and reading apps hard.

---

## 10. Google stack (Technical Merit & GenAI = 40% of score)

| Google tool | Role |
|---|---|
| **Gemini** | Multilingual voice conversation, tool-using agent, plain-language explanations |
| **Earth Engine** | Satellite rainfall, soil moisture, vegetation, heat |
| **WeatherNext** *(if access arrives)* | 15-day AI weather forecast |
| **BigQuery** | Precomputed district/village risk profiles |
| **Cloud Run** | Hosts the app (mandatory) |
| **Maps Platform** | Location lookup, map view |

## 11. Data sources

| Need | Source |
|---|---|
| Rainfall (since 1981) | CHIRPS (Earth Engine) |
| Temperature, soil moisture | ERA5-Land, SMAP (Earth Engine) |
| Crop greenness, heat | MODIS NDVI, MODIS LST (Earth Engine) |
| El Niño strength | NOAA Oceanic Niño Index (ONI) |
| Water storage | Central Water Commission bulletin, India-WRIS |
| What to do | ICAR-CRIDA District Agriculture Contingency Plans |
| Prices *(optional)* | Agmarknet |

---

## 12. What we deliberately will NOT do

- Promise certainty — always show a range and a confidence level.
- Let AI invent advice — actions come from official plans.
- Cover all of India — **demo = one state (Maharashtra), ~10 districts, 3 crops (gram, jowar, wheat).**
- Use real personal data — farmer profiles are synthetic.
- Reuse any earlier project's code — hackathon rules require a fresh code base built during the hackathon.

---

## 13. Built to grow region by region

Split the product into two parts:

| Part | Same everywhere? | Why |
|---|---|---|
| **Satellite data + risk engine** | ✅ Global | Earth Engine covers the planet; El Niño is one global signal |
| **Region pack** | ❌ Per region | Boundaries, crops + calendar, local action plans, languages |

**Adding a country = writing a new region pack, not rebuilding the product.**

| Region pack | Crops | Language |
|---|---|---|
| India – Maharashtra *(demo)* | Gram, jowar, wheat | Marathi, Hindi |
| Thailand | Rice, sugarcane | Thai |
| Indonesia | Rice, palm oil | Bahasa Indonesia |
| Philippines | Rice, corn | Filipino |

**Growth path:** one Indian state → other drought-prone Indian states → Southeast Asia → other El Niño-hit regions (Australia, southern Africa).

---

## 14. Who pays (market)

Small farmers usually don't pay for advice. Organisations that lose money when farmers suffer do.

| Customer | Why they'd pay |
|---|---|
| Government (state agri depts, Bharat-VISTAAR) | Prevention is cheaper than drought relief |
| Crop insurers (PMFBY ecosystem) | Fewer losses, better risk pricing |
| Banks / microfinance | Farm loans default in drought years |
| Seed & fertiliser companies | Recommend the right inputs for the season |
| Food companies & traders | Early warning of supply shortfalls |
| NGOs, FAO, WFP | Already fund early action |

**Model:** free for farmers; paid dashboards / API for institutions.
**Market size:** India agritech ≈ **$1B (conservative, Ken Research) to $9B (Inc42)** in 2025, growing fast.

---

## 15. Impact — what we claim and what we don't

**Strong case:** the problem is real, urgent and huge; early action is proven to pay (FAO $1 → $7); the 2025
monsoon pilot suggests farmers do change sowing decisions when given forecasts.

**Honest limits:**
- A prototype has no measured impact yet — we present *potential* plus a measurement plan.
- El Niño does not always mean drought (the Indian Ocean Dipole can offset it) — we show probabilities, not certainties.
- The hardest part is reaching farmers — rollout goes through existing channels (Bharat-VISTAAR, FPOs, KVKs, WhatsApp/IVR), not "farmers download our app".

**How we would measure impact:** farmers reached via partners · % who changed a decision · losses avoided vs.
neighbouring areas · insurance enrolment in high-risk villages.

---

## 16. Risks and how we handle them

| Risk | Handling |
|---|---|
| El Niño ≠ guaranteed drought | Show past-year ranges + current soil data; never "you will lose" |
| Wrong warning destroys trust | Advice from official plans; every figure sourced |
| WeatherNext access slow | Earth Engine history works without it |
| Farmers don't use web apps | Voice-first now; WhatsApp/IVR in the rollout plan |
| Little time left | Strict scope: one state, 3 crops, precomputed data |

---

## 17. Build plan to the deadline

| When | Build | Done when |
|---|---|---|
| **16 Oct** | New public GitHub repo · Earth Engine script → past El Niño-year rain/soil/greenness for ~10 Maharashtra districts → BigQuery · Risk engine + tests · contingency-plan table for 3 crops | Tests pass, BigQuery table populated |
| **17 Oct** | Web app on Cloud Run (map, district picker, risk card) · Gemini agent with tools, Hindi/Marathi, every number cited | Live URL answers a question correctly |
| **18 Oct** | Polish · 3-minute video · PDF deck · README · submit | Submitted ✅ |

**Cut first if short on time:** voice → text chat; WeatherNext → Earth Engine only.
**Never cut:** risk engine, Gemini agent, live Cloud Run URL.

---

## 18. Submission checklist (from the official rules)

- [ ] Working deployed live URL (Cloud Run / Firebase / GCP)
- [ ] Video demo **under 3 minutes** (public YouTube / Vimeo / Drive)
- [ ] **Public** GitHub repository
- [ ] Deck as **PDF**: vision, problem & community benefit, feasibility & scalability, architecture
- [ ] Problem statement / category named (Sustainability & Social Impact)
- [ ] Everything in **English**
- [ ] Uses Gemini/Gemma; built primarily on Google Cloud
- [ ] Fresh code only — written during the hackathon window

### Judging weights
| Criterion | Weight |
|---|---|
| Technical Merit & GenAI Implementation | **40%** |
| Problem Alignment & Impact | 25% |
| Innovation & Creativity | 25% |
| User Experience & Solution Design | 10% |

---

## 19. 3-minute demo script

1. **0:00–0:30 — Problem.** "A historic El Niño is here. 282 districts got too little rain. Farmers get warnings, not answers."
2. **0:30–1:00 — Meet Sunita.** Her farm, her decision.
3. **1:00–2:15 — Live demo.** Voice question in Marathi → risk card → past El Niño evidence → action plan → follow-up ("What if I only have one irrigation?").
4. **2:15–2:40 — How it works.** Four layers, Google stack, "AI explains, code decides".
5. **2:40–3:00 — Scale.** Same engine for Thailand, Indonesia, Philippines via region packs; rollout through FPOs, KVKs, Bharat-VISTAAR.

---

## 20. The pitch in three sentences

> Scientists saw this year's historic El Niño coming months ago — but farmers still only hear "below-normal
> rain", with no idea what to change. **Kavach is the missing climate-risk layer: it uses satellite data and past
> El Niño years to give each farmer a local risk score and an official action plan, explained by a Gemini voice
> assistant in their own language.** We start in Maharashtra; the same engine extends to Thailand, Indonesia and
> the Philippines with a new region pack.

---

## Glossary

| Term | Meaning |
|---|---|
| **El Niño / La Niña** | Warm / cool phases of the Pacific Ocean that shift global rainfall |
| **ENSO / ONI** | The El Niño cycle / NOAA's index measuring its strength |
| **Monsoon** | India's main rainy season (June–September) |
| **Kharif / Rabi** | Monsoon-season crops / winter-season crops |
| **Rain-fed** | Farmland watered only by rain, no irrigation |
| **NDVI** | Satellite measure of how green (healthy) crops are |
| **Contingency plan (CRIDA)** | Official per-district guide: "if rain fails, do this" |
| **FPO / KVK** | Farmer Producer Organisation / Krishi Vigyan Kendra (district farm centre) |
| **PMFBY** | India's government crop insurance scheme |
| **IOD** | Indian Ocean Dipole — can weaken or strengthen El Niño's effect on India |

---

## Key sources

- NOAA — El Niño status: https://www.noaa.gov/news-release/el-nino-forms-expected-to-strengthen-say-noaa-forecasters
- Business Standard — 2026 monsoon deficit: https://www.business-standard.com/amp/industry/agriculture/2026-monsoon-ends-with-nearly-13-rain-deficit-worst-since-2015-imd-126093001389_1.html
- MicroSave — Climate layer proposal for Bharat-VISTAAR: https://www.microsave.net/2026/03/13/integrating-climate-into-indias-digital-agriculture-solutions-the-case-for-a-climate-resilient-agricultural-system-cras/
- Bharat-VISTAAR launch: https://www.global-agriculture.com/india-region/india-launches-ai-driven-bharat-vistaar-to-deliver-real-time-advisory-to-farmers/
- Google — AI monsoon forecasts for 38M farmers: https://blog.google/technology/research/indian-farmers-monsoon-prediction/
- CSE — Agromet advisory gaps: https://cdn.cseindia.org/attachments/0.77659900_1770716256_gauri-arora.pdf
- FAO — Anticipatory action ($1 → $7): https://www.fao.org/3/cc7267en/cc7267en.pdf
- Ken Research — India agritech market: https://www.kenresearch.com/industry-reports/india-agritech-market.md
- AI Builder Cup — requirements & judging: https://aibuildercup.com/themes.html
- AI Builder Cup — Terms (fresh code rule): https://docs.google.com/document/d/e/2PACX-1vRm7ChZ6Ij9fG7uFDkxzUMpwgVeBmnQ6cMDnAIEEX84AiLBOOQ9cYbl3S5OzFBbcVb8TF55s-eVpiXb/pub
