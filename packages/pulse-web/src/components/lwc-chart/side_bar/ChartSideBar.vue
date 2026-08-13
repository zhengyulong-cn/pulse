<script setup lang="ts">
import { List, X } from '@lucide/vue'
import { ref } from 'vue'

import WatchlistPanel from './WatchlistPanel.vue'

type ToolId = 'watchlist'

const activeTool = ref<ToolId | null>(null)
const emit = defineEmits<{ selectSymbol: [instrument: { id: number, symbol: string }] }>()

const tools = [
  { id: 'watchlist' as const, title: '自选列表', icon: List },
]

const toggleTool = (toolId: ToolId) => {
  activeTool.value = activeTool.value === toolId ? null : toolId
}
</script>

<template>
  <aside class="flex" aria-label="图表工具栏">
    <section v-if="activeTool" class="w-[280px] border-r border-slate-200 bg-white shadow-md">
      <div class="h-[calc(100%-2.5rem)]">
        <WatchlistPanel v-if="activeTool === 'watchlist'" @select-symbol="emit('selectSymbol', $event)" />
      </div>
    </section>
    <nav class="flex w-11 flex-col items-center border-r border-slate-200 bg-white/95 py-2 shadow-sm backdrop-blur" aria-label="图表工具">
      <button
        v-for="tool in tools"
        :key="tool.id"
        type="button"
        class="flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :class="{ 'bg-blue-50 text-blue-600 hover:bg-blue-50 hover:text-blue-600': activeTool === tool.id }"
        :aria-label="tool.title"
        :aria-pressed="activeTool === tool.id"
        :title="tool.title"
        @click="toggleTool(tool.id)"
      >
        <component :is="tool.icon" :size="18" aria-hidden="true" />
      </button>
    </nav>
  </aside>
</template>
