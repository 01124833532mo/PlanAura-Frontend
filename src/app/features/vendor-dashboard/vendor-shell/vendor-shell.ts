import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { VendorProfileStateService } from '../../../core/services/vendor-profile-state.service';

@Component({
  selector: 'app-vendor-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './vendor-shell.html',
  styleUrl: './vendor-shell.css',
})
export class VendorShell implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly vendorProfileState = inject(VendorProfileStateService);

  ngOnInit(): void {
    this.vendorProfileState.load();
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/auth');
  }
}
