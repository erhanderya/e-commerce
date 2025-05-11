import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../../services/product.service';
import { OrderService } from '../../../../services/order.service';
import { Product } from '../../../../models/product.model';
import { Order } from '../../../../models/order.model';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-seller-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="seller-stats">
      <h3>My Statistics</h3>

      <div *ngIf="loading" class="loading">
        Loading your statistics...
      </div>

      <div *ngIf="error" class="error-message">
        {{ error }}
      </div>

      <div *ngIf="!loading && !error" class="stats-container">
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon">📦</div>
            <div class="stat-value">{{ products.length }}</div>
            <div class="stat-label">Products</div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">🛒</div>
            <div class="stat-value">{{ totalSales }}</div>
            <div class="stat-label">Total Sales</div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-value">{{ totalEarnings | currency }}</div>
            <div class="stat-label">Total Earnings</div>
          </div>
        </div>

        <div class="chart-container">
          <canvas id="earningsChart"></canvas>
        </div>

        <div class="product-performance">
          <h4>Product Performance</h4>
          <table class="performance-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Sales</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let product of productPerformance">
                <td>{{ product.name }}</td>
                <td>{{ product.sales }}</td>
                <td>{{ product.revenue | currency }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .seller-stats {
      padding: 20px 0;
    }

    .loading, .error-message {
      text-align: center;
      padding: 20px;
    }

    .error-message {
      color: #e74c3c;
      background-color: #ffeaea;
      border-radius: 4px;
    }

    .stats-container {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    .stats-cards {
      display: flex;
      gap: 20px;
      justify-content: space-between;
    }

    .stat-card {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 20px;
      flex: 1;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-5px);
    }

    .stat-icon {
      font-size: 2rem;
      margin-bottom: 10px;
    }

    .stat-value {
      font-size: 1.8rem;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 1rem;
      color: #7f8c8d;
    }

    .chart-container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      height: 300px;
    }

    .product-performance {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .performance-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }

    .performance-table th, .performance-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    .performance-table th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
  `]
})
export class SellerStatsComponent implements OnInit {
  products: Product[] = [];
  orders: Order[] = [];
  loading = true;
  error: string | null = null;

  totalSales = 0;
  totalEarnings = 0;
  productPerformance: { id: number, name: string, sales: number, revenue: number }[] = [];

  constructor(
    private productService: ProductService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.error = null;

    // Load seller products
    this.productService.getSellerProducts().subscribe({
      next: (products) => {
        this.products = products;

        // After getting products, load orders
        this.loadOrders();
      },
      error: (err) => {
        this.error = err.message || 'Failed to load products';
        this.loading = false;
      }
    });
  }

  loadOrders(): void {
    this.orderService.getSellerOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.calculateStats();
        this.createEarningsChart();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load orders';
        this.loading = false;
      }
    });
  }

  calculateStats(): void {
    // Reset counters
    this.totalSales = 0;
    this.totalEarnings = 0;

    // Create a map for product performance
    const productMap = new Map<number, { id: number, name: string, sales: number, revenue: number }>();

    // Initialize product map with all products
    this.products.forEach(product => {
      productMap.set(product.id!, {
        id: product.id!,
        name: product.name,
        sales: 0,
        revenue: 0
      });
    });

    // Process orders
    this.orders.forEach(order => {
      order.items.forEach(item => {
        // Check if the item's product belongs to the seller
        const productId = item.product.id;
        if (productId !== undefined && productMap.has(productId)) {
          const productPerf = productMap.get(productId)!;

          // Update sales count
          productPerf.sales += item.quantity;

          // Update revenue
          const itemRevenue = item.price * item.quantity;
          productPerf.revenue += itemRevenue;

          // Update totals
          this.totalSales += item.quantity;
          this.totalEarnings += itemRevenue;

          productMap.set(productId, productPerf);
        }
      });
    });

    // Convert map to array and sort by revenue (highest first)
    this.productPerformance = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue);
  }

  createEarningsChart(): void {
    // Get last 6 months for the chart
    const months = this.getLast6Months();

    // Calculate monthly earnings
    const monthlyEarnings = this.calculateMonthlyEarnings(months);

    // Create the chart after the view is initialized
    setTimeout(() => {
      const ctx = document.getElementById('earningsChart') as HTMLCanvasElement;
      if (ctx) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: months.map(m => m.label),
            datasets: [{
              label: 'Monthly Earnings',
              data: monthlyEarnings,
              fill: true,
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
              tension: 0.3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Earnings ($)'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Month'
                }
              }
            }
          }
        });
      }
    }, 0);
  }

  getLast6Months(): Array<{ month: number, year: number, label: string }> {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();

      // Create a label like "Jan 2023"
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      months.push({ month, year, label });
    }

    return months;
  }

  calculateMonthlyEarnings(months: Array<{ month: number, year: number, label: string }>): number[] {
    // Initialize earnings array with zeros
    const earnings = Array(months.length).fill(0);

    // Process each order
    this.orders.forEach(order => {
      const orderDate = new Date(order.orderDate);
      const orderMonth = orderDate.getMonth();
      const orderYear = orderDate.getFullYear();

      // Find the index in our months array
      const monthIndex = months.findIndex(m => m.month === orderMonth && m.year === orderYear);

      if (monthIndex !== -1) {
        // Add up the earnings for this order
        order.items.forEach(item => {
          // Only count seller's own products
          const productId = item.product.id;
          if (productId !== undefined && this.products.some(p => p.id === productId)) {
            earnings[monthIndex] += item.price * item.quantity;
          }
        });
      }
    });

    return earnings;
  }
}
