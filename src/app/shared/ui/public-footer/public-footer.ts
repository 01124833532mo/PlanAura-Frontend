import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Shared footer for every public/marketing page. Static, real content only —
 * no fabricated stats or social proof (see home.html history: the previous
 * iteration had hardcoded vendor/event counts and fake testimonials here,
 * both removed as part of this redesign since neither is backed by data).
 */
@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './public-footer.html',
  styleUrl: './public-footer.css',
})
export class PublicFooter {
  protected readonly year = new Date().getFullYear();
}
