package com.webapp.back_end.repository;

import com.webapp.back_end.model.ReturnRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {
    List<ReturnRequest> findByOrderItemOrderId(Long orderId);
    List<ReturnRequest> findByOrderItemOrderUserIdAndProcessed(Long userId, boolean processed);
    Optional<ReturnRequest> findByOrderItemOrderIdAndProcessed(Long orderId, boolean processed);
    boolean existsByOrderItemOrderIdAndProcessedFalse(Long orderId);
    boolean existsByOrderItemOrderId(Long orderId);
} 