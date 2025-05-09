import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../../services/order.service';
import { Order, OrderStatus } from '../../../../models/order.model';
import { AlertService } from '../../../../services/alert.service';

@Component({
  selector: 'app-seller-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './seller-orders.component.html',
  styles: [`
    .seller-orders {
      padding: 20px;
    }
    .loading, .no-orders {
      text-align: center;
      margin: 20px 0;
    }
    .order-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .order-item {
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .order-header {
      background-color: #f5f5f5;
      padding: 12px;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #ddd;
    }
    .order-status {
      padding: 4px 8px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
    }
    .order-items {
      padding: 12px;
    }
    .order-item-row {
      display: flex;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #eee;
    }
    .order-item-row:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
    .product-image {
      width: 80px;
      height: 80px;
      margin-right: 12px;
    }
    .product-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 4px;
    }
    .product-details {
      flex: 1;
    }
    .product-name {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .order-summary {
      background-color: #f9f9f9;
      padding: 12px;
      border-top: 1px solid #ddd;
    }
    .status-update {
      margin-top: 10px;
      display: flex;
      align-items: center;
    }
    .status-update strong {
      margin-right: 10px;
    }
    .status-update select {
      padding: 5px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    .status-spinner {
      margin-left: 10px;
      color: #3498db;
      font-size: 0.9em;
    }
  `]
})
export class SellerOrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  updatingOrderIds: Set<number> = new Set();
  OrderStatus = OrderStatus; // Expose enum to template

  constructor(
    private orderService: OrderService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadSellerOrders();
  }

  loadSellerOrders(): void {
    this.loading = true;
    this.orderService.getSellerOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: (error) => {
        this.alertService.error('Failed to load orders: ' + error.message);
        this.loading = false;
      }
    });
  }

  updateOrderStatus(orderId: number, newStatus: OrderStatus): void {
    this.updatingOrderIds.add(orderId);
    
    this.orderService.updateSellerOrderStatus(orderId, newStatus).subscribe({
      next: (updatedOrder) => {
        this.alertService.success('Order status updated successfully');
        
        // Update the order in the list
        const index = this.orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
          this.orders[index] = updatedOrder;
        }
        
        this.updatingOrderIds.delete(orderId);
      },
      error: (error) => {
        this.alertService.error('Failed to update order status: ' + error.message);
        this.updatingOrderIds.delete(orderId);
        
        // Reload orders to get the current status
        this.loadSellerOrders();
      }
    });
  }

  isUpdatingStatus(orderId: number | undefined): boolean {
    return orderId !== undefined && this.updatingOrderIds.has(orderId);
  }

  getStatusLabel(status: OrderStatus): string {
    return this.orderService.getStatusLabel(status);
  }

  getStatusColor(status: OrderStatus): string {
    return this.orderService.getStatusColor(status);
  }

  // Filter order items to only show the current seller's products
  getSellerItems(order: Order) {
    // For now, we show all items as the backend already filters by seller
    return order.items;
  }

  formatAddress(address: any): string {
    if (!address) return 'Address not available';
    return `${address.street}, ${address.city}, ${address.state}, ${address.postalCode}, ${address.country}`;
  }
} 