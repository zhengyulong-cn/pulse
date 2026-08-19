<script setup lang="ts">
import ContextMenu, { type MenuItem } from '@imengyu/vue3-context-menu'

import type { Watchlist, WatchlistItem } from '@/api/watchlists'

const props = defineProps<{
  activeWatchlist: Watchlist
  watchlists: Watchlist[]
}>()

const emit = defineEmits<{
  pin: [item: WatchlistItem]
  move: [item: WatchlistItem, targetWatchlist: Watchlist]
  remove: [item: WatchlistItem]
}>()

const open = (event: MouseEvent, item: WatchlistItem) => {
  event.preventDefault()

  const targetWatchlists = props.watchlists.filter(
    (watchlist) => watchlist.id !== props.activeWatchlist.id,
  )
  const moveMenuItems: MenuItem[] = targetWatchlists.map((watchlist) => ({
    label: watchlist.name,
    disabled: watchlist.items.some((targetItem) => targetItem.instrumentId === item.instrumentId),
    onClick: () => emit('move', item, watchlist),
  }))

  ContextMenu.showContextMenu({
    x: event.clientX,
    y: event.clientY,
    theme: 'flat',
    minWidth: 180,
    items: [
      {
        label: '置顶',
        disabled: props.activeWatchlist.items[0]?.id === item.id,
        onClick: () => emit('pin', item),
      },
      {
        label: '移动到自选列表',
        disabled: moveMenuItems.length === 0,
        children: moveMenuItems,
      },
      {
        label: '删除自选',
        divided: 'up',
        onClick: () => emit('remove', item),
      },
    ],
  })
}

defineExpose({ open })
</script>

<template>
  <span class="hidden" aria-hidden="true" />
</template>
