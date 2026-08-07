<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  createTradingAccount,
  deleteTradingAccount,
  type TradingAccount,
  updateTradingAccount,
} from '@/api/trading'

const props = defineProps<{
  modelValue: boolean
  accounts: TradingAccount[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  changed: []
  deleted: [accountId: number]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const saving = ref(false)
const form = reactive({
  id: undefined as number | undefined,
  name: '',
  account: '',
  currency: 'CNY',
})

const isEditing = computed(() => form.id !== undefined)

const resetForm = () => {
  form.id = undefined
  form.name = ''
  form.account = ''
  form.currency = 'CNY'
}

const editAccount = (row: unknown) => {
  const account = row as TradingAccount
  form.id = account.id
  form.name = account.name
  form.account = account.account
  form.currency = account.currency
}

const save = async () => {
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      account: form.account.trim(),
      currency: form.currency.trim().toUpperCase(),
    }

    if (form.id === undefined) {
      await createTradingAccount(payload)
      ElMessage.success('账户已新增。')
    } else {
      await updateTradingAccount(form.id, payload)
      ElMessage.success('账户已更新。')
    }

    resetForm()
    emit('changed')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '账户保存失败。')
  } finally {
    saving.value = false
  }
}

const remove = async (row: unknown) => {
  const account = row as TradingAccount
  try {
    await ElMessageBox.confirm(
      `确认删除“${account.name}（${account.account}）”吗？删除前必须先移除该账户的全部交易记录。`,
      '删除交易账户',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
    await deleteTradingAccount(account.id)
    if (form.id === account.id) resetForm()
    emit('deleted', account.id)
    emit('changed')
    ElMessage.success('账户已删除。')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : '账户删除失败。')
  }
}

watch(visible, (isVisible) => {
  if (!isVisible) resetForm()
})
</script>

<template>
  <el-dialog v-model="visible" title="账户配置" width="min(760px, calc(100vw - 32px))" destroy-on-close>
    <el-form label-position="top" @submit.prevent="save">
      <div class="mb-4 flex items-center justify-between gap-3">
        <span class="font-medium text-slate-800">{{ isEditing ? '编辑账户' : '新增账户' }}</span>
        <el-button v-if="isEditing" text @click="resetForm">取消编辑</el-button>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <el-form-item label="账户名称" required><el-input v-model="form.name" placeholder="例如：主账户" /></el-form-item>
        <el-form-item label="交易账户" required><el-input v-model="form.account" placeholder="例如：12345678" /></el-form-item>
        <el-form-item label="货币" required><el-select v-model="form.currency" filterable allow-create default-first-option placeholder="例如：CNY"><el-option label="人民币（CNY）" value="CNY" /><el-option label="美元（USD）" value="USD" /><el-option label="欧元（EUR）" value="EUR" /></el-select></el-form-item>
      </div>
      <div class="mb-5 flex justify-end gap-2"><el-button @click="resetForm">重置</el-button><el-button type="primary" native-type="submit" :loading="saving">{{ isEditing ? '保存修改' : '新增账户' }}</el-button></div>
    </el-form>

    <el-table :data="accounts" v-loading="loading" border stripe empty-text="暂无账户">
      <el-table-column prop="id" label="ID" width="72" />
      <el-table-column prop="name" label="账户名称" min-width="160" />
      <el-table-column prop="account" label="交易账户" min-width="160" />
      <el-table-column prop="currency" label="货币" width="100" />
      <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="editAccount(row)">编辑</el-button><el-button link type="danger" @click="remove(row)">删除</el-button></template></el-table-column>
    </el-table>
  </el-dialog>
</template>
