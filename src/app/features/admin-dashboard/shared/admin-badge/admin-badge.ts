import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AdminBadgeTone } from '../status-maps';

/** Generic pill badge used across every admin list/detail page. Callers pass a pre-resolved
 * { label, tone } pair, typically produced by one of the mapXStatus() helpers in status-maps.ts. */
@Component({
  selector: 'admin-badge',
  standalone: true,
  imports: [NgClass],
  templateUrl: './admin-badge.html',
  styles: [':host { display: inline-flex; vertical-align: middle; }'],
})
export class AdminBadge {
  @Input({ required: true }) label!: string;
  @Input() tone: AdminBadgeTone = 'neutral';
  @Input() dot = false;
}
