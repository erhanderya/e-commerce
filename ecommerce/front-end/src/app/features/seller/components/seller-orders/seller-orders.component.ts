import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../../services/order.service';
import { AuthService } from '../../../../services/auth.service';
import { Order, OrderItem, OrderStatus, ReturnRequest } from '../../../../models/order.model';
import { AlertService } from '../../../../services/alert.service';
import { User } from '../../../../models/user.model';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { OrderItemStatus } from '../../../../models/order.model';

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
export class SellerOrdersComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  returnRequests: ReturnRequest[] = [];
  loading = false;
  loadingReturnRequests = false;
  currentSeller: User | null = null;
  private destroy$ = new Subject<void>();

  activeTab: 'orders' | 'returns' = 'orders';

  updatingStatusMap = new Map<number, boolean>();
  processingReturnMap = new Map<number, boolean>();

  showProcessModal = false;
  selectedReturnRequest: ReturnRequest | null = null;
  processingAction: 'approve' | 'reject' | null = null;
  processingNotes: string = '';

  public OrderStatus = OrderStatus;
  public OrderItemStatus = OrderItemStatus;
  public orderStatusValues = Object.values(OrderStatus);

  constructor(
    public orderService: OrderService,
    private authService: AuthService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    const sellerId = this.authService.getCurrentUserId();
    if (sellerId) {
      this.currentSeller = { id: sellerId, role: 'SELLER' } as User;
      this.loadSellerOrders();
      this.loadReturnRequests();
    } else {
      this.loading = false;
      this.showAlert('You must be logged in as a seller to view this page.');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setActiveTab(tab: 'orders' | 'returns'): void {
    this.activeTab = tab;
    if (tab === 'orders' && this.orders.length === 0) {
      this.loadSellerOrders();
    } else if (tab === 'returns' && this.returnRequests.length === 0) {
      this.loadReturnRequests();
    }
  }

  loadSellerOrders(): void {
    this.loading = true;
    this.orderService.getSellerOrders()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (orders) => {
          this.orders = orders;
          this.filteredOrders = [...this.orders];
          console.log('Seller orders loaded:', this.orders);
        },
        error: (err) => {
          this.showAlert(`Error loading orders: ${err.message}`);
          console.error('Error fetching seller orders:', err);
        }
      });
  }

  loadReturnRequests(): void {
    this.loadingReturnRequests = true;
    this.orderService.getSellerReturnRequests()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingReturnRequests = false;
        })
      )
      .subscribe({
        next: (requests) => {
          this.returnRequests = requests.filter(req => !req.processed);
          console.log('Pending return requests loaded:', this.returnRequests);
        },
        error: (err) => {
          this.showAlert(`Error loading return requests: ${err.message}`);
          console.error('Error fetching return requests:', err);
        }
      });
  }

  updateItemStatus(orderId: number | undefined, itemId: number | undefined, event: Event): void {
    if (!orderId || !itemId) {
      this.alertService.error('Cannot update: Order or Item ID is missing');
      return;
    }
    
    const selectElement = event.target as HTMLSelectElement;
    const newStatus = selectElement.value as OrderItemStatus;
    
    if (!newStatus || !Object.values(OrderItemStatus).includes(newStatus)) {
      this.alertService.error('Invalid status selected.');
      const originalStatus = this.findOrderItem(orderId, itemId)?.status;
      if (originalStatus) {
        selectElement.value = originalStatus;
      }
      return;
    }
    
    this.updatingStatusMap.set(orderId, true);
    // To support TypeScript's type definition for updateOrderItemStatusBySeller
    this.orderService.updateOrderItemStatusBySeller(orderId, itemId, newStatus as any)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.updatingStatusMap.set(orderId, false))
      )
      .subscribe({
        next: (updatedItem) => {
          this.alertService.success(`Item status updated successfully.`);
          this.updateLocalOrderItemStatus(orderId, itemId, updatedItem.status as OrderItemStatus);
          
          // After updating the item, we should refresh the orders to get the updated order status
          this.loadSellerOrders();
        },
        error: (error) => {
          // Revert the local status in case of an error
          const originalStatus = this.findOrderItem(orderId, itemId)?.status;
          if (originalStatus) {
            selectElement.value = originalStatus;
          }
          this.alertService.error(error.message || 'Failed to update item status');
        }
      });
  }

  private updateLocalOrderItemStatus(orderId: number, itemId: number, newStatus: OrderItemStatus): void {
    const orderIndex = this.orders.findIndex(o => o.id === orderId);
    if (orderIndex > -1) {
      const itemIndex = this.orders[orderIndex].items.findIndex(i => i.id === itemId);
      if (itemIndex > -1) {
        const updatedItems = [...this.orders[orderIndex].items];
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: newStatus }; 
        
        this.orders[orderIndex] = { ...this.orders[orderIndex], items: updatedItems };
        
        const filteredOrderIndex = this.filteredOrders.findIndex(o => o.id === orderId);
        if(filteredOrderIndex > -1) {
            const filteredItemIndex = this.filteredOrders[filteredOrderIndex].items.findIndex(i => i.id === itemId);
             if(filteredItemIndex > -1) {
                const filteredUpdatedItems = [...this.filteredOrders[filteredOrderIndex].items];
                filteredUpdatedItems[filteredItemIndex] = { ...filteredUpdatedItems[filteredItemIndex], status: newStatus };
                this.filteredOrders[filteredOrderIndex] = { ...this.filteredOrders[filteredOrderIndex], items: filteredUpdatedItems };
            }
        }
      } else {
          console.warn(`Item ID ${itemId} not found in local order ${orderId} items.`);
      }
    } else {
        console.warn(`Order ID ${orderId} not found in local orders array.`);
    }
  }

  private findOrderItem(orderId: number, itemId: number): OrderItem | undefined {
      const order = this.orders.find(o => o.id === orderId);
      return order?.items.find(i => i.id === itemId);
  }

  getAvailableStatuses(currentStatus: OrderItemStatus | undefined): OrderItemStatus[] {
    if (!currentStatus) {
      return [OrderItemStatus.PENDING];
    }
    
    // We should only return valid transitions based on current status
    const allStatuses = Object.values(OrderItemStatus);
    let available: OrderItemStatus[] = [];
    
    switch (currentStatus) {
      case OrderItemStatus.PENDING:
        available = [OrderItemStatus.PENDING, OrderItemStatus.PREPARING];
        break;
      case OrderItemStatus.PREPARING:
        available = [OrderItemStatus.PREPARING, OrderItemStatus.SHIPPED];
        break;
      case OrderItemStatus.SHIPPED:
        available = [OrderItemStatus.SHIPPED, OrderItemStatus.DELIVERED];
        break;
      case OrderItemStatus.DELIVERED:
        available = [OrderItemStatus.DELIVERED];
        break;
      default:
        available = [currentStatus];
        break;
    }
    
    // Never allow already finalized statuses to be changed
    return available.filter(s => s !== OrderItemStatus.CANCELLED && s !== OrderItemStatus.RETURNED);
  }

  isStatusUpdateDisabled(itemStatus: OrderItemStatus | undefined): boolean {
    return itemStatus === OrderItemStatus.DELIVERED ||
           itemStatus === OrderItemStatus.CANCELLED ||
           itemStatus === OrderItemStatus.RETURNED ||
           itemStatus === OrderItemStatus.RETURN_REQUESTED;
  }

  updateOrderStatus(orderId: number, newStatus: OrderStatus): void {
    if (!orderId) {
      this.alertService.error('Cannot update: Order ID is missing');
      return;
    }
    
    // Update local state to show progress
    this.updatingStatusMap.set(orderId, true);
    
    // Call API to update order status
    this.orderService.updateOrderStatus(orderId, newStatus)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.updatingStatusMap.set(orderId, false))
      )
      .subscribe({
        next: (updatedOrder) => {
          this.alertService.success('Order status updated successfully');
          
          // Find order in our list and update it
          const index = this.orders.findIndex(o => o.id === orderId);
          if (index !== -1) {
            this.orders[index] = updatedOrder;
          }
        },
        error: (error) => {
          // If error occurs, revert the local state
          const order = this.orders.find(o => o.id === orderId);
          if (order) {
            order.status = this.findOriginalOrderStatus(orderId) || order.status;
          }
          
          this.alertService.error(error.message || 'Failed to update order status');
        }
      });
  }

  private findOriginalOrderStatus(orderId: number): OrderStatus | undefined {
    const originalOrder = this.orders.find(o => o.id === orderId);
    return originalOrder?.status;
  }

  isUpdatingStatus(orderId: number | undefined): boolean {
    return orderId !== undefined && this.updatingStatusMap.get(orderId) === true;
  }

  getSellerItems(order: Order): OrderItem[] {
    return order.items.filter(item => item.product.seller?.id === this.currentSeller?.id);
  }

  formatAddress(address: any): string {
    return `${address.street}, ${address.city}, ${address.state} ${address.postalCode}`;
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  getStatusLabel(status: OrderStatus | undefined): string {
    return this.orderService.getStatusLabel(status || 'RECEIVED');
  }

  getStatusColor(status: OrderStatus | undefined): string {
    return this.orderService.getStatusColor(status || OrderStatus.RECEIVED);
  }

  getOrderItemStatusLabel(status: OrderItemStatus | undefined): string {
    return this.orderService.getOrderItemStatusLabel(status || OrderItemStatus.PENDING);
  }

  openProcessModal(request: ReturnRequest, action: 'approve' | 'reject'): void {
    this.selectedReturnRequest = request;
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
    if (!this.selectedReturnRequest || this.processingAction === null) {
      this.showAlert('Error: No return request selected or action specified.');
      return;
    }

    const requestId = this.selectedReturnRequest.id!;
    const payload = {
      approved: this.processingAction === 'approve',
      notes: this.processingNotes
    };

    this.processingReturnMap.set(requestId, true);
    this.closeProcessModal();

    this.orderService.processReturnRequest(requestId, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processingReturnMap.delete(requestId);
        })
      )
      .subscribe({
        next: (processedRequest) => {
          this.showAlert(`Return request #${requestId} has been ${payload.approved ? 'approved' : 'rejected'}.`);
          this.loadReturnRequests();
          this.loadSellerOrders();
        },
        error: (err) => {
          this.showAlert(`Error processing return request: ${err.message}`);
          console.error('Error processing return request:', err);
        }
      });
  }

  isProcessingReturn(requestId: number | undefined): boolean {
    return !!requestId && this.processingReturnMap.has(requestId);
  }

  showAlert(message: string): void {
    this.alertService.success(message);
  }
}
