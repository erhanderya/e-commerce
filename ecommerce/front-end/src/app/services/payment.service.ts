import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private baseUrl = environment.apiUrl + '/api/payments';

  constructor(private http: HttpClient) { }

  createPaymentIntent(amount: number, description: string, addressId: number): Observable<any> {
    const paymentRequest = {
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      description: description,
      addressId: addressId
    };
    return this.http.post<any>(`${this.baseUrl}/create-payment-intent`, paymentRequest);
  }

  createCheckoutSession(amount: number, description: string, addressId: number): Observable<any> {
    const sessionRequest = {
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      description: description,
      addressId: addressId,
      successUrl: `${window.location.origin}/payment-success?addressId=${addressId}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: window.location.origin + '/checkout'
    };
    return this.http.post<any>(`${this.baseUrl}/create-checkout-session`, sessionRequest);
  }
}
