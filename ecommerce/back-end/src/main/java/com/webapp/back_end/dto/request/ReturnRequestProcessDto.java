package com.webapp.back_end.dto.request;

/**
 * Data Transfer Object for Processing Return Requests
 */
public class ReturnRequestProcessDto {
    private Boolean approved;
    private String notes;

    // Getters and Setters
    public Boolean getApproved() {
        return approved;
    }

    public void setApproved(Boolean approved) {
        this.approved = approved;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
} 