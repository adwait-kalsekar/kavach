# Kavach

Kavach is an El Niño readiness copilot for farmers in Maharashtra. It brings sourced regional climate history, transparent water calculations and visual or spoken explanations into a simple planning experience.

Built for the **Google Cloud AI Builder Cup · Sustainability & Social Impact** by **Team Market Sense**.

## Try the application

- [Open the live application](https://kavach-web-62041733238.asia-south1.run.app)
- [Watch the 3:41 video walkthrough](https://drive.google.com/file/d/16_JQ9Ign1FwZ1iHbyehvFg2r87MV0ffZ/view?usp=sharing)
- [Read the submission pitch deck](docs/submission/kavach-ai-builder-cup-pitch-deck.pdf)

The application works on mobile and desktop. No account is required for the public sample experience.

## Walkthrough

1. **Choose your situation.** Start in **My season**, follow the highlighted walkthrough, and select a district and crop. The POC covers ten Maharashtra districts and gram/chickpea, rabi jowar and wheat. Latur/chickpea is the example used in the video.
2. **Describe your field.** Open **Tell us about your field** to choose irrigation access, soil depth, crop stage and reported moisture. Leave anything you have not checked as unknown. These inputs describe a synthetic planning scenario, not an observed or saved farm record.
3. **Explore the El Niño evidence.** Open **Past El Niño years** to compare monsoon rainfall in 2002, 2009, 2015 and 2023 against the 1991–2020 baseline. Open the source details and **What is El Niño?** explanation. The historical examples vary; they are context for planning, not a forecast.
4. **Compare your water options.** Open **Water options**, choose **Change inputs**, and review the available water, two areas, application depth and efficiency. The video uses 200,000 litres with 3 acres versus 1.5 acres. Inspect the calculated water balance, select **Use this comparison**, then open **Review this comparison** for a printable discussion sheet. This is a budget for one illustrative application.
5. **Ask and see the answer.** Open **Talk** and ask, “How did rainfall differ in the selected past El Niño years here?” The reply can include sourced rainfall, surface-condition, crop-check, water or insurance components. Follow with “Give me a one-liner about what you said” or “Explain it to me simply.” Recent conversation context is retained, and supporting evidence can be expanded.
6. **Try Hindi voice.** Change **Language** to **हिन्दी**, tap the microphone, speak, then tap again to finish. For example: “मेरे पास सिंचाई नहीं है।” Voice input receives a spoken reply alongside visual evidence; typed questions remain silent. English and Marathi are also supported.
7. **Review the next checks.** Return to **My field checks** or **Crop insurance** to inspect source-conditioned discussion prompts, published calendar dates and what needs local confirmation. Insurance eligibility is not verified by Kavach.

Language preference and walkthrough completion survive refresh in browser local storage. The walkthrough can be replayed. Farmer selections and chat questions remain available for the current visit; they are not a persistent farmer profile or chat archive.

## Evidence and scope

The POC uses CHIRPS rainfall history, dated ERA5-Land modeled surface moisture and air-temperature context, NOAA ONI information, and official guidance/calendar references. Sources, observation periods and limitations remain visible. Pure code supplies calculations and canonical figures; Gemini explains the supplied evidence and selects from a bounded visual component catalog.

Regional grid samples are not measurements of a farmer’s field. The experimental regional stress indicator is not a calibrated crop-loss probability. Water comparisons are not sowing approval or a whole-season irrigation schedule. Crop discussion rules require current local confirmation; personal insurance coverage is unverified. Crop-masked greenness, verified reservoir access, operational forecasts and current reviewed agronomic prescriptions remain future work.

See the [full brief audit](docs/architecture/brief-audit.md), [source and method documentation](docs/architecture/season-readiness.md), and [original Kavach brief](docs/reference/original-project-brief.md) for implemented capabilities and remaining gaps.

## Google Cloud architecture

- **Cloud Run:** independent static React/Vite web and Hono API services. Browser service traffic goes through Hono; cloud SDKs and credentials stay on the server.
- **Vertex AI / Gemini:** contextual explanations grounded in validated assessment evidence.
- **Google Speech-to-Text and Text-to-Speech:** English, Hindi and Marathi voice interaction.
- **Earth Engine:** bounded offline acquisition of regional CHIRPS and ERA5-Land evidence, served as dated, versioned snapshots through the API.
- **Firestore:** production backend operational state and shared usage controls. The public demo does not store farmer conversations as persistent chat history.

[Architecture documentation](docs/architecture/README.md) explains service boundaries, contracts, keyless identities and deployment. The submission deck includes the system architecture diagram.

## Run locally

Requires **Node.js 24 LTS (24.15+)** and **npm 12.2.0**. No GCP project or credentials are required for local deterministic evidence and calculations.

```sh
npm ci
cp apps/api/.env.example apps/api/.env
npm run dev
```

Open **http://localhost:3000**. Hono runs separately at **http://localhost:8080**; keep `APP_ORIGIN=http://localhost:3000` in the API configuration. Optional server-side Google configuration enables AI and speech. Without it, provider features show their unavailable state.

`npm run build:app` builds both services. `npm run start:api` starts only Hono, which does not serve frontend assets. See [web/API development](docs/architecture/web-foundation.md), [GCP setup](docs/deployment/gcp-setup.md) and [container instructions](infra/README.md).

## Verification

```sh
npm run build:app
npm run check:app
npm run test:api
npm run openapi:check
npm run test:firestore  # Java 21+, no GCP account
npx playwright install chromium
npm run test:e2e
```

The [backend implementation record](docs/architecture/backend-foundation.md) and [brief audit](docs/architecture/brief-audit.md) document checks and their limits. Browser and service verification do not establish agronomic validity or measured farmer impact.

## Project documentation

Start with the [documentation index](docs/README.md). `apps/web` uses React/Vite with TanStack Router and Query; `apps/api` uses Hono. Shared packages contain public contracts, a browser-safe API client and pure decision logic. `apps/docs` remains a separate Next.js starter and is excluded from application development and Cloud Run packaging.

Use [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) for engineering instructions. The [original submission sprint plan](docs/submission/README.md) records the deadline scope and historical build sequence.
