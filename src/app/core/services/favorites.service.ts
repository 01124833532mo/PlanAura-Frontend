import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'planura.favorites.vendorIds';

/**
 * Per-device "saved vendors" list. There is no backend favorites endpoint
 * yet, so this persists to localStorage rather than faking a heart icon
 * that doesn't actually save anything — it's a real, working feature, just
 * not synced across devices until a server-side favorites table exists.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly idsSignal = signal<ReadonlySet<number>>(this.readFromStorage());
  readonly ids = this.idsSignal.asReadonly();

  isFavorite(vendorId: number): boolean {
    return this.idsSignal().has(vendorId);
  }

  toggle(vendorId: number): void {
    const next = new Set(this.idsSignal());
    if (next.has(vendorId)) {
      next.delete(vendorId);
    } else {
      next.add(vendorId);
    }
    this.idsSignal.set(next);
    this.writeToStorage(next);
  }

  private readFromStorage(): Set<number> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return new Set();
      }
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed.filter((v) => typeof v === 'number')) : new Set();
    } catch {
      // Private-browsing storage restrictions or corrupted data — fail soft.
      return new Set();
    }
  }

  private writeToStorage(ids: ReadonlySet<number>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      // Storage full / disabled — favoriting still works for the session via the signal.
    }
  }
}
