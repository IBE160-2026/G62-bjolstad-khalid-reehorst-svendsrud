import createClient, { type ClientOptions } from "openapi-fetch";

import type { paths } from "./schema";

/**
 * Typed API client generated from the backend OpenAPI schema (AD-10).
 *
 * The schema paths already start with `/api` (e.g. `/api/health`), so the client
 * uses the same origin as the page and every call goes through the Next.js
 * `/api` rewrite. Regenerate the types with `npm run gen:api`.
 */
export function createApiClient(options: ClientOptions = {}) {
  return createClient<paths>({ baseUrl: "", ...options });
}

export const api = createApiClient();
