import { app } from "@azure/functions";
import { handle } from "./app.mjs";
app.http("qwik", {
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "{*path}",
  handler: async (request) => {
    const response = await handle(
      new Request(request.url, {
        method: request.method,
        headers: Object.fromEntries(request.headers),
        ...(!["GET", "HEAD"].includes(request.method)
          ? { body: await request.text() }
          : {}),
      }),
    );
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    };
  },
});
