import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { Order, OrderStatus, OrderItem, OrderItemStatus, ReturnRequest } from '../../models/order.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface SellerGroup {
  sellerId: number | null;
  sellerName: string | null;
  items: OrderItem[];
}

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
  selectedOrder: Order | null = null;
  OrderStatus = OrderStatus; // Make enum available to template
  OrderItemStatus = OrderItemStatus; // Make OrderItemStatus available to template

  // Item return modal properties
  showReturnItemModal = false;
  selectedItem: OrderItem | null = null;
  returnReason = '';
  returnSubmitting = false;

  // Tab control
  activeTab = 'orders';
  
  // Return requests history
  returnRequests: ReturnRequest[] = [];
  loadingReturnRequests = false;

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

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    
    if (tab === 'returns' && this.returnRequests.length === 0) {
      this.loadReturnRequests();
    } else if (tab === 'orders' && this.orders.length === 0) {
      this.loadOrders();
    }
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
        
        // Check for rejected return requests
        this.orderService.getUserReturnRequests().subscribe({
          next: (returnRequests) => {
            // Process each order and its items to check for rejected return requests
            this.orders.forEach(order => {
              if (order.items) {
                order.items.forEach(item => {
                  const itemRequests = returnRequests.filter(req => 
                    req.orderItem && req.orderItem.id === item.id && req.processed);
                    
                  if (itemRequests.length > 0) {
                    // If any requests for this item were rejected, mark the item
                    const rejectedRequest = itemRequests.find(req => req.rejected);
                    if (rejectedRequest) {
                      item.returnRejected = true;
                      // Set rejection details
                      item.rejectionReason = rejectedRequest.processorNotes;
                      item.rejectionDate = rejectedRequest.processedDate;
                    }
                  }
                });
              }
            });
          },
          error: (err) => {
            console.error('Error fetching return requests:', err);
          }
        });
        
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

  loadReturnRequests(): void {
    this.loadingReturnRequests = true;
    this.orderService.getUserReturnRequests().subscribe({
      next: (data) => {
        this.returnRequests = data;
        this.loadingReturnRequests = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loadingReturnRequests = false;
        this.alertService.error('Failed to load return requests');
      }
    });
  }

  // Group order items by seller
  getItemsBySeller(order: Order | null): SellerGroup[] {
    if (!order || !order.items || order.items.length === 0) {
      return [];
    }

    const sellerGroups: SellerGroup[] = [];
    const sellerMap = new Map<number | null, SellerGroup>();

    // Group items by seller ID
    for (const item of order.items) {
      const sellerId = item.product.seller?.id || null;
      const sellerName = item.product.seller ? 
        `${item.product.seller.firstName || ''} ${item.product.seller.lastName || ''}`.trim() : 
        'Unknown Seller';

      if (!sellerMap.has(sellerId)) {
        // Create new group for this seller
        const newGroup: SellerGroup = {
          sellerId,
          sellerName,
          items: []
        };
        sellerMap.set(sellerId, newGroup);
        sellerGroups.push(newGroup);
      }

      // Add item to the seller's group
      sellerMap.get(sellerId)?.items.push(item);
    }

    return sellerGroups;
  }

  // Methods for order status display
  getOrderStatusLabel(status: OrderStatus): string {
    return this.orderService.getStatusLabel(status);
  }

  getStatusColor(status: OrderStatus): string {
    return this.orderService.getStatusColor(status);
  }

  // Methods for order item status display
  getOrderItemStatusLabel(status: OrderItemStatus): string {
    return this.orderService.getOrderItemStatusLabel(status);
  }

  getOrderItemStatusColor(status: OrderItemStatus): string {
    return this.orderService.getOrderItemStatusColor(status);
  }

  formatDate(date: string | Date): string {
    return formatDate(date, 'MMM d, y, h:mm a', 'en-US');
  }

  // Open the return modal for an order item
  openReturnItemModal(item: OrderItem): void {
    this.selectedItem = item;
    this.returnReason = '';
    this.showReturnItemModal = true;
  }

  // Submit the return request for an item
  submitItemReturnRequest(): void {
    if (!this.selectedItem || !this.selectedItem.id || !this.returnReason.trim()) {
      this.alertService.error('Please provide a reason for your return request');
      return;
    }

    this.returnSubmitting = true;

    this.orderService.createReturnRequest(this.selectedItem.id, { 
      reason: this.returnReason.trim(),
      orderItemId: this.selectedItem.id 
    })
    .subscribe({
      next: () => {
        this.returnSubmitting = false;
        this.showReturnItemModal = false;
        this.alertService.success('Return request submitted successfully');

        // Update the item in the order list to show it has a return request
        this.updateItemWithReturnRequest(this.selectedItem!);
      },
      error: (error) => {
        this.returnSubmitting = false;
        this.alertService.error('Failed to submit return request: ' + error.message);
      }
    });
  }

  // Get return status label
  getReturnStatusLabel(approved: boolean | undefined): string {
    if (approved === undefined) return 'Pending';
    return approved ? 'Approved' : 'Rejected';
  }
  
  // Get return status color
  getReturnStatusColor(approved: boolean | undefined): string {
    if (approved === undefined) return '#f39c12'; // orange for pending
    return approved ? '#2ecc71' : '#e74c3c'; // green for approved, red for rejected
  }

  // Update an item in the orders list to show it has a return request
  private updateItemWithReturnRequest(item: OrderItem): void {
    if (!item || !item.id) return;

    // Find the order containing this item
    for (const order of this.orders) {
      if (!order.items) continue;

      const itemIndex = order.items.findIndex(i => i.id === item.id);
      if (itemIndex !== -1) {
        // Update the item
        order.items[itemIndex].hasReturnRequest = true;
        break;
      }
    }
  }

  // Get the rejection reason for an item
  getRejectionReason(item: OrderItem): string {
    if (!item.returnRejected) return '';
    
    // Find the return request for this item in the processed return requests
    const request = this.returnRequests.find(req => 
      req.orderItem && req.orderItem.id === item.id && req.rejected);
      
    return request?.processorNotes || 'No reason provided';
  }
  
  // Get the rejection date for an item
  getRejectionDate(item: OrderItem): string {
    if (!item.returnRejected) return '';
    
    // Find the return request for this item in the processed return requests
    const request = this.returnRequests.find(req => 
      req.orderItem && req.orderItem.id === item.id && req.rejected);
    
    return request?.processedDate ? this.formatDate(request.processedDate) : 'Unknown date';
  }

  // Check if an item can be returned
  canReturnItem(item: OrderItem): boolean {
    return (
      item.status === OrderItemStatus.DELIVERED && 
      !item.hasReturnRequest
    );
  }
}
