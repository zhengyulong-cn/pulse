<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  createPineScript,
  deletePineScript,
  listPineScripts,
  updatePineScript,
  type PineScript,
  type PineScriptInput,
  type PineScriptType,
} from '@/api/pine-scripts'

type ScriptDraft = PineScriptInput
type ScriptFilter = 'ALL' | PineScriptType

const scripts = ref<PineScript[]>([])
const selectedScriptId = ref<number>()
const filter = ref<ScriptFilter>('ALL')
const draft = ref<ScriptDraft>()
const isLoading = ref(false)
const isSaving = ref(false)

const selectedScript = computed(() =>
  scripts.value.find((script) => script.id === selectedScriptId.value),
)
const filterOptions: Array<{ label: string; value: ScriptFilter }> = [
  { label: '全部', value: 'ALL' },
  { label: '指标', value: 'INDICATOR' },
  { label: '策略', value: 'STRATEGY' },
]

const typeLabel = (type: PineScriptType) => (type === 'INDICATOR' ? '指标' : '策略')

const selectScript = (script: PineScript) => {
  selectedScriptId.value = script.id
  draft.value = { content: script.content, description: script.description, type: script.type }
}

const loadScripts = async (preferredScriptId?: number) => {
  isLoading.value = true
  try {
    scripts.value = await listPineScripts(filter.value === 'ALL' ? undefined : filter.value)
    const script =
      scripts.value.find((item) => item.id === preferredScriptId) ??
      scripts.value.find((item) => item.id === selectedScriptId.value) ??
      scripts.value[0]
    if (script) selectScript(script)
    else {
      selectedScriptId.value = undefined
      draft.value = undefined
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '脚本列表加载失败。')
  } finally {
    isLoading.value = false
  }
}

const addScript = async () => {
  try {
    const script = await createPineScript({
      description: '未命名脚本',
      type: filter.value === 'STRATEGY' ? 'STRATEGY' : 'INDICATOR',
      content: '//@version=6\nindicator("未命名指标", overlay = true)\n',
    })
    if (filter.value !== 'ALL' && script.type !== filter.value) filter.value = script.type
    await loadScripts(script.id)
    ElMessage.success('脚本已创建。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '脚本创建失败。')
  }
}

const saveScript = async () => {
  if (!selectedScript.value || !draft.value) return
  if (!draft.value.description.trim() || !draft.value.content.trim()) {
    ElMessage.warning('请填写脚本介绍和源码。')
    return
  }

  isSaving.value = true
  try {
    const script = await updatePineScript(selectedScript.value.id, {
      ...draft.value,
      description: draft.value.description.trim(),
    })
    if (filter.value !== 'ALL' && script.type !== filter.value) await loadScripts()
    else {
      const index = scripts.value.findIndex((item) => item.id === script.id)
      if (index >= 0) scripts.value[index] = script
      selectScript(script)
    }
    ElMessage.success('脚本已保存。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '脚本保存失败。')
  } finally {
    isSaving.value = false
  }
}

const removeScript = async (script: PineScript) => {
  try {
    await ElMessageBox.confirm(`确定删除“${script.description}”吗？`, '删除脚本', {
      type: 'warning',
    })
    await deletePineScript(script.id)
    await loadScripts()
    ElMessage.success('脚本已删除。')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : '脚本删除失败。')
  }
}

onMounted(() => void loadScripts())
</script>

<template>
  <main class="min-h-[calc(100vh-2.5rem)] bg-slate-100 px-3 py-5 text-slate-800 sm:px-5 lg:px-6">
    <div class="mx-auto max-w-[1800px]">
      <header class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">脚本工作台</h1>
        </div>
        <el-button type="primary" class="!h-9 !rounded-lg !font-semibold" @click="addScript"
          >新建脚本</el-button
        >
      </header>

      <div
        class="flex min-h-[calc(100vh-11rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <aside class="flex w-80 shrink-0 flex-col bg-slate-50/60 border-r border-slate-200">
          <div class="space-y-3 border-b border-slate-200 bg-white p-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-slate-700">脚本列表</h2>
              <span class="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-400">{{
                scripts.length
              }}</span>
            </div>
            <el-select v-model="filter" class="w-full" @change="loadScripts()">
              <el-option
                v-for="option in filterOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </div>

          <div v-loading="isLoading" class="min-h-0 flex-1 overflow-y-auto p-2.5">
            <button
              v-for="script in scripts"
              :key="script.id"
              type="button"
              class="mb-1 flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors"
              :class="
                script.id === selectedScriptId
                  ? 'border-blue-100 bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-700 hover:border-slate-200 hover:bg-white'
              "
              @click="selectScript(script)"
            >
              <span class="min-w-0 flex-1 truncate text-sm">{{ script.description }}</span>
              <span class="shrink-0 text-xs text-slate-400">{{ typeLabel(script.type) }}</span>
              <span
                class="shrink-0 text-slate-400 hover:text-red-500"
                title="删除脚本"
                @click.stop="removeScript(script)"
                >×</span
              >
            </button>
            <p
              v-if="!isLoading && scripts.length === 0"
              class="p-6 text-center text-sm text-slate-400"
            >
              暂无脚本
            </p>
          </div>
        </aside>

        <section class="flex min-w-0 flex-1 flex-col bg-white">
          <template v-if="draft && selectedScript">
            <header class="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3.5">
              <el-input v-model="draft.description" class="!w-80" placeholder="脚本介绍" />
              <el-select v-model="draft.type" class="!w-28">
                <el-option label="指标" value="INDICATOR" />
                <el-option label="策略" value="STRATEGY" />
              </el-select>
              <span class="ml-auto text-xs text-slate-400"
                >更新于 {{ new Date(selectedScript.updatedAt).toLocaleString() }}</span
              >
              <el-button
                :rows="15"
                type="primary"
                class="!h-9 !rounded-lg !font-semibold"
                :loading="isSaving"
                @click="saveScript"
                >保存</el-button
              >
            </header>
            <div class="min-h-0 flex-1 bg-slate-50/40 p-4 sm:p-5">
              <el-input
                v-model="draft.content"
                class="h-full font-mono"
                type="textarea"
                resize="none"
                placeholder="请输入 Pine Script 源码"
              />
            </div>
          </template>
          <div
            v-else
            class="flex flex-1 flex-col items-center justify-center text-sm text-slate-400"
          >
            <span
              class="mb-3 flex size-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-500"
              >⌘</span
            >
            请选择或新建一个脚本
          </div>
        </section>
      </div>
    </div>
  </main>
</template>
