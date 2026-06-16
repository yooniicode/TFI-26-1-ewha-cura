package com.byby.backend.domain.medicalscript.repository;

import com.byby.backend.domain.medicalscript.entity.PhraseBookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhraseBookmarkRepository extends JpaRepository<PhraseBookmark, UUID> {

    List<PhraseBookmark> findByAuthUserIdOrderByCreatedAtDesc(UUID authUserId);

    Optional<PhraseBookmark> findByAuthUserIdAndKoText(UUID authUserId, String koText);

    void deleteByAuthUserIdAndKoText(UUID authUserId, String koText);
}
