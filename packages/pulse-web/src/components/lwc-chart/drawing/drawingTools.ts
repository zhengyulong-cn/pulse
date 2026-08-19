import {
  ArrowDown,
  ArrowUp,
  MoveUpRight,
  PencilLine,
  Ruler,
  Square,
  ArrowUpWideNarrow,
  ArrowDownNarrowWide,
} from '@lucide/vue'
import type { Component } from 'vue'

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

export type DrawingToolId = (typeof drawingToolIds)[number]

export type DrawingTool = {
  icon: Component
  id: DrawingToolId
  label: string
}

export const drawingTools: DrawingTool[] = [
  { id: 'segment', label: '线段', icon: PencilLine },
  { id: 'arrow_segment', label: '箭头线段', icon: MoveUpRight },
  { id: 'rectangle', label: '矩形', icon: Square },
  { id: 'arrow_up', label: '向上箭头', icon: ArrowUp },
  { id: 'arrow_down', label: '向下箭头', icon: ArrowDown },
  { id: 'long_position', label: '多头盈亏测量', icon: ArrowUpWideNarrow },
  { id: 'short_position', label: '空头盈亏测量', icon: ArrowDownNarrowWide },
  { id: 'measure', label: '测量工具', icon: Ruler },
]
