import { createFileRoute } from "@tanstack/react-router";
import { getSessionFromRequest } from "@/lib/session.server";
import { jsonResponse } from "@/lib/http.server";

export const Route = createFileRoute("/api/public/app/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authenticated = getSessionFromRequest(request, "main");
        return jsonResponse({ authenticated });
      },
    },
  },
});
