<script setup lang="ts">
import Layout from "./layouts/Layout.vue";
import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
</script>

<template>
  <Layout>
    <template v-slot:layoutContent>
      <router-view />
    </template>
  </Layout>
  <VueQueryDevtools />
</template>

<style scoped></style>
