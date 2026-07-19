/**
 * Central place for frontend runtime configuration.
 *
 * NOTE: this project's Angular CLI setup does not yet define environment.ts /
 * environment.development.ts file-replacement targets, so we keep the API base
 * URL here as a single, easy-to-find constant instead. If multi-environment
 * builds are introduced later, swap this for Angular's standard `environment`
 * file-replacement mechanism without changing any call sites (everything
 * imports API_BASE_URL from here).
 *
 * Matches the backend's default HTTPS dev profile in
 * Planura.Apis/Properties/launchSettings.json ("https": https://localhost:7123).
 */
export const API_BASE_URL = 'https://localhost:7123/api';

/**
 * Origin the API server also serves static files from (wwwroot), i.e.
 * API_BASE_URL without the trailing "/api". Some endpoints (e.g. admin
 * vendor-verification documents) return FileUrl values as paths relative to
 * this origin ("images/...") rather than the fully-qualified URLs other
 * endpoints return via IAttachmentService.ToAbsoluteUrl. Used to resolve
 * those relative paths into <img> srcs.
 */
export const STATIC_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Stripe's publishable key is not secret (it's designed to be embedded in
 * client code), so it's safe to hardcode here. This replaces the old
 * per-booking fetch from GET /booking-requests/{id}/payment-options, which
 * was removed when the payment flow moved to authorize-at-booking-time —
 * there is no longer a per-request server round trip that could hand this
 * back dynamically. Matches the backend's Stripe:PublishableKey dev value.
 */
export const STRIPE_PUBLISHABLE_KEY =
  'pk_test_51TsjWvJTBgcTyrCLDrVYXp1HZFOfa1LNUaHp7P4faMd5zJ6hYQSiCRUGcjtwo2XNN5nNMAFi8zc7p8othY68Ccxu00i7L2YVTl';
