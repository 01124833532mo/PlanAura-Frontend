import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-stepper-header',
  templateUrl: './stepper-header.html',
  styleUrl: './stepper-header.css',
})
export class StepperHeader {
  @Input() steps: string[] = [];
  @Input() currentIndex = 0;
}
