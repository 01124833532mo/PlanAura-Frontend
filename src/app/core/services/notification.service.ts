import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { AppNotification } from '../interfaces/notification.model';

/**
 * Wraps NotificationsController (api/notifications, [Authorize] — any
 * authenticated role). Also holds a small in-memory cache of the current
 * user's notifications so the client/vendor/admin shells' bell dropdowns can
 * share one fetch instead of each shell hitting the endpoint independently.
 * Mirrors the caching approach of VendorProfileStateService.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);

  private readonly notificationsSignal = signal<AppNotification[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly loadedSignal = signal(false);

  readonly notifications = this.notificationsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly unreadCount = computed(
    () => this.notificationsSignal().filter((n) => !n.isRead).length,
  );

  /** GET /api/notifications */
  getMy(unreadOnly = false): Observable<AppNotification[]> {
    let params = new HttpParams();
    if (unreadOnly) {
      params = params.set('unreadOnly', true);
    }
    return this.http.get<AppNotification[]>(`${API_BASE_URL}/notifications`, { params });
  }

  /** Fetches and caches the full notification list; safe to call repeatedly (no-op while in flight). */
  load(): void {
    if (this.loadingSignal()) {
      return;
    }
    this.loadingSignal.set(true);
    this.getMy().subscribe({
      next: (notifications) => {
        this.notificationsSignal.set(
          [...notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
        );
        this.loadedSignal.set(true);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  /** Loads only if never loaded before in this session — for shells that just want the bell populated. */
  loadOnce(): void {
    if (!this.loadedSignal() && !this.loadingSignal()) {
      this.load();
    }
  }

  refresh(): void {
    this.load();
  }

  /** POST /api/notifications/{id}/read */
  markAsRead(id: number): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/notifications/${id}/read`, {}).pipe(
      tap(() => {
        this.notificationsSignal.update((list) =>
          list.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        );
      }),
    );
  }

  /** POST /api/notifications/read-all */
  markAllAsRead(): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/notifications/read-all`, {}).pipe(
      tap(() => {
        this.notificationsSignal.update((list) => list.map((n) => ({ ...n, isRead: true })));
      }),
    );
  }
}
