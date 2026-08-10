<script setup lang="ts">
import { Plus } from '@lucide/vue'
</script>

<template>
  <div class="flex h-full flex-col bg-white">
    <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <h2 class="text-sm font-semibold text-slate-800">自选列表</h2>
    </header>
    <el-empty class="flex-1" description="暂未添加自选合约" :image-size="72">
      <p class="text-xs text-slate-500">添加后可在此快速切换图表标的</p>
    </el-empty>
  </div>
</template>
