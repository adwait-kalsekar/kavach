import { config } from "@repo/eslint-config/react-internal";

export default [
  { ignores: ["dist/**", ".next/**", "node_modules/**"] },
  ...config,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@kavach/api",
                "@kavach/api/*",
                "@kavach/domain",
                "@google-cloud/*",
                "firebase*",
                "google-auth-library",
                "node:*",
                "**/apps/api/**",
              ],
              message:
                "Use @kavach/api-client. Server code and provider SDKs must stay behind Hono.",
            },
          ],
        },
      ],
    },
  },
];
