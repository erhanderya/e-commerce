import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../../services/order.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-order-management',
  templateUrl: './order-management.component.html',
  styleUrls: ['./order-management.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class OrderManagementComponent implements OnInit {
  orders: any[] = [];
  loading = false;
  error: string | null = null;
  
  // For filtering
  statusFilter: string = '';
  searchTerm: string = '';
  
  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadAllOrders();
  }

  loadAllOrders(): void {
    this.loading = true;
    this.error = null;
    
    this.orderService.getAllOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load orders. Please try again.';
        this.loading = false;
        console.error('Error fetching orders:', err);
      }
    });
  }

  getOrderStatusLabel(status: string): string {
    switch (status) {
      case 'RECEIVED':
        return 'Received';
      case 'DELIVERED':
        return 'Delivered';
      case 'CANCELED':
        return 'Canceled';
      case 'REFUNDED':
        return 'Refunded';
      default:
        return status;
    }
  }

  getOrderStatusColor(status: string): string {
    switch (status) {
      case 'RECEIVED':
        return '#3498db';
      case 'DELIVERED':
        return '#2ecc71';
      case 'CANCELED':
        return '#e74c3c';
      case 'REFUNDED':
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }

  applyFilters(): any[] {
    return this.orders.filter(order => {
      // Filter by status
      if (this.statusFilter && order.status !== this.statusFilter) {
        return false;
      }
      
      // Filter by search term (order ID or customer username/email)
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        const orderIdMatch = order.id.toString().includes(searchLower);
        const customerUsernameMatch = order.customer?.username?.toLowerCase().includes(searchLower) || false;
        const customerEmailMatch = order.customer?.email?.toLowerCase().includes(searchLower) || false;
        
        if (!orderIdMatch && !customerUsernameMatch && !customerEmailMatch) {
          return false;
        }
      }
      
      return true;
    });
  }

  viewOrderDetails(orderId: number): void {
    // Navigate to order details page
    window.open(`/orders/${orderId}`, '_blank');
  }
} 