import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { Order, OrderStatus, OrderItem, OrderItemStatus, ReturnRequestCreation } from '../../models/order.model';
import { UserRole } from '../../models/user.model';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

// Make sure the OrderItem interface has the right properties
declare global {
  interface OrderItemExtended extends OrderItem {
    rejectionReason?: string;
    rejectionDate?: Date | string;
  }
}

interface SellerGroup {
  sellerId: number | null;
  sellerName: string | null;
  items: OrderItem[];
}

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
  OrderItemStatus = OrderItemStatus;
  updatingStatus = false;
  
  // Return item modal properties
  showReturnItemModal = false;
  selectedItem: OrderItem | null = null;
  returnReason = '';
  returnSubmitting = false;

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
        
        // Check for rejected return requests
        this.orderService.getUserReturnRequests().subscribe({
          next: (returnRequests) => {
            if (this.order && this.order.items) {
              // Process each item to check if any return requests were rejected
              this.order.items.forEach(item => {
                const itemRequests = returnRequests.filter(req => 
                  req.orderItem && req.orderItem.id === item.id && req.processed);
                  
                if (itemRequests.length > 0) {
                  // If any requests for this item were rejected, mark the item
                  const rejectedRequest = itemRequests.find(req => req.rejected);
                  if (rejectedRequest) {
                    item.returnRejected = true;
                    // Cast to OrderItemExtended to access the extended properties
                    const extendedItem = item as any;
                    extendedItem.rejectionReason = rejectedRequest.processorNotes;
                    extendedItem.rejectionDate = rejectedRequest.processedDate;
                  }
                }
              });
            }
          },
          error: (err) => {
            console.error('Error fetching return requests:', err);
          }
        });
        
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

  getOrderStatusLabel(status: OrderStatus | OrderItemStatus): string {
    if (typeof status === 'string') {
      return this.orderService.getStatusLabel(status);
    }
    
    // Check if it's an OrderItemStatus 
    if (Object.values(OrderItemStatus).includes(status as any)) {
      return this.orderService.getOrderItemStatusLabel(status as OrderItemStatus);
    }
    
    return this.orderService.getStatusLabel(status as OrderStatus);
  }

  getOrderStatusColor(status: OrderStatus | OrderItemStatus): string {
    // Check if it's an OrderItemStatus
    if (Object.values(OrderItemStatus).includes(status as any)) {
      return this.orderService.getOrderItemStatusColor(status as OrderItemStatus);
    }
    
    return this.orderService.getStatusColor(status as OrderStatus);
  }

  formatDate(date: string | Date): string {
    return formatDate(date, 'MMM d, y, h:mm a', 'en-US');
  }

  goBack(): void {
    this.router.navigate(['/my-orders']);
  }

  // Calculate what percentage of the order process has been completed
  getTrackingProgress(status: OrderStatus): number {
    // With the new order status system, we have a simpler progress calculation
    switch (status) {
      case OrderStatus.RECEIVED:
        return 25;
      case OrderStatus.DELIVERED:
        return 100;
      case OrderStatus.CANCELED:
        return 0;
      case OrderStatus.REFUNDED:
        return 0;
      default:
        return 0;
    }
  }

  isStatusCompleted(stepStatus: OrderStatus, orderStatus: OrderStatus): boolean {
    // For the new system, we consider a step completed if:
    // 1. RECEIVED - only if order is in RECEIVED state or further (DELIVERED)
    // 2. DELIVERED - only if order is in DELIVERED state
    // Cancel and Refund are special cases
    
    if (orderStatus === OrderStatus.CANCELED || orderStatus === OrderStatus.REFUNDED) {
      return false;
    }
    
    if (stepStatus === OrderStatus.RECEIVED) {
      return orderStatus === OrderStatus.RECEIVED || orderStatus === OrderStatus.DELIVERED;
    }
    
    return stepStatus === orderStatus;
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

  // Get the rejection reason for an item
  getRejectionReason(item: OrderItem): string {
    const extendedItem = item as any;
    return extendedItem.rejectionReason || 'No reason provided';
  }
  
  // Get the rejection date for an item
  getRejectionDate(item: OrderItem): string | null {
    const extendedItem = item as any;
    if (!extendedItem.rejectionDate) return null;
    return this.formatDate(extendedItem.rejectionDate);
  }

  // Check if an item can be returned
  canReturnItem(item: OrderItem): boolean {
    return (
      item.status === OrderItemStatus.DELIVERED && 
      !item.hasReturnRequest
    );
  }
  
  // Open the return modal for an order item
  openReturnItemModal(item: OrderItem): void {
    this.selectedItem = item;
    this.returnReason = '';
    this.showReturnItemModal = true;
  }
  
  // Open the return modal for an entire order
  openOrderReturnModal(): void {
    this.returnReason = '';
    this.showReturnItemModal = true;
    // When opening the modal for the entire order, set selectedItem to null
    // We'll handle all items in the order when submitting
    this.selectedItem = null;
  }
  
  // Submit the return request for an item
  submitItemReturnRequest(): void {
    // If selectedItem is null, it means we're returning the entire order
    if (!this.selectedItem && this.order) {
      // Find all eligible items (DELIVERED and not already returned)
      const eligibleItems = this.order.items.filter(item => 
        item.status === OrderItemStatus.DELIVERED && !item.hasReturnRequest
      );
      
      if (eligibleItems.length === 0) {
        this.alertService.error('No eligible items to return');
        return;
      }
      
      if (!this.returnReason.trim()) {
        this.alertService.error('Please provide a reason for your return request');
        return;
      }
      
      this.returnSubmitting = true;
      
      // Create an array of observables for each return request
      const returnRequests = eligibleItems.map(item => 
        this.orderService.createReturnRequest(item.id!, { 
          reason: this.returnReason.trim(),
          orderItemId: item.id! 
        })
      );
      
      // Use forkJoin to wait for all requests to complete
      forkJoin(returnRequests).subscribe({
        next: () => {
          this.returnSubmitting = false;
          this.showReturnItemModal = false;
          this.alertService.success('Return requests submitted successfully for all eligible items');
          
          // Update all items in the order to show they have return requests
          if (this.order) {
            eligibleItems.forEach(item => {
              const itemIndex = this.order!.items.findIndex(i => i.id === item.id);
              if (itemIndex !== -1) {
                this.order!.items[itemIndex].hasReturnRequest = true;
              }
            });
            
            // Mark the order as having a return request
            this.order.hasReturnRequest = true;
          }
          
          // Reload the order to get the updated status
          this.loadOrder();
        },
        error: (error) => {
          this.returnSubmitting = false;
          this.alertService.error('Failed to submit return requests: ' + error.message);
        }
      });
      
      return;
    }
    
    // Original logic for returning a single item
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

        // Update the item in the order to show it has a return request
        if (this.order && this.order.items) {
          const itemIndex = this.order.items.findIndex(i => i.id === this.selectedItem!.id);
          if (itemIndex !== -1) {
            this.order.items[itemIndex].hasReturnRequest = true;
          }
          
          // Check if any items have return requests and update the order flag
          this.order.hasReturnRequest = this.order.items.some(item => item.hasReturnRequest);
        }
      },
      error: (error) => {
        this.returnSubmitting = false;
        this.alertService.error('Failed to submit return request: ' + error.message);
      }
    });
  }
}
