if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error(
    "Run through npm run test:firestore; a real cloud database must never be used for these tests.",
  );
process.env.TEST_FIRESTORE = "1";
process.env.GOOGLE_CLOUD_PROJECT = "demo-kavach";
await import("./api.test.mjs");
