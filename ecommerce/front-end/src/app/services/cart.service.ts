import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CartItem } from '../models/cart-item.model';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartSubject = new BehaviorSubject<CartItem[]>([]);

  constructor() { }

  getCartItems(): Observable<CartItem[]> {
    return this.cartSubject.asObservable();
  }

  addToCart(product: Product): void {
    const existingCartItem = this.cartItems.find(item => item.product.id === product.id);

    if (existingCartItem) {
      existingCartItem.quantity++;
    } else {
      this.cartItems.push({ product, quantity: 1 });
    }

    this.cartSubject.next([...this.cartItems]);
  }

  removeFromCart(productId: number): void {
    this.cartItems = this.cartItems.filter(item => item.product.id !== productId);
    this.cartSubject.next([...this.cartItems]);
  }

  updateQuantity(productId: number, quantity: number): void {
    const item = this.cartItems.find(item => item.product.id === productId);
    if (item) {
      item.quantity = quantity;
      this.cartSubject.next([...this.cartItems]);
    }
  }

  clearCart(): void {
    this.cartItems = [];
    this.cartSubject.next([]);
  }

  getTotalPrice(): number {
    return this.cartItems.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  }

  getTotalItems(): number {
    return this.cartItems.reduce((total, item) => {
      return total + item.quantity;
    }, 0);
  }
} 