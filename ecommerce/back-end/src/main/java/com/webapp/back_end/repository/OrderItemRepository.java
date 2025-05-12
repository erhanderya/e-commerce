package com.webapp.back_end.repository;

import com.webapp.back_end.model.OrderItem;
import com.webapp.back_end.model.OrderItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    // Find all order items for a specific order
    List<OrderItem> findByOrderId(Long orderId);
    
    // Find all refunded order items for a specific order
    List<OrderItem> findByOrderIdAndRefundedTrue(Long orderId);
    
    // Find all order items with a specific status for a specific order
    List<OrderItem> findByOrderIdAndStatus(Long orderId, OrderItemStatus status);
    
    // Find all order items for a specific product
    List<OrderItem> findByProductId(Long productId);
    
    // Find all order items for a specific seller
    @Query("SELECT oi FROM OrderItem oi JOIN oi.product p WHERE p.seller.id = :sellerId")
    List<OrderItem> findBySellerId(@Param("sellerId") Long sellerId);
} 