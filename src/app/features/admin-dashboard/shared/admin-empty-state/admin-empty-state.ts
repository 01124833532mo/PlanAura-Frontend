import { Component, Input } from '@angular/core';

@Component({
  selector: 'admin-empty-state',
  standalone: true,
  templateUrl: './admin-empty-state.html',
  styleUrl: './admin-empty-state.css',
})
export class AdminEmptyState {
  @Input() icon = 'inbox';
  @Input() title = 'Nothing here yet';
  @Input() message = '';
}
