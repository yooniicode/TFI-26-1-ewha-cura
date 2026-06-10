'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import { chatApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { createClient } from '@/lib/supabase'
import { useMe } from '@/hooks/useMe'
import { useTranslation } from '@/lib/i18n/I18nContext'
import type { ChatMessage, ChatRoom } from '@/lib/types'

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const rawRoomId = params.roomId
  const roomId = Array.isArray(rawRoomId) ? rawRoomId[0] : rawRoomId
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { data: me } = useMe()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sendingRef = useRef(false)

  const { data: initialMessages, isLoading } = useQuery({
    queryKey: queryKeys.chat.messages(roomId ?? ''),
    queryFn: () => chatApi.messages(roomId!).then(r => r.payload ?? []),
    enabled: !!roomId,
    refetchInterval: 5000,
  })
  const latestInitialMessageId = initialMessages?.[initialMessages.length - 1]?.id

  const markCurrentRoomRead = useCallback(async () => {
    if (!roomId) return

    const rooms = queryClient.getQueryData<ChatRoom[]>(queryKeys.chat.rooms())
    const roomUnreadCount = rooms?.find(room => room.id === roomId)?.unreadCount ?? 0

    queryClient.setQueryData<ChatRoom[]>(queryKeys.chat.rooms(), old =>
      old?.map(room => room.id === roomId ? { ...room, unreadCount: 0 } : room),
    )
    if (roomUnreadCount > 0) {
      queryClient.setQueryData<number>(queryKeys.chat.unreadCount(), old =>
        typeof old === 'number' ? Math.max(0, old - roomUnreadCount) : old,
      )
    }

    try {
      await chatApi.markRead(roomId)
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadCount() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.rooms() }),
      ])
    }
  }, [roomId, queryClient])

  useEffect(() => {
    if (initialMessages) setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    void markCurrentRoomRead()
  }, [markCurrentRoomRead])

  useEffect(() => {
    if (!latestInitialMessageId) return
    void markCurrentRoomRead()
  }, [latestInitialMessageId, markCurrentRoomRead])

  useEffect(() => {
    if (!roomId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_message',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMsg = mapRealtimeMessage(payload.new)
          if (!newMsg) return
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          void markCurrentRoomRead()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [roomId, markCurrentRoomRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const { mutate: send, isPending: sending } = useMutation({
    mutationFn: (content: string) => chatApi.send(roomId!, content),
    onSuccess: (res) => {
      sendingRef.current = false
      const msg = res.payload
      if (msg) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      }
      setInput('')
      inputRef.current?.focus()
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.rooms() })
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadCount() })
    },
    onError: () => {
      sendingRef.current = false
    },
  })

  function handleSend() {
    const content = input.trim()
    if (!content || sendingRef.current || !roomId) return
    sendingRef.current = true
    send(content)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) return <AppShell><Spinner /></AppShell>

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-10rem)] flex-col">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700"
            aria-label="Back"
          >
            &lt;
          </button>
          <h1 className="text-base font-bold">{t.chat.title}</h1>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pb-2">
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={msg.senderAuthUserId === me?.authUserId}
              t={t}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-end gap-2 border-t pt-3">
          <textarea
            ref={inputRef}
            className="input max-h-28 min-h-10 flex-1 resize-none py-2"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.input_placeholder}
          />
          <button
            type="button"
            className="btn-primary shrink-0 px-4 py-2"
            onClick={handleSend}
            disabled={sending || !input.trim()}
          >
            {sending ? t.chat.sending : t.chat.send}
          </button>
        </div>
      </div>
    </AppShell>
  )
}

function MessageBubble({
  msg,
  isMine,
  t,
}: {
  msg: ChatMessage
  isMine: boolean
  t: ReturnType<typeof useTranslation>['t']
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
      <span className="text-xs text-gray-400">
        {isMine ? t.chat.you : (msg.senderName ?? t.chat.no_name)}
      </span>
      <div
        className={`max-w-[75%] break-words rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
          isMine
            ? 'rounded-br-sm bg-primary-600 text-white'
            : 'rounded-bl-sm bg-gray-100 text-gray-800'
        }`}
      >
        {msg.content}
      </div>
      <span className="text-xs text-gray-300">
        {formatTime(msg.createdAt)}
      </span>
    </div>
  )
}

function mapRealtimeMessage(row: unknown): ChatMessage | null {
  if (!row || typeof row !== 'object') return null
  const data = row as Record<string, unknown>
  const id = typeof data.id === 'string' ? data.id : ''
  const roomId = typeof data.room_id === 'string' ? data.room_id : ''
  const senderAuthUserId = typeof data.sender_auth_user_id === 'string' ? data.sender_auth_user_id : ''
  const content = typeof data.content === 'string' ? data.content : ''
  const createdAt = typeof data.created_at === 'string' ? data.created_at : ''
  if (!id || !roomId || !senderAuthUserId || !content || !createdAt) return null

  return {
    id,
    roomId,
    senderAuthUserId,
    senderName: typeof data.sender_name === 'string' ? data.sender_name : null,
    content,
    createdAt,
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}
