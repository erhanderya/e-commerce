import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { User } from '../../../../models/user.model';
import { OrderService } from '../../../../services/order.service';
import { OrderStatus } from '../../../../models/order.model';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="seller-dashboard">
      <div class="dashboard-header">
        <div class="user-welcome" *ngIf="currentUser">
          <h2>Seller Dashboard</h2>
          <p>Welcome back, <span>{{ currentUser.firstName || currentUser.username }}</span></p>
        </div>
        <div class="active-orders-badge" *ngIf="activeOrderCount > 0">
          <i class="fa-solid fa-truck-fast"></i>
          <span>{{activeOrderCount}} active order{{activeOrderCount !== 1 ? 's' : ''}}</span>
        </div>
      </div>

      <div class="dashboard-nav">
        <a [routerLink]="['./products']" routerLinkActive="active">
          <i class="fa-solid fa-boxes-stacked"></i>
          <span>My Products</span>
        </a>
        <a [routerLink]="['./create']" routerLinkActive="active">
          <i class="fa-solid fa-plus"></i>
          <span>Add Product</span>
        </a>
        <a [routerLink]="['./orders']" routerLinkActive="active">
          <i class="fa-solid fa-truck"></i>
          <span>Orders</span>
          <span class="order-count" *ngIf="activeOrderCount > 0">{{activeOrderCount}}</span>
        </a>
        <a [routerLink]="['./stats']" routerLinkActive="active">
          <i class="fa-solid fa-chart-line"></i>
          <span>Analytics</span>
        </a>
      </div>

      <div class="dashboard-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .seller-dashboard {
      padding: 20px;
      background-color: var(--secondary-color, #f5f5f5);
      border-radius: 8px;
      box-shadow: var(--box-shadow, 0 1px 3px rgba(0,0,0,0.1));
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 30px;
      gap: 20px;
    }

    .user-welcome h2 {
      font-size: 24px;
      margin: 0 0 8px 0;
      color: var(--text-color, #333);
    }

    .user-welcome p {
      margin: 0;
      color: var(--text-light, #666);
      font-size: 15px;
    }

    .user-welcome span {
      color: var(--primary-color, #f27a1a);
      font-weight: 600;
    }

    .active-orders-badge {
      display: flex;
      align-items: center;
      background-color: var(--primary-color, #f27a1a);
      color: white;
      padding: 8px 15px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      gap: 8px;
      box-shadow: 0 2px 5px rgba(242, 122, 26, 0.3);
    }

    .dashboard-nav {
      display: flex;
      background: white;
      border-radius: 8px;
      margin-bottom: 25px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow: hidden;
      position: relative;
    }

    .dashboard-nav a {
      display: flex;
      align-items: center;
      flex: 1;
      padding: 16px;
      text-decoration: none;
      color: var(--text-color, #333);
      transition: all 0.2s ease;
      justify-content: center;
      border-bottom: 3px solid transparent;
      gap: 8px;
      position: relative;
    }

    .dashboard-nav a:hover {
      background-color: rgba(0,0,0,0.02);
      color: var(--primary-color, #f27a1a);
    }

    .dashboard-nav a.active {
      color: var(--primary-color, #f27a1a);
      border-bottom-color: var(--primary-color, #f27a1a);
      background-color: rgba(242, 122, 26, 0.05);
      font-weight: 500;
    }

    .dashboard-nav i {
      font-size: 18px;
    }

    .order-count {
      position: absolute;
      top: 8px;
      right: 5px;
      background-color: var(--primary-color, #f27a1a);
      color: white;
      border-radius: 50%;
      font-size: 12px;
      font-weight: bold;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dashboard-content {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      min-height: 400px;
    }

    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .dashboard-nav {
        flex-wrap: wrap;
      }

      .dashboard-nav a {
        padding: 12px 10px;
        font-size: 14px;
      }
    }
  `]
})
export class SellerDashboardComponent implements OnInit {
  currentUser: User | null = null;
  activeOrderCount: number = 0;

  constructor(
    private authService: AuthService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadActiveOrders();
      }
    });
  }

  loadActiveOrders(): void {
    this.orderService.getSellerOrders().subscribe({
      next: (orders) => {
        this.activeOrderCount = orders.filter(order =>
          order.status !== OrderStatus.DELIVERED &&
          order.status !== OrderStatus.CANCELLED
        ).length;
      },
      error: (err) => {
        console.error('Error loading seller orders:', err);
        this.activeOrderCount = 0;
      }
    });
  }
}
