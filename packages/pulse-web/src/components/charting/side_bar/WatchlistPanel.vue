<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Plus, Search, GripVertical } from '@lucide/vue'
import { ElMessageBox } from 'element-plus'
import { computed, ref, watch } from 'vue'

import {
  getMarketInstruments,
  searchMarketInstruments,
  type MarketInstrumentSearchResult,
} from '@/api/market-data'
import WatchlistItemContextMenu from './WatchlistItemContextMenu.vue'
import {
  createWatchlist,
  createWatchlistItem,
  deleteWatchlist,
  deleteWatchlistItem,
  listWatchlists,
  updateWatchlist,
  updateWatchlistItem,
  type WatchlistItem,
  type Watchlist,
} from '@/api/watchlists'

const emit = defineEmits<{ selectSymbol: [symbol: string] }>()

const queryClient = useQueryClient()
const activeWatchlistId = ref<number>()
const isInstrumentDialogVisible = ref(false)
const editingItem = ref<WatchlistItem>()
const searchKeyword = ref('')
const selectedInstrument = ref<MarketInstrumentSearchResult>()
const searchResults = ref<MarketInstrumentSearchResult[]>([])
const isSearching = ref(false)
const draggedItemId = ref<number>()
const dragOverItemId = ref<number>()
const itemContextMenu = ref<InstanceType<typeof WatchlistItemContextMenu>>()

const watchlistsQuery = useQuery({ queryKey: ['watchlists'], queryFn: listWatchlists })
const watchlists = computed(() => watchlistsQuery.data.value ?? [])
const activeWatchlist = computed(() =>
  watchlists.value.find((watchlist) => watchlist.id === activeWatchlistId.value),
)
const activeInstrumentIds = computed(
  () => activeWatchlist.value?.items.map((item) => item.instrumentId) ?? [],
)

const instrumentsQuery = useQuery({
  queryKey: computed(() => ['watchlist-instruments', activeInstrumentIds.value]),
  enabled: computed(() => activeInstrumentIds.value.length > 0),
  queryFn: () => getMarketInstruments(activeInstrumentIds.value),
})
const instrumentsById = computed(
  () =>
    new Map((instrumentsQuery.data.value ?? []).map((instrument) => [instrument.id, instrument])),
)

watch(
  watchlists,
  (items) => {
    if (!items.some((watchlist) => watchlist.id === activeWatchlistId.value))
      activeWatchlistId.value = items[0]?.id
  },
  { immediate: true },
)

const refreshWatchlists = () => queryClient.invalidateQueries({ queryKey: ['watchlists'] })

const createWatchlistMutation = useMutation({
  mutationFn: createWatchlist,
  onSuccess: async (watchlist) => {
    activeWatchlistId.value = watchlist.id
    await refreshWatchlists()
  },
})
const updateWatchlistMutation = useMutation({
  mutationFn: ({ id, name }: { id: number; name: string }) => updateWatchlist(id, { name }),
  onSuccess: refreshWatchlists,
})
const deleteWatchlistMutation = useMutation({
  mutationFn: deleteWatchlist,
  onSuccess: refreshWatchlists,
})
const createItemMutation = useMutation({
  mutationFn: ({ watchlistId, instrumentId }: { watchlistId: number; instrumentId: number }) =>
    createWatchlistItem(watchlistId, { instrumentId }),
  onSuccess: refreshWatchlists,
})
const updateItemMutation = useMutation({
  mutationFn: ({
    watchlistId,
    itemId,
    instrumentId,
  }: {
    watchlistId: number
    itemId: number
    instrumentId: number
  }) => updateWatchlistItem(watchlistId, itemId, { instrumentId }),
  onSuccess: refreshWatchlists,
})
const deleteItemMutation = useMutation({
  mutationFn: ({ watchlistId, itemId }: { watchlistId: number; itemId: number }) =>
    deleteWatchlistItem(watchlistId, itemId),
  onSuccess: refreshWatchlists,
})

