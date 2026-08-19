const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/server'
const dataCenterApiBaseUrl = import.meta.env.VITE_DATA_CENTER_API_BASE_URL ?? '/api/market-data'

const requestFrom = async <Response>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<Response> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? `Request failed with status ${response.status}.`)
  }

  if (response.status === 204) {
    return undefined as Response
  }

  return response.json() as Promise<Response>
}

export const request = async <Response>(path: string, init?: RequestInit): Promise<Response> =>
  requestFrom<Response>(apiBaseUrl, path, init)

export const dataCenterRequest = async <Response>(
  path: string,
  init?: RequestInit,
): Promise<Response> => requestFrom<Response>(dataCenterApiBaseUrl, path, init)
