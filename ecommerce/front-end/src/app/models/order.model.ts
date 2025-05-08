import { Product } from './product.model';
import { Address } from './address.model';
import { User } from './user.model';

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  IN_COUNTRY = 'IN_COUNTRY',
  IN_CITY = 'IN_CITY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface OrderItem {
  id?: number;
  product: Product;
  quantity: number;
  price: number;
}

export interface Order {
  id?: number;
  user?: User;
  orderDate: Date | string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: Address;
  items: OrderItem[];
  paymentId?: string;
}

export interface OrderStatusUpdate {
  status: OrderStatus;
}

export interface OrderCreationRequest {
  addressId: number;
  paymentId: string;
}
