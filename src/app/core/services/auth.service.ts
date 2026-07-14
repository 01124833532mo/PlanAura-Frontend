import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  AuthResponse,
  CurrentUser,
  LoginRequest,
  RegisterClientRequest,
  ROLE_ADMIN,
  ROLE_CLIENT,
  ROLE_VENDOR,
} from '../interfaces/auth.model';
import { VendorRegistrationPayload } from '../interfaces/vendor.model';
import { TokenStorageService } from './token-storage.service';
import { VendorProfileStateService } from './vendor-profile-state.service';

/**
 * Talks to Planura's AuthController exactly as implemented:
 *  - POST /api/auth/login           (LoginDto -> AuthResponseDto)
 *  - POST /api/auth/register/client (RegisterClientDto -> AuthResponseDto)
 *  - POST /api/auth/register/vendor (multipart RegisterVendorDto -> AuthResponseDto)
 *  - GET  /api/auth/me              (-> CurrentUserDto)
 *
 * No endpoints are invented here — this service is a 1:1 wrapper.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly vendorProfileState = inject(VendorProfileStateService);

  private readonly currentUserSignal = signal<CurrentUser | null>(null);
  private readonly authResponseSignal = signal<AuthResponse | null>(null);

  /**
   * A plain writable signal, not a computed() over tokenStorage.getToken() —
   * localStorage reads aren't tracked by Angular's signal graph, so a
   * computed() here would memoize its first-ever value (false, before login)
   * and never invalidate when setToken()/clearToken() run afterward.
   */
  private readonly isAuthenticatedSignal = signal(!!this.tokenStorage.getToken());

  /** Read-only view of the logged-in user, once /me has been fetched. */
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = this.isAuthenticatedSignal.asReadonly();

  /** Roles from whichever signal was populated most recently: login/register response, or a later /me fetch. */
  private readonly roles = computed(
    () => this.authResponseSignal()?.roles ?? this.currentUserSignal()?.roles ?? [],
  );

  readonly isAdmin = computed(() => this.roles().includes(ROLE_ADMIN));
  readonly isVendor = computed(() => this.roles().includes(ROLE_VENDOR));
  readonly isClient = computed(() => this.roles().includes(ROLE_CLIENT));

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/login`, request)
      .pipe(tap((response) => this.handleAuthResponse(response)));
  }

  /** POST /api/auth/register/client — RegisterClientDto is [FromBody] JSON, unlike the vendor multipart flow. */
  registerClient(request: RegisterClientRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/register/client`, request)
      .pipe(tap((response) => this.handleAuthResponse(response)));
  }

  /**
   * Builds the exact multipart/form-data body RegisterVendorDto expects
   * (field names below match the DTO's C# property names, camelCased —
   * ASP.NET Core's default form binder is case-insensitive) and posts it
   * to POST /api/auth/register/vendor.
   */
  registerVendor(payload: VendorRegistrationPayload): Observable<AuthResponse> {
    const formData = new FormData();

    formData.append('fullName', payload.fullName);
    formData.append('email', payload.email);
    formData.append('phoneNumber', payload.phoneNumber);
    formData.append('password', payload.password);
    formData.append('confirmPassword', payload.confirmPassword);

    formData.append('businessName', payload.businessName);
    if (payload.businessDescription) {
      formData.append('businessDescription', payload.businessDescription);
    }
    if (payload.categoryId !== undefined && payload.categoryId !== null) {
      formData.append('categoryId', String(payload.categoryId));
    }
    if (payload.city) {
      formData.append('city', payload.city);
    }
    if (payload.address) {
      formData.append('address', payload.address);
    }
    formData.append('vendorType', String(payload.vendorType));

    formData.append('nationalIdFront', payload.nationalIdFront);
    formData.append('nationalIdBack', payload.nationalIdBack);
    formData.append('selfieWithId', payload.selfieWithId);
    if (payload.commercialRegistration) {
      formData.append('commercialRegistration', payload.commercialRegistration);
    }
    if (payload.taxCard) {
      formData.append('taxCard', payload.taxCard);
    }

    for (const image of payload.portfolioImages) {
      // RegisterVendorDto.PortfolioImages is List<IFormFile> — the default
      // model binder collects every form part sharing this exact field name
      // into the list, so repeating the key is correct (not a bug).
      formData.append('portfolioImages', image);
    }

    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/register/vendor`, formData)
      .pipe(tap((response) => this.handleAuthResponse(response)));
  }

  fetchCurrentUser(): Observable<CurrentUser> {
    return this.http
      .get<CurrentUser>(`${API_BASE_URL}/auth/me`)
      .pipe(tap((user) => this.currentUserSignal.set(user)));
  }

  logout(): void {
    this.tokenStorage.clearToken();
    this.isAuthenticatedSignal.set(false);
    this.currentUserSignal.set(null);
    this.authResponseSignal.set(null);
    this.vendorProfileState.clear();
  }

  private handleAuthResponse(response: AuthResponse): void {
    this.tokenStorage.setToken(response.accessToken);
    this.isAuthenticatedSignal.set(true);
    this.authResponseSignal.set(response);
  }
}
