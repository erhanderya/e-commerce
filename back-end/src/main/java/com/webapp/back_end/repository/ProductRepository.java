package com.webapp.back_end.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.webapp.back_end.model.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByCategoryId(Long categoryId);
}