package com.smartsplit.smartsplit;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

import org.springframework.stereotype.Component;

@Component
public class BillSecurity {

    private final SecureRandom random = new SecureRandom();
    public String generateAccessCode() {
    	
        String characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder code = new StringBuilder();

        for (int i = 0; i < 12; i++) {
            if (i == 4 || i == 8) {
                code.append("-");
            }

            int index = random.nextInt(characters.length());
            code.append(characters.charAt(index));
        }

        return code.toString();
    }

    public String hashAccessCode(String accessCode) {

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    accessCode.getBytes(StandardCharsets.UTF_8)
            );

            StringBuilder result = new StringBuilder();

            for (byte b : hash) {
                result.append(String.format("%02x", b));
            }

            return result.toString();

        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Security algorithm unavailable", e);
        }
    }

    public boolean checkAccessCode(String accessCode, String storedHash) {

        if (accessCode == null || storedHash == null) {
            return false;
        }

        String suppliedHash = hashAccessCode(accessCode);

        return MessageDigest.isEqual(
                suppliedHash.getBytes(StandardCharsets.UTF_8),
                storedHash.getBytes(StandardCharsets.UTF_8)
        );
    }
}