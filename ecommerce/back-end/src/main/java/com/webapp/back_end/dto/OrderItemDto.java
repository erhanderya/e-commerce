package com.webapp.back_end.dto;

import com.webapp.back_end.model.OrderItemStatus;
import java.math.BigDecimal;

/**
 * Data Transfer Object for OrderItem information
 */
public class OrderItemDto {
    private Long id;
    private Long productId;
    private String productName;
    private String productImage;
    private Integer quantity;
    private BigDecimal price;
    private OrderItemStatus status;
    private Long sellerId;
    private String sellerName;
    private Boolean hasReturnRequest;
    private Boolean returnRejected;
    private String rejectionReason;
    private String rejectionDate;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getProductImage() {
        return productImage;
    }

    public void setProductImage(String productImage) {
        this.productImage = productImage;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public OrderItemStatus getStatus() {
        return status;
    }

    public void setStatus(OrderItemStatus status) {
        this.status = status;
    }

    public Long getSellerId() {
        return sellerId;
    }

    public void setSellerId(Long sellerId) {
        this.sellerId = sellerId;
    }

    public String getSellerName() {
        return sellerName;
    }

    public void setSellerName(String sellerName) {
        this.sellerName = sellerName;
    }

    public Boolean getHasReturnRequest() {
        return hasReturnRequest;
    }

    public void setHasReturnRequest(Boolean hasReturnRequest) {
        this.hasReturnRequest = hasReturnRequest;
    }

    public Boolean getReturnRejected() {
        return returnRejected;
    }

    public void setReturnRejected(Boolean returnRejected) {
        this.returnRejected = returnRejected;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public String getRejectionDate() {
        return rejectionDate;
    }

    public void setRejectionDate(String rejectionDate) {
        this.rejectionDate = rejectionDate;
    }
} 