package com.webapp.back_end.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.webapp.back_end.model.Cart;
import com.webapp.back_end.model.CartItem;
import com.webapp.back_end.model.Product;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    List<CartItem> findByCartId(Long cartId);
    Optional<CartItem> findByCartAndProduct(Cart cart, Product product);
    void deleteByCartId(Long cartId);
}