const startItemDrag = (item: WatchlistItem, event: DragEvent) => {
  draggedItemId.value = item.id
  dragOverItemId.value = undefined
  event.dataTransfer?.setData('text/plain', String(item.id))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const clearItemDrag = () => {
  draggedItemId.value = undefined
  dragOverItemId.value = undefined
}

const persistItemOrder = async (watchlist: Watchlist, items: WatchlistItem[]) => {
  const reorderedItems = items.map((item, index) => ({ ...item, sortOrder: index }))
  queryClient.setQueryData<Watchlist[]>(['watchlists'], (current) =>
    current?.map((entry) =>
      entry.id === watchlist.id ? { ...entry, items: reorderedItems } : entry,
    ),
  )
  try {
    await Promise.all(
      reorderedItems.map((item) =>
        updateWatchlistItem(watchlist.id, item.id, { sortOrder: item.sortOrder }),
      ),
    )
  } finally {
    await refreshWatchlists()
  }
}

const dropItem = async (targetItem: WatchlistItem) => {
  const sourceId = draggedItemId.value
  const watchlist = activeWatchlist.value
  clearItemDrag()
  if (!sourceId || !watchlist || sourceId === targetItem.id) return

  const items = [...watchlist.items]
  const sourceIndex = items.findIndex((item) => item.id === sourceId)
  const targetIndex = items.findIndex((item) => item.id === targetItem.id)
  if (sourceIndex < 0 || targetIndex < 0) return

  const [movedItem] = items.splice(sourceIndex, 1)
  items.splice(targetIndex, 0, movedItem)
  await persistItemOrder(watchlist, items)
}

const createList = async () => {
  const { value } = await ElMessageBox.prompt('请输入自选列表名称', '新建自选列表', {
    inputPattern: /\S+/,
    inputErrorMessage: '名称不能为空',
  })
  await createWatchlistMutation.mutateAsync({ name: value })
}

const renameList = async () => {
  if (!activeWatchlist.value) return
  const { value } = await ElMessageBox.prompt('请输入自选列表名称', '编辑自选列表', {
    inputValue: activeWatchlist.value.name,
    inputPattern: /\S+/,
    inputErrorMessage: '名称不能为空',
  })
  await updateWatchlistMutation.mutateAsync({ id: activeWatchlist.value.id, name: value })
}

const removeList = async () => {
  if (!activeWatchlist.value) return
  await ElMessageBox.confirm(`删除“${activeWatchlist.value.name}”及其所有标的？`, '删除自选列表', {
    type: 'warning',
  })
  await deleteWatchlistMutation.mutateAsync(activeWatchlist.value.id)
}

const openInstrumentDialog = (item?: WatchlistItem) => {
  editingItem.value = item
  const instrument = item ? instrumentsById.value.get(item.instrumentId) : undefined
  selectedInstrument.value = instrument
    ? {
        id: instrument.id,
        symbol: instrument.symbol,
        name: instrument.name,
        english_name: instrument.english_name,
        instrument_type: instrument.instrument_type,
        exchange_mic: '',
        exchange_name: '',
        is_active: instrument.is_active,
      }
    : undefined
  searchKeyword.value = selectedInstrument.value?.symbol ?? ''
  searchResults.value = []
  isInstrumentDialogVisible.value = true
}

const openSearch = () => {
  if (activeWatchlist.value) openInstrumentDialog()
  else void createList()
}

const searchInstruments = async () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    searchResults.value = []
    return
  }
  isSearching.value = true
  try {
    searchResults.value = await searchMarketInstruments(keyword)
  } finally {
    isSearching.value = false
  }
}

const saveInstrument = async () => {
  if (!activeWatchlist.value || !selectedInstrument.value) return
  if (editingItem.value) {
    await updateItemMutation.mutateAsync({
      watchlistId: activeWatchlist.value.id,
      itemId: editingItem.value.id,
      instrumentId: selectedInstrument.value.id,
    })
  } else {
    await createItemMutation.mutateAsync({
      watchlistId: activeWatchlist.value.id,
      instrumentId: selectedInstrument.value.id,
    })
  }
}

const removeItem = async (item: WatchlistItem) => {
  if (activeWatchlist.value)
    await deleteItemMutation.mutateAsync({ watchlistId: activeWatchlist.value.id, itemId: item.id })
}

const pinItem = async (item: WatchlistItem) => {
  const watchlist = activeWatchlist.value
  if (!watchlist || watchlist.items[0]?.id === item.id) return

  const items = watchlist.items.filter((currentItem) => currentItem.id !== item.id)
  items.unshift(item)
  await persistItemOrder(watchlist, items)
}

const moveItemToWatchlist = async (item: WatchlistItem, targetWatchlist: Watchlist) => {
  const sourceWatchlist = activeWatchlist.value
  if (!sourceWatchlist || sourceWatchlist.id === targetWatchlist.id) return
  if (targetWatchlist.items.some((targetItem) => targetItem.instrumentId === item.instrumentId))
    return

  const sortOrder =
    Math.max(-1, ...targetWatchlist.items.map((targetItem) => targetItem.sortOrder)) + 1
  await createWatchlistItem(targetWatchlist.id, { instrumentId: item.instrumentId, sortOrder })
  await deleteWatchlistItem(sourceWatchlist.id, item.id)
  await refreshWatchlists()
}

const selectInstrument = (item: WatchlistItem) => {
  const instrument = instrumentsById.value.get(item.instrumentId)
  if (instrument) emit('selectSymbol', instrument.symbol)
}
</script>

