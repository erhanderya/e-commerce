-- Update the status column in order_items table to use OrderItemStatus instead of OrderStatus
ALTER TABLE order_items MODIFY COLUMN status VARCHAR(30);

-- Add new columns for refund tracking
ALTER TABLE order_items ADD COLUMN refunded BOOLEAN DEFAULT FALSE;
ALTER TABLE order_items ADD COLUMN refund_reason VARCHAR(255);
ALTER TABLE order_items ADD COLUMN refund_date TIMESTAMP; 