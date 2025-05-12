package com.webapp.back_end.repository;

import com.webapp.back_end.model.ReturnRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {
    List<ReturnRequest> findByOrderId(Long orderId);
    List<ReturnRequest> findByOrderUserIdAndProcessed(Long userId, boolean processed);
    Optional<ReturnRequest> findByOrderIdAndProcessed(Long orderId, boolean processed);
    boolean existsByOrderIdAndProcessedFalse(Long orderId);
    boolean existsByOrderId(Long orderId);
} 