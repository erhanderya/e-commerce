import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { loadStripe } from '@stripe/stripe-js';
import { CartService } from '../../services/cart.service';
import { PaymentService } from '../../services/payment.service';
import { AddressService } from '../../services/address.service';
import { AlertService } from '../../services/alert.service';
import { Address } from '../../models/address.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class CheckoutComponent implements OnInit {
  loading = false;
  loadingAddresses = false;
  totalAmount = 0;
  addresses: Address[] = [];
  selectedAddressId: number | null = null;
  stripe: any;
  elements: any;
  error: string | null = null;
  checkoutStep = 1; // 1: Address selection, 2: Payment
  addressForm: FormGroup;
  showNewAddressForm = false;

  constructor(
    private cartService: CartService,
    private paymentService: PaymentService,
    private addressService: AddressService,
    private alertService: AlertService,
    private router: Router,
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

  async ngOnInit(): Promise<void> {
    // Calculate total from cart
    this.calculateCartTotal();

    // Load user addresses
    this.loadAddresses();

    // Initialize Stripe
    this.stripe = await loadStripe('pk_test_51RK0me4IR2smHUVuKzfl1prqqfWCsf8XzPgpLxQZE3c3LN76iMomVU3uAhPC9RFHsXUxkxCwHxwdHJuf9NQsRSiU00yQawxXp3');
  }

  calculateCartTotal(): void {
    this.totalAmount = this.cartService.getTotalPrice();
  }

  loadAddresses(): void {
    this.loadingAddresses = true;
    this.addressService.getUserAddresses().subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        // Select default address if available
        const defaultAddress = addresses.find(a => a.isDefault);
        if (defaultAddress) {
          this.selectedAddressId = defaultAddress.id ?? null;
        } else if (addresses.length > 0) {
          this.selectedAddressId = addresses[0].id ?? null;
        }
        this.loadingAddresses = false;
      },
      error: (error) => {
        console.error('Error loading addresses:', error);
        this.error = 'Failed to load your addresses. Please try again.';
        this.loadingAddresses = false;
      }
    });
  }

  toggleNewAddressForm(): void {
    this.showNewAddressForm = !this.showNewAddressForm;
    if (!this.showNewAddressForm) {
      this.addressForm.reset();
      this.addressForm.patchValue({ isDefault: false });
    }
  }

  saveNewAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.addressService.createAddress(this.addressForm.value).subscribe({
      next: (address) => {
        this.alertService.success('Address added successfully');
        this.loadAddresses();
        this.selectedAddressId = address.id ?? null;
        this.toggleNewAddressForm();
        this.loading = false;
      },
      error: (error) => {
        this.alertService.error(error.message || 'Failed to add address');
        this.loading = false;
      }
    });
  }

  continueToPayment(): void {
    if (!this.selectedAddressId) {
      this.alertService.warn('Please select a shipping address');
      return;
    }
    this.checkoutStep = 2;
  }

  async proceedToPayment(): Promise<void> {
    if (!this.selectedAddressId) {
      this.alertService.warn('Please select a shipping address');
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      // Create checkout session on the server
      const result = await firstValueFrom(this.paymentService.createCheckoutSession(
        this.totalAmount,
        'Payment for order from e-commerce site',
        this.selectedAddressId
      ));

      // Redirect to Stripe Checkout - only pass the sessionId parameter
      const { error } = await this.stripe.redirectToCheckout({
        sessionId: result.sessionId
      });

      if (error) {
        console.error('Error:', error);
        this.error = error.message;
      }
    } catch (err: any) {
      console.error('Payment failed:', err);
      this.error = 'Payment processing failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  // Use Stripe Elements for embedded checkout
  async createPaymentIntent(): Promise<void> {
    if (!this.selectedAddressId) {
      this.alertService.warn('Please select a shipping address');
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const response = await firstValueFrom(this.paymentService.createPaymentIntent(
        this.totalAmount,
        'Payment for order from e-commerce site',
        this.selectedAddressId
      ));

      const appearance = {
        theme: 'stripe',
      };

      this.elements = this.stripe.elements({
        clientSecret: response.clientSecret,
        appearance,
      });

      const paymentElement = this.elements.create('payment');
      paymentElement.mount('#payment-element');

    } catch (error: any) {
      this.error = error.message || 'An error occurred while setting up payment.';
    } finally {
      this.loading = false;
    }
  }

  async confirmPayment(): Promise<void> {
    this.loading = true;

    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?addressId=${this.selectedAddressId}`,
      }
    });

    if (error) {
      this.error = error.message;
    }

    this.loading = false;
  }

  backToAddressSelection(): void {
    this.checkoutStep = 1;
  }
}
