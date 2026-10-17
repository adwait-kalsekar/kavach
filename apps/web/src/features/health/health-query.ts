import { queryOptions } from "@tanstack/react-query";
import { createRpcClient, readRpcResponse } from "@kavach/api-client";

const api = createRpcClient();
export const healthQueryOptions = queryOptions({
  queryKey: ["system", "health"],
  queryFn: async ({ signal }) => {
    const start = performance.now();
    const response = await readRpcResponse(
      "health",
      await api.api.v1.health.$get(
        {},
        {
          init: {
            signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
          },
        },
      ),
    );
    return { ...response, roundTripMs: Math.round(performance.now() - start) };
  },
});
