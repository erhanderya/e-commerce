package com.webapp.back_end.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.webapp.back_end.model.Address;
import com.webapp.back_end.model.User;
import com.webapp.back_end.model.ErrorResponse;
import com.webapp.back_end.service.AddressService;
import com.webapp.back_end.repository.UserRepository;
import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/addresses")
@CrossOrigin(origins = "http://localhost:4200")
public class AddressController {

    private final AddressService addressService;
    private final UserRepository userRepository;

    @Autowired
    public AddressController(AddressService addressService, UserRepository userRepository) {
        this.addressService = addressService;
        this.userRepository = userRepository;
    }

    @GetMapping("/user")
    public ResponseEntity<?> getUserAddresses(Authentication authentication) {
        try {
            User user = getUserFromAuthentication(authentication);
            List<Address> addresses = addressService.getUserAddresses(user);
            return ResponseEntity.ok(addresses);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAddress(@PathVariable Long id, Authentication authentication) {
        try {
            User user = getUserFromAuthentication(authentication);
            Address address = addressService.getAddressById(id, user);
            return ResponseEntity.ok(address);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createAddress(@Valid @RequestBody Address address, Authentication authentication) {
        try {
            User user = getUserFromAuthentication(authentication);
            Address createdAddress = addressService.createAddress(address, user);
            return ResponseEntity.ok(createdAddress);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAddress(@PathVariable Long id, @Valid @RequestBody Address addressDetails, Authentication authentication) {
        try {
            User user = getUserFromAuthentication(authentication);
            Address updatedAddress = addressService.updateAddress(id, addressDetails, user);
            return ResponseEntity.ok(updatedAddress);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAddress(@PathVariable Long id, Authentication authentication) {
        try {
            User user = getUserFromAuthentication(authentication);
            addressService.deleteAddress(id, user);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    @PutMapping("/{id}/default")
    public ResponseEntity<?> setDefaultAddress(@PathVariable Long id, Authentication authentication) {
        try {
            User user = getUserFromAuthentication(authentication);
            Address address = addressService.setDefaultAddress(id, user);
            return ResponseEntity.ok(address);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(new ErrorResponse(e.getMessage()));
        }
    }

    // Helper method to get User from Authentication
    private User getUserFromAuthentication(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
    }
}