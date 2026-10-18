# Submission and demo checklist

Official pages checked **18 October 2026**: [requirements](https://aibuildercup.com/themes.html), [FAQ](https://aibuildercup.com/Faqs.html), [timeline](https://aibuildercup.com/). The entrant dashboard may contain additional upload limits/fields. Plan on an eight-hour working window; upload before its end.

## Required deliverables

| Deliverable                   | Evidence / check                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Functional deployed prototype | Public working Google Cloud URL, Cloud Run or Firebase; not a health-only mockup                                                |
| Real Google AI use            | Gemini/Gemma or eligible agentic platform, meaningfully integrated; capture actual model behavior                               |
| Proposal deck exported to PDF | Problem, community benefit, solution, technical feasibility and scaling; use [deck starter](deck-outline.md)                    |
| Public demo video             | FAQ says **under three minutes**; target 2:40, on public YouTube/Vimeo/Drive, playable signed out                               |
| **Public GitHub repository**  | FAQ explicitly requires public source; a private-repo invitation is insufficient                                                |
| Category/theme                | Sustainability & Social Impact; requirements also use “Sustainability” among category labels. Match the actual dashboard option |
| English materials             | Code/documentation/presentation/video narration or English captions as required; avoid unverified language-support claims       |

Judging: technical/GenAI **40%**, problem/impact **25%**, innovation **25%**, UX **10%**. The technical story must show genuine model use, not just a Google Cloud hosting badge. A short grounded explanation with visible input/result differences is preferable to pretending to have an autonomous agent.

The FAQ also specifies eligibility/team conditions and fresh work during the program. Verify your already-registered team's status in the entrant dashboard; do not claim this repo's prototype has been formally accepted merely because deployment works.

## 2:40 recording script

| Video time | Show / say                                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:20  | “Advice can assume resources a farmer doesn't have. Kavach makes those constraints explicit.” Label the scenario synthetic                          |
| 0:20–0:50  | Show Latur/chickpea, one irrigation, unknown moisture. Run actual checks; show the field-check limitation                                           |
| 0:50–1:20  | Request the real Google-model explanation; show actual loading/result, source/limits and model identity/time                                        |
| 1:20–1:55  | Change irrigation to none; show changed deterministic checks and grounded explanation of the difference. The original context is not silently saved |
| 1:55–2:15  | Show unavailable weather/unknown field condition honestly and a retry/error state if time permits                                                   |
| 2:15–2:40  | Show the deployment architecture and scope: React web → Hono → Google model/Firestore operations; explain future private plans/reviewed rules       |

Keep the actual interaction visible. Rehearse to avoid wasting the video on cold starts or console navigation. Cached output can be shown only with its original generated time/cached label; don't call it a new live generation. Do not add fake model logs, farmer testimonials, impact numbers or agronomic validation. If editing out dead time, don't edit away a failure to make an unsupported feature appear implemented.

## Source publication gate — owner action

The repository is currently private. Publishing it changes who can read its entire Git history, issues and tracked artifacts. Codex pushing main does **not** authorize this visibility change.

Before the owner publishes: review tracked files **and history** for credentials, private data, .env files, service-account JSON, downloaded farmer data, third-party assets/licensing and internal-only notes. Use your available secret-scanning tools; a quick string search is not proof that history is clean. Rotate any exposed secret before publication. Confirm research/source licenses and select appropriate project licensing.

Once reviewed, the owner can make this repository public in GitHub Settings → General → Danger Zone, or publish an appropriately reviewed clean submission repository with source/build instructions. If using a separate repository, update submission links; **do not change the existing WIF repo IDs/workflow trust without a deliberate deployment migration**. Publishing a repository does not require moving the deployment pipeline.

Do not post credential screenshots or private GCP identifiers beyond the metadata needed to explain architecture. No key, ADC file or access token belongs in the recording, repository or PDF.

## Final pass before submit

- [ ] Signed-out/incognito visitor opens the live web URL and completes the full sample demo, not just health.
- [ ] Google model/version/time metadata is genuine; provider failure is visible and deterministic checks stay available.
- [ ] Changing the water constraint changes the result/rationale; unknown moisture stays unknown.
- [ ] Phone-size UI works; keyboard labels, readable contrast and loading/error controls are usable.
- [ ] Public sample routes set no guest cookie and cannot access private farms/plans.
- [ ] No browser cloud/model SDK or direct provider call; no credentials in built assets.
- [ ] Main/source commit, deployed revision pair and model configuration are recorded.
- [ ] The **public** source link opens signed out and README explains local startup and actual limitations.
- [ ] PDF opens and contains the real URLs, correct theme and accurate implementation status.
- [ ] Video is below three minutes and plays signed out, including Drive sharing settings if used.
- [ ] Dashboard fields are complete, attachments uploaded, links pasted correctly and final submission confirmed.
- [ ] Receipt/confirmation and the exact submitted URLs are retained.

Do not make a late framework/domain refactor after these checks. Keep the last known-good deployment available through evaluation.
