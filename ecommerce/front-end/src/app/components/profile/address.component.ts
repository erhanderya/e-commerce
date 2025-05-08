import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AddressService } from '../../services/address.service';
import { AlertService } from '../../services/alert.service';
import { Address } from '../../models/address.model';

@Component({
  selector: 'app-address',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './address.component.html',
  styleUrls: ['./profile.component.scss', './address.component.scss']
})
export class AddressComponent implements OnInit {
  addresses: Address[] = [];
  addressForm: FormGroup;
  loading = false;
  submitting = false;
  editMode = false;
  editAddressId: number | null = null;
  showAddressForm = false;
  error = '';

  constructor(
    private addressService: AddressService,
    private alertService: AlertService,
    private fb: FormBuilder
  ) {
    this.addressForm = this.fb.group({
      fullName: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      street: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      postalCode: ['', [Validators.required]],
      country: ['', [Validators.required]],
      isDefault: [false]
    });
  }

  ngOnInit(): void {
    this.loadAddresses();
  }

  loadAddresses(): void {
    this.loading = true;
    this.addressService.getUserAddresses().subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message || 'Failed to load addresses';
        this.loading = false;
      }
    });
  }

  toggleAddressForm(): void {
    this.showAddressForm = !this.showAddressForm;
    if (!this.showAddressForm) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.addressForm.reset({
      fullName: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      isDefault: false
    });
    this.editMode = false;
    this.editAddressId = null;
  }

  onSubmit(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const addressData = this.addressForm.value;

    if (this.editMode && this.editAddressId) {
      this.addressService.updateAddress(this.editAddressId, addressData).subscribe({
        next: () => {
          this.alertService.success('Address updated successfully');
          this.loadAddresses();
          this.toggleAddressForm();
          this.submitting = false;
        },
        error: (error) => {
          this.alertService.error(error.message || 'Failed to update address');
          this.submitting = false;
        }
      });
    } else {
      this.addressService.createAddress(addressData).subscribe({
        next: () => {
          this.alertService.success('Address added successfully');
          this.loadAddresses();
          this.toggleAddressForm();
          this.submitting = false;
        },
        error: (error) => {
          this.alertService.error(error.message || 'Failed to add address');
          this.submitting = false;
        }
      });
    }
  }

  editAddress(address: Address): void {
    this.editMode = true;
    this.editAddressId = address.id ?? null;
    this.addressForm.setValue({
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault
    });
    this.showAddressForm = true;
  }

  deleteAddress(id: number): void {
    if (confirm('Are you sure you want to delete this address?')) {
      this.loading = true;
      this.addressService.deleteAddress(id).subscribe({
        next: () => {
          this.alertService.success('Address deleted successfully');
          this.loadAddresses();
        },
        error: (error) => {
          this.alertService.error(error.message || 'Failed to delete address');
          this.loading = false;
        }
      });
    }
  }

  setAsDefault(id: number): void {
    this.loading = true;
    this.addressService.setDefaultAddress(id).subscribe({
      next: () => {
        this.alertService.success('Default address updated');
        this.loadAddresses();
      },
      error: (error) => {
        this.alertService.error(error.message || 'Failed to update default address');
        this.loading = false;
      }
    });
  }
}
