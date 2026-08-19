<template>
  <template v-for="subItem in menuList" :key="subItem.path">
    <el-sub-menu v-if="subItem.children?.length" :index="subItem.path">
      <template #title>
        <component
          v-if="subItem.meta?.icon"
          :is="subItem.meta.icon"
          class="mr-1.5 size-4 shrink-0"
          :stroke-width="2"
          aria-hidden="true"
        />
        <span class="truncate">{{ subItem.meta?.title }}</span>
      </template>
      <SubMenu :menu-list="subItem.children" />
    </el-sub-menu>
    <el-menu-item v-else :index="subItem.path" @click="handleClickMenu(subItem)">
      <component
        v-if="subItem.meta?.icon"
        :is="subItem.meta.icon"
        class="mr-1.5 size-4 shrink-0"
        :stroke-width="2"
        aria-hidden="true"
      />
      <template #title>
        <span class="truncate">{{ subItem.meta?.title }}</span>
      </template>
    </el-menu-item>
  </template>
</template>

<script setup lang="ts">
import { type RouteRecordRaw, useRouter } from 'vue-router'
defineProps<{ menuList: RouteRecordRaw[] }>()
const router = useRouter()
const handleClickMenu = (subItem: RouteRecordRaw) => {
  router.push(subItem.path)
}
</script>
