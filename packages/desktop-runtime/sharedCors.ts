export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const CORS_MAX_AGE = "86400";

export function corsOptionsResponse(allowedMethods: string = "POST, OPTIONS"): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Allow-Methods": allowedMethods,
      "Access-Control-Max-Age": CORS_MAX_AGE,
    },
  });
}