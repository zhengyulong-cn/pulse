import { ref } from 'vue'

import type { DrawingToolId } from './drawingTools'

export const useDrawingTool = () => {
  const activeDrawingTool = ref<DrawingToolId>()

  const selectDrawingTool = (tool: DrawingToolId) => {
    activeDrawingTool.value = activeDrawingTool.value === tool ? undefined : tool
  }

  const clearDrawingTool = () => {
    activeDrawingTool.value = undefined
  }

  return { activeDrawingTool, clearDrawingTool, selectDrawingTool }
}
