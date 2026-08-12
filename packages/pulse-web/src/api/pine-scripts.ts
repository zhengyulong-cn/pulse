import { request } from './client'

export type PineScriptType = 'INDICATOR' | 'STRATEGY'

export type PineScript = {
  id: number
  content: string
  description: string
  type: PineScriptType
  createdAt: string
  updatedAt: string
}

export type PineScriptInput = Pick<PineScript, 'content' | 'description' | 'type'>

export const listPineScripts = (type?: PineScriptType) => request<PineScript[]>(
  `/pine-scripts${type === undefined ? '' : `?type=${type}`}`,
)

export const createPineScript = (payload: PineScriptInput) => request<PineScript>('/pine-scripts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

export const updatePineScript = (scriptId: number, payload: Partial<PineScriptInput>) => request<PineScript>(`/pine-scripts/${scriptId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

export const deletePineScript = (scriptId: number) =>
  request<void>(`/pine-scripts/${scriptId}`, { method: 'DELETE' })
