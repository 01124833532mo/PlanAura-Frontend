import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Shown when an admin list/detail fetch fails. Offers a retry action. */
@Component({
  selector: 'admin-error-state',
  standalone: true,
  templateUrl: './admin-error-state.html',
  styleUrl: './admin-error-state.css',
})
export class AdminErrorState {
  @Input() message = 'Something went wrong while loading this data.';
  @Input() retryLabel = 'Try again';
  @Output() retry = new EventEmitter<void>();
}
