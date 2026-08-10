<script setup lang="ts">
import TradingViewChart from '@/components/charting/TradingViewChart.vue'
</script>

<template>
  <section class="h-[calc(100vh-2.5rem)] bg-slate-100">
    <TradingViewChart symbol="jm2701" interval="1" />
  </section>
</template>
