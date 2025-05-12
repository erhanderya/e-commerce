import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getAuthToken();
    
    // Debug logs
    if (request.url.includes('admin') || request.url.includes('return-requests')) {
      console.log('AuthInterceptor: Processing request to admin or return-requests endpoint');
      console.log('AuthInterceptor: Token present:', !!token);
      console.log('AuthInterceptor: Request URL:', request.url);
    }
    
    if (token) {
      const authReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // For admin-related requests, log the full authorization header
      if (request.url.includes('admin')) {
        console.log('AuthInterceptor: Adding auth header:', `Bearer ${token.substring(0, 10)}...`);
        console.log('AuthInterceptor: Is admin?', this.authService.isAdmin());
      }
      
      return next.handle(authReq);
    }
    
    return next.handle(request);
  }
}