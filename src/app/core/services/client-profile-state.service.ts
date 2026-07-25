import { Injectable, inject, signal } from '@angular/core';
import { ClientProfile } from '../interfaces/client-profile.model';
import { ClientProfileService } from './client-profile.service';

/**
 * In-memory cache for the logged-in client's own profile (fetched once via
 * GET /api/clients/me). Mirrors VendorProfileStateService — the client-shell
 * topbar needs avatarUrl, which lives on ClientProfile, not on
 * AuthService.currentUser (CurrentUserDto has no avatar field).
 */
@Injectable({ providedIn: 'root' })
export class ClientProfileStateService {
  private readonly clientProfileService = inject(ClientProfileService);

  private readonly profileSignal = signal<ClientProfile | null>(null);
  private readonly loadingSignal = signal(false);

  readonly profile = this.profileSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  /** Fetches the profile once and caches it; safe to call repeatedly (no-op while cached or in flight). */
  load(): void {
    if (this.profileSignal() || this.loadingSignal()) {
      return;
    }

    this.loadingSignal.set(true);
    this.clientProfileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profileSignal.set(profile);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  clear(): void {
    this.profileSignal.set(null);
    this.loadingSignal.set(false);
  }

  /** Forces a fresh fetch, discarding any cached profile — use after an edit. */
  refresh(): void {
    this.clear();
    this.load();
  }
}
