import { Injectable, signal } from '@angular/core';

/**
 * Small in-memory hand-off between the Auth page's "Register" tab (which only
 * collects the account fields shown in the Stitch design: full name, email,
 * phone, password) and the multi-step Vendor Onboarding wizard.
 *
 * There is no backend endpoint that creates a partial vendor account —
 * RegisterVendorAsync is a single atomic call that also requires business
 * info and verification documents. So the Auth page can't actually register
 * anyone by itself; it just pre-fills step 1 of the wizard so the vendor
 * doesn't have to retype what they already entered.
 *
 * Deliberately not persisted (no localStorage) — account credentials belong
 * in memory only, and losing this on a hard refresh mid-registration is
 * acceptable for this flow.
 */
export interface PrefilledAccountInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

@Injectable({ providedIn: 'root' })
export class VendorOnboardingStateService {
  private readonly prefillSignal = signal<PrefilledAccountInfo | null>(null);
  readonly prefill = this.prefillSignal.asReadonly();

  setAccountPrefill(value: PrefilledAccountInfo): void {
    this.prefillSignal.set(value);
  }

  clear(): void {
    this.prefillSignal.set(null);
  }
}
