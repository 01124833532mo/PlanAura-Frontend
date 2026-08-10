import { Component, EventEmitter, Input, OnDestroy, Output, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** A selected file paired with an object-URL thumbnail so the dropzone can show a real image
 * preview instead of a bare filename — every accepted extension here is an image format. */
interface FilePreview {
  file: File;
  url: string;
}

/**
 * Client-side mirror of Planura.Infrastructure.AttachementService.AttachmentService's
 * upload rules, so a bad file is rejected instantly instead of round-tripping
 * to the server first: extensions .png/.jpg/.jpeg only (case-sensitive, same
 * as the backend), 2 MB max per file.
 */
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg'];
const MAX_SIZE_BYTES = 2_097_152;

let nextId = 0;

@Component({
  selector: 'ui-file-dropzone',
  templateUrl: './file-dropzone.html',
  styleUrl: './file-dropzone.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileDropzone),
      multi: true,
    },
  ],
})
export class FileDropzone implements ControlValueAccessor, OnDestroy {
  @Input() label = '';
  @Input() hint = 'PNG or JPG, up to 2 MB';
  @Input() multiple = false;
  @Input() errorMessage: string | null = null;
  @Output() clientValidationError = new EventEmitter<string>();

  protected readonly fieldId = `ui-file-dropzone-${nextId++}`;
  protected readonly dragging = signal(false);
  protected files: File[] = [];
  /** Thumbnail previews kept in lockstep with `files` — rebuilt (and old object URLs revoked)
   * every time the file list changes, so the dropzone can show what was actually selected
   * instead of just its filename. */
  protected previews: FilePreview[] = [];
  protected disabled = false;

  private onChange: (value: File | File[] | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: File | File[] | null): void {
    this.files = value ? (Array.isArray(value) ? value : [value]) : [];
    this.rebuildPreviews();
  }

  ngOnDestroy(): void {
    this.previews.forEach((p) => URL.revokeObjectURL(p.url));
  }

  private rebuildPreviews(): void {
    this.previews.forEach((p) => URL.revokeObjectURL(p.url));
    this.previews = this.files.map((file) => ({ file, url: URL.createObjectURL(file) }));
  }

  registerOnChange(fn: (value: File | File[] | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected handleDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled) {
      this.dragging.set(true);
    }
  }

  protected handleDragLeave(): void {
    this.dragging.set(false);
  }

  protected handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    if (this.disabled || !event.dataTransfer?.files.length) {
      return;
    }
    this.addFiles(Array.from(event.dataTransfer.files));
  }

  protected handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.addFiles(Array.from(input.files));
    }
    input.value = '';
  }

  protected removeFile(index: number): void {
    this.files = this.files.filter((_, i) => i !== index);
    this.rebuildPreviews();
    this.emitValue();
  }

  private addFiles(incoming: File[]): void {
    const valid: File[] = [];

    for (const file of incoming) {
      const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        this.clientValidationError.emit(
          `"${file.name}" has an unsupported extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}.`,
        );
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        this.clientValidationError.emit(`"${file.name}" exceeds the 2 MB limit.`);
        continue;
      }
      valid.push(file);
    }

    if (valid.length === 0) {
      return;
    }

    this.files = this.multiple ? [...this.files, ...valid] : [valid[0]];
    this.rebuildPreviews();
    this.emitValue();
    this.onTouched();
  }

  private emitValue(): void {
    this.onChange(this.multiple ? this.files : (this.files[0] ?? null));
  }
}
