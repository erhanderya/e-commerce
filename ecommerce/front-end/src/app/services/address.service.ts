import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, catchError, retry, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Address, AddressRequest } from '../models/address.model';

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private baseUrl = environment.apiUrl + '/api/addresses';

  constructor(private http: HttpClient) { }

  getUserAddresses(): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.baseUrl}/user`).pipe(
      map(addresses => addresses.map(addr => this.normalizeAddress(addr)))
    );
  }

  getAddressById(id: number): Observable<Address> {
    return this.http.get<Address>(`${this.baseUrl}/${id}`).pipe(
      map(address => this.normalizeAddress(address))
    );
  }

  createAddress(addressRequest: AddressRequest): Observable<Address> {
    // Format the address for backend compatibility
    const backendAddress = {
      ...addressRequest,
      zipCode: addressRequest.postalCode  // Map postalCode to zipCode for backend
    };

    return this.http.post<Address>(`${this.baseUrl}`, backendAddress).pipe(
      map(response => this.normalizeAddress(response))
    );
  }

  updateAddress(id: number, addressRequest: AddressRequest): Observable<Address> {
    // Format the address for backend compatibility
    const backendAddress = {
      ...addressRequest,
      zipCode: addressRequest.postalCode  // Map postalCode to zipCode for backend
    };

    return this.http.put<Address>(`${this.baseUrl}/${id}`, backendAddress).pipe(
      map(response => this.normalizeAddress(response))
    );
  }

  deleteAddress(id: number): Observable<void> {
    if (!id) {
      return throwError(() => new Error('Address ID is required'));
    }
    
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      retry(1), // Retry once if there's a network issue
      catchError((error: HttpErrorResponse) => {
        // Specific handling for foreign key constraint errors
        const errorMessage = error.error?.message || error.message || JSON.stringify(error);
        
        if (errorMessage.includes('foreign key constraint fails') || 
            errorMessage.includes('CONSTRAINT') || 
            errorMessage.includes('FK')) {
          return throwError(() => new Error('This address cannot be deleted because it is used in one or more orders.'));
        }
        
        // For other errors, use the generic handler
        return this.handleError(error);
      })
    );
  }

  setDefaultAddress(id: number): Observable<Address> {
    return this.http.put<Address>(`${this.baseUrl}/${id}/default`, {}).pipe(
      map(response => this.normalizeAddress(response))
    );
  }

  // Helper method to ensure address objects have both postalCode and zipCode properties
  private normalizeAddress(address: any): Address {
    if (!address) return address;

    // Ensure both zipCode and postalCode properties exist
    return {
      ...address,
      postalCode: address.postalCode || address.zipCode || '',
      zipCode: address.zipCode || address.postalCode || ''
    };
  }

  // Error handler
  private handleError(error: HttpErrorResponse) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
