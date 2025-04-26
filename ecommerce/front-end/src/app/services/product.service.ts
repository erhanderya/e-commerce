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
  
  private mockProducts: Product[] = [
    {
      id: 1,
      name: 'Mock Product 1',
      description: 'This is a mock product description.',
      price: 19.99,
      image_url: 'https://via.placeholder.com/150',
      stock_quantity: 100,
      category_id: 1
    },
    {
      id: 2,
      name: 'Mock Product 2',
      description: 'This is another mock product description.',
      price: 29.99,
      image_url: 'https://via.placeholder.com/150',
      stock_quantity: 50,
      category_id: 2
    }
  ];
  constructor(private http: HttpClient) { }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`).pipe(
      catchError(error => {
        console.error('Error fetching products from API:', error);
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
    const productData = {
      ...product,
      category_id: product.category_id ? Number(product.category_id) : null
    };
    return this.http.post<Product>(`${this.apiUrl}/products`, productData).pipe(
      catchError(this.handleError)
    );
  }

  updateProduct(product: Product): Observable<Product> {
    const productData = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity,
      category_id: product.category_id !== undefined ? Number(product.category_id) : null
    };

    return this.http.put<Product>(`${this.apiUrl}/products/${product.id}`, productData).pipe(
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