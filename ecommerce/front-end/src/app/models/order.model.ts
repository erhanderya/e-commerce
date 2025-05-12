import { Product } from './product.model';
import { Address } from './address.model';
import { User } from './user.model';

export enum OrderStatus {
  RECEIVED = 'RECEIVED',   // Order has been received but not yet delivered
  DELIVERED = 'DELIVERED', // Order has been delivered to the customer
  CANCELED = 'CANCELED',   // Order has been canceled
  REFUNDED = 'REFUNDED',   // Order has been refunded
  RETURNED = 'RETURNED'    // Order has been returned
}

export enum OrderItemStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  CANCELLED = 'CANCELED'
}

export interface OrderItem {
  id?: number;
  product: Product;
  quantity: number;
  price: number;
  status?: OrderItemStatus;
  hasReturnRequest?: boolean;
  returnRejected?: boolean;
  rejectionReason?: string;
  rejectionDate?: Date | string;
  returnRequests?: ReturnRequest[];
}

export interface ReturnRequest {
  id?: number;
  orderItem?: OrderItem;
  reason: string;
  requestDate: Date | string;
  processed: boolean;
  approved: boolean;
  rejected?: boolean;
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
  orderItemId: number;
}

export interface ReturnRequestProcess {
  approved: boolean;
  notes?: string;
}
