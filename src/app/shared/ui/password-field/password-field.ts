import { Component, Input, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

@Component({
  selector: 'ui-password-field',
  templateUrl: './password-field.html',
  styleUrl: './password-field.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordField),
      multi: true,
    },
  ],
})
export class PasswordField implements ControlValueAccessor {
  @Input() label = 'Password';
  @Input() placeholder = '••••••••';
  @Input() errorMessage: string | null = null;

  protected readonly fieldId = `ui-password-field-${nextId++}`;
  protected readonly visible = signal(false);
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

  protected toggleVisibility(): void {
    this.visible.update((v) => !v);
  }

  protected handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.onChange(value);
  }

  protected handleBlur(): void {
    this.onTouched();
  }
}
