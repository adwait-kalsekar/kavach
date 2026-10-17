import { writeFileSync, readFileSync } from "node:fs";
import { openApiDocument } from "../dist/index.js";
const target = new URL("../../../docs/api/openapi.json", import.meta.url);
const output = JSON.stringify(openApiDocument(), null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== output)
    throw new Error(
      "OpenAPI drift: rebuild contracts and run npm run openapi -w @kavach/contracts.",
    );
} else writeFileSync(target, output);
