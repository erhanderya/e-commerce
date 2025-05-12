package com.webapp.back_end.dto;

import java.util.Date;

/**
 * Data Transfer Object for ReturnRequest information
 */
public class ReturnRequestDto {
    private Long id;
    private Long orderItemId;
    private String reason;
    private Date requestDate;
    private Boolean processed;
    private Boolean approved;
    private Boolean rejected;
    private Date processedDate;
    private String processorNotes;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getOrderItemId() {
        return orderItemId;
    }

    public void setOrderItemId(Long orderItemId) {
        this.orderItemId = orderItemId;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Date getRequestDate() {
        return requestDate;
    }

    public void setRequestDate(Date requestDate) {
        this.requestDate = requestDate;
    }

    public Boolean getProcessed() {
        return processed;
    }

    public void setProcessed(Boolean processed) {
        this.processed = processed;
    }

    public Boolean getApproved() {
        return approved;
    }

    public void setApproved(Boolean approved) {
        this.approved = approved;
    }

    public Boolean getRejected() {
        return rejected;
    }

    public void setRejected(Boolean rejected) {
        this.rejected = rejected;
    }

    public Date getProcessedDate() {
        return processedDate;
    }

    public void setProcessedDate(Date processedDate) {
        this.processedDate = processedDate;
    }

    public String getProcessorNotes() {
        return processorNotes;
    }

    public void setProcessorNotes(String processorNotes) {
        this.processorNotes = processorNotes;
    }
} 