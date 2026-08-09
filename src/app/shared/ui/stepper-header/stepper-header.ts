import { Component, Input } from '@angular/core';

/**
 * Horizontal progress indicator for multi-step flows: completed steps show a check, the current step
 * is highlighted, upcoming steps stay muted.
 *
 * Inputs are unchanged from the original component so existing callers (vendor onboarding) keep
 * working. What changed is small-screen behaviour: labels used to be hidden outright below 640px,
 * which left the user with numbered dots and no idea which step they were on. Now the dots stay
 * compact and the current step is named underneath, so "where am I" is answerable at any width.
 */
@Component({
  selector: 'ui-stepper-header',
  templateUrl: './stepper-header.html',
  styleUrl: './stepper-header.css',
})
export class StepperHeader {
  @Input() steps: string[] = [];
  @Input() currentIndex = 0;

  /** Label of the step in progress, used for the small-screen caption. */
  protected get currentLabel(): string {
    return this.steps[this.currentIndex] ?? '';
  }

  /** 1-based position, for the "Step 2 of 5" caption and for screen readers. */
  protected get currentPosition(): number {
    return Math.min(this.currentIndex + 1, this.steps.length);
  }
}
