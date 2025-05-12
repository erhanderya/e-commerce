package com.webapp.back_end.dto;

import com.webapp.back_end.model.OrderStatus;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

/**
 * Data Transfer Object for Order information
 */
public class OrderDto {
    private Long id;
    private Long userId;
    private Date orderDate;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private Long shippingAddressId;
    private List<OrderItemDto> items;
    private String paymentId;
    private String refundId;
    private Boolean hasReturnRequest;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Date getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(Date orderDate) {
        this.orderDate = orderDate;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Long getShippingAddressId() {
        return shippingAddressId;
    }

    public void setShippingAddressId(Long shippingAddressId) {
        this.shippingAddressId = shippingAddressId;
    }

    public List<OrderItemDto> getItems() {
        return items;
    }

    public void setItems(List<OrderItemDto> items) {
        this.items = items;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public String getRefundId() {
        return refundId;
    }

    public void setRefundId(String refundId) {
        this.refundId = refundId;
    }

    public Boolean getHasReturnRequest() {
        return hasReturnRequest;
    }

    public void setHasReturnRequest(Boolean hasReturnRequest) {
        this.hasReturnRequest = hasReturnRequest;
    }
} 