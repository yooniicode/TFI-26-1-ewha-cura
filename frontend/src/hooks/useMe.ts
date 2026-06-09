import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { clearAccessToken, getAccessToken } from '@/lib/auth-token'
import { queryKeys } from '@/lib/queryKeys'

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const token = getAccessToken()
      if (!token) return null
      try {
        return await authApi.me().then(r => r.payload)
      } catch (e) {
        if (e instanceof ApiError && (e.isUnauthorized || e.isForbidden)) {
          clearAccessToken()
          return null
        }
        throw e
      }
    },
    retry: (failureCount, error) =>
      !(error instanceof ApiError && (error.isUnauthorized || error.isForbidden)) && failureCount < 1,
    refetchOnWindowFocus: false,
  })
}
