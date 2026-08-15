export const drawingToolIds = [
  'segment',
  'arrow_segment',
  'rectangle',
  'text',
  'arrow_up',
  'arrow_down',
  'long_position',
  'short_position',
  'measure',
] as const

export type DrawingToolId = typeof drawingToolIds[number]

export type DrawingTool = {
  id: DrawingToolId
  label: string
}

export const drawingTools: DrawingTool[] = [
  { id: 'segment', label: '线段' },
  { id: 'arrow_segment', label: '箭头线段' },
  { id: 'rectangle', label: '矩形' },
  { id: 'text', label: '文本' },
  { id: 'arrow_up', label: '向上箭头' },
  { id: 'arrow_down', label: '向下箭头' },
  { id: 'long_position', label: '多头盈亏测量' },
  { id: 'short_position', label: '空头盈亏测量' },
  { id: 'measure', label: '测量工具' },
]
