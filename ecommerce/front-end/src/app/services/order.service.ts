import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, map, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Order, OrderCreationRequest, OrderStatus, ReturnRequest, ReturnRequestCreation, ReturnRequestProcess, OrderItem, OrderItemStatus } from '../models/order.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = environment.apiUrl + '/api/orders'; // Use environment variable

  constructor(private http: HttpClient) { }

  // Create a new order from cart
  createOrder(orderRequest: OrderCreationRequest): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, orderRequest).pipe(
      catchError(error => {
        console.error('Error creating order:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to create order'));
      })
    );
  }

  // Get all orders for the current user
  getUserOrders(): Observable<Order[]> {
    console.log('OrderService - Fetching user orders from:', this.apiUrl);
    // Use the base apiUrl
    return this.http.get<Order[]>(this.apiUrl).pipe(
      tap(orders => {
        console.log('OrderService - Orders fetched successfully:', orders);
      }),
      catchError(error => {
        console.error('OrderService - Error fetching user orders:', error);
        if (error.status === 401) {
          console.error('Authentication error - possibly invalid or expired token');
        } else if (error.status === 403) {
          console.error('Authorization error - user does not have permission');
        } else if (error.status === 404) {
          console.error('Endpoint not found');
        } else if (error.status === 500) {
          console.error('Server error');
        }
        // Provide more detailed error info if available
        const errorMsg = error.error?.error || error.message || 'Failed to fetch orders';
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  // Get a specific order by ID
  getOrderById(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error(`Error fetching order #${id}:`, error);
        return throwError(() => new Error(error.error?.error || 'Failed to fetch order'));
      })
    );
  }

  // Cancel an order
  cancelOrder(orderId: number): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/${orderId}/cancel`, {}).pipe(
      catchError(error => {
        console.error('Error cancelling order:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to cancel order'));
      })
    );
  }

  // Create a return request
  createReturnRequest(orderItemId: number, request: ReturnRequestCreation): Observable<ReturnRequest> {
    return this.http.post<ReturnRequest>(`${this.apiUrl}/items/${orderItemId}/return-request`, request).pipe(
      catchError(error => {
        console.error('Error creating return request:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to create return request'));
      })
    );
  }

  // Get pending return requests for seller
  getSellerReturnRequests(): Observable<ReturnRequest[]> {
    return this.http.get<ReturnRequest[]>(`${this.apiUrl}/return-requests/seller`).pipe(
      catchError(error => {
        console.error('Error fetching return requests:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to fetch return requests'));
      })
    );
  }

  // Process a return request (approve/reject)
  processReturnRequest(requestId: number, process: ReturnRequestProcess): Observable<ReturnRequest> {
    return this.http.put<ReturnRequest>(`${this.apiUrl}/return-requests/${requestId}/process`, process).pipe(
      catchError(error => {
        console.error('Error processing return request:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to process return request'));
      })
    );
  }

  // Get all return requests for the current user
  getUserReturnRequests(): Observable<ReturnRequest[]> {
    return this.http.get<ReturnRequest[]>(`${this.apiUrl}/return-requests`).pipe(
      catchError(error => {
        console.error('Error fetching user return requests:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to fetch return requests'));
      })
    );
  }

  // Check if an order item has a pending return request
  hasItemPendingReturnRequest(itemId: number): Observable<{hasPendingRequest: boolean, request?: ReturnRequest}> {
    return this.http.get<{hasPendingRequest: boolean, request?: ReturnRequest}>(`${this.apiUrl}/items/${itemId}/has-return-request`).pipe(
      catchError(error => {
        console.error('Error checking return request status:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to check return request status'));
      })
    );
  }

  // Update order status (admin only)
  updateOrderStatus(orderId: number, status: OrderStatus): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/${orderId}/status`, { status }).pipe(
      catchError(error => {
        console.error('Error updating order status:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to update order status'));
      })
    );
  }

  // Get all orders (admin only)
  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/admin`).pipe(
      catchError(error => {
        console.error('Error fetching all orders:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to fetch orders'));
      })
    );
  }

  // Get a human-readable status label
  getStatusLabel(status: string): string {
    const statusMap: {[key: string]: string} = {
      'RECEIVED': 'Order Received',
      'DELIVERED': 'Delivered',
      'CANCELED': 'Canceled',
      'REFUNDED': 'Refunded',
      'RETURNED': 'Returned'
    };

    return statusMap[status] || status;
  }

  // Get a color for status display
  getStatusColor(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.RECEIVED:
        return '#f39c12'; // orange
      case OrderStatus.DELIVERED:
        return '#27ae60'; // green
      case OrderStatus.CANCELED:
        return '#e74c3c'; // red
      case OrderStatus.REFUNDED:
        return '#8e44ad'; // purple
      case OrderStatus.RETURNED:
        return '#9b59b6'; // light purple
      default:
        return '#7f8c8d'; // gray
    }
  }

  // Get orders for the current seller
  getSellerOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/seller`).pipe(
      catchError(error => {
        console.error('Error fetching seller orders:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to fetch seller orders'));
      })
    );
  }

  // Check if the current user has purchased a specific product
  hasUserPurchasedProduct(productId: number): Observable<boolean> {
    return this.http.get<{hasPurchased: boolean}>(`${this.apiUrl}/has-purchased/${productId}`).pipe(
      catchError(error => {
        console.error('Error checking product purchase:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to verify purchase status'));
      }),
      map(response => response.hasPurchased)
    );
  }

  // Update OrderItem status (Seller only)
  updateOrderItemStatusBySeller(orderId: number, itemId: number, status: OrderItemStatus): Observable<OrderItem> {
    const url = `${this.apiUrl}/${orderId}/items/${itemId}/status/seller`;
    const body = { status: status };
    return this.http.put<OrderItem>(url, body).pipe(
      tap(updatedItem => console.log(`Updated order item ${itemId} status to ${status}`, updatedItem)),
      catchError(error => {
        console.error(`Error updating order item ${itemId} status:`, error);
        return throwError(() => new Error(error.error?.error || 'Failed to update order item status'));
      })
    );
  }

  // Get a human-readable status label for OrderItem
  getOrderItemStatusLabel(status: string | OrderItemStatus): string {
    const statusMap: {[key: string]: string} = {
      'PENDING': 'Pending',
      'PREPARING': 'Preparing',
      'SHIPPED': 'Shipped',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Canceled',
      'RETURNED': 'Returned',
      'RETURN_REQUESTED': 'Return Requested'
    };

    return statusMap[status] || status;
  }

  // Get a color for OrderItem status display
  getOrderItemStatusColor(status: OrderItemStatus): string {
    switch (status) {
      case OrderItemStatus.PENDING:
        return '#f39c12'; // orange
      case OrderItemStatus.PREPARING:
        return '#3498db'; // blue
      case OrderItemStatus.SHIPPED:
        return '#2980b9'; // darker blue
      case OrderItemStatus.DELIVERED:
        return '#27ae60'; // green
      case OrderItemStatus.CANCELLED:
        return '#e74c3c'; // red
      case OrderItemStatus.RETURNED:
        return '#8e44ad'; // purple
      case OrderItemStatus.RETURN_REQUESTED:
        return '#d35400'; // dark orange
      default:
        return '#7f8c8d'; // gray
    }
  }

  // Get all return requests (admin only)
  getAllReturnRequests(): Observable<ReturnRequest[]> {
    // Use the correct API endpoint that we just added to the backend
    return this.http.get<ReturnRequest[]>(`${this.apiUrl}/return-requests/admin`).pipe(
      catchError(error => {
        console.error('Error fetching all return requests:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to fetch return requests'));
      })
    );
  }

  // Process return request as admin (approve/reject)
  processReturnRequestAsAdmin(requestId: number, process: ReturnRequestProcess): Observable<ReturnRequest> {
    return this.http.put<ReturnRequest>(`${this.apiUrl}/return-requests/${requestId}/admin-process`, process).pipe(
      catchError(error => {
        console.error('Error processing return request as admin:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to process return request'));
      })
    );
  }
}
