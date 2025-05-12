import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../../services/order.service';
import { Order, OrderStatus, ReturnRequest } from '../../../../models/order.model';
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
    .return-request-badge {
      background-color: #e74c3c;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      margin-left: 10px;
      font-size: 0.8em;
    }
    .return-request-section {
      padding: 15px;
      background-color: #fff3e0;
      border-top: 1px solid #ffe0b2;
    }
    .return-request-info {
      margin-bottom: 15px;
    }
    .return-actions {
      display: flex;
      gap: 10px;
    }
    .approve-btn {
      background-color: #27ae60;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
    }
    .approve-btn:hover {
      background-color: #219653;
    }
    .reject-btn {
      background-color: #e74c3c;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
    }
    .reject-btn:hover {
      background-color: #c0392b;
    }

    .return-request-tab {
      display: inline-block;
      padding: 10px 20px;
      margin-right: 10px;
      background-color: #f5f5f5;
      cursor: pointer;
      border-radius: 4px 4px 0 0;
    }
    .return-request-tab.active {
      background-color: #3498db;
      color: white;
    }
    .tab-content {
      margin-top: 10px;
    }

    .return-request-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .return-modal-content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .modal-title {
      margin: 0;
    }
    .close-modal {
      font-size: 24px;
      cursor: pointer;
      border: none;
      background: none;
    }
    .modal-label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .modal-textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 20px;
      min-height: 100px;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
  `]
})
export class SellerOrdersComponent implements OnInit {
  orders: Order[] = [];
  returnRequests: ReturnRequest[] = [];
  loading = true;
  loadingReturnRequests = false;
  updatingOrderIds: Set<number> = new Set();
  processingReturnIds: Set<number> = new Set();
  OrderStatus = OrderStatus; // Expose enum to template
  activeTab: 'orders' | 'returns' = 'orders';

  // For return request processing modal
  showProcessModal = false;
  selectedReturnRequest: ReturnRequest | null = null;
  processingAction: 'approve' | 'reject' | null = null;
  processingNotes = '';

  constructor(
    private orderService: OrderService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadSellerOrders();
    this.loadReturnRequests();
  }

  setActiveTab(tab: 'orders' | 'returns'): void {
    this.activeTab = tab;
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

  loadReturnRequests(): void {
    this.loadingReturnRequests = true;
    this.orderService.getSellerReturnRequests().subscribe({
      next: (requests) => {
        this.returnRequests = requests;
        this.loadingReturnRequests = false;
      },
      error: (error) => {
        this.alertService.error('Failed to load return requests: ' + error.message);
        this.loadingReturnRequests = false;
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

  isProcessingReturn(returnId: number | undefined): boolean {
    return returnId !== undefined && this.processingReturnIds.has(returnId);
  }

  getStatusLabel(status: OrderStatus, returnRequests?: ReturnRequest[]): string {
    return this.orderService.getStatusLabel(status, returnRequests);
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

  formatDate(date: string | Date): string {
    if (!date) return '';
    return new Date(date).toLocaleString();
  }

  openProcessModal(returnRequest: ReturnRequest, action: 'approve' | 'reject'): void {
    this.selectedReturnRequest = returnRequest;
    this.processingAction = action;
    this.processingNotes = '';
    this.showProcessModal = true;
  }

  closeProcessModal(): void {
    this.showProcessModal = false;
    this.selectedReturnRequest = null;
    this.processingAction = null;
    this.processingNotes = '';
  }

  processReturnRequest(): void {
    if (!this.selectedReturnRequest || !this.processingAction) {
      return;
    }

    const requestId = this.selectedReturnRequest.id;
    if (!requestId) {
      this.alertService.error('Invalid return request');
      return;
    }

    const isApproved = this.processingAction === 'approve';
    this.processingReturnIds.add(requestId);

    this.orderService.processReturnRequest(requestId, {
      approved: isApproved,
      notes: this.processingNotes
    }).subscribe({
      next: () => {
        this.processingReturnIds.delete(requestId);
        this.showProcessModal = false;

        const actionText = isApproved ? 'approved' : 'rejected';
        this.alertService.success(`Return request ${actionText} successfully`);

        // Remove the request from the list
        this.returnRequests = this.returnRequests.filter(r => r.id !== requestId);

        // If we approved a return, reload orders to get updated status
        if (isApproved) {
          this.loadSellerOrders();
        }
      },
      error: (error) => {
        this.processingReturnIds.delete(requestId);
        this.alertService.error(`Failed to process return request: ${error.message}`);
      }
    });
  }
}
