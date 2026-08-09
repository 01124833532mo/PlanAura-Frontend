import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Dedicated "How Planura Works" page, linked from the public navbar. Static
 * content only (no API calls) — the 4-step explanation plus a short, honest
 * "About Planura" blurb and a closing CTA into Explore Vendors.
 */
@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.css',
})
export class HowItWorks {}
