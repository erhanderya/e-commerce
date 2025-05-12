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
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED'
}

export interface OrderItem {
  id?: number;
  product: Product;
  quantity: number;
  price: number;
}

export interface ReturnRequest {
  id?: number;
  order?: Order;
  reason: string;
  requestDate: Date | string;
  processed: boolean;
  approved: boolean;
  processedDate?: Date | string;
  processorNotes?: string;
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
  refundId?: string;
  hasReturnRequest?: boolean;
  returnRequests?: ReturnRequest[];
}

export interface OrderStatusUpdate {
  status: OrderStatus;
}

export interface OrderCreationRequest {
  addressId: number;
  paymentId: string;
}

export interface ReturnRequestCreation {
  reason: string;
}

export interface ReturnRequestProcess {
  approved: boolean;
  notes?: string;
}
