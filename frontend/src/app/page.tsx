import LandingContent, { type CenterSummary } from '@/components/landing/LandingContent'

async function fetchCenters(): Promise<CenterSummary[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    const res = await fetch(`${apiUrl}/api/v1/centers?page=0&size=100`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.payload ?? []) as CenterSummary[]
  } catch {
    return []
  }
}

export default async function LandingPage() {
  const centers = await fetchCenters()

  return <LandingContent centers={centers} />
}
