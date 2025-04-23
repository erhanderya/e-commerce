package com.webapp.back_end.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.webapp.back_end.model.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {
}