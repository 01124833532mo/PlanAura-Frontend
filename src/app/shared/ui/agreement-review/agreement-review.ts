import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Shows the Booking Agreement PDF in an embedded viewer with a mandatory
 * "I have read and agree" checkbox, and reports consent changes to the parent.
 * Used identically by the client (payment step, before "Confirm & Book") and
 * the vendor (request details, before "Accept") so both parties review the
 * exact same document — the parent supplies the same stored PDF URL to each.
 *
 * The PDF is served as a static file, so it renders via a plain sanitized
 * <iframe> (no PDF library needed). Whenever the document changes — e.g. the
 * client edits booking details and a fresh agreement is generated — prior
 * consent is cleared, so the user must read and agree to the new document.
 */
@Component({
  selector: 'app-agreement-review',
  standalone: true,
  templateUrl: './agreement-review.html',
  styleUrl: './agreement-review.css',
})
export class AgreementReview implements OnChanges {
  private readonly sanitizer = inject(DomSanitizer);

  /** Absolute URL of the generated agreement PDF. Null while it's still being prepared. */
  @Input() documentUrl: string | null = null;
  /** True while the agreement is being generated/fetched — shows a loading state. */
  @Input() loading = false;
  /** A message shown instead of the viewer when preparing the agreement failed. */
  @Input() error: string | null = null;

  /** Emits the current consent state whenever the checkbox toggles or the document changes. */
  @Output() agreedChange = new EventEmitter<boolean>();

  protected readonly checked = signal(false);
  protected safeUrl: SafeResourceUrl | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['documentUrl']) {
      this.safeUrl = this.documentUrl
        ? this.sanitizer.bypassSecurityTrustResourceUrl(this.documentUrl)
        : null;

      // A different (or cleared) agreement invalidates any prior consent.
      if (this.checked()) {
        this.checked.set(false);
        this.agreedChange.emit(false);
      }
    }
  }

  protected onToggle(event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.checked.set(value);
    this.agreedChange.emit(value);
  }
}
