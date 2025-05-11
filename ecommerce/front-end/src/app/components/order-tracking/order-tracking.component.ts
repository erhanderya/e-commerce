import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { Order, OrderStatus } from '../../models/order.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-tracking',
  templateUrl: './order-tracking.component.html',
  styleUrls: ['./order-tracking.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink]
})
export class OrderTrackingComponent implements OnInit {
  undeliveredOrders: Order[] = [];
  loading = true;
  error = false;
  hasActiveOrders = false;

  @Output() activeOrdersChange = new EventEmitter<boolean>();

  constructor(
    private orderService: OrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUndeliveredOrders();
  }

  loadUndeliveredOrders(): void {
    this.loading = true;
    console.log('Order tracking: Loading orders...');
    this.orderService.getUserOrders().subscribe({
      next: (orders) => {
        console.log('Order tracking: Received orders:', orders);
        // Filter out delivered and cancelled orders
        this.undeliveredOrders = orders.filter(order => 
          order.status !== OrderStatus.DELIVERED && 
          order.status !== OrderStatus.CANCELLED
        );
        console.log('Order tracking: Filtered undelivered orders:', this.undeliveredOrders);
        this.loading = false;
        this.hasActiveOrders = this.undeliveredOrders.length > 0;
        console.log('Order tracking: Has active orders:', this.hasActiveOrders);
        this.activeOrdersChange.emit(this.hasActiveOrders);
      },
      error: (err) => {
        console.error('Error loading undelivered orders', err);
        this.error = true;
        this.loading = false;
        this.hasActiveOrders = false;
        this.activeOrdersChange.emit(false);
      }
    });
  }

  viewOrderDetails(orderId: number | undefined): void {
    if (orderId !== undefined) {
      this.router.navigate(['/orders', orderId]);
    }
  }

  getStatusLabel(status: OrderStatus): string {
    return this.orderService.getStatusLabel(status);
  }

  getStatusColor(status: OrderStatus): string {
    return this.orderService.getStatusColor(status);
  }
} 