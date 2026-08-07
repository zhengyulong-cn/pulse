<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { Copy, Landmark } from '@lucide/vue'

import {
  createTradeRecordsBatch,
  type BatchTradeRecordInput,
  type TradingAccount,
} from '@/api/trading'
import { importPrompt } from './prompt'

const props = defineProps<{
  modelValue: boolean
  account?: TradingAccount
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const rawJson = ref('')
const previewRecords = ref<BatchTradeRecordInput[]>([])
const parseError = ref('')
const saving = ref(false)
const requiredFields: Array<keyof BatchTradeRecordInput> = [
  'underlyingName',
  'underlyingCode',
  'marketRegion',
  'direction',
  'quantity',
  'openTime',
  'openPrice',
]

const invalidRowNumbers = computed(() => previewRecords.value.flatMap((record, index) =>
  requiredFields.some((field) => record[field] === undefined || record[field] === null || record[field] === '') ? [index + 1] : [],
))

const canSubmit = computed(() => previewRecords.value.length > 0 && !parseError.value && invalidRowNumbers.value.length === 0)

const formatDateTime = (value: string | null | undefined) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—'

const copyImportPrompt = async () => {
  try {
    await navigator.clipboard.writeText(importPrompt)
    ElMessage.success('导入提示词已复制到剪贴板。')
  } catch {
    ElMessage.error('复制失败，请检查浏览器剪贴板权限。')
  }
}

const parseJson = () => {
  if (!rawJson.value.trim()) {
    previewRecords.value = []
    parseError.value = ''
    return
  }

  try {
    const parsed: unknown = JSON.parse(rawJson.value)
    if (!Array.isArray(parsed) || parsed.some((record) => record === null || typeof record !== 'object' || Array.isArray(record))) {
      throw new Error('请输入由对象组成的 JSON 数组。')
    }
    previewRecords.value = parsed as BatchTradeRecordInput[]
    parseError.value = ''
  } catch (error) {
    previewRecords.value = []
    parseError.value = error instanceof Error ? error.message : 'JSON 格式不正确。'
  }
}

const reset = () => {
  rawJson.value = ''
  previewRecords.value = []
  parseError.value = ''
}

const save = async () => {
  if (!props.account || !canSubmit.value) return

  saving.value = true
  try {
    const tradeRecords = await createTradeRecordsBatch(props.account.id, previewRecords.value)
    ElMessage.success(`已新增 ${tradeRecords.length} 条交易记录。`)
    visible.value = false
    emit('saved')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '批量新增交易记录失败。')
  } finally {
    saving.value = false
  }
}

watch(rawJson, parseJson)
watch(visible, (isVisible) => {
  if (!isVisible) reset()
})
</script>

<template>
  <el-dialog v-model="visible" title="批量新增交易记录" width="min(1480px, calc(100vw - 32px))" destroy-on-close>
    <div class="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-sm text-blue-700"><Landmark :size="17" /><span>记录将添加到：</span><strong>{{ account?.name }} · {{ account?.account }}（{{ account?.currency }}）</strong></div>
    <div class="grid gap-4 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
      <section class="min-w-0">
        <div class="mb-2 flex items-center justify-between gap-3"><h3 class="font-medium text-slate-800">粘贴 JSON</h3><el-button size="small" @click="copyImportPrompt"><Copy :size="14" />一键复制 prompt</el-button></div>
        <el-input v-model="rawJson" type="textarea" :rows="23" resize="none" class="font-mono" placeholder='[\n  {\n    "underlyingName": "焦煤2609",\n    "underlyingCode": "jm2609",\n    "marketRegion": "MAINLAND_FUTURES",\n    "direction": "SHORT",\n    "quantity": "12",\n    "openTime": "2026-08-06T21:11:11.000+08:00",\n    "openPrice": "1258.5"\n  }\n]' />
        <p v-if="parseError" class="mt-2 text-sm text-rose-600">{{ parseError }}</p>
        <p v-else-if="invalidRowNumbers.length" class="mt-2 text-sm text-rose-600">第 {{ invalidRowNumbers.join('、') }} 条缺少必填字段。</p>
        <p v-else class="mt-2 text-xs leading-5 text-slate-400">必填：标的名称、代码、市场、方向、手数、开仓时间、开仓价格。手续费缺失时按 0 保存。</p>
      </section>

      <section class="min-w-0">
        <div class="mb-2 flex items-center justify-between"><h3 class="font-medium text-slate-800">记录预览</h3><span class="text-xs text-slate-400">{{ previewRecords.length }} 条</span></div>
        <div class="max-h-[560px] overflow-auto rounded-lg border border-slate-200">
          <el-table :data="previewRecords" size="small" empty-text="粘贴有效 JSON 后将在此预览">
            <el-table-column type="index" label="#" width="54" />
            <el-table-column prop="underlyingName" label="标的名称" min-width="120" />
            <el-table-column prop="underlyingCode" label="代码" width="100" />
            <el-table-column prop="marketRegion" label="市场" width="145" />
            <el-table-column label="方向" width="76"><template #default="{ row }">{{ row.direction === 'LONG' ? '做多' : row.direction === 'SHORT' ? '做空' : '—' }}</template></el-table-column>
            <el-table-column prop="quantity" label="手数" width="76" align="right" />
            <el-table-column label="开仓时间" width="166"><template #default="{ row }">{{ formatDateTime(row.openTime) }}</template></el-table-column>
            <el-table-column prop="openPrice" label="开仓价" width="90" align="right" />
            <el-table-column label="平仓时间" width="166"><template #default="{ row }">{{ formatDateTime(row.closeTime) }}</template></el-table-column>
            <el-table-column label="平仓价" width="90" align="right"><template #default="{ row }">{{ row.closePrice ?? '—' }}</template></el-table-column>
            <el-table-column label="盈亏" width="90" align="right"><template #default="{ row }">{{ row.realizedPnl ?? '—' }}</template></el-table-column>
            <el-table-column label="手续费" width="90" align="right"><template #default="{ row }">{{ row.fee ?? '0' }}</template></el-table-column>
          </el-table>
        </div>
      </section>
    </div>
    <template #footer><el-button @click="visible = false">取消</el-button><el-button type="primary" :disabled="!canSubmit" :loading="saving" @click="save">新增 {{ previewRecords.length }} 条记录</el-button></template>
  </el-dialog>
</template>
