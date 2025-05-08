import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Order, OrderCreationRequest, OrderStatus } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = 'http://localhost:8080/api/orders'; // Base URL

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
    // Use the base apiUrl
    return this.http.get<Order[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Error fetching user orders:', error);
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

  // Get a user-friendly status label for display
  getStatusLabel(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'Order Received';
      case OrderStatus.PREPARING:
        return 'Preparing Your Order';
      case OrderStatus.IN_COUNTRY:
        return 'Package Arrived in Your Country';
      case OrderStatus.IN_CITY:
        return 'Package Arrived in Your City';
      case OrderStatus.OUT_FOR_DELIVERY:
        return 'Out for Delivery Today';
      case OrderStatus.DELIVERED:
        return 'Delivered';
      case OrderStatus.CANCELLED:
        return 'Cancelled';
      default:
        return 'Unknown Status';
    }
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
      default:
        return '#7f8c8d'; // gray
    }
  }
}
