<script setup lang="ts">
import { Camera } from '@lucide/vue';
import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
</script>

<template>
  <p>
    <Camera :size="48" color="pink" :stroke-width="1" />
    <VueQueryDevtools />
  </p>
</template>

<style scoped></style>
