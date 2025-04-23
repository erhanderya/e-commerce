import { ApplicationConfig, importProvidersFrom, PLATFORM_ID, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

import { routes } from './app.routes';

// Auth interceptor function with platform check
export function authInterceptor(req: any, next: any) {
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);
  
  // Only access localStorage in browser environment
  let token = null;
  if (isBrowser) {
    const user = localStorage.getItem('currentUser');
    if (user) {
      token = JSON.parse(user).token;
    }
  }
  
  // Add token to headers if available
  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }
  
  return next(req);
}

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
