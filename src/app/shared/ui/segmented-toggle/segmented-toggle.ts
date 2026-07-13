import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface SegmentedOption {
  value: string;
  label: string;
}

/** The Login/Register pill toggle from the Stitch auth page, generalized. */
@Component({
  selector: 'ui-segmented-toggle',
  templateUrl: './segmented-toggle.html',
  styleUrl: './segmented-toggle.css',
})
export class SegmentedToggle {
  @Input() options: SegmentedOption[] = [];
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  protected select(option: SegmentedOption): void {
    if (option.value === this.value) {
      return;
    }
    this.value = option.value;
    this.valueChange.emit(option.value);
  }
}
