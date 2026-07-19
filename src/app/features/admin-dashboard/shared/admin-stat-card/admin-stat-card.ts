import { Component, Input } from '@angular/core';

export type AdminStatAccent = 'indigo' | 'purple' | 'cyan' | 'success' | 'warning' | 'danger';

/** KPI card used on the Dashboard Home and section headers (vendor/client/booking counts, revenue, ...). */
@Component({
  selector: 'admin-stat-card',
  standalone: true,
  templateUrl: './admin-stat-card.html',
  styleUrl: './admin-stat-card.css',
})
export class AdminStatCard {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() icon = 'insights';
  @Input() accent: AdminStatAccent = 'indigo';
  /** Optional trend text, e.g. "+12% this week". */
  @Input() trend: string | null = null;
  @Input() trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
  @Input() loading = false;
}
