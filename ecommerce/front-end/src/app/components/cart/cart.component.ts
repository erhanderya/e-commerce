import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../models/cart-item.model';
import { CartItemComponent } from '../cart-item/cart-item.component';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, CartItemComponent]
})
export class CartComponent implements OnInit {
  cartItems: CartItem[] = [];
  totalPrice: number = 0;

  constructor(private cartService: CartService) { }

  ngOnInit(): void {
    this.loadCartItems();
    console.log('Cart component initialized');
  }

  loadCartItems(): void {
    this.cartService.getCartItems().subscribe(items => {
      this.cartItems = items;
      this.totalPrice = this.cartService.getTotalPrice();
      console.log('Cart items loaded:', this.cartItems);
    });
  }

  removeFromCart(productId: number | undefined): void {
    if (productId !== undefined) {
      this.cartService.removeFromCart(productId);
      console.log('Product removed from cart:', productId);
    }
  }

  updateQuantity(productId: number | undefined, quantity: number): void {
    if (productId !== undefined) {
      if (quantity > 0) {
        this.cartService.updateQuantity(productId, quantity);
        console.log('Quantity updated:', productId, quantity);
      } else {
        this.removeFromCart(productId);
      }
    }
  }

  clearCart(): void {
    this.cartService.clearCart();
    console.log('Cart cleared');
  }
}
