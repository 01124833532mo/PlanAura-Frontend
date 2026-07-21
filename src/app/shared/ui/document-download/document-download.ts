import { Component, Input } from '@angular/core';

/**
 * Small presentational download affordance for a generated document (contract
 * PDF, partnership agreement PDF, etc). Renders nothing when `url` is null/
 * empty, so callers can drop it straight into a template without an extra
 * @if wrapper. Uses only global (var(--color-*), var(--radius-*), ...) CSS
 * custom properties defined in styles.css, so it renders consistently across
 * the client, vendor, and admin themes without any theme-specific styling.
 */
@Component({
  selector: 'app-document-download',
  standalone: true,
  templateUrl: './document-download.html',
  styleUrl: './document-download.css',
})
export class DocumentDownload {
  @Input() url: string | null = null;
  @Input() label = 'Download';
  @Input() icon = 'description';
  /** 'link' for an inline text link, 'button' for a filled pill button. */
  @Input() variant: 'link' | 'button' = 'link';

  /** Prevents click-through to parent row/card handlers (e.g. "open details"). */
  protected stop(event: Event): void {
    event.stopPropagation();
  }
}
