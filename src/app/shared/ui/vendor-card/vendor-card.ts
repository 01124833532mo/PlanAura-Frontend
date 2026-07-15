import { DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VendorListItem } from '../../../core/interfaces/vendor-browse.model';

@Component({
  selector: 'ui-vendor-card',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './vendor-card.html',
  styleUrl: './vendor-card.css',
})
export class VendorCard {
  @Input({ required: true }) vendor!: VendorListItem;
  /** Carried into vendor-details so "Book this package" can thread it through to booking-create. */
  @Input() eventPlanId?: number;

  /** Hardcoded pending the VendorListItemDto Currency field — see vendor-browse.model.ts. */
  protected readonly fallbackCurrency = 'EGP';
}
