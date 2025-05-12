package com.webapp.back_end.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Data;
import java.util.Date;

@Data
@Entity
@Table(name = "return_requests")
public class ReturnRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "order_id", nullable = false)
    @JsonBackReference
    private Order order;

    @Column(nullable = false)
    private String reason;

    @Column(nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date requestDate;

    @Column(name = "processed")
    private boolean processed;

    @Column(name = "approved")
    private boolean approved;

    @Column(name = "processed_date")
    @Temporal(TemporalType.TIMESTAMP)
    private Date processedDate;

    @Column(name = "processor_notes")
    private String processorNotes;
} 