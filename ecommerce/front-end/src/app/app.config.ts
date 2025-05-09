import { ApplicationConfig, importProvidersFrom, PLATFORM_ID, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors, withFetch, HttpInterceptorFn } from '@angular/common/http';
import { routes } from './app.routes';
import { AuthService } from './services/auth.service';

// Auth interceptor function using AuthService
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAuthToken();
  
  // Debug: Log the token and request information
  console.log(`Auth Interceptor URL: ${req.url}`);
  console.log(`Auth Interceptor Token present: ${!!token}`);
  
  // Add token to headers if available
  if (token) {
    // Log the first few characters of the token for debugging
    const tokenPreview = token.substring(0, Math.min(10, token.length)) + '...';
    console.log(`Auth Interceptor adding token: ${tokenPreview}`);
    
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    console.log('Added Authorization header to request:', authReq.headers.has('Authorization'));
    return next(authReq);
  } else {
    console.log('No token available - sending request without Authorization header');
  }
  
  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
  ]
};
