export const queryKeys = {
  me: ['me'] as const,
  members: ['members'] as const,
  centers: ['centers'] as const,
  adminProfile: ['admin', 'profile'] as const,
  adminStats: ['admin', 'stats'] as const,
  adminWorkLogs: (page: number, from = '', to = '') => ['admin', 'work-logs', page, from, to] as const,
  announcements: {
    list: (page: number) => ['announcements', 'list', page] as const,
  },

  patients: {
    list:      (page: number, query = '') => ['patients', 'list', page, query] as const,
    detail:    (id: string)   => ['patients', id] as const,
    history:   (id: string, page: number) => ['patients', id, 'history', page] as const,
    myRecords: (id: string, page: number) => ['patients', id, 'my-records', page] as const,
    centerMemos: (id: string, page: number) => ['patients', id, 'center-memos', page] as const,
  },

  interpreters: {
    list:   (page: number, query = '', language = '') => ['interpreters', 'list', page, query, language] as const,
    detail: (id: string)   => ['interpreters', id] as const,
  },

  consultations: {
    list:      (page: number, patientQuery = '', sortBy = 'consultationDate', direction = 'desc') =>
      ['consultations', 'list', page, patientQuery, sortBy, direction] as const,
    detail:    (id: string)                      => ['consultations', id] as const,
    byPatient: (patientId: string, page: number) => ['consultations', 'patient', patientId, page] as const,
    pending:   () => ['consultations', 'pending'] as const,
  },

  handovers: {
    byPatient: (patientId: string, page: number) => ['handovers', 'patient', patientId, page] as const,
  },

  matching: {
    list:      (page: number)     => ['matching', 'list', page] as const,
    byPatient: (patientId: string) => ['matching', 'patient', patientId] as const,
    myMatch:   () => ['matching', 'me'] as const,
    myCount:   () => ['matching', 'my-count'] as const,
  },

  scripts: {
    byPatient: (patientId: string, page: number) => ['scripts', 'patient', patientId, page] as const,
    detail:    (id: string) => ['scripts', id] as const,
  },

  hospitals: {
    search: (name: string | undefined, page: number) => ['hospitals', 'search', name, page] as const,
  },

  chat: {
    rooms:       () => ['chat', 'rooms'] as const,
    messages:    (roomId: string, page = 0) => ['chat', 'messages', roomId, page] as const,
    unreadCount: () => ['chat', 'unread-count'] as const,
  },
}
