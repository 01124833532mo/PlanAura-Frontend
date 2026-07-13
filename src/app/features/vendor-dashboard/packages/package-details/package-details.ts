import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Button } from '../../../../shared/ui/button/button';
import { VendorPackage } from '../../../../core/interfaces/vendor-package.model';

@Component({
  selector: 'app-package-details',
  standalone: true,
  imports: [Button, DecimalPipe, DatePipe],
  templateUrl: './package-details.html',
  styleUrl: './package-details.css',
})
export class PackageDetails {
  @Input({ required: true }) package!: VendorPackage;
  @Input() loading = false;

  @Output() closed = new EventEmitter<void>();
}
