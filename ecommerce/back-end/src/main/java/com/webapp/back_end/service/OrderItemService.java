package com.webapp.back_end.service;

import com.webapp.back_end.model.*;
import com.webapp.back_end.repository.OrderItemRepository;
import com.webapp.back_end.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Service
public class OrderItemService {

    private static final Logger logger = LoggerFactory.getLogger(OrderItemService.class);

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderService orderService;

    /**
     * Process a refund for a specific order item
     * @param orderItemId the ID of the order item to refund
     * @param reason the reason for the refund
     * @param userId the ID of the user requesting the refund (for validation)
     * @return the updated order item
     */
    @Transactional
    public OrderItem refundOrderItem(Long orderItemId, String reason, Long userId) {
        OrderItem orderItem = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new RuntimeException("Order item not found"));

        // Validate the user owns the order
        if (!orderItem.getOrder().getUser().getId().equals(userId)) {
            logger.warn("User ID: {} attempted to refund order item ID: {} which they don't own", userId, orderItemId);
            throw new RuntimeException("You don't have permission to refund this order item");
        }

        // Check if the order item is already refunded
        if (orderItem.getRefunded() != null && orderItem.getRefunded()) {
            logger.warn("Order item ID: {} has already been refunded", orderItemId);
            throw new RuntimeException("This order item has already been refunded");
        }

        // Check if the order item can be refunded (only DELIVERED items can be refunded)
        if (orderItem.getStatus() != OrderItemStatus.DELIVERED) {
            logger.warn("Cannot refund order item ID: {} with status: {}", orderItemId, orderItem.getStatus());
            throw new RuntimeException("Cannot refund order item with status: " + orderItem.getStatus());
        }

        // Set the refund information
        orderItem.setRefunded(true);
        orderItem.setRefundReason(reason);
        orderItem.setRefundDate(new Date());
        orderItem.setStatus(OrderItemStatus.REFUNDED);

        // Restore product quantity
        Product product = orderItem.getProduct();
        product.setStock_quantity(product.getStock_quantity() + orderItem.getQuantity());
        productRepository.save(product);

        // Process the payment refund through Stripe for this specific item
        boolean refundProcessed = orderService.processPartialRefund(
                orderItem.getOrder(),
                orderItem.getPrice(),
                "Refund for item: " + product.getName()
        );

        if (!refundProcessed) {
            logger.error("Failed to process refund for order item ID: {}", orderItemId);
            throw new RuntimeException("Failed to process payment refund");
        }

        OrderItem savedItem = orderItemRepository.save(orderItem);
        
        // Update the order status based on all order items
        Order order = orderItem.getOrder();
        order.updateOrderStatus();
        // Note: Order is already being saved within processPartialRefund
        
        logger.info("Order item ID: {} successfully refunded", orderItemId);
        return savedItem;
    }

    /**
     * Process a return request for a specific order item
     * @param orderItemId the ID of the order item
     * @param status the new status to set
     * @param sellerId the ID of the seller (for validation)
     * @return the updated order item
     */
    @Transactional
    public OrderItem updateOrderItemStatus(Long orderItemId, OrderItemStatus status, Long sellerId) {
        OrderItem orderItem = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new RuntimeException("Order item not found"));

        // Validate the seller owns the product
        if (!orderItem.getProduct().getSeller().getId().equals(sellerId)) {
            logger.warn("Seller ID: {} attempted to update order item ID: {} which doesn't contain their product", sellerId, orderItemId);
            throw new RuntimeException("This order item doesn't contain your product");
        }

        // Set the new status
        orderItem.setStatus(status);

        // If status is set to REFUNDED, handle the refund process
        if (status == OrderItemStatus.REFUNDED && (orderItem.getRefunded() == null || !orderItem.getRefunded())) {
            orderItem.setRefunded(true);
            orderItem.setRefundDate(new Date());
            orderItem.setRefundReason("Approved by seller: " + sellerId);

            // Restore product quantity
            Product product = orderItem.getProduct();
            product.setStock_quantity(product.getStock_quantity() + orderItem.getQuantity());
            productRepository.save(product);

            // Process the payment refund through Stripe for this specific item
            boolean refundProcessed = orderService.processPartialRefund(
                    orderItem.getOrder(),
                    orderItem.getPrice(),
                    "Refund for item: " + product.getName() + " approved by seller"
            );

            if (!refundProcessed) {
                logger.error("Failed to process refund for order item ID: {}", orderItemId);
                throw new RuntimeException("Failed to process payment refund");
            }
        }

        OrderItem savedItem = orderItemRepository.save(orderItem);
        
        // Update the order status based on all order items
        Order order = orderItem.getOrder();
        order.updateOrderStatus();
        orderService.saveOrder(order);
        
        logger.info("Order item ID: {} status updated to: {}", orderItemId, status);
        return savedItem;
    }

    /**
     * Get all order items for a specific order
     * @param orderId the ID of the order
     * @return a list of order items
     */
    public List<OrderItem> getOrderItemsByOrderId(Long orderId) {
        return orderItemRepository.findByOrderId(orderId);
    }

    /**
     * Get all refunded order items for a specific order
     * @param orderId the ID of the order
     * @return a list of refunded order items
     */
    public List<OrderItem> getRefundedOrderItems(Long orderId) {
        return orderItemRepository.findByOrderIdAndRefundedTrue(orderId);
    }
} 