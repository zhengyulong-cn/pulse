export type PinePlotItemKind = 'box' | 'label' | 'line' | 'plot'

export type PinePlotItem = {
  key: string
  value: unknown
}

const drawingKeyByKind: Record<Exclude<PinePlotItemKind, 'plot'>, string> = {
  box: '__boxes__',
  label: '__labels__',
  line: '__lines__',
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

const getItems = (value: unknown) => {
  if (!isRecord(value) || !Array.isArray(value.data)) return []
  return value.data.flatMap((item) => (
    isRecord(item) && Array.isArray(item.value) ? item.value : [item]
  ))
}

export const getPlotItems = (plots: unknown, kind: PinePlotItemKind): PinePlotItem[] => {
  if (!isRecord(plots)) return []

  if (kind === 'plot') {
    return Object.entries(plots)
      .filter(([key]) => !key.startsWith('__'))
      .map(([key, value]) => ({ key, value }))
  }

  const drawingKey = drawingKeyByKind[kind]
  return Object.entries(plots)
    .filter(([key]) => key === drawingKey || key.startsWith(`${drawingKey}-`))
    .flatMap(([key, value]) => getItems(value).map((item) => ({ key, value: item })))
}
