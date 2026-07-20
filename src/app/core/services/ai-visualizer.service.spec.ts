import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/app-config';
import { VisualizeEventResponse } from '../interfaces/ai-visualizer.model';
import { AiVisualizerService } from './ai-visualizer.service';

describe('AiVisualizerService', () => {
  let service: AiVisualizerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AiVisualizerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('POSTs multipart/form-data with the image file and prompt to /ai/visualize', () => {
    const file = new File(['fake-image-bytes'], 'hall.jpg', { type: 'image/jpeg' });
    const prompt = 'A modern wedding setup with white roses, fairy lights, and a luxury stage.';

    service.visualizeSpace(file, prompt).subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/ai/visualize`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);

    const body = req.request.body as FormData;
    expect(body.get('image')).toBe(file);
    expect(body.get('prompt')).toBe(prompt);

    const response: VisualizeEventResponse = {
      originalImageUrl: 'https://api.planura.local/images/ai-visualizer/originals/abc.jpg',
      generatedImageUrl: 'https://api.planura.local/images/ai-visualizer/generated/abc.png',
      prompt,
    };
    req.flush(response);
  });

  it('resolves to the generated image URL extracted from the response body', () => {
    const file = new File(['fake-image-bytes'], 'hall.jpg', { type: 'image/jpeg' });
    let result: string | undefined;

    service.visualizeSpace(file, 'A prompt').subscribe((generatedImageUrl) => {
      result = generatedImageUrl;
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/ai/visualize`);
    req.flush({
      originalImageUrl: 'https://api.planura.local/images/ai-visualizer/originals/abc.jpg',
      generatedImageUrl: 'https://api.planura.local/images/ai-visualizer/generated/abc.png',
      prompt: 'A prompt',
    } as VisualizeEventResponse);

    expect(result).toBe('https://api.planura.local/images/ai-visualizer/generated/abc.png');
  });

  it('propagates an HTTP error to the caller instead of swallowing it', () => {
    const file = new File(['fake-image-bytes'], 'hall.jpg', { type: 'image/jpeg' });
    let receivedError: HttpErrorResponse | undefined;

    service.visualizeSpace(file, 'A prompt').subscribe({
      next: () => undefined,
      error: (err: HttpErrorResponse) => {
        receivedError = err;
      },
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/ai/visualize`);
    req.flush({ message: 'The image generation service is currently unavailable.' }, {
      status: 502,
      statusText: 'Bad Gateway',
    });

    expect(receivedError?.status).toBe(502);
  });
});
