import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

@Component({
  selector: 'ui-text-field',
  templateUrl: './text-field.html',
  styleUrl: './text-field.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextField),
      multi: true,
    },
  ],
})
export class TextField implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type: 'text' | 'email' | 'tel' | 'date' | 'number' = 'text';
  @Input() multiline = false;
  @Input() min: string | number | null = null;
  @Input() errorMessage: string | null = null;
  @Input() hint: string | null = null;

  protected readonly fieldId = `ui-text-field-${nextId++}`;
  protected value = '';
  protected disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.value = value;
    this.onChange(value);
  }

  protected handleBlur(): void {
    this.onTouched();
  }
}
