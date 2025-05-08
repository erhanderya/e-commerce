export interface Address {
  id?: number;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;  // For compatibility with order components
  postalCode: string; // For compatibility with checkout and address forms
  country: string;
  userId?: number;
  isDefault?: boolean;
}

export interface AddressRequest {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}
