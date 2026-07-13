import { Component, Input } from '@angular/core';
import {
  AccountFormGroup,
  BusinessFormGroup,
  DocumentsFormGroup,
  PortfolioFormGroup,
} from '../../vendor-onboarding.types';
import { VendorType } from '../../../../core/interfaces/vendor.model';

@Component({
  selector: 'app-step-review',
  standalone: true,
  imports: [],
  templateUrl: './step-review.html',
})
export class StepReview {
  @Input({ required: true }) account!: AccountFormGroup;
  @Input({ required: true }) business!: BusinessFormGroup;
  @Input({ required: true }) documents!: DocumentsFormGroup;
  @Input({ required: true }) portfolio!: PortfolioFormGroup;
  @Input() categoryName: string | null = null;

  protected readonly VendorType = VendorType;

  protected get isBusiness(): boolean {
    return this.business.controls.vendorType.value === VendorType.Business;
  }
}
