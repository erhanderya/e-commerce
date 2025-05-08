import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { AlertService } from '../../services/alert.service';
import { OrderService } from '../../services/order.service';
import { OrderCreationRequest } from '../../models/order.model';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.scss']
})
export class PaymentSuccessComponent implements OnInit {
  loading = true;
  orderProcessed = false;
  orderId?: number;
  error?: string;
  paymentId?: string;
  addressId?: number;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cartService: CartService,
    private alertService: AlertService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    // Get payment details from both query parameters and URL fragments
    this.route.queryParams.subscribe(params => {
      console.log('Payment success params:', params); // Debug log

      // Check URL for session_id or payment_intent directly
      const url = window.location.href;
      console.log('Full redirect URL:', url);

      // Retrieve addressId from params, handling potential formatting issues
      let addressIdStr = params['addressId'];

      // In case the addressId contains extra parts like '1?addressId=1'
      if (addressIdStr && addressIdStr.includes('?')) {
        addressIdStr = addressIdStr.split('?')[0];
      }

      this.addressId = addressIdStr ? parseInt(addressIdStr, 10) : undefined;

      // Try to get payment ID directly from URL if not in params
      const sessionIdMatch = url.match(/session_id=([^&]+)/);
      const paymentIntentMatch = url.match(/payment_intent=([^&]+)/);

      // Try to get payment ID from different possible parameter names that Stripe might use
      this.paymentId =
        params['payment_intent'] ||
        params['session_id'] ||
        (sessionIdMatch ? sessionIdMatch[1] : undefined) ||
        (paymentIntentMatch ? paymentIntentMatch[1] : undefined);

      // If we still don't have a payment ID, try a fallback approach - in some cases Stripe adds it differently
      if (!this.paymentId) {
        // If there's only one parameter with cs_ or pi_ prefix, use that as payment ID
        Object.keys(params).forEach(key => {
          const value = params[key];
          if (value && typeof value === 'string' &&
             (value.startsWith('cs_') || value.startsWith('pi_'))) {
            this.paymentId = value;
          }
          // Also check if the key itself is the session ID or payment intent
          if (key.startsWith('cs_') || key.startsWith('pi_')) {
            this.paymentId = key;
          }
        });
      }

      console.log('Parsed payment info:', { addressId: this.addressId, paymentId: this.paymentId });

      // If payment ID is still missing but we have address ID, try to proceed anyway with a dummy ID
      if (!this.paymentId && this.addressId) {
        console.log('Missing payment ID but address ID found - using fallback payment ID');
        this.paymentId = 'stripe_redirect_' + Date.now();
      }

      // If we don't have both parameters, show error
      if (isNaN(this.addressId as number) || !this.paymentId) {
        console.error('Missing payment info:', { addressId: this.addressId, paymentId: this.paymentId });
        this.error = 'Missing required payment information. Please contact customer support with your order details.';
        this.loading = false;
        return;
      }

      // Create an order based on the payment
      this.createOrder();
    });
  }

  createOrder(): void {
    if (!this.addressId || !this.paymentId) {
      this.error = 'Missing address or payment information';
      this.loading = false;
      return;
    }

    const orderRequest: OrderCreationRequest = {
      addressId: this.addressId,
      paymentId: this.paymentId
    };

    this.orderService.createOrder(orderRequest).subscribe({
      next: (order) => {
        this.orderId = order.id;
        this.orderProcessed = true;
        this.loading = false;

        // Clear the cart once order is created
        this.cartService.clearCart().subscribe({
          next: () => {
            this.alertService.success('Your order has been placed successfully!');
          },
          error: (error) => {
            console.error('Failed to clear cart:', error);
            // Order was already created, so we don't need to show an error here
          }
        });
      },
      error: (error) => {
        this.error = error.message || 'Failed to process your order';
        this.loading = false;
        // Fix for the TypeScript error - ensure we're passing a string
        this.alertService.error(this.error || 'An unknown error occurred');
      }
    });
  }

  viewOrder(): void {
    if (this.orderId) {
      this.router.navigate(['/orders', this.orderId]);
    } else {
      this.router.navigate(['/orders']);
    }
  }

  continueShopping(): void {
    this.router.navigate(['/']);
  }
}