<template>
  <div class="flex h-full flex-col bg-white text-slate-800">
    <header class="flex h-10 items-center justify-between px-3">
      <h2 class="text-sm font-semibold tracking-tight">自选列表</h2>
      <div class="flex items-center gap-1 text-slate-400">
        <button
          type="button"
          class="flex flex-row items-center gap-x-1 p-1 hover:bg-[#f1f5f9] hover:text-[#334155] hover:cursor-pointer"
          title="添加标的"
          aria-label="添加标的"
          @click="openSearch"
        >
          <Plus :size="12" />
          <span class="text-sm">添加标的到自选</span>
        </button>
      </div>
    </header>

    <div class="scrollbar-none flex gap-1 overflow-x-auto border-b border-slate-100 px-2 pb-2">
      <button
        v-for="watchlist in watchlists"
        :key="watchlist.id"
        type="button"
        class="shrink-0 rounded-full px-3 py-1 text-xs transition-colors"
        :class="
          watchlist.id === activeWatchlistId
            ? 'bg-blue-500 text-white shadow-sm'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        "
        @click="activeWatchlistId = watchlist.id"
      >
        {{ watchlist.name }}
      </button>
      <button
        type="button"
        class="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
        title="新建自选列表"
        @click="createList"
      >
        <Plus :size="14" />
      </button>
    </div>

    <template v-if="activeWatchlist">
      <WatchlistItemContextMenu
        ref="itemContextMenu"
        :active-watchlist="activeWatchlist"
        :watchlists="watchlists"
        @pin="pinItem"
        @move="moveItemToWatchlist"
        @remove="removeItem"
      />
      <div v-if="activeWatchlist.items.length" class="min-h-0 flex-1 overflow-y-auto">
        <div
          v-for="item in activeWatchlist.items"
          :key="item.id"
          role="button"
          tabindex="0"
          class="group relative flex cursor-pointer items-center border-b border-slate-100 px-3 py-2.5 text-left transition-colors hover:bg-blue-50/50 focus:outline-none focus-visible:bg-blue-50"
          :class="{
            'border-t-2 border-t-blue-400': dragOverItemId === item.id && draggedItemId !== item.id,
            'opacity-50': draggedItemId === item.id,
          }"
          @click="selectInstrument(item)"
          @contextmenu="itemContextMenu?.open($event, item)"
          @keydown.enter="selectInstrument(item)"
          @dragover.prevent="dragOverItemId = item.id"
          @drop.prevent="dropItem(item)"
        >
          <span
            class="mr-1 flex cursor-grab touch-none items-center text-slate-300 hover:text-slate-500 active:cursor-grabbing"
            draggable="true"
            title="拖动排序"
            aria-label="拖动排序"
            @click.stop
            @dragstart.stop="startItemDrag(item, $event)"
            @dragend="clearItemDrag"
            ><GripVertical :size="16"
          /></span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold leading-4">
              {{ instrumentsById.get(item.instrumentId)?.name ?? '加载中…' }}
            </p>
            <p class="mt-1 truncate font-mono text-[11px] leading-3 text-slate-400">
              {{ instrumentsById.get(item.instrumentId)?.symbol ?? item.instrumentId }}
            </p>
          </div>
          <div class="mr-1 text-right">
            <p class="font-mono text-sm leading-4 text-slate-400">—</p>
            <p class="mt-1 text-[10px] leading-3 text-slate-300">暂无行情</p>
          </div>
        </div>
      </div>
      <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p class="text-sm text-slate-400">还没有自选标的</p>
        <button
          type="button"
          class="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
          @click="openInstrumentDialog()"
        >
          添加标的
        </button>
      </div>
    </template>
    <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p class="text-sm text-slate-400">创建一个列表开始关注市场</p>
      <button
        type="button"
        class="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
        @click="createList"
      >
        新建自选列表
      </button>
    </div>

    <el-dialog
      v-model="isInstrumentDialogVisible"
      :title="editingItem ? '替换自选标的' : '添加自选标的'"
      width="420px"
      append-to-body
    >
      <el-input
        v-model="searchKeyword"
        placeholder="搜索名称或代码"
        clearable
        @input="searchInstruments"
      ></el-input>
      <div class="mt-3 max-h-64 overflow-y-auto rounded-md border border-slate-200">
        <button
          v-for="instrument in searchResults"
          :key="instrument.id"
          type="button"
          class="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50"
          :class="{ 'bg-blue-50': selectedInstrument?.id === instrument.id }"
          @click="selectedInstrument = instrument"
        >
          <span
            ><b class="text-sm text-slate-800">{{ instrument.name }}</b
            ><small class="ml-2 font-mono text-slate-500">{{ instrument.symbol }}</small></span
          ><small class="text-slate-400">{{ instrument.exchange_name }}</small>
        </button>
        <p
          v-if="searchKeyword && !searchResults.length && !isSearching"
          class="px-3 py-5 text-center text-sm text-slate-400"
        >
          未找到匹配标的
        </p>
      </div>
      <template #footer
        ><el-button @click="isInstrumentDialogVisible = false">关闭</el-button
        ><el-button
          type="primary"
          :disabled="!selectedInstrument"
          :loading="createItemMutation.isPending.value || updateItemMutation.isPending.value"
          @click="saveInstrument"
          >{{ editingItem ? '保存' : '添加' }}</el-button
        ></template
      >
    </el-dialog>
  </div>
</template>

<style scoped>
.scrollbar-none {
  scrollbar-width: none;
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>
