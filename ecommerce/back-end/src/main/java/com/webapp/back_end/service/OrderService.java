package com.webapp.back_end.service;

import com.webapp.back_end.model.*;
import com.webapp.back_end.repository.OrderRepository;
import com.webapp.back_end.repository.ProductRepository;
import com.webapp.back_end.repository.AddressRepository;
import com.webapp.back_end.repository.ReturnRequestRepository;
import com.webapp.back_end.repository.OrderItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.model.checkout.Session;
import com.stripe.param.RefundCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.HashSet;
import java.util.Set;
import java.util.HashMap;
import java.util.Map;

@Service
public class OrderService {

    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private CartService cartService;
    
    @Autowired
    private AddressRepository addressRepository;
    
    @Autowired
    private PaymentService paymentService;
    
    @Autowired
    private ReturnRequestRepository returnRequestRepository;
    
    @Autowired
    private OrderItemRepository orderItemRepository;
    
    /**
     * Create a new order from user's cart
     */
    @Transactional
    public Order createOrderFromCart(Long userId, Long addressId, String paymentId) {
        // Get user's cart
        Cart cart = cartService.getUserCart(userId);
        
        if (cart.getCartItems().isEmpty()) {
            throw new RuntimeException("Cannot create order with empty cart");
        }
        
        // Find the shipping address
        Address shippingAddress = addressRepository.findById(addressId)
            .orElseThrow(() -> new RuntimeException("Shipping address not found"));
        
        // Create new order
        Order order = new Order();
        order.setUser(cart.getUser());
        order.setOrderDate(new Date());
        order.setStatus(OrderStatus.RECEIVED);
        order.setShippingAddress(shippingAddress);
        order.setPaymentId(paymentId);
        
        // Calculate total amount
        BigDecimal totalAmount = BigDecimal.valueOf(cart.getTotalPrice());
        order.setTotalAmount(totalAmount);
        
        // Create order items from cart items
        List<OrderItem> orderItems = new ArrayList<>();
        for (CartItem cartItem : cart.getCartItems()) {
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(cartItem.getProduct());
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setPrice(BigDecimal.valueOf(cartItem.getProduct().getPrice()));
            orderItem.setStatus(OrderItemStatus.PENDING);
            orderItems.add(orderItem);
            
            // Update product stock
            Product product = cartItem.getProduct();
            product.setStock_quantity(product.getStock_quantity() - cartItem.getQuantity());
            productRepository.save(product);
        }
        
        order.setItems(orderItems);
        
        // Save the order
        Order savedOrder = orderRepository.save(order);
        
        // Clear the cart after order is created
        cartService.clearCart(userId);
        
        return savedOrder;
    }
    
    /**
     * Get all orders for a user
     */
    public List<Order> getOrdersByUser(Long userId) {
        return orderRepository.findByUserIdOrderByOrderDateDesc(userId);
    }
    
    /**
     * Get an order by ID
     */
    public Optional<Order> getOrderById(Long orderId) {
        return orderRepository.findById(orderId);
    }
    
    /**
     * Update order status
     */
    @Transactional
    public Order updateOrderStatus(Long orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        
        order.setStatus(status);
        return orderRepository.save(order);
    }
    
