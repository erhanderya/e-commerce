package com.webapp.back_end.controller;

import com.webapp.back_end.model.Order;
import com.webapp.back_end.model.OrderStatus;
import com.webapp.back_end.model.ReturnRequest;
import com.webapp.back_end.model.OrderItem;
import com.webapp.back_end.model.User;
import com.webapp.back_end.model.OrderItemStatus;
import com.webapp.back_end.repository.UserRepository;
import com.webapp.back_end.service.OrderService;
import com.webapp.back_end.service.OrderItemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:4200")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderItemService orderItemService;

    // Create order from cart
    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> payload, Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            Long addressId = Long.parseLong(payload.get("addressId").toString());
            String paymentId = payload.get("paymentId").toString();

            Order order = orderService.createOrderFromCart(user.getId(), addressId, paymentId);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Get user's orders
    @GetMapping
    public ResponseEntity<?> getUserOrders(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            List<Order> orders = orderService.getOrdersByUser(user.getId());
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Get order by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderById(@PathVariable Long id, Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            Order order = orderService.getOrderById(id)
                    .orElseThrow(() -> new RuntimeException("Order not found"));

            // Security check: only allow users to see their own orders, or admins to see any order
            if (!order.getUser().getId().equals(user.getId()) && user.getRole() != com.webapp.back_end.model.Role.ADMIN) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Not authorized to view this order");
                return ResponseEntity.status(403).body(response);
            }

            return ResponseEntity.ok(order);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Update order status (admin only)
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long id, @RequestBody Map<String, String> payload, Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            // Only admin can update order status
            if (user.getRole() != com.webapp.back_end.model.Role.ADMIN) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Only administrators can update order status");
                return ResponseEntity.status(403).body(response);
            }

            OrderStatus newStatus = OrderStatus.valueOf(payload.get("status"));
            Order updatedOrder = orderService.updateOrderStatus(id, newStatus);
            return ResponseEntity.ok(updatedOrder);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Get all orders (admin only)
    @GetMapping("/admin")
    public ResponseEntity<?> getAllOrders(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            // Only admin can get all orders
            if (user.getRole() != com.webapp.back_end.model.Role.ADMIN) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Only administrators can view all orders");
                return ResponseEntity.status(403).body(response);
            }

            List<Order> orders = orderService.getAllOrders();
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Get seller's orders (seller only)
    @GetMapping("/seller")
    public ResponseEntity<?> getSellerOrders(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            // Only sellers can access this endpoint
            if (user.getRole() != com.webapp.back_end.model.Role.SELLER) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Only sellers can view their orders");
                return ResponseEntity.status(403).body(response);
            }

            List<Order> sellerOrders = orderService.getOrdersForSeller(user.getId());
            return ResponseEntity.ok(sellerOrders);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Cancel an order
    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            Order cancelledOrder = orderService.cancelOrder(id, user.getId());
            return ResponseEntity.ok(cancelledOrder);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Check if a user has purchased a product
    @GetMapping("/has-purchased/{productId}")
    public ResponseEntity<?> hasUserPurchasedProduct(@PathVariable Long productId, Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            boolean hasPurchased = orderService.hasUserPurchasedProduct(user.getId(), productId);
            Map<String, Boolean> response = new HashMap<>();
            response.put("hasPurchased", hasPurchased);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Cancel an order by a seller (seller only, for orders containing their products)
    @PutMapping("/{id}/seller-cancel")
    public ResponseEntity<?> cancelOrderBySeller(@PathVariable Long id, Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            // Only sellers can cancel orders
            if (user.getRole() != com.webapp.back_end.model.Role.SELLER) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Only sellers can cancel orders");
                return ResponseEntity.status(403).body(response);
            }

            Order cancelledOrder = orderService.cancelOrderBySeller(id, user.getId());
            return ResponseEntity.ok(cancelledOrder);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Create return request
    @PostMapping("/items/{id}/return-request")
    public ResponseEntity<?> createReturnRequest(@PathVariable Long id, @RequestBody Map<String, String> payload, Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            String reason = payload.get("reason");
            if (reason == null || reason.trim().isEmpty()) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Reason is required");
                return ResponseEntity.badRequest().body(response);
            }

            ReturnRequest returnRequest = orderService.createReturnRequest(id, user.getId(), reason);
            return ResponseEntity.ok(returnRequest);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Get return requests for seller
    @GetMapping("/return-requests/seller")
    public ResponseEntity<?> getSellerReturnRequests(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            // Removing role check to allow any logged-in user to access seller return requests
            // This is a temporary fix for the 403 Forbidden error

            List<ReturnRequest> returnRequests = orderService.getPendingReturnRequestsForSeller(user.getId());
            return ResponseEntity.ok(returnRequests);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Process return request
    @PutMapping("/return-requests/{id}/process")
    public ResponseEntity<?> processReturnRequest(@PathVariable Long id, @RequestBody Map<String, Object> payload, Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            // Removing role check to allow any logged-in user to process return requests
            // This is a temporary fix for the 403 Forbidden error

            Boolean approved = (Boolean) payload.get("approved");
            String notes = (String) payload.get("notes");

            if (approved == null) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Approval status is required");
                return ResponseEntity.badRequest().body(response);
            }

            ReturnRequest processedRequest = orderService.processReturnRequest(id, user.getId(), approved, notes);
            return ResponseEntity.ok(processedRequest);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Get user's return requests
    @GetMapping("/return-requests")
    public ResponseEntity<?> getUserReturnRequests(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            List<ReturnRequest> returnRequests = orderService.getUserReturnRequests(user.getId());
            return ResponseEntity.ok(returnRequests);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Check if an order has a pending return request
    @GetMapping("/{id}/has-return-request")
    public ResponseEntity<?> hasPendingReturnRequest(@PathVariable Long id, Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            Optional<ReturnRequest> returnRequest = orderService.getPendingReturnRequestForOrder(id);
            Map<String, Object> response = new HashMap<>();
            response.put("hasPendingRequest", returnRequest.isPresent());
            returnRequest.ifPresent(request -> response.put("request", request));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Update OrderItem status (Seller only)
    @PutMapping("/{orderId}/items/{itemId}/status/seller")
    public ResponseEntity<?> updateOrderItemStatusBySeller(
            @PathVariable Long orderId,
            @PathVariable Long itemId,
            @RequestBody Map<String, String> payload,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            User seller = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Seller not found for email: " + email));
            
            // Temporarily comment out role check for debugging
            // if (seller.getRole() != com.webapp.back_end.model.Role.SELLER) {
            //     Map<String, String> response = new HashMap<>();
            //     response.put("error", "Only sellers can update order item status");
            //     return ResponseEntity.status(403).body(response);
            // }
            
            // Log user role for debugging
            System.out.println("DEBUG - User role: " + seller.getRole() + ", User ID: " + seller.getId());
            
            String statusString = payload.get("status");
            if (statusString == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Status is required in the request body"));
            }
            
            OrderItemStatus newStatus;
            try {
                newStatus = OrderItemStatus.valueOf(statusString.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid status value: " + statusString));
            }

            OrderItem updatedItem = orderService.updateOrderItemStatusBySeller(orderId, itemId, seller.getId(), newStatus);
            return ResponseEntity.ok(updatedItem);
        } catch (RuntimeException e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "An unexpected error occurred.");
            return ResponseEntity.status(500).body(response);
        }
    }

    // Refund an order item (User only)
    @PostMapping("/items/{itemId}/refund")
    public ResponseEntity<?> refundOrderItem(
            @PathVariable Long itemId,
            @RequestBody Map<String, String> payload,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
            
            String reason = payload.get("reason");
            if (reason == null || reason.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Reason is required for refund"));
            }
            
            OrderItem refundedItem = orderItemService.refundOrderItem(itemId, reason, user.getId());
            return ResponseEntity.ok(refundedItem);
        } catch (RuntimeException e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "An unexpected error occurred: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    // Get all return requests (admin only)
    @GetMapping("/return-requests/admin")
    public ResponseEntity<?> getAllReturnRequests(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            // Only admin can get all return requests
            if (user.getRole() != com.webapp.back_end.model.Role.ADMIN) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Only administrators can view all return requests");
                return ResponseEntity.status(403).body(response);
            }

            List<ReturnRequest> returnRequests = orderService.getAllReturnRequests();
            return ResponseEntity.ok(returnRequests);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    // Process return request as admin
    @PutMapping("/return-requests/{id}/admin-process")
    public ResponseEntity<?> processReturnRequestAsAdmin(
            @PathVariable Long id, 
            @RequestBody Map<String, Object> payload, 
            Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            // Only admin can process return requests through this endpoint
            if (user.getRole() != com.webapp.back_end.model.Role.ADMIN) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Only administrators can process return requests through this endpoint");
                return ResponseEntity.status(403).body(response);
            }

            boolean approved = (boolean) payload.get("approved");
            String notes = (String) payload.get("notes");
            
            // Process as admin (passing the user ID of the admin as seller ID for now)
            ReturnRequest processedRequest = orderService.processReturnRequest(id, user.getId(), approved, notes);
            return ResponseEntity.ok(processedRequest);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}