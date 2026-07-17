import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string | number;
  label: string;
}

let nextId = 0;

@Component({
  selector: 'ui-select-field',
  templateUrl: './select-field.html',
  styleUrl: './select-field.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectField),
      multi: true,
    },
  ],
})
export class SelectField implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Select an option';
  @Input() options: SelectOption[] = [];
  @Input() errorMessage: string | null = null;
  @Input() compact = false;

  protected readonly fieldId = `ui-select-field-${nextId++}`;
  protected value: string | number | null = null;
  protected disabled = false;

  private onChange: (value: string | number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | number | null): void {
    this.value = value;
  }

  registerOnChange(fn: (value: string | number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected handleChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const match = this.options.find((option) => String(option.value) === raw);
    this.value = match ? match.value : null;
    this.onChange(this.value);
  }

  protected handleBlur(): void {
    this.onTouched();
  }
}
