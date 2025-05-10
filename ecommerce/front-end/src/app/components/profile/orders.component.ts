import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { AlertService } from '../../services/alert.service';
import { Order, OrderStatus } from '../../models/order.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './orders.component.html',
  styleUrls: ['./profile.component.scss', './orders.component.scss']
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  selectedOrder: Order | null = null;
  loading = false;
  error = '';
  OrderStatus = OrderStatus; // Make enum available to template

  constructor(
    private orderService: OrderService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.orderService.getUserOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message || 'Failed to load orders';
        this.alertService.error(this.error);
        this.loading = false;
      }
    });
  }

  viewOrderDetails(order: Order): void {
    this.selectedOrder = order;
  }

  closeOrderDetails(): void {
    this.selectedOrder = null;
  }

  cancelOrder(id: number | undefined): void {
    if (!id) {
      this.alertService.error('Cannot cancel: Order ID is missing');
      return;
    }

    // Find the order to check its status
    const orderToCancel = this.orders.find(order => order.id === id);
    if (!orderToCancel) {
      this.alertService.error('Order not found');
      return;
    }

    // Check if the order can be cancelled based on its status
    if (!this.canCancelOrder(orderToCancel.status)) {
      this.alertService.error(`Cannot cancel order in ${orderToCancel.status} status`);
      return;
    }

    if (confirm('Are you sure you want to cancel this order?')) {
      this.loading = true;
      this.orderService.cancelOrder(id).subscribe({
        next: () => {
          this.alertService.success('Order cancelled successfully');
          this.loadOrders();
          this.selectedOrder = null;
          this.loading = false;
        },
        error: (error) => {
          this.alertService.error(error?.message || 'Failed to cancel order');
          this.loading = false;
        }
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'status-pending';
      case OrderStatus.PREPARING:
        return 'status-processing';
      case OrderStatus.IN_COUNTRY:
      case OrderStatus.IN_CITY:
      case OrderStatus.OUT_FOR_DELIVERY:
        return 'status-shipped';
      case OrderStatus.DELIVERED:
        return 'status-delivered';
      case OrderStatus.CANCELLED:
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getTotalItems(order: Order): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  canCancelOrder(status: OrderStatus): boolean {
    return status === OrderStatus.PENDING || status === OrderStatus.PREPARING;
  }
}
