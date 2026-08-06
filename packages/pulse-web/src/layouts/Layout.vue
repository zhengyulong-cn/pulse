<script setup lang="ts">
import { Settings, HeartPulse } from '@lucide/vue';
import Menu from '@/layouts/components/Menu.vue';
</script>

<template>
  <div class="min-h-screen bg-page text-page-foreground">
    <header class="sticky top-0 z-40 h-10 border-b border-header-border bg-header text-header-foreground shadow-sm">
      <div class="flex h-full w-full items-center gap-3 px-3 sm:px-4">
        <a
          class="flex shrink-0 items-center gap-1.5 rounded-sm px-1 text-header-foreground outline-none transition-colors hover:text-brand-hover focus-visible:ring-2 focus-visible:ring-brand"
          href="/"
          aria-label="Pulse 首页"
        >
          <span class="flex size-6 items-center justify-center rounded-sm bg-brand text-brand-foreground">
            <HeartPulse :size="15" :stroke-width="2.5" aria-hidden="true" />
          </span>
          <span class="text-sm font-semibold tracking-wide text-brand">Pulse</span>
        </a>
        <nav class="min-w-0 flex-1 self-stretch" aria-label="主导航">
          <Menu />
        </nav>
        <el-tooltip content="设置" placement="bottom" :show-arrow="false">
          <button
            type="button"
            class="flex size-7 shrink-0 items-center justify-center rounded-sm text-header-muted outline-none transition-colors hover:bg-header-hover hover:text-header-foreground focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="设置"
          >
            <Settings :size="16" aria-hidden="true" />
          </button>
        </el-tooltip>
      </div>
    </header>
    <main class="w-full">
      <slot name="layoutContent" />
    </main>
  </div>
</template>
