package com.webapp.back_end.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

@Data
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "order_id", nullable = false)
    @JsonBackReference
    private Order order;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderItemStatus status;
    
    @OneToMany(mappedBy = "orderItem", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<ReturnRequest> returnRequests;
    
    @Column(name = "has_return_request", nullable = true)
    private Boolean hasReturnRequest = false;
    
    @Column(name = "refunded", nullable = true)
    private Boolean refunded = false;
    
    @Column(name = "refund_date")
    @Temporal(TemporalType.TIMESTAMP)
    private Date refundDate;
    
    @Column(name = "refund_reason")
    private String refundReason;

    public void setId(Long id) {
        this.id = id;
    }

    public Long getId() {
        return id;
    }

    public void setOrder(Order order) {
        this.order = order;
    }

    public Order getOrder() {
        return order;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Product getProduct() {
        return product;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public OrderItemStatus getStatus() {
        return status;
    }

    public void setStatus(OrderItemStatus status) {
        this.status = status;
    }
    
    public List<ReturnRequest> getReturnRequests() {
        return returnRequests;
    }
    
    public void setReturnRequests(List<ReturnRequest> returnRequests) {
        this.returnRequests = returnRequests;
    }
    
    public Boolean getHasReturnRequest() {
        return hasReturnRequest;
    }
    
    public void setHasReturnRequest(Boolean hasReturnRequest) {
        this.hasReturnRequest = hasReturnRequest != null ? hasReturnRequest : false;
    }
    
    public Boolean getRefunded() {
        return refunded;
    }
    
    public void setRefunded(Boolean refunded) {
        this.refunded = refunded != null ? refunded : false;
    }
    
    public Date getRefundDate() {
        return refundDate;
    }
    
    public void setRefundDate(Date refundDate) {
        this.refundDate = refundDate;
    }
    
    public String getRefundReason() {
        return refundReason;
    }
    
    public void setRefundReason(String refundReason) {
        this.refundReason = refundReason;
    }
}