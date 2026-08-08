const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const request = async <Response>(path: string, init?: RequestInit): Promise<Response> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(payload?.message ?? `Request failed with status ${response.status}.`)
  }

  if (response.status === 204) {
    return undefined as Response
  }

  return response.json() as Promise<Response>
}
