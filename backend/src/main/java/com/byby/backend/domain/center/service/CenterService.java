package com.byby.backend.domain.center.service;

import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.entity.AdminProfile;
import com.byby.backend.domain.admin.repository.AdminProfileRepository;
import com.byby.backend.domain.center.dto.CenterRequest;
import com.byby.backend.domain.center.dto.CenterResponse;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.center.repository.CenterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Comparator;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CenterService {

    private final CenterRepository centerRepository;
    private final AdminProfileRepository adminProfileRepository;

    public Page<CenterResponse.Summary> list(String query, Pageable pageable) {
        String normalizedQuery = trimToNull(query);
        String compactQuery = normalizedQuery == null
                ? null
                : normalizedQuery.toLowerCase(Locale.ROOT).replaceAll("[\\s-]+", "");
        return centerRepository.searchActive(normalizedQuery, compactQuery, pageable)
                .map(CenterResponse.Summary::from);
    }

    @Transactional
    public CenterResponse.Summary create(CenterRequest.Upsert req, UserPrincipal principal) {
        // 권한 검증은 컨트롤러에서 처리 (admin JWT 또는 dev secret)
        Center center = getOrCreateByName(req.name());
        center.update(center.getName(), trimToNull(req.address()), trimToNull(req.phone()),
                req.active() != null ? req.active() : true);
        return CenterResponse.Summary.from(center);
    }

    @Transactional
    public CenterResponse.Summary update(UUID id, CenterRequest.Upsert req, UserPrincipal principal) {
        // 권한 검증은 컨트롤러에서 처리 (admin JWT 또는 dev secret)
        Center center = centerRepository.findById(id)
                .orElseThrow(() -> new GeneralException(GeneralErrorCode.NOT_FOUND));
        if (principal != null) requireOwnCenterOrUnassigned(center, principal);
        center.update(req.name().trim(), trimToNull(req.address()), trimToNull(req.phone()),
                req.active() != null ? req.active() : true);
        return CenterResponse.Summary.from(center);
    }

    @Transactional
    public Center getOrCreateByName(String name) {
        if (!StringUtils.hasText(name)) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "centerName is required");
        }
        String normalized = name.trim();
        return centerRepository.findByNameIgnoreCaseAndActiveTrue(normalized)
                .or(() -> findSimilarActiveCenter(normalized))
                .orElseGet(() -> centerRepository.save(Center.builder().name(normalized).build()));
    }

    public Center find(UUID id) {
        return centerRepository.findById(id)
                .orElseThrow(() -> new GeneralException(GeneralErrorCode.NOT_FOUND));
    }

    private void requireOwnCenterOrUnassigned(Center center, UserPrincipal principal) {
        AdminProfile profile = adminProfileRepository.findByAuthUserId(principal.getAuthUserId())
                .orElse(null);
        if (profile == null || profile.getCenter() == null) return;
        if (!profile.getCenter().getId().equals(center.getId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private java.util.Optional<Center> findSimilarActiveCenter(String name) {
        String target = compactCenterName(name);
        if (target.isBlank()) return java.util.Optional.empty();
        return centerRepository.findByActiveTrue().stream()
                .map(center -> new CenterMatch(center, bigramSimilarity(target, compactCenterName(center.getName()))))
                .filter(match -> match.score() >= 0.88)
                .max(Comparator.comparingDouble(CenterMatch::score))
                .map(CenterMatch::center);
    }

    private String compactCenterName(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("[\\s-]+", "");
    }

    private double bigramSimilarity(String left, String right) {
        if (left.equals(right)) return 1.0;
        if (left.length() < 2 || right.length() < 2) return 0.0;

        Map<String, Integer> leftCounts = bigramCounts(left);
        Map<String, Integer> rightCounts = bigramCounts(right);
        int shared = 0;
        for (Map.Entry<String, Integer> entry : leftCounts.entrySet()) {
            shared += Math.min(entry.getValue(), rightCounts.getOrDefault(entry.getKey(), 0));
        }
        return (2.0 * shared) / ((left.length() - 1) + (right.length() - 1));
    }

    private Map<String, Integer> bigramCounts(String value) {
        Map<String, Integer> counts = new HashMap<>();
        for (int i = 0; i < value.length() - 1; i++) {
            String bigram = value.substring(i, i + 2);
            counts.merge(bigram, 1, Integer::sum);
        }
        return counts;
    }

    private record CenterMatch(Center center, double score) {}
}
