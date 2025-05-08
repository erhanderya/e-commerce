import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { AlertService } from '../../services/alert.service';
import { Order, OrderStatus } from '../../models/order.model';
import { formatDate } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.scss']
})
export class MyOrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private orderService: OrderService,
    private alertService: AlertService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.error = null;

    // Directly fetch orders from correct endpoint
    this.http.get<Order[]>(`${environment.apiUrl}/api/orders`).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message || 'Failed to load orders';
        this.loading = false;
        // Only call error if error is not null
        if (this.error) {
          this.alertService.error(this.error);
        } else {
          this.alertService.error('Unknown error occurred');
        }
      }
    });
  }

  getStatusLabel(status: OrderStatus): string {
    return this.orderService.getStatusLabel(status);
  }

  getStatusColor(status: OrderStatus): string {
    return this.orderService.getStatusColor(status);
  }

  formatDate(date: string | Date): string {
    return formatDate(date, 'MMM d, y, h:mm a', 'en-US');
  }
}
