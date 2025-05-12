import { Component, OnInit, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { AlertService } from '../../services/alert.service';
import { OrderService } from '../../services/order.service';
import { Product } from '../../models/product.model';
import { Review } from '../../models/review.model';
import { User } from '../../models/user.model';
import { Order, OrderItem } from '../../models/order.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  @ViewChild('errorTemplate') errorTemplate!: TemplateRef<any>;

  product: Product | null = null;
  reviews: Review[] = [];
  isLoading: boolean = true;
  error: string | null = null;
  isLoggedIn: boolean = false;
  reviewForm: FormGroup;
  currentUserId: number | null = null;
  hasReviewed: boolean = false;
  userReview: Review | null = null;
  hasPurchasedProduct: boolean = false;
  checkingPurchaseStatus: boolean = false;
  activeTab: string = 'description';
  purchasedOrders: Order[] = [];
  loadingOrders: boolean = false;
  showReturnTab: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private reviewService: ReviewService,
    private authService: AuthService,
    private cartService: CartService,
    private alertService: AlertService,
    private orderService: OrderService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    // Initialize the form immediately
    this.reviewForm = this.createReviewForm();
  }

  // Create a separate method for form creation for better organization
  private createReviewForm(): FormGroup {
    return this.fb.group({
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    // Check login status first
    this.isLoggedIn = this.authService.isLoggedIn();
    this.currentUserId = this.authService.getCurrentUserId();

    // Get the product ID from the route
    this.route.paramMap.subscribe(params => {
      const productId = Number(params.get('id'));
      if (!productId) {
        this.error = 'Invalid product ID';
        this.isLoading = false;
        return;
      }

      this.loadProduct(productId);
      if (this.isLoggedIn) {
        this.loadOrdersWithProduct(productId);
      }
    });
  }

  loadProduct(productId: number): void {
    this.isLoading = true;

    this.productService.getProduct(productId).subscribe({
      next: (product) => {
        this.product = product;
        this.loadReviews(productId);

        // Check if user has purchased this product
        if (this.isLoggedIn && this.currentUserId) {
          this.checkingPurchaseStatus = true;
          this.orderService.hasUserPurchasedProduct(productId).subscribe({
            next: (hasPurchased) => {
              this.hasPurchasedProduct = hasPurchased;
              this.checkingPurchaseStatus = false;
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error checking purchase status:', err);
              this.hasPurchasedProduct = false;
              this.checkingPurchaseStatus = false;
              this.cdr.detectChanges();
            }
          });
        }
      },
      error: (err) => {
        this.error = err.message || 'Failed to load product';
        this.isLoading = false;
        this.alertService.error(err.message || 'Failed to load product details');
        this.cdr.detectChanges(); // Make sure changes are detected
      }
    });
  }

  loadReviews(productId: number): void {
    this.reviewService.getProductReviews(productId).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        this.isLoading = false;

        // Check if the current user has already reviewed this product
        if (this.isLoggedIn && this.currentUserId) {
          const existingReview = this.reviews.find(r => r.userId === this.currentUserId);
          if (existingReview) {
            this.hasReviewed = true;
            this.userReview = existingReview;

            // Update form with existing review data
            this.reviewForm.patchValue({
              rating: existingReview.rating,
              comment: existingReview.comment
            });
          }
        }

        // Manually trigger change detection after all updates
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading reviews:', err);
        this.isLoading = false;
        this.cdr.detectChanges(); // Make sure changes are detected
      }
    });
  }

  submitReview(): void {
    if (!this.isLoggedIn) {
      this.alertService.warn('Please log in to submit a review.');
      return;
    }

    if (!this.hasPurchasedProduct) {
      this.alertService.error('You can only review products you have purchased.');
      return;
    }

    if (this.reviewForm.invalid) {
      this.alertService.error('Please fill all required fields correctly.');
      return;
    }

    if (!this.product?.id) {
      this.alertService.error('Product information is missing.');
      return;
    }

    const reviewData: Review = {
      productId: this.product.id,
      userId: this.currentUserId as number,
      rating: this.reviewForm.value.rating,
      comment: this.reviewForm.value.comment
    };

    if (this.hasReviewed && this.userReview?.id) {
      // Update existing review
      reviewData.id = this.userReview.id;
      this.reviewService.updateReview(reviewData).subscribe({
        next: (updatedReview) => {
          this.alertService.success('Your review has been updated!');
          this.loadReviews(this.product?.id as number);
        },
        error: (err) => {
          this.alertService.error(err.message || 'Failed to update review');
        }
      });
    } else {
      // Add new review
      this.reviewService.addReview(reviewData).subscribe({
        next: (newReview) => {
          this.alertService.success('Your review has been submitted!');
          this.loadReviews(this.product?.id as number);
        },
        error: (err) => {
          // Check if this is the "not purchased" error
          if (err.error && err.error.error === 'Cannot review a product you haven\'t purchased') {
            this.alertService.error('You can only review products you have purchased.');
          } else {
            this.alertService.error(err.error?.error || 'Failed to submit review');
          }
        }
      });
    }
  }

  deleteReview(reviewId: number | undefined): void {
    if (!reviewId) {
      this.alertService.warn('Review ID is missing.');
      return;
    }

    if (!this.isLoggedIn) {
      this.alertService.error('You must be logged in to delete reviews.');
      return;
    }

    // Check authorization on client side first (to avoid unnecessary API calls)
    const reviewToDelete = this.reviews.find(r => r.id === reviewId);
    if (!reviewToDelete) {
      this.alertService.warn('Review not found.');
      return;
    }

    // Debug logs to see why user can't delete their own review
    console.log('Review user ID:', reviewToDelete.userId);
    console.log('Current user ID:', this.currentUserId);
    console.log('Are they equal?', reviewToDelete.userId === this.currentUserId);

    // Fix: Make sure we're comparing numbers, not strings
    const isAuthor = Number(reviewToDelete.userId) === Number(this.currentUserId);
    const isAdmin = this.isAdminUser();
    const isSeller = this.isProductSeller();

    console.log('Is author?', isAuthor);
    console.log('Is admin?', isAdmin);
    console.log('Is seller?', isSeller);

    if (!isAuthor && !isAdmin && !isSeller) {
      this.alertService.error('You do not have permission to delete this review. Only the review author, product seller, or admins can delete reviews.');
      return;
    }

    if (confirm('Are you sure you want to delete this review?')) {
      this.reviewService.deleteReview(reviewId).subscribe({
        next: () => {
          this.alertService.success('Review has been deleted successfully.');

          // Update the reviews list
          this.reviews = this.reviews.filter(r => r.id !== reviewId);

          // If it was user's own review, reset the form and review status
          if (isAuthor) {
            this.hasReviewed = false;
            this.userReview = null;
            this.reviewForm.reset({rating: 5, comment: ''});
          }

          // Reload the product to get updated average rating
          if (this.product?.id) {
            this.productService.getProduct(this.product.id).subscribe({
              next: (updatedProduct) => {
                this.product = updatedProduct;
                this.cdr.detectChanges();
              }
            });
          }
        },
        error: (err) => {
          console.error('Error deleting review:', err);
          // First check for specific known errors
          if (err.status === 403) {
            this.alertService.error('You do not have permission to delete this review.');
          } else if (err.status === 404) {
            this.alertService.error('The review could not be found. It may have been already deleted.');
          } else if (err.error && err.error.error) {
            // If there's a specific error message from the server
            this.alertService.error(err.error.error);
          } else {
            // Generic error message as fallback
            this.alertService.error('Failed to delete review. Please try again later.');
          }
        }
      });
    }
  }

  // Keep existing deleteReviewByUserId method for backward compatibility
  deleteReviewByUserId(userId: number): void {
    const reviewToDelete = this.reviews.find(review => review.userId === userId);

    if (!reviewToDelete?.id) {
      this.alertService.warn('Review not found for the specified user.');
      return;
    }

    this.deleteReview(reviewToDelete.id);
  }

  addToCart(): void {
    if (!this.isLoggedIn) {
      this.alertService.warn('Please log in to add items to your cart.');
      return;
    }

    if (!this.product) {
      this.alertService.error('Product information is missing.');
      return;
    }

    if (this.product.stock_quantity < 1) {
      this.alertService.error('This product is out of stock.');
      return;
    }

    this.cartService.addToCart(this.product, 1).subscribe({
      next: () => {
        this.alertService.success(`${this.product?.name} added to your cart.`);
      },
      error: (err) => {
        this.alertService.error(err.message || 'Failed to add product to cart.');
      }
    });
  }

  loadOrdersWithProduct(productId: number): void {
    this.loadingOrders = true;
    
    // Get user orders to check for returnable items
    this.orderService.getUserOrders().subscribe({
      next: (orders) => {
        this.purchasedOrders = orders.filter(order => {
          // Find orders with this product
          return order.items.some(item => item.product.id === productId);
        });
        
        // Show the return tab if there are orders with this product
        this.showReturnTab = this.purchasedOrders.length > 0;
        this.loadingOrders = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.loadingOrders = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Helper method to check if the current user is the seller of this product
  isProductSeller(): boolean {
    if (!this.isLoggedIn || !this.product || !this.product.seller || !this.currentUserId) {
      return false;
    }
    return this.product.seller.id === this.currentUserId;
  }

  // Helper method to check if user is admin
  isAdminUser(): boolean {
    return this.authService.isAdmin();
  }

  // Helper method for star ratings display
  createStarArray(rating: number | undefined): number[] {
    if (rating === undefined) {
      return Array(5).fill(0);
    }

    // Round to nearest 0.5 for half-star display
    const roundedRating = Math.round(rating * 2) / 2;
    const fullStars = Math.floor(roundedRating);
    const hasHalfStar = roundedRating % 1 !== 0;

    // Create array with 1s for filled stars and 0s for empty stars
    const stars = Array(5).fill(0);

    // Fill the full stars
    for (let i = 0; i < fullStars; i++) {
      stars[i] = 1;
    }

    // Add half star if needed
    if (hasHalfStar && fullStars < 5) {
      stars[fullStars] = 0.5;
    }

    return stars;
  }

  // Helper method to get all order items for the current product
  getOrderItemsForProduct(order: Order): OrderItem[] {
    if (!this.product || !order.items) return [];
    return order.items.filter(item => item.product.id === this.product?.id);
  }

  // Check if an item can be returned
  canReturnItem(item: OrderItem): boolean {
    return item && 
           item.status === 'DELIVERED' && 
           !item.hasReturnRequest;
  }
}
