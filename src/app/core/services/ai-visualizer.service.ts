import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { VisualizeEventResponse } from '../interfaces/ai-visualizer.model';

/**
 * Wraps the client-facing AiController endpoint (AI Event Visualizer /
 * "Imagination Mode"). The component keeps its own local object-URL preview
 * of the uploaded file, so this service only needs to hand back the
 * AI-generated image URL rather than the full response envelope.
 */
@Injectable({ providedIn: 'root' })
export class AiVisualizerService {
  private readonly http = inject(HttpClient);

  /** POST /api/ai/visualize (multipart/form-data) */
  visualizeSpace(imageFile: File, prompt: string): Observable<string> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt);

    return this.http
      .post<VisualizeEventResponse>(`${API_BASE_URL}/ai/visualize`, formData)
      .pipe(map((response) => response.generatedImageUrl));
  }
}
