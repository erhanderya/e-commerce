import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User, LoginRequest, RegisterRequest } from '../models/user.model';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/users';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isBrowser: boolean;
  
  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.loadUserFromStorage();
  }
  
  private loadUserFromStorage(): void {
    if (this.isBrowser) {
      const userJson = localStorage.getItem('currentUser');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          this.currentUserSubject.next(user);
        } catch (error) {
          console.error('Error parsing user from localStorage', error);
          localStorage.removeItem('currentUser');
        }
      }
    }
  }
  
  register(userData: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, userData).pipe(
      tap(user => {
        this.storeUserData(user);
      }),
      catchError(this.handleError)
    );
  }
  
  login(credentials: LoginRequest): Observable<User> {
    const loginData = {
      email: credentials.email.trim(),
      password: credentials.password
    };
    
    return this.http.post<User>(`${this.apiUrl}/login`, loginData).pipe(
      tap(user => {
        this.storeUserData(user);
      }),
      catchError(error => {
        console.error('Login error:', error);
        if (error.error && typeof error.error === 'string') {
          return throwError(() => ({ message: error.error }));
        }
        return throwError(() => ({ 
          message: error.error?.message || 'Login failed. Please check your credentials and try again.'
        }));
      })
    );
  }
  
  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
  }
  
  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}`).pipe(
      catchError(this.handleError)
    );
  }

  // User management methods
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/all`).pipe(
      catchError(this.handleError)
    );
  }

  updateUser(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user).pipe(
      catchError(this.handleError)
    );
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }
  
  private storeUserData(user: User): void {
    if (this.isBrowser) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
    this.currentUserSubject.next(user);
  }
  
  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }
  
  getToken(): string | null {
    return this.currentUserSubject.value?.token || null;
  }
  
  private handleError(error: any): Observable<never> {
    console.error('Auth service error', error);
    return throwError(() => error.error?.message || 'Something went wrong');
  }
}