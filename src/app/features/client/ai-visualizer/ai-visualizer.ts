import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../shared/ui/button/button';
import { FileDropzone } from '../../../shared/ui/file-dropzone/file-dropzone';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { AppError } from '../../../core/interfaces/api-response.model';
import { AiVisualizerService } from '../../../core/services/ai-visualizer.service';
import { notifyError, notifySuccess } from '../../../shared/utils/notify';

const MAX_PROMPT_LENGTH = 500;

/**
 * AI Event Visualizer ("Imagination Mode"): the client uploads a photo of an
 * empty venue, describes their dream setup, and AiController POST
 * /api/ai/visualize (Hugging Face black-forest-labs/FLUX.1-Kontext-dev)
 * returns a styled version of the same space.
 *
 * The "original" preview is a local object URL created from the selected
 * File rather than the backend's persisted originalImageUrl - it renders
 * instantly and needs no round trip, and is revoked on file change/destroy
 * to avoid leaking blob URLs.
 */
@Component({
  selector: 'app-ai-visualizer',
  standalone: true,
  imports: [ReactiveFormsModule, FileDropzone, TextField, Button, AlertBanner],
  templateUrl: './ai-visualizer.html',
  styleUrl: './ai-visualizer.css',
})
export class AiVisualizerComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly aiVisualizerService = inject(AiVisualizerService);

  protected readonly maxPromptLength = MAX_PROMPT_LENGTH;

  protected readonly imageControl = this.fb.control<File | null>(null);
  protected readonly promptControl = this.fb.nonNullable.control('', [
    Validators.required,
    Validators.maxLength(MAX_PROMPT_LENGTH),
  ]);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly originalImageUrl = signal<string | null>(null);
  protected readonly generatedImageUrl = signal<string | null>(null);

  private objectUrl: string | null = null;

  // Not a computed(): imageControl.value/promptControl.valid are plain
  // FormControl reads, not signals, so a computed() over them would never
  // recompute after its first (empty-form) evaluation. Called directly from
  // the template instead, which re-evaluates it on every change-detection
  // pass like any other template method call.
  protected canVisualize(): boolean {
    return !!this.imageControl.value && this.promptControl.valid && !this.loading();
  }

  constructor() {
    this.imageControl.valueChanges.subscribe((file) => this.handleImageChange(file));
  }

  protected onClientValidationError(message: string): void {
    this.error.set({ status: 0, message, fieldErrors: [] });
  }

  protected visualize(): void {
    const file = this.imageControl.value;
    if (!file || this.promptControl.invalid) {
      this.promptControl.markAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.generatedImageUrl.set(null);

    this.aiVisualizerService.visualizeSpace(file, this.promptControl.value.trim()).subscribe({
      next: (generatedImageUrl) => {
        this.generatedImageUrl.set(generatedImageUrl);
        this.loading.set(false);
        notifySuccess('Your event visualization is ready!');
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
        notifyError('Could not generate visualization', err.message);
      },
    });
  }

  protected startOver(): void {
    this.releaseObjectUrl();
    this.imageControl.setValue(null);
    this.promptControl.setValue('');
    this.promptControl.markAsUntouched();
    this.originalImageUrl.set(null);
    this.generatedImageUrl.set(null);
    this.error.set(null);
  }

  ngOnDestroy(): void {
    this.releaseObjectUrl();
  }

  private handleImageChange(file: File | null): void {
    this.releaseObjectUrl();
    this.generatedImageUrl.set(null);
    this.error.set(null);

    if (!file) {
      this.originalImageUrl.set(null);
      return;
    }

    this.objectUrl = URL.createObjectURL(file);
    this.originalImageUrl.set(this.objectUrl);
  }

  private releaseObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
