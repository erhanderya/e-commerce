import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Product } from '../../../../models/product.model';
import { ProductService } from '../../../../services/product.service';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="product-management">
      <h2>Product Management</h2>
      
      <div class="product-form" *ngIf="editingProduct">
        <h3>{{ editingProduct.id ? 'Edit Product' : 'Create Product' }}</h3>
        <form [formGroup]="productForm" (ngSubmit)="saveProduct()">
          <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" formControlName="name">
          </div>
          
          <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" formControlName="description"></textarea>
          </div>
          
          <div class="form-group">
            <label for="price">Price</label>
            <input type="number" id="price" formControlName="price" step="0.01">
          </div>
          
          <div class="form-group">
            <label for="image_url">Image URL</label>
            <input type="text" id="image_url" formControlName="image_url">
          </div>
          
          <div class="form-group">
            <label for="stock_quantity">Stock Quantity</label>
            <input type="number" id="stock_quantity" formControlName="stock_quantity">
          </div>
          
          <div class="button-group">
            <button type="submit" [disabled]="productForm.invalid || isSaving">Save</button>
            <button type="button" (click)="cancelEdit()">Cancel</button>
          </div>
        </form>
      </div>

      <div class="product-list">
        <button class="add-button" (click)="createProduct()">Add New Product</button>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let product of products">
              <td>{{product.id}}</td>
              <td>{{product.name}}</td>
              <td>{{product.price | currency}}</td>
              <td>{{product.stock_quantity}}</td>
              <td>{{product.created_at | date:'medium'}}</td>
              <td>
                <button (click)="editProduct(product)">Edit</button>
                <button (click)="deleteProduct(product)" [disabled]="!product.id">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .product-management {
      width: 100%;
    }
    .product-form {
      background: white;
      padding: 20px;
      border-radius: 4px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .form-group {
      margin-bottom: 15px;
    }
    .form-group label {
      display: block;
      margin-bottom: 5px;
    }
    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .form-group textarea {
      height: 100px;
      resize: vertical;
    }
    .button-group {
      margin-top: 20px;
      display: flex;
      gap: 10px;
    }
    .add-button {
      margin-bottom: 20px;
      background-color: #28a745;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f8f9fa;
    }
    button {
      margin: 0 5px;
      padding: 5px 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    button:first-child {
      background-color: #007bff;
      color: white;
    }
    button:last-child {
      background-color: #dc3545;
      color: white;
    }
  `]
})
export class ProductManagementComponent implements OnInit {
  products: Product[] = [];
  editingProduct: Product | null = null;
  productForm: FormGroup;
  isSaving = false;

  constructor(
    private productService: ProductService,
    private fb: FormBuilder
  ) {
    this.productForm = this.createProductForm();
  }

  ngOnInit() {
    this.loadProducts();
  }

  private createProductForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      price: ['', [Validators.required, Validators.min(0)]],
      image_url: [''],
      stock_quantity: ['', [Validators.required, Validators.min(0)]]
    });
  }

  loadProducts() {
    this.productService.getProducts().subscribe(
      products => this.products = products
    );
  }

  createProduct() {
    this.editingProduct = {} as Product;
    this.productForm.reset();
  }

  editProduct(product: Product) {
    this.editingProduct = { ...product };
    this.productForm.patchValue({
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity
    });
  }

  cancelEdit() {
    this.editingProduct = null;
    this.productForm.reset();
  }

  saveProduct() {
    if (this.productForm.invalid || !this.editingProduct) return;
    
    this.isSaving = true;
    const productData = { ...this.editingProduct, ...this.productForm.value };
    
    const request = productData.id
      ? this.productService.updateProduct(productData)
      : this.productService.createProduct(productData);

    request.subscribe({
      next: () => {
        this.loadProducts();
        this.editingProduct = null;
        this.isSaving = false;
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }

  deleteProduct(product: Product) {
    if (!product.id) return;
    
    if (confirm('Are you sure you want to delete this product?')) {
      this.productService.deleteProduct(product.id).subscribe({
        next: () => {
          this.loadProducts();
        }
      });
    }
  }
}