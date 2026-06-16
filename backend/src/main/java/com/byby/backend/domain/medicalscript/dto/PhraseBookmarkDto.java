package com.byby.backend.domain.medicalscript.dto;

import com.byby.backend.domain.medicalscript.entity.PhraseBookmark;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public class PhraseBookmarkDto {

    public record SaveRequest(
            @NotBlank String koText,
            String translatedText
    ) {}

    public record BookmarkResponse(
            UUID id,
            String koText,
            String translatedText
    ) {
        public static BookmarkResponse from(PhraseBookmark bookmark) {
            return new BookmarkResponse(
                    bookmark.getId(),
                    bookmark.getKoText(),
                    bookmark.getTranslatedText()
            );
        }
    }
}
