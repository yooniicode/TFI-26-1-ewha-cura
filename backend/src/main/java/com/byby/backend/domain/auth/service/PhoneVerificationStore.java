package com.byby.backend.domain.auth.service;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PhoneVerificationStore {

    private final ConcurrentHashMap<String, Entry> store = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> verifiedStore = new ConcurrentHashMap<>();

    private record Entry(String code, Instant expiresAt) {}

    public void save(String phone, String code, int ttlSeconds) {
        store.put(normalize(phone), new Entry(code, Instant.now().plusSeconds(ttlSeconds)));
    }

    public Optional<String> getCode(String phone) {
        String key = normalize(phone);
        Entry entry = store.get(key);
        if (entry == null || Instant.now().isAfter(entry.expiresAt())) {
            store.remove(key);
            return Optional.empty();
        }
        return Optional.of(entry.code());
    }

    public void remove(String phone) {
        store.remove(normalize(phone));
    }

    /** OCTOMO 인증 성공 후 5분간 유지 — phone-only 가입 시 소비 */
    public void markVerified(String phone) {
        verifiedStore.put(normalize(phone), Instant.now().plusSeconds(300));
    }

    /** 인증 상태 확인 후 즉시 소비 (1회용) */
    public boolean consumeVerified(String phone) {
        String key = normalize(phone);
        Instant expiry = verifiedStore.remove(key);
        return expiry != null && Instant.now().isBefore(expiry);
    }

    private String normalize(String phone) {
        return phone.replaceAll("[^0-9]", "");
    }
}
