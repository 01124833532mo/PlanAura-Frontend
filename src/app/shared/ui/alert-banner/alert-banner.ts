import { Component, Input } from '@angular/core';

export type AlertVariant = 'error' | 'success' | 'info';

@Component({
  selector: 'ui-alert-banner',
  templateUrl: './alert-banner.html',
  styleUrl: './alert-banner.css',
})
export class AlertBanner {
  @Input() variant: AlertVariant = 'error';
  @Input() message: string | null = null;
  @Input() details: string[] = [];
}
