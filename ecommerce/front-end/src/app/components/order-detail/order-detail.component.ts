import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { Order, OrderStatus } from '../../models/order.model';
import { UserRole } from '../../models/user.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit {
  order: Order | null = null;
  loading = true;
  error: string | null = null;
  selectedStatus: OrderStatus | null = null;
  isAdmin = false;
  OrderStatus = OrderStatus;
  updatingStatus = false;

  constructor(
    private orderService: OrderService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.checkAdminStatus();
    this.loadOrder();
  }

  checkAdminStatus(): void {
    this.isAdmin = this.authService.isAdmin();
  }

  loadOrder(): void {
    this.loading = true;
    this.error = null;

    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.error = 'Order ID is missing';
      this.loading = false;
      this.alertService.error(this.error);
      return;
    }

    this.orderService.getOrderById(+orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.selectedStatus = order.status;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message || 'Failed to load order';
        this.loading = false;
        if (this.error) {
          this.alertService.error(this.error);
        } else {
          this.alertService.error('Unknown error occurred');
        }
      }
    });
  }

  updateOrderStatus(): void {
    if (!this.isAdmin || !this.order || !this.selectedStatus || this.selectedStatus === this.order.status) {
      return;
    }

    this.updatingStatus = true;
    this.orderService.updateOrderStatus(this.order.id!, this.selectedStatus).subscribe({
      next: (updatedOrder) => {
        this.order = updatedOrder;
        this.updatingStatus = false;
        this.alertService.success('Order status updated successfully');
      },
      error: (error) => {
        this.updatingStatus = false;
        const errorMsg = error?.message || 'Failed to update order status';
        this.alertService.error(errorMsg);
      }
    });
  }

  getOrderStatusLabel(status: OrderStatus): string {
    return this.orderService.getStatusLabel(status);
  }

  getOrderStatusColor(status: OrderStatus): string {
    return this.orderService.getStatusColor(status);
  }

  formatDate(date: string | Date): string {
    return formatDate(date, 'MMM d, y, h:mm a', 'en-US');
  }

  goBack(): void {
    this.router.navigate(['/orders']);
  }

  // Calculate what percentage of the order process has been completed
  getTrackingProgress(status: OrderStatus): number {
    const statuses = [
      OrderStatus.PENDING,
      OrderStatus.PREPARING,
      OrderStatus.IN_COUNTRY,
      OrderStatus.IN_CITY,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED
    ];

    const currentIndex = statuses.indexOf(status);

    // If the order is cancelled or status is not in the list
    if (status === OrderStatus.CANCELLED || currentIndex === -1) {
      return 0;
    }

    return ((currentIndex + 1) / statuses.length) * 100;
  }

  isStatusCompleted(status: OrderStatus, orderStatus: OrderStatus): boolean {
    const statuses = [
      OrderStatus.PENDING,
      OrderStatus.PREPARING,
      OrderStatus.IN_COUNTRY,
      OrderStatus.IN_CITY,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED
    ];

    if (orderStatus === OrderStatus.CANCELLED) {
      return false;
    }

    const orderIndex = statuses.indexOf(orderStatus);
    const statusIndex = statuses.indexOf(status);

    return statusIndex <= orderIndex;
  }
}
