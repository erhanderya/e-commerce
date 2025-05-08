import { Routes } from '@angular/router';
import { AdminGuard } from './guards/admin.guard';
import { SellerGuard } from './guards/seller.guard';
import { AuthGuard } from './guards/auth.guard';
import { ProductListComponent } from './components/product-list/product-list.component';
import { CartComponent } from './components/cart/cart.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ProductDetailComponent } from './components/product-detail/product-detail.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { PaymentSuccessComponent } from './components/payment-success/payment-success.component';
import { ProfileComponent } from './components/profile/profile.component';
import { AddressComponent } from './components/profile/address.component';
import { OrdersComponent } from './components/profile/orders.component';
import { MyOrdersComponent } from './components/my-orders/my-orders.component';
import { OrderDetailComponent } from './components/order-detail/order-detail.component';

export const routes: Routes = [
  { path: '', component: ProductListComponent },
  { path: 'cart', component: CartComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'payment-success', component: PaymentSuccessComponent },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    children: [
      { path: '', component: ProfileComponent },
      { path: 'address', component: AddressComponent },
      { path: 'orders', component: OrdersComponent }
    ]
  },
  // Order routes
  {
    path: 'orders',
    component: MyOrdersComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'orders/:id',
    component: OrderDetailComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule),
    canActivate: [AdminGuard]
  },
  {
    path: 'seller',
    loadChildren: () => import('./features/seller/seller.module').then(m => m.SellerModule),
    canActivate: [SellerGuard]
  },
  { path: 'product/:id', component: ProductDetailComponent },
  { path: '**', redirectTo: '' }
];
