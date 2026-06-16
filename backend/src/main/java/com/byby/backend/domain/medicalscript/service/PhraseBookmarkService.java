package com.byby.backend.domain.medicalscript.service;

import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.medicalscript.dto.PhraseBookmarkDto;
import com.byby.backend.domain.medicalscript.entity.PhraseBookmark;
import com.byby.backend.domain.medicalscript.repository.PhraseBookmarkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PhraseBookmarkService {

    private final PhraseBookmarkRepository bookmarkRepository;

    public List<PhraseBookmarkDto.BookmarkResponse> getAll(UserPrincipal principal) {
        return bookmarkRepository.findByAuthUserIdOrderByCreatedAtDesc(principal.getAuthUserId())
                .stream()
                .map(PhraseBookmarkDto.BookmarkResponse::from)
                .toList();
    }

    @Transactional
    public PhraseBookmarkDto.BookmarkResponse save(PhraseBookmarkDto.SaveRequest req, UserPrincipal principal) {
        return bookmarkRepository
                .findByAuthUserIdAndKoText(principal.getAuthUserId(), req.koText())
                .map(PhraseBookmarkDto.BookmarkResponse::from)
                .orElseGet(() -> {
                    PhraseBookmark bookmark = PhraseBookmark.builder()
                            .authUserId(principal.getAuthUserId())
                            .koText(req.koText())
                            .translatedText(req.translatedText())
                            .build();
                    return PhraseBookmarkDto.BookmarkResponse.from(bookmarkRepository.save(bookmark));
                });
    }

    @Transactional
    public void delete(String koText, UserPrincipal principal) {
        bookmarkRepository.deleteByAuthUserIdAndKoText(principal.getAuthUserId(), koText);
    }
}
