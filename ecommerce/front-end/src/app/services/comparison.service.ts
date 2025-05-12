import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ComparisonService {
  private compareMode = new BehaviorSubject<boolean>(false);
  private compareList = new BehaviorSubject<Product[]>([]);
  
  constructor() {}

  // Toggle compare mode
  toggleCompareMode(): void {
    this.compareMode.next(!this.compareMode.value);
    
    // Clear comparison list when exiting compare mode
    if (!this.compareMode.value) {
      this.clearComparison();
    }
  }
  
  // Get compare mode as observable
  getCompareMode(): Observable<boolean> {
    return this.compareMode.asObservable();
  }

  // Add product to comparison
  addToComparison(product: Product): boolean {
    const currentList = this.compareList.value;
    
    // Check if product already exists in comparison
    if (currentList.find(p => p.id === product.id)) {
      return false;
    }
    
    // Only allow up to 2 products to be compared
    if (currentList.length >= 2) {
      return false;
    }
    
    this.compareList.next([...currentList, product]);
    return true;
  }
  
  // Remove product from comparison
  removeFromComparison(productId: number): void {
    const currentList = this.compareList.value;
    this.compareList.next(currentList.filter(p => p.id !== productId));
  }
  
  // Get comparison list as observable
  getComparisonList(): Observable<Product[]> {
    return this.compareList.asObservable();
  }
  
  // Clear comparison list
  clearComparison(): void {
    this.compareList.next([]);
  }
  
  // Check if comparison is ready (has 2 products)
  isComparisonReady(): boolean {
    return this.compareList.value.length === 2;
  }
} 