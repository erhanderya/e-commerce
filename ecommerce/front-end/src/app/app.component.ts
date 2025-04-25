import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from './services/cart.service';
import { AuthService } from './services/auth.service';
import { User } from './models/user.model';
import { get } from 'http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'E-Commerce Store';
  cartItemCount = 0;
  currentUser: User | null = null;
  searchQuery: string = '';

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cartService.getCartItems().subscribe(items => {
      this.cartItemCount = this.cartService.getTotalItems();
    });

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    if (this.authService.isLoggedIn()) {
      if(this.currentUser?.banned) { 
        alert('Your account has been banned. Please contact support.');
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    }
  }

  logout(): void {
    this.authService.logout();
  }

  onSearch(): void {
    if (this.searchQuery === '') {
      this.router.navigate(['/']);
    }

    if (this.searchQuery.trim()) {
      this.router.navigate(['/'], { 
        queryParams: { search: this.searchQuery.trim() } 
      });
    }
  }
}
