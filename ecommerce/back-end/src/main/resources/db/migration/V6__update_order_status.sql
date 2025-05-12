-- Update the 'status' column in the orders table to accept REFUNDED value
ALTER TABLE orders MODIFY COLUMN status VARCHAR(30);

-- Ensure has_return_request column is properly handled
ALTER TABLE orders MODIFY COLUMN has_return_request BOOLEAN NULL DEFAULT FALSE; 