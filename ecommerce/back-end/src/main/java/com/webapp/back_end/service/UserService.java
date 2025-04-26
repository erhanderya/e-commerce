package com.webapp.back_end.service;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import com.webapp.back_end.model.User;
import com.webapp.back_end.model.LoginRequest;
import com.webapp.back_end.repository.UserRepository;
import com.webapp.back_end.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.transaction.Transactional;
import java.util.List;

@Service
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    
    public UserService(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
        this.jwtUtil = jwtUtil;
    }
    
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User login(LoginRequest loginRequest) {
        try {
            User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found with this email"));
                
            if (user.getBanned()) {
                throw new RuntimeException("Your account has been banned. Please contact support.");
            }

            // Debug password comparison
            boolean passwordMatches = passwordEncoder.matches(loginRequest.getPassword(), user.getPassword());
            if (!passwordMatches) {
                throw new RuntimeException("Incorrect password");
            }
            
            String token = jwtUtil.generateToken(user);
            user.setToken(token);
            return user;
        } catch (Exception e) {
            // Log the error for debugging
            System.out.println("Login error: " + e.getMessage());
            throw e;
        }
    }

    @Transactional
    public User updateUser(Long id, User userDetails) {
        User user = getUserById(id);
        user.setUsername(userDetails.getUsername());
        user.setEmail(userDetails.getEmail());
        user.setFirstName(userDetails.getFirstName());
        user.setLastName(userDetails.getLastName());
        user.setIsAdmin(userDetails.getIsAdmin());
        user.setBanned(userDetails.getBanned());
        
        if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
        }
        
        return userRepository.save(user);
    }

    @Transactional
    public User toggleUserBan(Long id) {
        User user = getUserById(id);
        user.setBanned(!user.getBanned());
        return userRepository.save(user);
    }
    
    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User not found");
        }
        userRepository.deleteById(id);
    }
    
    @Transactional
    public User register(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userRepository.save(user);
        String token = jwtUtil.generateToken(savedUser);
        savedUser.setToken(token);
        return savedUser;
    }
    
    public User getUserProfile(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        String email = jwtUtil.getEmailFromToken(token);
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }
}