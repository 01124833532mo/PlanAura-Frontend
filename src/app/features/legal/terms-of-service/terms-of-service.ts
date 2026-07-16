import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Public, unauthenticated legal page. Static content only — no services,
 * no forms, nothing to load. Linked from the auth page and home page
 * footers.
 */
@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './terms-of-service.html',
  styleUrl: './terms-of-service.css',
})
export class TermsOfService {
  protected readonly lastUpdated = 'July 16, 2026';
}
