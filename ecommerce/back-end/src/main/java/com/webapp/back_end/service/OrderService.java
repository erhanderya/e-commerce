package com.webapp.back_end.service;

import com.webapp.back_end.model.*;
import com.webapp.back_end.repository.OrderRepository;
import com.webapp.back_end.repository.ProductRepository;
import com.webapp.back_end.repository.AddressRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.HashSet;
import java.util.Set;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private CartService cartService;
    
    @Autowired
    private AddressRepository addressRepository;
    
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
        order.setStatus(OrderStatus.PENDING);
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
}