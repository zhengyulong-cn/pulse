<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { Landmark } from '@lucide/vue'

import {
  createTradeRecord,
  type TradeRecord,
  type TradingAccount,
  updateTradeRecord,
} from '@/api/trading'

const props = defineProps<{
  modelValue: boolean
  account?: TradingAccount
  record?: TradeRecord
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})
const saving = ref(false)
const form = reactive({
  underlyingName: '',
  underlyingCode: '',
  direction: 'LONG' as 'LONG' | 'SHORT',
  quantity: '',
  openTime: dayjs().toDate(),
  openPrice: '',
  closeTime: null as Date | null,
  closePrice: '',
  realizedPnl: '',
  fee: '',
  extraJson: '',
})

const isEditing = computed(() => props.record !== undefined)
const title = computed(() => isEditing.value ? '修改交易记录' : '新增交易记录')
const formatApiDateTime = (value: Date) => dayjs(value).format('YYYY-MM-DDTHH:mm:ss.SSSZ')

const resetForm = () => {
  const record = props.record
  form.underlyingName = record?.underlyingName ?? ''
  form.underlyingCode = record?.underlyingCode ?? ''
  form.direction = record?.direction ?? 'LONG'
  form.quantity = record?.quantity ?? ''
  form.openTime = record ? dayjs(record.openTime).toDate() : dayjs().toDate()
  form.openPrice = record?.openPrice ?? ''
  form.closeTime = record?.closeTime ? dayjs(record.closeTime).toDate() : null
  form.closePrice = record?.closePrice ?? ''
  form.realizedPnl = record?.realizedPnl ?? ''
  form.fee = record?.fee ?? ''
  form.extraJson = record?.extraJson ? JSON.stringify(record.extraJson, null, 2) : ''
}

const save = async () => {
  if (!props.account) return
  if (!form.underlyingName.trim() || !form.underlyingCode.trim() || !form.quantity || !form.openPrice || !form.fee) {
    ElMessage.warning('请填写标的、手数、开仓价格和手续费。')
    return
  }

  let extraJson: Record<string, unknown> | null = null
  if (form.extraJson.trim()) {
    try {
      const parsed = JSON.parse(form.extraJson)
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error()
      extraJson = parsed as Record<string, unknown>
    } catch {
      ElMessage.warning('extra_json 必须是合法的 JSON 对象。')
      return
    }
  }

  const payload = {
    accountId: props.account.id,
    underlyingName: form.underlyingName.trim(),
    underlyingCode: form.underlyingCode.trim(),
    direction: form.direction,
    quantity: form.quantity,
    openTime: formatApiDateTime(form.openTime),
    openPrice: form.openPrice,
    closeTime: form.closeTime ? formatApiDateTime(form.closeTime) : null,
    closePrice: form.closePrice || null,
    realizedPnl: form.realizedPnl || null,
    fee: form.fee,
    extraJson,
  }

  saving.value = true
  try {
    if (props.record) {
      await updateTradeRecord(props.record.id, payload)
      ElMessage.success('交易记录已更新。')
    } else {
      await createTradeRecord(payload)
      ElMessage.success('交易记录已新增。')
    }
    visible.value = false
    emit('saved')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : `交易记录${isEditing.value ? '更新' : '新增'}失败。`)
  } finally {
    saving.value = false
  }
}

watch(visible, (isVisible) => {
  if (isVisible) resetForm()
})
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="min(840px, calc(100vw - 32px))" destroy-on-close>
    <div class="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-sm text-blue-700"><Landmark :size="17" /><span>{{ isEditing ? '记录所属账户：' : '记录将添加到：' }}</span><strong>{{ account?.name }} · {{ account?.account }}（{{ account?.currency }}）</strong></div>
    <el-form label-position="top" @submit.prevent="save">
      <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
        <el-form-item label="标的名称" required><el-input v-model="form.underlyingName" placeholder="例如：沪深300" /></el-form-item>
        <el-form-item label="标的代码" required><el-input v-model="form.underlyingCode" placeholder="例如：000300" /></el-form-item>
        <el-form-item label="开仓方向" required><el-radio-group v-model="form.direction"><el-radio-button value="LONG">做多</el-radio-button><el-radio-button value="SHORT">做空</el-radio-button></el-radio-group></el-form-item>
        <el-form-item label="手数" required><el-input v-model="form.quantity" inputmode="decimal" placeholder="例如：1" /></el-form-item>
        <el-form-item label="开仓时间" required><el-date-picker v-model="form.openTime" type="datetime" class="!w-full" /></el-form-item>
        <el-form-item label="开仓价格" required><el-input v-model="form.openPrice" inputmode="decimal" placeholder="例如：4000.25" /></el-form-item>
        <el-form-item label="手续费" required><el-input v-model="form.fee" inputmode="decimal" placeholder="例如：12.50" /></el-form-item>
        <el-form-item label="平仓时间"><el-date-picker v-model="form.closeTime" type="datetime" class="!w-full" clearable /></el-form-item>
        <el-form-item label="平仓价格"><el-input v-model="form.closePrice" inputmode="decimal" placeholder="未平仓可留空" /></el-form-item>
        <el-form-item label="真实盈亏"><el-input v-model="form.realizedPnl" inputmode="decimal" placeholder="未平仓可留空" /></el-form-item>
        <el-form-item class="sm:col-span-2 lg:col-span-4" label="extra_json"><el-input v-model="form.extraJson" type="textarea" :rows="3" placeholder='例如：{ "strategy": "突破" }' /></el-form-item>
      </div>
      <div class="mt-2 flex justify-end gap-2"><el-button @click="visible = false">取消</el-button><el-button type="primary" native-type="submit" :loading="saving">{{ isEditing ? '保存修改' : '保存记录' }}</el-button></div>
    </el-form>
  </el-dialog>
</template>
