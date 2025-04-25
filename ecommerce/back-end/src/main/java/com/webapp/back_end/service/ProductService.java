package com.webapp.back_end.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.webapp.back_end.model.Product;
import com.webapp.back_end.repository.ProductRepository;

@Service
public class ProductService {
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private CategoryService categoryService;
    
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }
    
    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id);
    }
    
    public Product createProduct(Product product) {
        if (product.getCategory_id() != null) {
            categoryService.getCategoryById(product.getCategory_id())
                .ifPresent(product::setCategory);
        }
        return productRepository.save(product);
    }
    
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

    public List<Product> getProductsByCategory(Long categoryId) {
        return productRepository.findByCategoryId(categoryId);
    }

    public Product updateProduct(Long id, Product product) {
        return productRepository.findById(id).map(existingProduct -> {
            existingProduct.setName(product.getName());
            existingProduct.setDescription(product.getDescription());
            existingProduct.setPrice(product.getPrice());
            existingProduct.setImage_url(product.getImage_url());
            existingProduct.setStock_quantity(product.getStock_quantity());
            
            // Handle category update
            if (product.getCategory_id() != null) {
                categoryService.getCategoryById(product.getCategory_id())
                    .ifPresent(existingProduct::setCategory);
            } else {
                existingProduct.setCategory(null);
            }
            
            return productRepository.save(existingProduct);
        }).orElse(null);
    }
}