    /**
     * Get all orders (for admin)
     */
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }
    
    /**
     * Get orders that contain products from a specific seller
     */
    public List<Order> getOrdersForSeller(Long sellerId) {
        return orderRepository.findOrdersContainingSellerProducts(sellerId);
    }
    
    /**
     * Extract a payment intent ID from a checkout session ID
     * @param sessionId The Stripe Checkout Session ID
     * @return The associated PaymentIntent ID or null if not found
     */
    private String getPaymentIntentFromSession(String sessionId) {
        try {
            // Clean the sessionId in case it has query parameters
            String cleanSessionId = sessionId;
            if (sessionId.contains("?")) {
                cleanSessionId = sessionId.substring(0, sessionId.indexOf("?"));
                logger.info("Cleaned session ID from '{}' to '{}'", sessionId, cleanSessionId);
            }
            
            Session session = Session.retrieve(cleanSessionId);
            String paymentIntentId = session.getPaymentIntent();
            
            if (paymentIntentId != null && !paymentIntentId.isEmpty()) {
                logger.info("Found payment intent '{}' from session '{}'", paymentIntentId, cleanSessionId);
                return paymentIntentId;
            } else {
                logger.warn("No payment intent found in session '{}'", cleanSessionId);
                return null;
            }
        } catch (StripeException e) {
            logger.error("Error retrieving session '{}': {}", sessionId, e.getMessage());
            return null;
        }
    }
    
    /**
     * Process refund for an order
     * @param order The order to refund
     * @return true if refund was successful, false otherwise
     */
    private boolean processRefund(Order order) {
        try {
            String paymentId = order.getPaymentId();
            if (paymentId == null || paymentId.isEmpty()) {
                logger.error("No payment ID found for order ID: {}", order.getId());
                throw new RuntimeException("No payment ID found for this order");
            }
            
            logger.info("Processing refund for order ID: {} with payment ID: {}", order.getId(), paymentId);
            
            // Determine if this is a checkout session ID or a payment intent ID
            String actualPaymentIntentId = paymentId;
            
            // If it starts with 'cs_', it's a checkout session
            if (paymentId.startsWith("cs_")) {
                logger.info("Detected checkout session ID '{}', retrieving associated payment intent", paymentId);
                String sessionPaymentIntentId = getPaymentIntentFromSession(paymentId);
                
                if (sessionPaymentIntentId != null) {
                    actualPaymentIntentId = sessionPaymentIntentId;
                    logger.info("Using payment intent '{}' from session for refund", actualPaymentIntentId);
                } else {
                    logger.error("Failed to retrieve payment intent from session '{}'", paymentId);
                    return false;
                }
            }
            
            // Create refund parameters
            Map<String, Object> refundParams = new HashMap<>();
            refundParams.put("payment_intent", actualPaymentIntentId);
            logger.info("Attempting to create refund with Stripe for PaymentIntent ID: {}", actualPaymentIntentId);
            
            // Create refund through Stripe
            Refund refund = Refund.create(refundParams);
            logger.info("Refund created with ID: {} and status: {}", refund.getId(), refund.getStatus());
            
            // Update order with refund information
            order.setRefundId(refund.getId());
            orderRepository.save(order);
            
            return "succeeded".equals(refund.getStatus());
        } catch (StripeException e) {
            logger.error("Failed to process refund for order ID: {}: {}", order.getId(), e.getMessage(), e);
            return false;
        } catch (Exception e) {
            logger.error("Unexpected error during refund processing for order ID: {}: {}", order.getId(), e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Cancel an order
     * Only orders in RECEIVED status can be cancelled
     */
    @Transactional
    public Order cancelOrder(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        
        // Check if the order belongs to the user
        if (!order.getUser().getId().equals(userId)) {
            logger.warn("User ID: {} attempted to cancel order ID: {} which they don't own", userId, orderId);
            throw new RuntimeException("This order does not belong to you");
        }
        
        // Check if the order can be cancelled 
        // Only orders that are RECEIVED (not yet delivered) can be cancelled
        if (order.getStatus() != OrderStatus.RECEIVED) {
            logger.warn("Cannot cancel order ID: {} with status: {}", orderId, order.getStatus());
            throw new RuntimeException("Cannot cancel order with status: " + order.getStatus());
        }
        
        // Update all order items to CANCELLED
        for (OrderItem item : order.getItems()) {
            item.setStatus(OrderItemStatus.CANCELLED);
        }
        
        // Update order status
        order.setStatus(OrderStatus.CANCELED);
        
        // If order was paid, issue refund
        if (order.getPaymentId() != null && !order.getPaymentId().isEmpty()) {
            boolean refundProcessed = processRefund(order);
            
            if (!refundProcessed) {
                logger.error("Failed to process refund for order ID: {}", orderId);
                throw new RuntimeException("Failed to process payment refund");
            }
        }
        
        // Restore product stock
        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            product.setStock_quantity(product.getStock_quantity() + item.getQuantity());
            productRepository.save(product);
        }
        
        return orderRepository.save(order);
    }

    /**
     * Check if a user has purchased a specific product
     * @param userId the user's ID
     * @param productId the product's ID
     * @return true if the user has purchased the product, false otherwise
     */
    public boolean hasUserPurchasedProduct(Long userId, Long productId) {
        return orderRepository.hasUserPurchasedProduct(userId, productId);
    }
    
    /**
     * Cancel an order by a seller
     * Only orders in RECEIVED status can be cancelled by a seller
     */
    @Transactional
    public Order cancelOrderBySeller(Long orderId, Long sellerId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        
        // Check if the order contains products from this seller
        boolean containsSellerProducts = order.getItems().stream()
            .anyMatch(item -> item.getProduct().getSeller().getId().equals(sellerId));
        
        if (!containsSellerProducts) {
            logger.warn("Seller ID: {} attempted to cancel order ID: {} which doesn't contain their products", sellerId, orderId);
            throw new RuntimeException("This order doesn't contain your products");
        }
        
        // Check if the order can be cancelled
        // Only orders that are RECEIVED (not yet delivered) can be cancelled by seller
        if (order.getStatus() != OrderStatus.RECEIVED) {
            logger.warn("Cannot cancel order ID: {} with status: {}", orderId, order.getStatus());
            throw new RuntimeException("Cannot cancel order with status: " + order.getStatus());
        }
        
        // Cancel only items from this seller
        for (OrderItem item : order.getItems()) {
            if (item.getProduct().getSeller().getId().equals(sellerId)) {
                item.setStatus(OrderItemStatus.CANCELLED);
                
                // Restore product stock
                Product product = item.getProduct();
                product.setStock_quantity(product.getStock_quantity() + item.getQuantity());
                productRepository.save(product);
            }
        }
        
        // If all items are cancelled, cancel the entire order
        boolean allItemsCancelled = order.getItems().stream()
            .allMatch(item -> item.getStatus() == OrderItemStatus.CANCELLED);
        
        if (allItemsCancelled) {
            order.setStatus(OrderStatus.CANCELED);
            
            // If order was paid, issue refund
            if (order.getPaymentId() != null && !order.getPaymentId().isEmpty()) {
                boolean refundProcessed = processRefund(order);
                
                if (!refundProcessed) {
                    logger.error("Failed to process refund for order ID: {}", orderId);
                    throw new RuntimeException("Failed to process payment refund");
                }
            }
        } else {
            // Otherwise, recalculate order total to exclude cancelled items
            BigDecimal newTotal = order.getItems().stream()
                .filter(item -> item.getStatus() != OrderItemStatus.CANCELLED)
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            order.setTotalAmount(newTotal);
            
            // Update order status based on item statuses
            order.updateOrderStatus();
        }
        
        return orderRepository.save(order);
    }

    /**
     * Create a return request for a delivered order
     */
    @Transactional
    public ReturnRequest createReturnRequest(Long orderItemId, Long userId, String reason) {
        OrderItem orderItem = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new RuntimeException("Order item not found"));

        Order order = orderItem.getOrder();
        
        if (!order.getUser().getId().equals(userId)) {
            throw new RuntimeException("You can only return your own orders");
        }

        if (orderItem.getStatus() != OrderItemStatus.DELIVERED) {
            throw new RuntimeException("Only delivered items can be returned");
        }

        // Check if there's already any return request for this item
        if (orderItem.getHasReturnRequest() != null && orderItem.getHasReturnRequest()) {
            throw new RuntimeException("You have already submitted a return request for this item");
        }

        ReturnRequest returnRequest = new ReturnRequest();
        returnRequest.setOrderItem(orderItem);
        returnRequest.setReason(reason);
        returnRequest.setRequestDate(new Date());
        returnRequest.setProcessed(false);
        returnRequest.setApproved(false);

        // Mark the item as having a return request
        orderItem.setHasReturnRequest(true);
        orderItemRepository.save(orderItem);
        
        // Also mark the order as having a return request
        order.setHasReturnRequest(true);
        orderRepository.save(order);

        return returnRequestRepository.save(returnRequest);
    }

    /**
     * Get all pending return requests for a seller
     */
    public List<ReturnRequest> getPendingReturnRequestsForSeller(Long sellerId) {
        // Get all orders that have items sold by this seller
        List<Order> sellerOrders = getOrdersForSeller(sellerId);
        
        // Filter orders that have pending return requests
        List<Long> orderIds = sellerOrders.stream()
                .filter(order -> order.getHasReturnRequest() != null && order.getHasReturnRequest())
                .map(Order::getId)
                .collect(Collectors.toList());
                
        if (orderIds.isEmpty()) {
            return new ArrayList<>();
        }
        
        // Get all pending return requests for these orders
        return orderIds.stream()
                .map(id -> returnRequestRepository.findByOrderItemOrderIdAndProcessed(id, false))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
    }

    /**
     * Process a return request
     */
    @Transactional
    public ReturnRequest processReturnRequest(Long requestId, Long sellerId, boolean approved, String notes) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Return request not found"));
        
        OrderItem orderItem = request.getOrderItem();
        Order order = orderItem.getOrder();
        
        // Verify the seller owns the product in this return request
        if (!orderItem.getProduct().getSeller().getId().equals(sellerId)) {
            logger.warn("Seller ID: {} attempted to process return request ID: {} which doesn't involve their product", 
                    sellerId, requestId);
            throw new RuntimeException("This return request doesn't involve your product");
        }
        
        // Update return request status
        if (approved) {
            request.setProcessed(true);
            request.setApproved(true);
            request.setProcessedDate(new Date());
            request.setProcessorNotes(notes);
            
            // Update order status to REFUNDED
            order.setStatus(OrderStatus.REFUNDED);
            
            // Update all order items to REFUNDED
            for (OrderItem item : order.getItems()) {
                // Only if the item was delivered (not already cancelled/refunded)
                if (item.getStatus() == OrderItemStatus.DELIVERED) {
                    item.setStatus(OrderItemStatus.REFUNDED);
                    item.setRefunded(true);
                    item.setRefundDate(new Date());
                    item.setRefundReason("Return approved: " + notes);
                    
                    // Restore product stock
                    Product product = item.getProduct();
                    product.setStock_quantity(product.getStock_quantity() + item.getQuantity());
                    productRepository.save(product);
                }
            }
            
            // Process refund if not already refunded
            if (order.getRefundId() == null || order.getRefundId().isEmpty()) {
                boolean refundProcessed = processRefund(order);
                
                if (!refundProcessed) {
                    logger.error("Failed to process refund for order ID: {} (return request ID: {})", 
                            order.getId(), requestId);
                    // Continue anyway, the seller has already approved the return
                    // Admin will need to manually process the refund
                    logger.warn("Return approved but payment refund failed - manual intervention required");
                    
                    // Add note about failed refund
                    String updatedNotes = notes + "\n[WARNING: Payment refund failed and needs manual processing]";
                    request.setProcessorNotes(updatedNotes);
                }
            }
        } else {
            // Request denied
            request.setProcessed(true);
            request.setApproved(false);
            request.setRejected(true);
            request.setProcessedDate(new Date());
            request.setProcessorNotes(notes);
            
            // Update the orderItem to show it has a rejected return request
            orderItem.setHasReturnRequest(true); // Keep this true to show there was a request
            orderItem.setStatus(OrderItemStatus.DELIVERED); // Ensure it stays as delivered
        }
        
        ReturnRequest savedRequest = returnRequestRepository.save(request);
        logger.info("Return request ID: {} processed by seller ID: {}, approved: {}", 
                requestId, sellerId, approved);
        
        return savedRequest;
    }

    /**
     * Get all return requests for a user
     */
    public List<ReturnRequest> getUserReturnRequests(Long userId) {
        return returnRequestRepository.findByOrderItemOrderUserIdAndProcessed(userId, true);
    }

    /**
     * Get pending return request for an order if it exists
     */
    public Optional<ReturnRequest> getPendingReturnRequestForOrder(Long orderId) {
        return returnRequestRepository.findByOrderItemOrderIdAndProcessed(orderId, false);
    }

    /**
     * Update an order item's status by a seller
     */
    @Transactional
    public OrderItem updateOrderItemStatusBySeller(Long orderId, Long orderItemId, Long sellerId, OrderItemStatus newStatus) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        
        OrderItem orderItem = orderItemRepository.findById(orderItemId)
            .orElseThrow(() -> new RuntimeException("Order item not found"));
        
        // Verify this item belongs to the specified order
        if (!orderItem.getOrder().getId().equals(orderId)) {
            logger.warn("Order item ID: {} does not belong to order ID: {}", orderItemId, orderId);
            throw new RuntimeException("This order item does not belong to the specified order");
        }
        
        // Verify the seller owns the product
        if (!orderItem.getProduct().getSeller().getId().equals(sellerId)) {
            logger.warn("Seller ID: {} attempted to update order item ID: {} which doesn't contain their product", 
                    sellerId, orderItemId);
            throw new RuntimeException("This order item doesn't contain your product");
        }
        
        // Validate status transition
        validateStatusTransition(orderItem.getStatus(), newStatus);
        
        // Update the order item status
        orderItem.setStatus(newStatus);
        orderItemRepository.save(orderItem);
        
        // Check if all items in order have the same status
        boolean allItemsSameStatus = true;
        OrderItemStatus firstItemStatus = null;
        
        for (OrderItem item : order.getItems()) {
            if (firstItemStatus == null) {
                firstItemStatus = item.getStatus();
            } else if (item.getStatus() != firstItemStatus) {
                allItemsSameStatus = false;
                break;
            }
        }
        
        // Update order status based on items
        order.updateOrderStatus();
        orderRepository.save(order);
        
        logger.info("Order item ID: {} status updated to: {} by seller ID: {}", 
                orderItemId, newStatus, sellerId);
        
        return orderItem;
    }

    /**
     * Process a partial refund for a specific order item
     * @param order The order containing the item to refund
     * @param amount The amount to refund
     * @param description Description for the refund
     * @return true if refund was successful, false otherwise
     */
    public boolean processPartialRefund(Order order, BigDecimal amount, String description) {
        try {
            String paymentId = order.getPaymentId();
            if (paymentId == null || paymentId.isEmpty()) {
                logger.error("No payment ID found for order ID: {}", order.getId());
                throw new RuntimeException("No payment ID found for this order");
            }
            
            logger.info("Processing partial refund of {} for order ID: {} with payment ID: {}", 
                    amount, order.getId(), paymentId);
            
            // Determine if this is a checkout session ID or a payment intent ID
            String actualPaymentIntentId = paymentId;
            
            // If it starts with 'cs_', it's a checkout session
            if (paymentId.startsWith("cs_")) {
                logger.info("Detected checkout session ID '{}', retrieving associated payment intent", paymentId);
                String sessionPaymentIntentId = getPaymentIntentFromSession(paymentId);
                
                if (sessionPaymentIntentId != null) {
                    actualPaymentIntentId = sessionPaymentIntentId;
                    logger.info("Using payment intent '{}' from session for refund", actualPaymentIntentId);
                } else {
                    logger.error("Failed to retrieve payment intent from session '{}'", paymentId);
                    return false;
                }
            }
            
            // Create refund parameters with simplified approach
            Map<String, Object> refundParams = new HashMap<>();
            refundParams.put("payment_intent", actualPaymentIntentId);
            refundParams.put("amount", amount.multiply(BigDecimal.valueOf(100)).longValue()); // Convert to cents
            refundParams.put("reason", "requested_by_customer");
            
            if (description != null && !description.isEmpty()) {
                refundParams.put("metadata", Map.of("description", description));
            }
            
            logger.info("Attempting to create partial refund with Stripe for PaymentIntent ID: {}, amount: {}", 
                    actualPaymentIntentId, amount);
            
            // Create refund through Stripe
            Refund refund = Refund.create(refundParams);
            logger.info("Partial refund created with ID: {} and status: {}", refund.getId(), refund.getStatus());
            
            return "succeeded".equals(refund.getStatus());
        } catch (StripeException e) {
            logger.error("Failed to process partial refund for order ID: {}: {}", order.getId(), e.getMessage(), e);
            return false;
        } catch (Exception e) {
            logger.error("Unexpected error during partial refund processing for order ID: {}: {}", 
                    order.getId(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * Save an order
     */
    @Transactional
    public Order saveOrder(Order order) {
        return orderRepository.save(order);
    }

    /**
     * Validate order item status transition
     * @param currentStatus The current status of the order item
     * @param newStatus The new status to set
     * @throws RuntimeException if the status transition is invalid
     */
    private void validateStatusTransition(OrderItemStatus currentStatus, OrderItemStatus newStatus) {
        if (currentStatus == null || newStatus == null) {
            throw new RuntimeException("Status cannot be null");
        }
        
        // Items in final states cannot be updated
        if (currentStatus == OrderItemStatus.DELIVERED || 
            currentStatus == OrderItemStatus.CANCELLED || 
            currentStatus == OrderItemStatus.REFUNDED || 
            currentStatus == OrderItemStatus.RETURNED) {
            throw new RuntimeException("Cannot update item with status: " + currentStatus);
        }
        
        // Prevent going back to earlier states
        if (newStatus == OrderItemStatus.PENDING) {
            throw new RuntimeException("Cannot revert to PENDING status");
        }
        
        // Specific rules for each status transition
        switch (currentStatus) {
            case PENDING:
                // From PENDING, can only go to PREPARING or CANCELLED
                if (newStatus != OrderItemStatus.PREPARING && newStatus != OrderItemStatus.CANCELLED) {
                    throw new RuntimeException("From PENDING, can only transition to PREPARING or CANCELLED");
                }
                break;
            case PREPARING:
                // From PREPARING, can only go to SHIPPED or CANCELLED
                if (newStatus != OrderItemStatus.SHIPPED && newStatus != OrderItemStatus.CANCELLED) {
                    throw new RuntimeException("From PREPARING, can only transition to SHIPPED or CANCELLED");
                }
                break;
            case SHIPPED:
                // From SHIPPED, can only go to DELIVERED or CANCELLED
                if (newStatus != OrderItemStatus.DELIVERED && newStatus != OrderItemStatus.CANCELLED) {
                    throw new RuntimeException("From SHIPPED, can only transition to DELIVERED or CANCELLED");
                }
                break;
            default:
                throw new RuntimeException("Unexpected status: " + currentStatus);
        }
    }

    /**
     * Get all return requests (admin only)
     */
    public List<ReturnRequest> getAllReturnRequests() {
        return returnRequestRepository.findAll();
    }
}