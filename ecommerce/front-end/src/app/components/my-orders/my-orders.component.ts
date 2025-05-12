import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { Order, OrderStatus } from '../../models/order.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.scss']
})
export class MyOrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  error: string | null = null;

  // Return request modal properties
  showReturnRequestModal = false;
  selectedOrder: Order | null = null;
  returnReason = '';
  returnSubmitting = false;

  constructor(
    private orderService: OrderService,
    private alertService: AlertService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.alertService.error('You must be logged in to view your orders.');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/my-orders' } });
      return;
    }
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.error = null;

    console.log('Loading orders...');
    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.error = 'You need to be logged in to view your orders';
      this.loading = false;
      return;
    }

    // Use the OrderService instead of direct HTTP calls
    this.orderService.getUserOrders().subscribe({
      next: (orders) => {
        console.log('Orders loaded successfully:', orders);
        this.orders = orders;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to load orders:', error);

        if (error.status === 401) {
          this.error = 'Your session has expired. Please log in again.';
          this.authService.logout();
          this.router.navigate(['/login'], { queryParams: { returnUrl: '/my-orders' } });
        } else if (error.status === 403) {
          this.error = 'You do not have permission to view orders.';
        } else if (error.status === 0) {
          this.error = 'Could not connect to the server. Please check your internet connection.';
        } else {
          this.error = error.message || 'Failed to load orders';
        }

        this.loading = false;
        this.alertService.error(this.error || 'Unknown error occurred');
      }
    });
  }

  getStatusLabel(status: OrderStatus): string {
    // Find the relevant order based on status
    const order = this.orders.find(o => o.status === status);
    return this.orderService.getStatusLabel(status, order?.returnRequests);
  }

  getStatusColor(status: OrderStatus): string {
    return this.orderService.getStatusColor(status);
  }

  formatDate(date: string | Date): string {
    return formatDate(date, 'MMM d, y, h:mm a', 'en-US');
  }

  // Open the return request modal for an order
  openReturnRequestForm(order: Order): void {
    this.selectedOrder = order;
    this.returnReason = '';
    this.showReturnRequestModal = true;
  }

  // Submit the return request
  submitReturnRequest(): void {
    if (!this.selectedOrder || !this.returnReason.trim()) {
      this.alertService.error('Please provide a reason for your return request');
      return;
    }

    this.returnSubmitting = true;

    this.orderService.createReturnRequest(this.selectedOrder.id!, { reason: this.returnReason.trim() })
      .subscribe({
        next: () => {
          this.returnSubmitting = false;
          this.showReturnRequestModal = false;
          this.alertService.success('Return request submitted successfully');

          // Update the order in the list to show the return request flag
          if (this.selectedOrder) {
            const index = this.orders.findIndex(o => o.id === this.selectedOrder!.id);
            if (index !== -1) {
              this.orders[index].hasReturnRequest = true;
            }
          }
        },
        error: (error) => {
          this.returnSubmitting = false;
          this.alertService.error('Failed to submit return request: ' + error.message);
        }
      });
  }
}
