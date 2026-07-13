import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Generic radio-style card: used for the Customer/Vendor role choice on the
 * Stitch auth page, and reused as-is for the Individual/Business vendor-type
 * choice in the onboarding wizard.
 */
@Component({
  selector: 'ui-selectable-card',
  templateUrl: './selectable-card.html',
  styleUrl: './selectable-card.css',
})
export class SelectableCard {
  @Input() icon = 'check_circle';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() selected = false;
  @Input() disabled = false;
  @Output() select = new EventEmitter<void>();

  protected handleClick(): void {
    if (this.disabled) {
      return;
    }
    this.select.emit();
  }
}
