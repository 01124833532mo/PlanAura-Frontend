import { Component, Input } from '@angular/core';

export type ButtonVariant = 'primary' | 'outline' | 'ghost';

@Component({
  selector: 'ui-button',
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
  @Input() variant: ButtonVariant = 'primary';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() fullWidth = true;
}
