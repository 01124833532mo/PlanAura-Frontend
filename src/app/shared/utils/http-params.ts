import { HttpParams } from '@angular/common/http';

/**
 * Builds an HttpParams instance from a plain filter object, skipping any key
 * whose value is undefined, null, or an empty string. Used by the admin
 * services, which each take a filter DTO with many optional fields — keeps
 * every list() method a one-liner instead of repeating the same chain of
 * `if (filter.x !== undefined) params = params.set(...)` checks.
 */
export function toHttpParams(source: object): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    params = params.set(key, String(value));
  }

  return params;
}
