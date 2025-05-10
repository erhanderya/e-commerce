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
        this.alertService.error(this.error);
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

    // Ensure isDefault is a boolean
    addressData.isDefault = Boolean(addressData.isDefault);

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
    if (!address) {
      this.alertService.error('Cannot edit: Address information is missing');
      return;
    }
    
    this.editMode = true;
    this.editAddressId = address.id ?? null;
    
    if (!this.editAddressId) {
      this.alertService.error('Cannot edit: Address ID is missing');
      return;
    }
    
    // Use patchValue instead of setValue to handle missing properties
    // and explicitly set isDefault to ensure it's properly handled
    this.addressForm.patchValue({
      fullName: address.fullName || '',
      phone: address.phone || '',
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || '',
      isDefault: Boolean(address.isDefault) // Ensure proper boolean conversion
    });
    
    this.showAddressForm = true;
  }

  deleteAddress(id: number): void {
    if (!id) {
      this.alertService.error('Cannot delete: Address ID is missing');
      return;
    }
    
    if (confirm('Are you sure you want to delete this address?')) {
      this.loading = true;
      this.addressService.deleteAddress(id).subscribe({
        next: () => {
          this.alertService.success('Address deleted successfully');
          // Remove from local array immediately for UI responsiveness
          this.addresses = this.addresses.filter(address => address.id !== id);
          // Then reload from server to ensure consistency
          this.loadAddresses();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error deleting address:', error);
          
          // Handle foreign key constraint error
          if (error.message && (
              error.message.includes('foreign key constraint fails') || 
              error.message.includes('CONSTRAINT') || 
              error.message.includes('FK')
          )) {
            this.alertService.error('This address cannot be deleted because it is used in one or more orders.');
          } else {
            this.alertService.error(error.message || 'Failed to delete address');
          }
          this.loading = false;
        }
      });
    }
  }

  setAsDefault(id: number): void {
    if (!id) {
      this.alertService.error('Cannot set as default: Address ID is missing');
      return;
    }
    
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
