import { z } from 'zod'
import { get, post, del } from './client'

const bookmarkSchema = z.object({
  id: z.string(),
  koText: z.string(),
  translatedText: z.string().nullable().optional(),
})

export type Bookmark = z.infer<typeof bookmarkSchema>

const bookmarkListSchema = z.array(bookmarkSchema)

export const bookmarkApi = {
  list: () => get('/phrase-bookmarks', bookmarkListSchema),
  save: (koText: string, translatedText: string) =>
    post('/phrase-bookmarks', { koText, translatedText }, bookmarkSchema),
  delete: (koText: string) =>
    del<void>(`/phrase-bookmarks?koText=${encodeURIComponent(koText)}`),
}
