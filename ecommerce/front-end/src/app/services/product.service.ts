import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `http://localhost:8080/api`;
  
  // Keep the mock products for fallback
  private mockProducts: Product[] = [
    {
      id: 1,
      name: 'Laptop',
      description: 'High performance laptop',
      price: 999.99,
      image_url: 'https://picsum.photos/200/300',
      stock_quantity: 5,
      created_at: new Date()
    },
    {
      id: 2,
      name: 'Smartphone',
      description: 'Latest model smartphone',
      price: 699.99,
      image_url: 'https://picsum.photos/200/300',
      stock_quantity: 10,
      created_at: new Date()
    },
    {
      id: 3,
      name: 'Headphones',
      description: 'Wireless noise-canceling headphones',
      price: 199.99,
      image_url: 'https://picsum.photos/200/300',
      stock_quantity: 15,
      created_at: new Date()
    }
  ];

  constructor(private http: HttpClient) { }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`).pipe(
      catchError(error => {
        console.error('Error fetching products from API:', error);
        console.log('Falling back to mock data');
        return of(this.mockProducts);
      })
    );
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}`).pipe(
      catchError(error => {
        console.error(`Error fetching product with id ${id}:`, error);
        const product = this.mockProducts.find(p => p.id === id);
        return product ? of(product) : throwError(() => new Error('Product not found'));
      })
    );
  }

  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, product).pipe(
      catchError(this.handleError)
    );
  }

  updateProduct(product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/products/${product.id}`, product).pipe(
      catchError(this.handleError)
    );
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }

  getProductsByCategory(categoryId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products/category/${categoryId}`);
  }

  searchProducts(query: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products/search`, {
      params: { query }
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('Product service error:', error);
    return throwError(() => error.error?.message || 'Something went wrong');
  }
}