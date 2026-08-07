import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { GenerateInvitationRequest, Invitation } from '../interfaces/ai-invitation.model';

/** Wraps the client-facing AiController invitation endpoints (AI Invitation). */
@Injectable({ providedIn: 'root' })
export class AiInvitationService {
  private readonly http = inject(HttpClient);

  /** POST /api/ai/invitations */
  generateInvitation(request: GenerateInvitationRequest): Observable<Invitation> {
    return this.http.post<Invitation>(`${API_BASE_URL}/ai/invitations`, request);
  }

  /** GET /api/ai/invitations/{eventPlanId} */
  listInvitations(eventPlanId: number): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`${API_BASE_URL}/ai/invitations/${eventPlanId}`);
  }

  /**
   * Fetches the full-quality generated image as a blob (rather than just
   * linking to imageUrl) so the browser saves it as a file with a chosen
   * name instead of navigating to/opening the image in a new tab - the
   * <a download> attribute is unreliable across browsers for cross-origin
   * URLs, which this always is (API origin vs. app origin).
   */
  downloadImage(imageUrl: string): Observable<Blob> {
    return this.http.get(imageUrl, { responseType: 'blob' });
  }
}
