package com.webapp.back_end.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CheckoutSessionResponse {
    private String sessionId;
    private String url;

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getUrl() {
        return url;
    }
    
}