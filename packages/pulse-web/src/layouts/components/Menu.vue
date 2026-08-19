<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { RouterModules } from '@/router/modules'
import SubMenu from './SubMenu.vue'
const route = useRoute()
const activeMenu = computed(
  () => (route.meta.activeMenu ? route.meta.activeMenu : route.path) as string,
)
const subMenuList = computed(() => RouterModules.filter((item) => item.meta))
</script>

<template>
  <el-menu
    class="pulse-menu h-full !border-b-0 bg-transparent"
    mode="horizontal"
    :default-active="activeMenu"
    :collapse="false"
  >
    <SubMenu :menu-list="subMenuList" />
  </el-menu>
</template>

<style scoped>
.pulse-menu {
  --el-menu-active-color: var(--color-header-foreground);
  --el-menu-hover-bg-color: var(--color-header-hover);
  --el-menu-bg-color: transparent;
  --el-menu-horizontal-height: 2.5rem;
  justify-content: flex-start;
}

.pulse-menu :deep(.el-menu-item),
.pulse-menu :deep(.el-sub-menu__title) {
  height: 2.5rem;
  border-bottom: 2px solid transparent;
  color: var(--color-header-navigation);
  font-size: 0.875rem;
  font-weight: 500;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.pulse-menu :deep(.el-menu-item:hover),
.pulse-menu :deep(.el-sub-menu__title:hover) {
  background-color: var(--color-header-hover);
  color: var(--color-header-foreground);
}

.pulse-menu :deep(.el-menu-item.is-active) {
  border-bottom-color: var(--color-brand);
  color: var(--color-header-foreground);
}

.pulse-menu :deep(.el-sub-menu__icon-arrow) {
  color: inherit;
}
</style>
