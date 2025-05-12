import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, map, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Order, OrderCreationRequest, OrderStatus, ReturnRequest, ReturnRequestCreation, ReturnRequestProcess } from '../models/order.model';
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
  createReturnRequest(orderId: number, request: ReturnRequestCreation): Observable<ReturnRequest> {
    return this.http.post<ReturnRequest>(`${this.apiUrl}/${orderId}/return-request`, request).pipe(
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

  // Check if an order has a pending return request
  hasPendingReturnRequest(orderId: number): Observable<{hasPendingRequest: boolean, request?: ReturnRequest}> {
    return this.http.get<{hasPendingRequest: boolean, request?: ReturnRequest}>(`${this.apiUrl}/${orderId}/has-return-request`).pipe(
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
  getStatusLabel(status: string, returnRequests?: ReturnRequest[]): string {
    // If returnRequests are provided, check if there's an approved return request
    const hasApprovedReturn = returnRequests && returnRequests.some(
      req => req.processed && req.approved && (req.processorNotes?.includes('[THIS_IS_RETURN_APPROVED]') || false)
    );

    // If it's cancelled but has an approved return request, show as "Returned & Refunded"
    if (status === 'CANCELLED' && hasApprovedReturn) {
      return 'Returned & Refunded';
    }

    const statusMap: {[key: string]: string} = {
      'PENDING': 'Pending',
      'PREPARING': 'Preparing',
      'IN_COUNTRY': 'In Country',
      'IN_CITY': 'In City',
      'OUT_FOR_DELIVERY': 'Out For Delivery',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled',
      'RETURNED': 'Returned & Refunded'
    };

    return statusMap[status] || status;
  }

  // Get a color for status display
  getStatusColor(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return '#f39c12'; // orange
      case OrderStatus.PREPARING:
        return '#3498db'; // blue
      case OrderStatus.IN_COUNTRY:
        return '#2980b9'; // darker blue
      case OrderStatus.IN_CITY:
        return '#9b59b6'; // purple
      case OrderStatus.OUT_FOR_DELIVERY:
        return '#1abc9c'; // teal
      case OrderStatus.DELIVERED:
        return '#27ae60'; // green
      case OrderStatus.CANCELLED:
        return '#e74c3c'; // red
      case OrderStatus.RETURNED:
        return '#8e44ad'; // purple
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

  // Update order status as a seller (when a seller updates status of their products)
  updateSellerOrderStatus(orderId: number, status: OrderStatus): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/${orderId}/seller-status`, { status }).pipe(
      catchError(error => {
        console.error('Error updating order status:', error);
        return throwError(() => new Error(error.error?.error || 'Failed to update order status'));
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
}
