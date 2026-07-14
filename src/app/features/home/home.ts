import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Landing page for authenticated clients (the "/" fallback in
 * AuthService/auth-page's role-based post-login redirect). Minimal for now —
 * no client-facing features are built yet, only the auth session itself.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/auth');
  }
}
