import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AiInvitationComponent } from './ai-invitation';
import { AiInvitationService } from '../../../core/services/ai-invitation.service';
import { AppError } from '../../../core/interfaces/api-response.model';
import { GenerateInvitationRequest, Invitation } from '../../../core/interfaces/ai-invitation.model';

// See ai-visualizer.spec.ts for why notify.ts (SweetAlert2) needs this polyfill.
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

// jsdom doesn't implement the Blob URL registry used by downloadInvitation().
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock-url';
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => undefined;
}

function createInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: 1,
    eventPlanId: 30,
    theme: 'Elegant',
    imageUrl: 'https://api.planura.local/images/ai-invitations/generated/1.png',
    prompt: 'Gold foil accents.',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

class FakeAiInvitationService {
  generateCalls: GenerateInvitationRequest[] = [];
  downloadCalls: string[] = [];
  private listResult: () => Observable<Invitation[]> = () => of([]);
  private generateResult: () => Observable<Invitation> = () => of(createInvitation());
  private downloadResult: () => Observable<Blob> = () => of(new Blob(['fake-image-bytes'], { type: 'image/png' }));

  listReturns(invitations: Invitation[]): void {
    this.listResult = () => of(invitations);
  }

  listRejectsWith(error: AppError): void {
    this.listResult = () => throwError(() => error);
  }

  generateResolvesWith(invitation: Invitation): void {
    this.generateResult = () => of(invitation);
  }

  generateRejectsWith(error: AppError): void {
    this.generateResult = () => throwError(() => error);
  }

  downloadRejectsWith(error: AppError): void {
    this.downloadResult = () => throwError(() => error);
  }

  listInvitations(): Observable<Invitation[]> {
    return this.listResult();
  }

  generateInvitation(request: GenerateInvitationRequest): Observable<Invitation> {
    this.generateCalls.push(request);
    return this.generateResult();
  }

  downloadImage(imageUrl: string): Observable<Blob> {
    this.downloadCalls.push(imageUrl);
    return this.downloadResult();
  }
}

function getButtonByText(nativeElement: HTMLElement, text: string): HTMLButtonElement {
  const buttons = Array.from(nativeElement.querySelectorAll<HTMLButtonElement>('ui-button button'));
  const match = buttons.find((button) => button.textContent?.trim().includes(text));
  if (!match) {
    throw new Error(`No <ui-button> found containing text "${text}"`);
  }
  return match;
}

describe('AiInvitationComponent', () => {
  let fakeService: FakeAiInvitationService;

  beforeEach(async () => {
    fakeService = new FakeAiInvitationService();

    await TestBed.configureTestingModule({
      imports: [AiInvitationComponent],
      providers: [
        { provide: AiInvitationService, useValue: fakeService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '30' }) } },
        },
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(AiInvitationComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create and load past invitations for the event plan from the route', () => {
    fakeService.listReturns([createInvitation()]);
    const fixture = createComponent();

    expect(fixture.componentInstance).toBeTruthy();
    const cards = fixture.nativeElement.querySelectorAll('.aii-card');
    expect(cards.length).toBe(1);
  });

  it('keeps "Generate Invitation" disabled until a theme and a prompt are both provided', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as {
      themeControl: { setValue(v: string): void };
      promptControl: { setValue(v: string): void };
    };

    expect(getButtonByText(fixture.nativeElement, 'Generate Invitation').disabled).toBe(true);

    component.themeControl.setValue('Elegant');
    fixture.detectChanges();
    expect(getButtonByText(fixture.nativeElement, 'Generate Invitation').disabled).toBe(true);

    component.promptControl.setValue('Gold foil accents with floral borders.');
    fixture.detectChanges();
    expect(getButtonByText(fixture.nativeElement, 'Generate Invitation').disabled).toBe(false);
  });

  it('clicking "Generate Invitation" sends the event plan id, theme, and trimmed prompt, then prepends the result', () => {
    const generated = createInvitation({ id: 2, theme: 'Rustic' });
    fakeService.generateResolvesWith(generated);
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as {
      themeControl: { setValue(v: string): void };
      promptControl: { setValue(v: string): void };
    };

    component.themeControl.setValue('Rustic');
    component.promptControl.setValue('  Wood and burlap textures.  ');
    fixture.detectChanges();

    getButtonByText(fixture.nativeElement, 'Generate Invitation').click();
    fixture.detectChanges();

    expect(fakeService.generateCalls.length).toBe(1);
    expect(fakeService.generateCalls[0]).toEqual({
      eventPlanId: 30,
      theme: 'Rustic',
      prompt: 'Wood and burlap textures.',
    });

    const cards = fixture.nativeElement.querySelectorAll('.aii-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Rustic');
  });

  it('shows an error banner and re-enables the action when generation fails', () => {
    fakeService.generateRejectsWith({
      status: 502,
      message: 'The image generation service is currently unavailable.',
      fieldErrors: [],
    });
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as {
      themeControl: { setValue(v: string): void };
      promptControl: { setValue(v: string): void };
    };

    component.themeControl.setValue('Elegant');
    component.promptControl.setValue('Gold foil accents.');
    fixture.detectChanges();

    getButtonByText(fixture.nativeElement, 'Generate Invitation').click();
    fixture.detectChanges();

    const alertText = fixture.nativeElement.querySelector('.ui-alert__message')?.textContent;
    expect(alertText).toContain('The image generation service is currently unavailable.');

    const generateButton = getButtonByText(fixture.nativeElement, 'Generate Invitation');
    expect(generateButton.disabled).toBe(false);
  });

  it('does not call the service when no theme has been selected', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as { promptControl: { setValue(v: string): void } };

    component.promptControl.setValue('Gold foil accents.');
    fixture.detectChanges();

    getButtonByText(fixture.nativeElement, 'Generate Invitation').click();

    expect(fakeService.generateCalls.length).toBe(0);
  });

  it('a failed history load leaves the gallery empty instead of blocking the page', () => {
    fakeService.listRejectsWith({ status: 500, message: 'Server error', fieldErrors: [] });
    const fixture = createComponent();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.aii-card').length).toBe(0);
  });

  it('clicking "Download" fetches the image as a blob and triggers a save with a themed file name', () => {
    fakeService.listReturns([createInvitation({ id: 5, theme: 'Modern', imageUrl: 'https://api.planura.local/images/5.png' })]);
    const fixture = createComponent();

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    getButtonByText(fixture.nativeElement, 'Download').click();
    fixture.detectChanges();

    expect(fakeService.downloadCalls).toEqual(['https://api.planura.local/images/5.png']);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe('planaura-invitation-modern-5.png');

    clickSpy.mockRestore();
  });

  it('shows an error toast without crashing when the download fetch fails', () => {
    fakeService.listReturns([createInvitation()]);
    fakeService.downloadRejectsWith({ status: 404, message: 'Not found', fieldErrors: [] });
    const fixture = createComponent();

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    getButtonByText(fixture.nativeElement, 'Download').click();
    fixture.detectChanges();

    expect(clickSpy).not.toHaveBeenCalled();
    expect(getButtonByText(fixture.nativeElement, 'Download').disabled).toBe(false);

    clickSpy.mockRestore();
  });
});
