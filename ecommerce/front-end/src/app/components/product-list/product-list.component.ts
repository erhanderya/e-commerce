import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { Category } from '../../models/category.model';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { OrderTrackingComponent } from '../order-tracking/order-tracking.component';

interface Slide {
  imageUrl: string;
  title: string;
  description: string;
}

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
  
  // Simplified slider properties
  currentSlide = 0;
  slides: Slide[] = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=400&q=80',
      title: 'New Arrivals',
      description: 'Check out our latest products with amazing offers'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=400&q=80',
      title: 'Summer Collection',
      description: 'Discover our summer essentials with up to 30% off'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1607082350899-7e105aa886ae?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=400&q=80',
      title: 'Best Sellers',
      description: 'Shop our most popular products loved by customers'
    }
  ];
  sliderInterval: any = null;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
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
    
    // Start slider timer after all initialization is done
    setTimeout(() => {
      this.startSliderTimer();
    }, 500);
  }
  
  ngOnDestroy(): void {
    // Make sure to clear the interval on component destruction
    this.clearSliderTimer();
  }
  
  // Clear slider timer method
  clearSliderTimer(): void {
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
      this.sliderInterval = null;
    }
  }
  
  // Start slider timer method
  startSliderTimer(): void {
    this.clearSliderTimer();
    this.sliderInterval = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    }, 5000);
  }
  
  // Simplified navigation methods
  prevSlide(): void {
    this.clearSliderTimer();
    this.currentSlide = this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
    this.startSliderTimer();
  }
  
  nextSlide(): void {
    this.clearSliderTimer();
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    this.startSliderTimer();
  }
  
  goToSlide(index: number): void {
    this.clearSliderTimer();
    this.currentSlide = index;
    this.startSliderTimer();
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
}