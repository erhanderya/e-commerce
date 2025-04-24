import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];
  selectedCategory: Category | null = null;
  originalProducts: Product[] = [];

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();

    // Subscribe to query parameter changes for search
    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.filterProducts(params['search']);
      } else {
        this.loadProducts();
      }
    });
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
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product);
  }
}