package com.webapp.back_end.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

@Data
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date orderDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    @ManyToOne
    @JoinColumn(name = "shipping_address_id", nullable = false)
    private Address shippingAddress;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<OrderItem> items;

    private String paymentId;
    
    @Column(name = "refund_id")
    private String refundId;
    
    @Column(name = "has_return_request")
    private Boolean hasReturnRequest = false;

    /**
     * Updates the order status based on the least significant order item status.
     * The order status significance from lowest to highest:
     * RECEIVED -> DELIVERED -> CANCELED -> REFUNDED
     */
    public void updateOrderStatus() {
        if (items == null || items.isEmpty()) {
            return;
        }

        boolean hasReceivedItem = false;
        boolean hasDeliveredItem = false;
        boolean hasCanceledItem = false;
        boolean hasReturnedItem = false;

        for (OrderItem item : items) {
            if (item == null) continue;
            
            OrderItemStatus itemStatus = item.getStatus();
            if (itemStatus == null) continue;
            
            switch (itemStatus) {
                case PENDING:
                case PREPARING:
                case SHIPPED:
                    hasReceivedItem = true;
                    break;
                case DELIVERED:
                    hasDeliveredItem = true;
                    break;
                case CANCELLED:
                    hasCanceledItem = true;
                    break;
                case RETURNED:
                case RETURN_REQUESTED:
                case REFUNDED:
                    hasReturnedItem = true;
                    break;
            }
        }

        // Assign the least significant status
        if (hasReceivedItem) {
            this.status = OrderStatus.RECEIVED;
        } else if (hasDeliveredItem) {
            this.status = OrderStatus.DELIVERED;
        } else if (hasCanceledItem) {
            this.status = OrderStatus.CANCELED;
        } else if (hasReturnedItem) {
            this.status = OrderStatus.RETURNED;
        }
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public String getPaymentId() {
        return paymentId;
    }
    
    public void setRefundId(String refundId) {
        this.refundId = refundId;
    }

    public String getRefundId() {
        return refundId;
    }
    
    public Boolean getHasReturnRequest() {
        return hasReturnRequest;
    }

    public void setHasReturnRequest(Boolean hasReturnRequest) {
        this.hasReturnRequest = hasReturnRequest != null ? hasReturnRequest : false;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setOrderDate(Date orderDate) {
        this.orderDate = orderDate;
    }

    public Date getOrderDate() {
        return orderDate;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setShippingAddress(Address shippingAddress) {
        this.shippingAddress = shippingAddress;
    }

    public Address getShippingAddress() {
        return shippingAddress;
    }

    public void setItems(List<OrderItem> items) {
        this.items = items;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public User getUser() {
        return user;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getId() {
        return id;
    }
}