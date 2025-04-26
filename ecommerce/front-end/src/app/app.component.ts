import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from './services/cart.service';
import { AuthService } from './services/auth.service';
import { User } from './models/user.model';
import { AlertService } from './services/alert.service'; // Import AlertService
import { AlertComponent } from './components/alert/alert.component'; // Import AlertComponent

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, FormsModule, AlertComponent], // Add AlertComponent here
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
    private router: Router,
    private alertService: AlertService // Inject AlertService
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
        // Use AlertService instead of alert()
        this.alertService.error('Your account has been banned. Please contact support.', false);
        this.authService.logout(); // Logout happens immediately after showing the alert
        // No need to navigate here, logout likely handles redirection or the guard will
      }
    }
  }

  logout(): void {
    const username = this.currentUser?.username; // Get username before logging out
    this.authService.logout();
    // Show success alert after logout
    this.alertService.success(`User ${username} logged out successfully.`);
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
