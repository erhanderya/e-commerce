package com.webapp.back_end.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.http.HttpMethod;
import java.util.Arrays;
import com.webapp.back_end.security.JwtAuthenticationFilter;
import com.webapp.back_end.model.Role; // Import Role enum

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors().and()
            .csrf().disable()
            .sessionManagement()
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .authorizeHttpRequests((authz) -> authz
                // Public endpoints
                .requestMatchers("/api/users/register", "/api/users/login").permitAll()
                .requestMatchers("/api/products", "/api/products/{id}", "/api/products/category/{categoryId}").permitAll() // Allow reading products
                .requestMatchers("/api/categories/**").permitAll()
                .requestMatchers("/api/product/**").permitAll() // Allow reading product details
                .requestMatchers("/api/cart").permitAll() // Allow reading cart details (if needed)
                .requestMatchers("/api/reviews/**").permitAll() // Allow reading reviews
                
                // Authenticated endpoints (general)
                .requestMatchers("/api/cart/**").authenticated() 
                .requestMatchers("/api/orders/**").authenticated() // Assuming orders require authentication
                .requestMatchers("/api/users/profile", "/api/users/profile/**").authenticated() // User profile endpoints - require auth but not admin
                
                // Seller/Admin endpoints for products
                .requestMatchers(HttpMethod.POST, "/api/products").hasAnyAuthority(Role.SELLER.name(), Role.ADMIN.name()) // Only Sellers or Admins can create
                .requestMatchers(HttpMethod.PUT, "/api/products/{id}").hasAnyAuthority(Role.SELLER.name(), Role.ADMIN.name()) // Only Sellers or Admins can update (service layer does specific owner check)
                .requestMatchers(HttpMethod.DELETE, "/api/products/{id}").hasAnyAuthority(Role.SELLER.name(), Role.ADMIN.name()) // Only Sellers or Admins can delete (service layer does specific owner check)

                // Admin endpoints for user management
                .requestMatchers("/api/users/all", "/api/users/{id}").hasAuthority(Role.ADMIN.name()) // Only Admins can manage users
                .requestMatchers(HttpMethod.PUT, "/api/users/{id}").hasAuthority(Role.ADMIN.name())
                .requestMatchers(HttpMethod.DELETE, "/api/users/{id}").hasAuthority(Role.ADMIN.name())
                // .requestMatchers("/admin/**").hasAuthority(Role.ADMIN.name()) // Keep or adjust if you have specific /admin paths
                
                // Deny all others by default unless authenticated
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:4200"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
