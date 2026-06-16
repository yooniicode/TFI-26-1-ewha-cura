package com.byby.backend.domain.medicalscript.entity;

import com.byby.backend.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
    name = "phrase_bookmark",
    uniqueConstraints = @UniqueConstraint(name = "uk_phrase_bookmark_user_text", columnNames = {"auth_user_id", "ko_text"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PhraseBookmark extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "auth_user_id", nullable = false)
    private UUID authUserId;

    @Column(name = "ko_text", nullable = false, columnDefinition = "TEXT")
    private String koText;

    @Column(name = "translated_text", columnDefinition = "TEXT")
    private String translatedText;

    @Builder
    public PhraseBookmark(UUID authUserId, String koText, String translatedText) {
        this.authUserId = authUserId;
        this.koText = koText;
        this.translatedText = translatedText;
    }
}
