import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Public, unauthenticated legal page. Static content only — no services,
 * no forms, nothing to load. Linked from the auth page and home page
 * footers.
 */
@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.css',
})
export class PrivacyPolicy {
  protected readonly lastUpdated = 'July 16, 2026';
}
