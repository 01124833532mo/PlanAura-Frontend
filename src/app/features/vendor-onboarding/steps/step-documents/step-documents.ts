import { Component, Input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FileDropzone } from '../../../../shared/ui/file-dropzone/file-dropzone';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { DocumentsFormGroup } from '../../vendor-onboarding.types';
import { VendorType } from '../../../../core/interfaces/vendor.model';

@Component({
  selector: 'app-step-documents',
  standalone: true,
  imports: [ReactiveFormsModule, FileDropzone, AlertBanner],
  templateUrl: './step-documents.html',
})
export class StepDocuments {
  @Input({ required: true }) group!: DocumentsFormGroup;
  @Input({ required: true }) vendorType!: VendorType;

  protected readonly VendorType = VendorType;
  protected clientError: string | null = null;

  protected touchedInvalid(name: keyof DocumentsFormGroup['controls']): boolean {
    const control = this.group.controls[name];
    return control.touched && control.invalid;
  }

  protected onClientValidationError(message: string): void {
    this.clientError = message;
  }
}
