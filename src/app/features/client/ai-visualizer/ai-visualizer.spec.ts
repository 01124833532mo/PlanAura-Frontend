import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of, throwError } from 'rxjs';
import { AiVisualizerComponent } from './ai-visualizer';
import { AiVisualizerService } from '../../../core/services/ai-visualizer.service';
import { FileDropzone } from '../../../shared/ui/file-dropzone/file-dropzone';
import { AppError } from '../../../core/interfaces/api-response.model';

// notify.ts (SweetAlert2) needs window.matchMedia, which jsdom doesn't
// implement. The Angular test runner here disallows vi.mock() on relative
// imports ("Please use Angular TestBed for mocking dependencies"), so the
// pragmatic fix is polyfilling the missing API rather than mocking the
// module - real toasts are harmless side effects in these tests.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
}

/**
 * Records every call and lets each test decide whether visualizeSpace()
 * resolves or errors, without depending on a spy-object API (jasmine vs.
 * vitest globals) that may differ depending on the test runner shim.
 */
class FakeAiVisualizerService {
  calls: Array<{ file: File; prompt: string }> = [];
  private result: () => Observable<string> = () => of('https://api.planura.local/images/ai-visualizer/generated/abc.png');

  resolveWith(generatedImageUrl: string): void {
    this.result = () => of(generatedImageUrl);
  }

  rejectWith(error: AppError): void {
    this.result = () => throwError(() => error);
  }

  visualizeSpace(file: File, prompt: string): Observable<string> {
    this.calls.push({ file, prompt });
    return this.result();
  }
}

function createImageFile(name = 'hall.jpg'): File {
  return new File(['fake-image-bytes'], name, { type: 'image/jpeg' });
}

function getButtonByText(nativeElement: HTMLElement, text: string): HTMLButtonElement {
  const buttons = Array.from(nativeElement.querySelectorAll<HTMLButtonElement>('ui-button button'));
  const match = buttons.find((button) => button.textContent?.trim().includes(text));
  if (!match) {
    throw new Error(`No <ui-button> found containing text "${text}"`);
  }
  return match;
}

describe('AiVisualizerComponent', () => {
  let fakeService: FakeAiVisualizerService;

  beforeEach(async () => {
    fakeService = new FakeAiVisualizerService();

    await TestBed.configureTestingModule({
      imports: [AiVisualizerComponent],
      providers: [{ provide: AiVisualizerService, useValue: fakeService }],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(AiVisualizerComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('keeps the "Visualize My Event" action disabled until an image and a prompt are both provided', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as {
      imageControl: { setValue(v: File | null): void };
      promptControl: { setValue(v: string): void };
    };

    fixture.detectChanges();
    expect(getButtonByText(fixture.nativeElement, 'Visualize My Event').disabled).toBe(true);

    component.imageControl.setValue(createImageFile());
    fixture.detectChanges();
    expect(getButtonByText(fixture.nativeElement, 'Visualize My Event').disabled).toBe(true);

    component.promptControl.setValue('A modern wedding setup with white roses.');
    fixture.detectChanges();
    expect(getButtonByText(fixture.nativeElement, 'Visualize My Event').disabled).toBe(false);
  });

  it('shows a local preview of the uploaded image as soon as a file is selected', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as {
      imageControl: { setValue(v: File | null): void };
    };

    expect(fixture.nativeElement.querySelector('.aiv-results')).toBeNull();

    component.imageControl.setValue(createImageFile());
    fixture.detectChanges();

    const preview = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
      'img[alt="Uploaded photo of the empty space"]',
    );
    expect(preview).toBeTruthy();
    expect(preview!.src).toMatch(/^blob:/);
  });

  it('clicking "Visualize My Event" sends the selected file and trimmed prompt, then renders the generated image', () => {
    fakeService.resolveWith('https://api.planura.local/images/ai-visualizer/generated/xyz.png');
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as {
      imageControl: { setValue(v: File | null): void };
      promptControl: { setValue(v: string): void };
    };
    const file = createImageFile();

    component.imageControl.setValue(file);
    component.promptControl.setValue('  A modern wedding setup with white roses.  ');
    fixture.detectChanges();

    getButtonByText(fixture.nativeElement, 'Visualize My Event').click();
    fixture.detectChanges();

    expect(fakeService.calls.length).toBe(1);
    expect(fakeService.calls[0].file).toBe(file);
    expect(fakeService.calls[0].prompt).toBe('A modern wedding setup with white roses.');

    const generatedImg = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
      'img[alt="AI-generated visualization of the styled event"]',
    );
    expect(generatedImg).toBeTruthy();
    expect(generatedImg!.src).toContain('generated/xyz.png');
  });

  it('shows an error banner and re-enables the action when the service call fails', () => {
    fakeService.rejectWith({
      status: 502,
      message: 'The image generation service is currently unavailable.',
      fieldErrors: [],
    });
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as {
      imageControl: { setValue(v: File | null): void };
      promptControl: { setValue(v: string): void };
    };

    component.imageControl.setValue(createImageFile());
    component.promptControl.setValue('A modern wedding setup.');
    fixture.detectChanges();

    getButtonByText(fixture.nativeElement, 'Visualize My Event').click();
    fixture.detectChanges();

    const alertText = fixture.nativeElement.querySelector('.ui-alert__message')?.textContent;
    expect(alertText).toContain('The image generation service is currently unavailable.');

    const visualizeButton = getButtonByText(fixture.nativeElement, 'Visualize My Event');
    expect(visualizeButton.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('img[alt="AI-generated visualization of the styled event"]')).toBeNull();
  });

  it('does not call the service when no image has been selected', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as { promptControl: { setValue(v: string): void } };

    component.promptControl.setValue('A modern wedding setup.');
    fixture.detectChanges();

    getButtonByText(fixture.nativeElement, 'Visualize My Event').click();

    expect(fakeService.calls.length).toBe(0);
  });

  it('surfaces the file dropzone\'s client-side validation error in the alert banner', () => {
    const fixture = createComponent();
    const dropzone = fixture.debugElement.query(By.directive(FileDropzone)).componentInstance as FileDropzone;

    dropzone.clientValidationError.emit('"huge.png" exceeds the 2 MB limit.');
    fixture.detectChanges();

    const alertText = fixture.nativeElement.querySelector('.ui-alert__message')?.textContent;
    expect(alertText).toContain('exceeds the 2 MB limit');
  });

  it('"Start Over" clears the selected image, prompt, previews, and any error', () => {
    fakeService.resolveWith('https://api.planura.local/images/ai-visualizer/generated/xyz.png');
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as {
      imageControl: { setValue(v: File | null): void; value: File | null };
      promptControl: { setValue(v: string): void; value: string };
    };

    component.imageControl.setValue(createImageFile());
    component.promptControl.setValue('A modern wedding setup.');
    fixture.detectChanges();
    getButtonByText(fixture.nativeElement, 'Visualize My Event').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.aiv-results')).toBeTruthy();

    getButtonByText(fixture.nativeElement, 'Start Over').click();
    fixture.detectChanges();

    expect(component.imageControl.value).toBeNull();
    expect(component.promptControl.value).toBe('');
    expect(fixture.nativeElement.querySelector('.aiv-results')).toBeNull();
  });
});
