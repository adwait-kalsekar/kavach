# Authentication follow-up

Reviewed 17 October 2026. Account login is deferred by user instruction. The implemented opaque guest cookie isolates records; it does not verify a person's identity or provide recovery across devices.

| Option                                                      | Fit and tradeoff                                                                                                                                                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity Platform / Firebase email-password via server REST | Recommended next account option: GCP-native and compatible with browser → Hono only. Auth emulator allows project-free development. Hono must own sign-in, recovery and app-session lifecycle.      |
| Clerk                                                       | Managed account UX, but typical browser SDK integrations contact Clerk directly. Its Frontend API proxy supports same-domain designs with additional configuration and an external SaaS dependency. |
| Better Auth                                                 | Hono integration exists. Firestore adapters are community-maintained; an officially supported SQL adapter would introduce a different persistence service.                                          |
| Homemade email/password                                     | Avoid owning password storage, reset tokens and account recovery when managed identity can provide these functions.                                                                                 |

When adding accounts, keep a server-only identity-provider port and map provider identity to an internal owner. Rotate guest sessions on promotion; make transfer of existing guest plans explicit and atomic. Never merge accounts by an unverified email address. Define app-session revocation after password reset or account disable; provider token changes alone do not invalidate our opaque cookies. OAuth redirects and browser CAPTCHA SDKs require a deliberate decision about the strict browser boundary.

No identity-provider dependency or account endpoints are installed in this batch.

Sources: [Identity Platform REST](https://docs.cloud.google.com/identity-platform/docs/use-rest-api), [Firebase Auth emulator](https://firebase.google.com/docs/emulator-suite/connect_auth), [Clerk proxy](https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi), [Better Auth Hono](https://better-auth.com/docs/integrations/hono), [community adapters](https://better-auth.com/docs/adapters/community-adapters), [Firebase session lifecycle](https://firebase.google.com/docs/auth/admin/manage-cookies).
