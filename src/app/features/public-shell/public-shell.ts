import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicNavbar } from '../../shared/ui/public-navbar/public-navbar';
import { PublicFooter } from '../../shared/ui/public-footer/public-footer';

/**
 * Layout for every public/marketing route (Home, Explore Services, Explore
 * Vendors, Vendor Details, How It Works, Terms, Privacy) — a real website
 * shell (navbar + content + footer), not the account sidebar. See
 * app.routes.ts: this wraps routes with no authGuard/clientGuard, so guests
 * can browse the whole marketplace before ever signing in.
 */
@Component({
  selector: 'app-public-shell',
  standalone: true,
  imports: [RouterOutlet, PublicNavbar, PublicFooter],
  templateUrl: './public-shell.html',
  styleUrl: './public-shell.css',
})
export class PublicShell {}
