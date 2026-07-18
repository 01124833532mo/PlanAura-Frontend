import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface AdminTimelineEntry {
  title: string;
  subtitle?: string | null;
  timestamp: string;
  icon?: string;
  tone?: 'indigo' | 'purple' | 'cyan' | 'success' | 'warning' | 'danger' | 'neutral';
}

/** Vertical timeline used for verification history, dispute history, and the dashboard activity feed. */
@Component({
  selector: 'admin-timeline',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-timeline.html',
  styleUrl: './admin-timeline.css',
})
export class AdminTimeline {
  @Input({ required: true }) entries: AdminTimelineEntry[] = [];
}
