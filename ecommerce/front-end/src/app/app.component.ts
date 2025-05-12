import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';
import { ComparisonService } from './services/comparison.service';
import { AlertComponent } from './components/alert/alert.component';
import { User } from './models/user.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    FormsModule, 
    HttpClientModule, 
    AlertComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'E-Commerce Store';
  searchQuery = '';
  currentUser: User | null = null;
  cartItemCount = 0;
  showUserDropdown = false;
  compareMode = false;
  private userSubscription?: Subscription;
  private cartSubscription?: Subscription;
  private compareModeSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private comparisonService: ComparisonService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.cartSubscription = this.cartService.getCartItems().subscribe(items => {
      this.cartItemCount = items.reduce((count, item) => count + item.quantity, 0);
    });
    
    this.compareModeSubscription = this.comparisonService.getCompareMode().subscribe(mode => {
      this.compareMode = mode;
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
    if (this.compareModeSubscription) {
      this.compareModeSubscription.unsubscribe();
    }
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/'], {
        queryParams: { search: this.searchQuery.trim() }
      });
    }
  }

  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    this.showUserDropdown = !this.showUserDropdown;
  }
  
  toggleCompareMode(): void {
    this.comparisonService.toggleCompareMode();
    
    // Navigate to product list page if not already there
    if (this.compareMode) {
      this.router.navigate(['/']);
    }
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.showUserDropdown = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'ADMIN';
  }

  isSeller(): boolean {
    return this.currentUser?.role === 'SELLER';
  }
}
