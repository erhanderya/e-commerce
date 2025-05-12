import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../../services/order.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { catchError, of, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-return-request-management',
  templateUrl: './return-request-management.component.html',
  styleUrls: ['./return-request-management.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ReturnRequestManagementComponent implements OnInit {
  returnRequests: any[] = [];
  loading = false;
  error: string | null = null;
  isUsingMockData = false;
  
  // For filtering
  statusFilter: string = '';
  searchTerm: string = '';
  
  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.validateAdminAccess();
    this.checkAdminAccess().then(isAdmin => {
      if (isAdmin) {
        this.loadReturnRequestsDirectly();
      } else {
        this.error = "Admin access check failed. Using mock data instead.";
        this.isUsingMockData = true;
        this.returnRequests = this.getMockReturnRequests();
      }
    });
  }

  async checkAdminAccess(): Promise<boolean> {
    try {
      // Direct call to check admin status
      const token = this.authService.getAuthToken();
      if (!token) {
        console.error('No authentication token found');
        return false;
      }

      console.log('Token found:', token.substring(0, 15) + '...');
      
      // Try to access a simple admin endpoint to check permissions
      return new Promise((resolve) => {
        this.http.get<{success: boolean}>(
          `${environment.apiUrl}/api/admin/check`,
          { 
            headers: new HttpHeaders().set('Authorization', `Bearer ${token}`),
            params: { timestamp: new Date().getTime().toString() } // Prevent caching
          }
        ).subscribe({
          next: (result) => {
            console.log('Admin check result:', result);
            resolve(!!result?.success);
          },
          error: (err) => {
            console.log('Admin check failed:', err);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error('Error checking admin access:', error);
      return false;
    }
  }

  validateAdminAccess(): void {
    const isAdmin = this.authService.isAdmin();
    const token = this.authService.getAuthToken();
    const currentUser = this.authService.currentUser$;
    
    console.log('Admin validation check:');
    console.log('Is admin according to service:', isAdmin);
    console.log('Auth token exists:', !!token);
    console.log('Token first 10 chars:', token ? token.substring(0, 10) + '...' : 'No token');
    
    currentUser.subscribe(user => {
      console.log('Current user role:', user?.role);
      console.log('User details:', user ? 
        { id: user.id, username: user.username, email: user.email, role: user.role } : 'Not logged in');
    });
    
    if (!isAdmin) {
      this.error = 'You do not have permission to access this page. Admin role required.';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    }
  }

  loadReturnRequestsDirectly(): void {
    this.loading = true;
    this.error = null;
    
    const token = this.authService.getAuthToken();
    
    // Make a direct HTTP request with token instead of using the service
    this.http.get<any[]>(`${environment.apiUrl}/api/orders/return-requests/admin`, {
      headers: new HttpHeaders().set('Authorization', `Bearer ${token}`)
    })
    .pipe(
      catchError(err => {
        console.error('Direct API call failed:', err);
        this.isUsingMockData = true;
        return of(this.getMockReturnRequests());
      })
    )
    .subscribe({
      next: (data) => {
        console.log('Return requests data received:', data);
        this.returnRequests = data || [];
        this.loading = false;
        
        if (this.isUsingMockData) {
          console.warn('Using mock data as the API endpoint returned an error');
        }
      },
      error: (err) => {
        console.error('Unhandled error:', err);
        this.error = 'An unexpected error occurred. Please check console for details.';
        this.loading = false;
      }
    });
  }

  loadAllReturnRequests(): void {
    this.loading = true;
    this.error = null;
    
    console.log('Starting to load return requests...');
    
    this.orderService.getAllReturnRequests()
      .pipe(
        catchError(err => {
          console.error('Main API call failed:', err);
          
          // Extract specific error information
          let errorMessage = 'Failed to load return requests';
          
          if (err.status === 403) {
            errorMessage = 'Access forbidden. You need admin privileges to view return requests.';
          } else if (err.status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          } else if (err.status === 404) {
            errorMessage = 'Return requests endpoint not found. Please check API configuration.';
          } else if (err.status === 500) {
            errorMessage = 'Server error encountered while fetching return requests.';
          }
          
          if (err.error && err.error.message) {
            errorMessage += ` Details: ${err.error.message}`;
          }
          
          this.error = errorMessage;
          this.loading = false;
          
          // Use mock data as fallback
          this.isUsingMockData = true;
          return of(this.getMockReturnRequests());
        })
      )
      .subscribe({
        next: (data) => {
          console.log('Return requests data received:', data);
          this.returnRequests = data;
          this.loading = false;
          
          if (this.isUsingMockData) {
            console.warn('Using mock data as the API endpoint returned an error');
          }
        },
        error: (err) => {
          console.error('Unhandled error:', err);
          this.error = 'An unexpected error occurred. Please check console for details.';
          this.loading = false;
        }
      });
  }
  
  // Mock data for testing when API isn't available
  getMockReturnRequests(): any[] {
    return [
      {
        id: 1,
        order: { id: 101 },
        orderItem: { 
          id: 1001, 
          product: { name: 'Wireless Headphones' } 
        },
        user: { username: 'customer1', email: 'customer1@example.com' },
        reason: 'Product not as described',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        processedAt: null
      },
      {
        id: 2,
        order: { id: 102 },
        orderItem: { 
          id: 1002, 
          product: { name: 'Smart Watch' } 
        },
        user: { username: 'customer2', email: 'customer2@example.com' },
        reason: 'Defective product',
        status: 'APPROVED',
        createdAt: '2023-05-15T10:30:00',
        processedAt: '2023-05-17T14:20:00'
      },
      {
        id: 3,
        order: { id: 103 },
        orderItem: { 
          id: 1003, 
          product: { name: 'Bluetooth Speaker' } 
        },
        user: { username: 'customer3', email: 'customer3@example.com' },
        reason: 'Wrong item received',
        status: 'REJECTED',
        createdAt: '2023-05-10T08:45:00',
        processedAt: '2023-05-12T11:35:00'
      }
    ];
  }
  
  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }
  
  getStatusColor(status: string): string {
    if (!status) return '#95a5a6'; // gray for undefined/null status
    
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '#f39c12'; // orange
      case 'APPROVED':
        return '#2ecc71'; // green
      case 'REJECTED':
        return '#e74c3c'; // red
      case 'COMPLETED':
        return '#3498db'; // blue
      default:
        return '#95a5a6'; // gray
    }
  }

  getStatusLabel(status: string): string {
    if (!status) return 'Unknown';
    
    // Capitalize first letter and lowercase the rest
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  applyFilters(): any[] {
    return this.returnRequests.filter(request => {
      // Filter by status
      if (this.statusFilter && (!request.status || request.status.toUpperCase() !== this.statusFilter.toUpperCase())) {
        return false;
      }
      
      // Filter by search term (request ID, order ID, or customer username)
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        const requestIdMatch = request.id.toString().includes(searchLower);
        const orderIdMatch = request.order?.id.toString().includes(searchLower);
        const orderItemIdMatch = request.orderItem?.id.toString().includes(searchLower);
        const usernameMatch = request.user?.username?.toLowerCase().includes(searchLower) || 
                             request.customer?.username?.toLowerCase().includes(searchLower) || false;
        
        if (!requestIdMatch && !orderIdMatch && !orderItemIdMatch && !usernameMatch) {
          return false;
        }
      }
      
      return true;
    });
  }

  viewOrderDetails(orderId: number): void {
    window.open(`/orders/${orderId}`, '_blank');
  }
  
  processReturnRequest(requestId: number, approve: boolean): void {
    const status = approve ? 'APPROVED' : 'REJECTED';
    const comments = approve ? 'Approved by admin' : 'Rejected by admin';
    
    this.orderService.processReturnRequestAsAdmin(requestId, { 
      approved: approve, 
      notes: comments 
    }).subscribe({
      next: () => {
        // Update the request in the local array
        const index = this.returnRequests.findIndex(r => r.id === requestId);
        if (index !== -1) {
          this.returnRequests[index].status = status;
          this.returnRequests[index].adminComments = comments;
          this.returnRequests[index].processedAt = new Date().toISOString();
        }
      },
      error: (err) => {
        console.error('Error processing return request:', err);
        alert('Failed to process the return request. Please try again.');
      }
    });
  }
} 