import { Component, Input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FileDropzone } from '../../../../shared/ui/file-dropzone/file-dropzone';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { PortfolioFormGroup } from '../../vendor-onboarding.types';

@Component({
  selector: 'app-step-portfolio',
  standalone: true,
  imports: [ReactiveFormsModule, FileDropzone, AlertBanner],
  templateUrl: './step-portfolio.html',
})
export class StepPortfolio {
  @Input({ required: true }) group!: PortfolioFormGroup;

  protected clientError: string | null = null;

  protected get touchedInvalid(): boolean {
    return this.group.controls.images.touched && this.group.controls.images.invalid;
  }

  protected onClientValidationError(message: string): void {
    this.clientError = message;
  }
}
