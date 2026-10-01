export const queryKeys = {
  me: ['me'] as const,
  dashboard: ['admin', 'dashboard'] as const,
  calendar: (from: string, to: string) => ['admin', 'calendar', from, to] as const,
  settings: {
    center: ['admin', 'settings', 'center'] as const,
    sheet: ['admin', 'settings', 'sheet'] as const,
    members: (query: string) => ['admin', 'settings', 'members', query] as const,
    profile: ['admin', 'settings', 'profile'] as const,
  },
  patients: {
    list: (filter: unknown) => ['admin', 'patients', 'list', filter] as const,
    detail: (id: string) => ['admin', 'patients', 'detail', id] as const,
    consultations: (id: string) => ['admin', 'patients', 'consultations', id] as const,
  },
  interpreters: {
    list: (filter: unknown) => ['admin', 'interpreters', 'list', filter] as const,
    detail: (id: string) => ['admin', 'interpreters', 'detail', id] as const,
    consultations: (id: string) => ['admin', 'interpreters', 'consultations', id] as const,
  },
  reports: {
    all: ['admin', 'reports'] as const,
    list: (filter: unknown) => ['admin', 'reports', 'list', filter] as const,
    detail: (consultationId: string) => ['admin', 'reports', 'detail', consultationId] as const,
  },
  matching: {
    all: ['admin', 'matching'] as const,
    requests: (filter: unknown) => ['admin', 'matching', 'requests', filter] as const,
    candidates: (consultationId: string) => ['admin', 'matching', 'candidates', consultationId] as const,
  },
}
