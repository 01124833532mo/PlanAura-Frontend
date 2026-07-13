import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const TOKEN_KEY = 'planura_access_token';

/**
 * Thin wrapper around localStorage. Guarded behind isPlatformBrowser because
 * this app uses Angular SSR (src/main.server.ts) — localStorage does not
 * exist while rendering on the server, and touching it there throws.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
  }
}
