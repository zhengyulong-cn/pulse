<script setup lang="ts">
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'

import {
  createFutureTrendStatusSnapshot,
  getFutureTrendStatusSnapshot,
  getLatestFutureTrendStatusSnapshot,
  listFutureTrendStatusSnapshots,
  type FutureTrendStatusInput,
  type FutureTrendStatusSnapshot,
} from '@/api/future-trend-status'

const visible = defineModel<boolean>({ required: true })

const rows = ref<FutureTrendStatusInput[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const isHistoryVisible = ref(false)
const snapshots = ref<FutureTrendStatusSnapshot[]>([])
const isHistoryLoading = ref(false)

const directionOptions = [
  { value: 'UP', label: '上涨' },
  { value: 'DOWN', label: '下跌' },
]
const segmentTypeOptions = [
  { value: 'TREND_IMPULSE', label: '趋势推动段' },
  { value: 'TREND_PULLBACK', label: '趋势回调段' },
  { value: 'RANGE_INTERNAL', label: '区间内部段' },
]
const lifecycleOptions = [
  { value: 'DECAY', label: '衰退' },
  { value: 'GROWTH', label: '生长' },
  { value: 'STRONG', label: '强势' },
]

const tableRows = computed(() => rows.value)

const createEmptyRow = (): FutureTrendStatusInput => ({
  contract: '',
  trend3hDirection: null,
  trend3hSegmentType: null,
  trend3hLifecycle: null,
  trend30fDirection: null,
  trend30fSegmentType: null,
  trend30fLifecycle: null,
})

const toInputs = (snapshot: FutureTrendStatusSnapshot | null) =>
  snapshot?.items.map(
    ({
      contract,
      trend3hDirection,
      trend3hSegmentType,
      trend3hLifecycle,
      trend30fDirection,
      trend30fSegmentType,
      trend30fLifecycle,
    }) => ({
      contract,
      trend3hDirection,
      trend3hSegmentType,
      trend3hLifecycle,
      trend30fDirection,
      trend30fSegmentType,
      trend30fLifecycle,
    }),
  ) ?? []

const loadLatest = async () => {
  isLoading.value = true
  try {
    rows.value = toInputs(await getLatestFutureTrendStatusSnapshot())
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载最新快照失败。')
  } finally {
    isLoading.value = false
  }
}

const addRow = () => rows.value.push(createEmptyRow())

const removeRow = (rowIndex: number) => rows.value.splice(rowIndex, 1)

const saveSnapshot = async () => {
  const items = rows.value.filter((row) => row.contract.trim())
  if (!items.length) {
    ElMessage.warning('请至少填写一个合约。')
    return
  }
  if (items.length !== rows.value.length) {
    ElMessage.warning('请填写或删除空白合约行。')
    return
  }
  if (new Set(items.map((row) => row.contract.trim())).size !== items.length) {
    ElMessage.warning('同一快照中不能重复填写合约。')
    return
  }

  isSaving.value = true
  try {
    const snapshot = await createFutureTrendStatusSnapshot(items)
    rows.value = toInputs(snapshot)
    ElMessage.success('快照已保存。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存快照失败。')
  } finally {
    isSaving.value = false
  }
}

const openHistory = async () => {
  isHistoryVisible.value = true
  isHistoryLoading.value = true
  try {
    snapshots.value = await listFutureTrendStatusSnapshots()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载历史快照失败。')
  } finally {
    isHistoryLoading.value = false
  }
}

const selectHistorySnapshot = async (snapshotKey: string) => {
  isLoading.value = true
  try {
    rows.value = toInputs(await getFutureTrendStatusSnapshot(snapshotKey))
    isHistoryVisible.value = false
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载历史快照失败。')
  } finally {
    isLoading.value = false
  }
}

watch(visible, (isVisible) => {
  if (!isVisible) {
    isHistoryVisible.value = false
    return
  }
  void loadLatest()
})
</script>

<template>
  <el-dialog
    v-model="visible"
    title="期货走势状态"
    width="min(1280px, 94vw)"
    top="6vh"
    append-to-body
    :destroy-on-close="false"
  >
    <template #header="{ titleId, titleClass }">
      <div class="flex items-center justify-between gap-4 pr-8">
        <span :id="titleId" :class="titleClass">期货走势状态</span>
        <div class="flex items-center gap-2">
          <el-button :loading="isSaving" type="primary" @click="saveSnapshot">保存快照</el-button>
          <el-button @click="openHistory">历史快照</el-button>
        </div>
      </div>
    </template>

    <div v-loading="isLoading" class="space-y-3">
      <div class="flex justify-end">
        <el-button plain type="primary" @click="addRow">新增合约</el-button>
      </div>
      <el-table
        :data="tableRows"
        border
        height="min(64vh, 680px)"
        empty-text="暂无数据，请新增合约。"
      >
        <el-table-column label="合约" min-width="130">
          <template #default="{ row }"
            ><el-input v-model="row.contract" placeholder="如 rb2601"
          /></template>
        </el-table-column>
        <el-table-column label="3H 方向" min-width="125">
          <template #default="{ row }"
            ><el-select v-model="row.trend3hDirection" clearable
              ><el-option
                v-for="option in directionOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value" /></el-select
          ></template>
        </el-table-column>
        <el-table-column label="3H 线段类型" min-width="160">
          <template #default="{ row }"
            ><el-select v-model="row.trend3hSegmentType" clearable
              ><el-option
                v-for="option in segmentTypeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value" /></el-select
          ></template>
        </el-table-column>
        <el-table-column label="3H 生命周期" min-width="125">
          <template #default="{ row }"
            ><el-select v-model="row.trend3hLifecycle" clearable
              ><el-option
                v-for="option in lifecycleOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value" /></el-select
          ></template>
        </el-table-column>
        <el-table-column label="30F 方向" min-width="125">
          <template #default="{ row }"
            ><el-select v-model="row.trend30fDirection" clearable
              ><el-option
                v-for="option in directionOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value" /></el-select
          ></template>
        </el-table-column>
        <el-table-column label="30F 线段类型" min-width="160">
          <template #default="{ row }"
            ><el-select v-model="row.trend30fSegmentType" clearable
              ><el-option
                v-for="option in segmentTypeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value" /></el-select
          ></template>
        </el-table-column>
        <el-table-column label="30F 生命周期" min-width="125">
          <template #default="{ row }"
            ><el-select v-model="row.trend30fLifecycle" clearable
              ><el-option
                v-for="option in lifecycleOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value" /></el-select
          ></template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="76">
          <template #default="{ $index }"
            ><el-button link type="danger" @click="removeRow($index)">删除</el-button></template
          >
        </el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="isHistoryVisible" title="历史快照" size="380px" append-to-body>
      <div v-loading="isHistoryLoading" class="space-y-2">
        <button
          v-for="snapshot in snapshots"
          :key="snapshot.snapshotKey"
          type="button"
          class="w-full rounded-md border border-slate-200 px-3 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
          @click="selectHistorySnapshot(snapshot.snapshotKey)"
        >
          <p class="font-medium text-slate-800">
            {{ dayjs(snapshot.snapshotAt).format('YYYY-MM-DD HH:mm:ss') }}
          </p>
          <p class="mt-1 text-xs text-slate-500">{{ snapshot.items.length }} 个合约</p>
        </button>
        <p
          v-if="!isHistoryLoading && !snapshots.length"
          class="py-10 text-center text-sm text-slate-400"
        >
          暂无历史快照
        </p>
      </div>
    </el-drawer>
  </el-dialog>
</template>
