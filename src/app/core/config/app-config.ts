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
