import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { ComparisonService } from '../../services/comparison.service';
import { Category } from '../../models/category.model';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { OrderTrackingComponent } from '../order-tracking/order-tracking.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, OrderTrackingComponent]
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  categories: Category[] = [];
  selectedCategory: Category | null = null;
  originalProducts: Product[] = [];
  isLoggedIn: boolean = false;
  hasActiveOrders: boolean = false;
  activeSortOption: string = 'newest';
  minPrice: number = 0;
  maxPrice: number = 1000;
  isPriceFilterActive: boolean = false;
  
  // Comparison mode
  compareMode: boolean = false;
  comparisonList: Product[] = [];
  private compareModeSubscription?: Subscription;
  private comparisonListSubscription?: Subscription;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private comparisonService: ComparisonService,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
    
    // Check if user is logged in
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
    });

    // Subscribe to query parameter changes for search
    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.filterProducts(params['search']);
      } else {
        this.loadProducts();
      }
    });
    
    // Subscribe to comparison mode changes
    this.compareModeSubscription = this.comparisonService.getCompareMode().subscribe(mode => {
      this.compareMode = mode;
    });
    
    // Subscribe to comparison list changes
    this.comparisonListSubscription = this.comparisonService.getComparisonList().subscribe(list => {
      this.comparisonList = list;
    });
  }
  
  ngOnDestroy(): void {
    if (this.compareModeSubscription) {
      this.compareModeSubscription.unsubscribe();
    }
    if (this.comparisonListSubscription) {
      this.comparisonListSubscription.unsubscribe();
    }
  }

  onActiveOrdersChange(hasActiveOrders: boolean): void {
    console.log('Product list: Active orders changed:', hasActiveOrders);
    this.hasActiveOrders = hasActiveOrders;
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.originalProducts = [...data];
        // Apply price filter if active
        if (this.isPriceFilterActive) {
          this.applyPriceFilter();
        } else {
          // Apply the active sorting if any
          this.applySorting(this.activeSortOption);
        }
      },
      error: (error) => {
        console.error('Error fetching products:', error);
      }
    });
  }

  selectCategory(category: Category | null, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    
    console.log('Selecting category:', category);
    this.selectedCategory = category;
    
    if (category) {
      console.log('Fetching products for category:', category.id);
      this.productService.getProductsByCategory(category.id).subscribe({
        next: (products) => {
          console.log('Products received:', products);
          this.products = products;
          this.originalProducts = [...products];
          // Apply price filter if active
          if (this.isPriceFilterActive) {
            this.applyPriceFilter();
          } else {
            // Apply the active sorting
            this.applySorting(this.activeSortOption);
          }
        },
        error: (error) => {
          console.error('Error loading products for category:', error);
          // Fallback to all products if there's an error
          this.loadProducts();
        }
      });
    } else {
      console.log('Loading all products');
      this.loadProducts();
    }
  }

  filterProducts(searchQuery: string): void {
    const query = searchQuery.toLowerCase();
    this.products = this.originalProducts.filter(product => 
      product.name.toLowerCase().includes(query) ||
      (product.description?.toLowerCase().includes(query) ?? false)
    );

    if (this.selectedCategory) {
      this.selectCategory(this.selectedCategory);
    }
    
    // Apply price filter if active
    if (this.isPriceFilterActive) {
      this.applyPriceFilter();
    } else {
      // Apply the active sorting
      this.applySorting(this.activeSortOption);
    }
  }

  applyPriceFilter(): void {
    this.isPriceFilterActive = true;
    
    // If max price is 0 or less than min price, reset it to a high value
    if (this.maxPrice <= 0 || this.maxPrice < this.minPrice) {
      this.maxPrice = 10000; // Set to a reasonably high value
    }
    
    // Filter products by price range
    this.products = this.originalProducts.filter(product => 
      product.price >= this.minPrice && product.price <= this.maxPrice
    );
    
    // Apply sorting to the filtered products
    this.applySorting(this.activeSortOption);
    
    // Show success message
    this.alertService.success(`Showing products between $${this.minPrice} and $${this.maxPrice}`);
  }

  sortProducts(sortOption: string): void {
    this.activeSortOption = sortOption;
    this.applySorting(sortOption);
  }

  private applySorting(sortOption: string): void {
    switch (sortOption) {
      case 'priceLowToHigh':
        this.products.sort((a, b) => a.price - b.price);
        break;
      case 'priceHighToLow':
        this.products.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        this.products.sort((a, b) => {
          const ratingA = a.averageRating || 0;
          const ratingB = b.averageRating || 0;
          return ratingB - ratingA;
        });
        break;
      case 'newest':
      default:
        // Reset to original product order when "Remove filter" is clicked
        this.products = [...this.originalProducts];
        // Re-apply price filter if active
        if (this.isPriceFilterActive) {
          this.products = this.products.filter(product => 
            product.price >= this.minPrice && product.price <= this.maxPrice
          );
        }
        break;
    }
  }

  addToCart(product: Product): void {
    if (!product || product.id === undefined) {
      console.error('Cannot add product without ID to cart:', product);
      // Use AlertService for error
      this.alertService.error('Could not add product to cart. Product information is missing.');
      return;
    }

    console.log('Attempting to add product to cart:', product);
    this.cartService.addToCart(product).subscribe({
      next: (cart) => {
        // Use AlertService for success
        this.alertService.success(`'${product.name}' added to cart successfully!`);
      },
      error: (error) => {
        console.error('Error adding product to cart:', error);
        // Use AlertService for error
        const message = error?.error?.message || error?.message || 'Please try again.';
        this.alertService.error(`Failed to add product to cart: ${message}`);
      }
    });
  }
  
  // Comparison methods
  toggleProductComparison(product: Product, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent navigation to product details
    }
    
    if (product.id === undefined) {
      this.alertService.error('Invalid product ID');
      return;
    }
    
    const isAdded = this.isInComparison(product.id);
    
    if (isAdded) {
      this.comparisonService.removeFromComparison(product.id);
      this.alertService.info(`Removed '${product.name}' from comparison`);
    } else {
      const success = this.comparisonService.addToComparison(product);
      if (success) {
        this.alertService.success(`Added '${product.name}' to comparison`);
      } else if (this.comparisonList.length >= 2) {
        this.alertService.warn('You can only compare 2 products at a time. Please remove one first.');
      }
    }
  }
  
  isInComparison(productId: number | undefined): boolean {
    if (productId === undefined) {
      return false;
    }
    return this.comparisonList.some(p => p.id === productId);
  }
  
  clearComparison(): void {
    this.comparisonService.clearComparison();
    this.alertService.info('Comparison list cleared');
  }
  
  exitCompareMode(): void {
    this.comparisonService.toggleCompareMode();
  }
}