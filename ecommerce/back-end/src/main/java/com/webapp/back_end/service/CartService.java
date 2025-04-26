package com.webapp.back_end.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.webapp.back_end.model.Cart;
import com.webapp.back_end.model.CartItem;
import com.webapp.back_end.model.Product;
import com.webapp.back_end.model.User;
import com.webapp.back_end.repository.CartItemRepository;
import com.webapp.back_end.repository.CartRepository;
import com.webapp.back_end.repository.ProductRepository;
import com.webapp.back_end.repository.UserRepository;

@Service
public class CartService {

    @Autowired
    private CartRepository cartRepository;
    
    @Autowired
    private CartItemRepository cartItemRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Gets or creates a cart for the user
     */
    public Cart getOrCreateCart(Long userId) {
        Optional<Cart> existingCart = cartRepository.findByUserId(userId);
        
        if (existingCart.isPresent()) {
            return existingCart.get();
        } else {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
            Cart newCart = new Cart();
            newCart.setUser(user);
            newCart.setCreatedAt(LocalDateTime.now());
            newCart.setUpdatedAt(LocalDateTime.now());
            
            return cartRepository.save(newCart);
        }
    }
    
    /**
     * Add product to user's cart
     */
    @Transactional
    public Cart addItemToCart(Long userId, Long productId, Integer quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero");
        }
        
        Cart cart = getOrCreateCart(userId);
        
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new RuntimeException("Product not found"));
            
        // Check if product is in stock
        if (product.getStock_quantity() < quantity) {
            throw new RuntimeException("Not enough stock available");
        }
            
        Optional<CartItem> existingItem = cartItemRepository.findByCartAndProduct(cart, product);
        
        if (existingItem.isPresent()) {
            // Update existing item
            CartItem item = existingItem.get();
            item.setQuantity(item.getQuantity() + quantity);
        } else {
            // Create new cart item
            CartItem newItem = new CartItem();
            newItem.setCart(cart);
            newItem.setProduct(product);
            newItem.setQuantity(quantity);
            newItem.setAddedAt(LocalDateTime.now());
            
            cart.getCartItems().add(newItem);
        }
        
        cart.setUpdatedAt(LocalDateTime.now());
        return cartRepository.save(cart);
    }
    
    /**
     * Update cart item quantity
     */
    @Transactional
    public Cart updateCartItemQuantity(Long userId, Long productId, Integer quantity) {
        if (quantity <= 0) {
            return removeItemFromCart(userId, productId);
        }
        
        Cart cart = getOrCreateCart(userId);
        
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new RuntimeException("Product not found"));
            
        Optional<CartItem> existingItem = cartItemRepository.findByCartAndProduct(cart, product);
        
        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            
            // Check if enough stock is available
            if (product.getStock_quantity() < quantity) {
                throw new RuntimeException("Not enough stock available");
            }
            
            item.setQuantity(quantity);
            cartItemRepository.save(item);
        } else {
            throw new RuntimeException("Item not found in cart");
        }
        
        cart.setUpdatedAt(LocalDateTime.now());
        return cartRepository.save(cart);
    }
    
    /**
     * Remove item from cart
     */
    @Transactional
    public Cart removeItemFromCart(Long userId, Long productId) {
        Cart cart = getOrCreateCart(userId);
        
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new RuntimeException("Product not found"));
            
        Optional<CartItem> existingItem = cartItemRepository.findByCartAndProduct(cart, product);
        
        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            cart.getCartItems().remove(item);
            cartItemRepository.delete(item);
        }
        
        cart.setUpdatedAt(LocalDateTime.now());
        return cartRepository.save(cart);
    }
    
    /**
     * Get user's cart
     */
    public Cart getUserCart(Long userId) {
        return cartRepository.findByUserId(userId)
            .orElseThrow(() -> new RuntimeException("Cart not found"));
    }
    
    /**
     * Clear all items from cart
     */
    @Transactional
    public Cart clearCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        
        // Remove all items from cart
        cart.getCartItems().clear();
        cartItemRepository.deleteByCartId(cart.getId());
        
        cart.setUpdatedAt(LocalDateTime.now());
        return cartRepository.save(cart);
    }
    
    /**
     * Get list of all cart items for a user
     */
    public List<CartItem> getCartItems(Long userId) {
        Cart cart = getOrCreateCart(userId);
        return cartItemRepository.findByCartId(cart.getId());
    }
}