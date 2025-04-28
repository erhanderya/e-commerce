package com.webapp.back_end.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // Ensure transactional is imported

import com.webapp.back_end.model.Product;
import com.webapp.back_end.model.User; // Import User
import com.webapp.back_end.repository.ProductRepository;
import com.webapp.back_end.repository.UserRepository; // Import UserRepository

@Service
public class ProductService {
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private CategoryService categoryService;

    @Autowired
    private UserRepository userRepository; // Inject UserRepository
    
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }
    
    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id);
    }
    
    @Transactional // Add transactional annotation
    public Product createProduct(Product product, User seller) { // Accept seller User object
        // Set the seller
        product.setSeller(seller);

        // Handle category
        if (product.getCategory_id() != null) {
            categoryService.getCategoryById(product.getCategory_id())
                .ifPresent(product::setCategory);
        }
        return productRepository.save(product);
    }
    
    @Transactional // Add transactional annotation
    public void deleteProduct(Long id, User seller) { // Accept seller for authorization check
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Product not found"));
        // Authorization check: Only the seller or an admin can delete
        if (!product.getSeller().getId().equals(seller.getId()) && seller.getRole() != com.webapp.back_end.model.Role.ADMIN) {
             throw new RuntimeException("User not authorized to delete this product");
        }
        productRepository.deleteById(id);
    }

    public List<Product> getProductsByCategory(Long categoryId) {
        return productRepository.findByCategoryId(categoryId);
    }

    @Transactional // Add transactional annotation
    public Product updateProduct(Long id, Product productDetails, User seller) { // Accept seller User object
        Product existingProduct = productRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Product not found"));

        // Authorization check: Only the seller or an admin can update
        if (!existingProduct.getSeller().getId().equals(seller.getId()) && seller.getRole() != com.webapp.back_end.model.Role.ADMIN) {
             throw new RuntimeException("User not authorized to update this product");
        }

        existingProduct.setName(productDetails.getName());
        existingProduct.setDescription(productDetails.getDescription());
        existingProduct.setPrice(productDetails.getPrice());
        existingProduct.setImage_url(productDetails.getImage_url());
        existingProduct.setStock_quantity(productDetails.getStock_quantity());
        
        // Handle category update
        if (productDetails.getCategory_id() != null) {
            categoryService.getCategoryById(productDetails.getCategory_id())
                .ifPresent(existingProduct::setCategory);
        } else {
            existingProduct.setCategory(null);
        }
        
        // Seller cannot be changed during update in this logic
        // existingProduct.setSeller(seller); 
        
        return productRepository.save(existingProduct);
    }
}