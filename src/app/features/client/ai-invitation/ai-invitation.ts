import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../shared/ui/button/button';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { AppError } from '../../../core/interfaces/api-response.model';
import { Invitation } from '../../../core/interfaces/ai-invitation.model';
import { AiInvitationService } from '../../../core/services/ai-invitation.service';
import { notifyError, notifySuccess } from '../../../shared/utils/notify';

const MAX_PROMPT_LENGTH = 500;

const THEME_OPTIONS: SelectOption[] = [
  { value: 'Elegant', label: 'Elegant' },
  { value: 'Rustic', label: 'Rustic' },
  { value: 'Modern', label: 'Modern' },
  { value: 'Floral', label: 'Floral' },
  { value: 'Minimalist', label: 'Minimalist' },
];

/**
 * AI Invitation: the client picks a theme and describes their dream
 * invitation card for a given event plan; AiController POST
 * /api/ai/invitations (Hugging Face stabilityai/stable-diffusion-3-medium)
 * generates and persists a themed invitation image. Unlike AI Visualizer,
 * generated invitations are saved server-side, so past invitations for this
 * event plan are also loaded and shown below the generator.
 */
@Component({
  selector: 'app-ai-invitation',
  standalone: true,
  imports: [ReactiveFormsModule, TextField, SelectField, Button, AlertBanner],
  templateUrl: './ai-invitation.html',
  styleUrl: './ai-invitation.css',
})
export class AiInvitationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly aiInvitationService = inject(AiInvitationService);

  protected readonly maxPromptLength = MAX_PROMPT_LENGTH;
  protected readonly themeOptions = THEME_OPTIONS;

  protected readonly themeControl = this.fb.nonNullable.control<string | number>('', [Validators.required]);
  protected readonly promptControl = this.fb.nonNullable.control('', [
    Validators.required,
    Validators.maxLength(MAX_PROMPT_LENGTH),
  ]);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly invitations = signal<Invitation[]>([]);
  protected readonly downloadingId = signal<number | null>(null);

  private planId = 0;

  // Not a computed(): themeControl.value/promptControl.valid are plain
  // FormControl reads, not signals - see the identical note in
  // AiVisualizerComponent.canVisualize().
  protected canGenerate(): boolean {
    return !!this.themeControl.value && this.promptControl.valid && !this.loading();
  }

  ngOnInit(): void {
    this.planId = Number(this.route.snapshot.paramMap.get('id'));
    this.aiInvitationService.listInvitations(this.planId).subscribe({
      next: (invitations) => this.invitations.set(invitations),
      // A failed history load shouldn't block generating a new invitation.
      error: () => this.invitations.set([]),
    });
  }

  protected generate(): void {
    if (!this.themeControl.value || this.promptControl.invalid) {
      this.promptControl.markAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.aiInvitationService
      .generateInvitation({
        eventPlanId: this.planId,
        theme: String(this.themeControl.value),
        prompt: this.promptControl.value.trim(),
      })
      .subscribe({
        next: (invitation) => {
          this.invitations.update((list) => [invitation, ...list]);
          this.loading.set(false);
          notifySuccess('Your AI invitation is ready!');
        },
        error: (err: AppError) => {
          this.error.set(err);
          this.loading.set(false);
          notifyError('Could not generate invitation', err.message);
        },
      });
  }

  protected downloadInvitation(invitation: Invitation): void {
    this.downloadingId.set(invitation.id);

    this.aiInvitationService.downloadImage(invitation.imageUrl).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = this.buildFileName(invitation, blob.type);
        link.click();
        URL.revokeObjectURL(objectUrl);
        this.downloadingId.set(null);
      },
      error: (err: AppError) => {
        this.downloadingId.set(null);
        notifyError('Could not download invitation', err.message);
      },
    });
  }

  private buildFileName(invitation: Invitation, mimeType: string): string {
    const extension = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
    const theme = invitation.theme.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'invitation';
    return `planaura-invitation-${theme}-${invitation.id}.${extension}`;
  }
}
