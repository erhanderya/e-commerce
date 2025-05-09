package com.webapp.back_end.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.InitializingBean;
import com.webapp.back_end.model.User;
import com.webapp.back_end.model.Role;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

@Component
public class JwtUtil implements InitializingBean {
    @Value("${jwt.secret:defaultSecretKeyWhichShouldBeVeryLongAndComplexForSecurity}")
    private String secretString;
    
    private Key key;
    private final long JWT_TOKEN_VALIDITY = 5 * 60 * 60 * 1000; // 5 hours
    
    // Initialize key after properties are set
    @Override
    public void afterPropertiesSet() {
        byte[] keyBytes = secretString.getBytes(StandardCharsets.UTF_8);
        this.key = new SecretKeySpec(keyBytes, SignatureAlgorithm.HS256.getJcaName());
    }
    
    // Lazy initialization of key if not set via afterPropertiesSet
    private Key getKey() {
        if (key == null) {
            byte[] keyBytes = secretString.getBytes(StandardCharsets.UTF_8);
            this.key = new SecretKeySpec(keyBytes, SignatureAlgorithm.HS256.getJcaName());
        }
        return key;
    }

    public String generateToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole().name());
        return createToken(claims, user.getEmail());
    }

    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(subject)
            .setIssuedAt(new Date(System.currentTimeMillis()))
            .setExpiration(new Date(System.currentTimeMillis() + JWT_TOKEN_VALIDITY))
            .signWith(getKey())
            .compact();
    }

    public Boolean validateToken(String token) {
        try {
            return !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    public String getEmailFromToken(String token) {
        return getClaimFromToken(token, Claims::getSubject);
    }

    public Boolean isAdmin(String token) {
        final Claims claims = getAllClaimsFromToken(token);
        String role = claims.get("role", String.class);
        return Role.ADMIN.name().equals(role);
    }

    public Role getRole(String token) {
        final Claims claims = getAllClaimsFromToken(token);
        String roleStr = claims.get("role", String.class);
        return roleStr != null ? Role.valueOf(roleStr) : Role.USER;
    }

    private Date getExpirationDateFromToken(String token) {
        return getClaimFromToken(token, Claims::getExpiration);
    }

    private <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }

    private Claims getAllClaimsFromToken(String token) {
        return Jwts.parserBuilder().setSigningKey(getKey()).build().parseClaimsJws(token).getBody();
    }

    private Boolean isTokenExpired(String token) {
        final Date expiration = getExpirationDateFromToken(token);
        return expiration.before(new Date());
    }
}