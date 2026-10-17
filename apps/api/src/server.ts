import { serve } from "@hono/node-server";
import { compose } from "./composition.js";

const { app, config, store } = await compose();
const server = serve(
  { fetch: app.fetch, hostname: "0.0.0.0", port: config.port },
  () => {
    console.log(
      JSON.stringify({
        event: "listening",
        port: config.port,
        environment: config.environment,
        persistence: config.storage,
      }),
    );
  },
);
let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  const deadline = setTimeout(() => process.exit(1), 8000);
  deadline.unref();
  server.close(() => {
    void store
      .close()
      .then(() => {
        clearTimeout(deadline);
        process.exit(0);
      })
      .catch(() => process.exit(1));
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
