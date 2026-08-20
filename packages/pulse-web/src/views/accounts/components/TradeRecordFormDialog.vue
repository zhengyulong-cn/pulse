<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, genFileId, type UploadRequestOptions, type UploadUserFile } from 'element-plus'
import { Landmark } from '@lucide/vue'

import {
  createTradeRecord,
  getUploadedFileUrl,
  type TradeScreenshot,
  type TradeRecord,
  type TradingAccount,
  uploadFiles,
  updateTradeRecord,
} from '@/api/trading'

const props = defineProps<{
  modelValue: boolean
  account?: TradingAccount
  record?: TradeRecord
  historicalTags?: string[]
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
  openReason: '',
  screenshots: [] as TradeScreenshot[],
  reflection: '',
  tags: [] as string[],
  closeTime: null as Date | null,
  closePrice: '',
  closeReason: '',
  realizedPnl: '',
  fee: '',
})
const screenshotFiles = ref<UploadUserFile[]>([])
const screenshotUploading = ref(false)
const screenshotPreviewVisible = ref(false)
const screenshotPreviewUrl = ref('')

const isEditing = computed(() => props.record !== undefined)
const title = computed(() => (isEditing.value ? '修改交易记录' : '新增交易记录'))
const formatApiDateTime = (value: Date) => dayjs(value).format('YYYY-MM-DDTHH:mm:ss.SSSZ')

const resetForm = () => {
  const record = props.record
  form.underlyingName = record?.underlyingName ?? ''
  form.underlyingCode = record?.underlyingCode ?? ''
  form.direction = record?.direction ?? 'LONG'
  form.quantity = record?.quantity ?? ''
  form.openTime = record ? dayjs(record.openTime).toDate() : dayjs().toDate()
  form.openPrice = record?.openPrice ?? ''
  form.openReason = record?.openReason ?? ''
  form.screenshots = record?.screenshots ? [...record.screenshots] : []
  form.reflection = record?.reflection ?? ''
  form.tags = record?.tags ? [...record.tags] : []
  screenshotFiles.value = form.screenshots.map((screenshot) => ({
    name: screenshot.original_name,
    response: screenshot,
    status: 'success',
    url: getUploadedFileUrl(screenshot.path),
  }))
  form.closeTime = record?.closeTime ? dayjs(record.closeTime).toDate() : null
  form.closePrice = record?.closePrice ?? ''
  form.closeReason = record?.closeReason ?? ''
  form.realizedPnl = record?.realizedPnl ?? ''
  form.fee = record?.fee ?? ''
}

const beforeScreenshotUpload = (file: File) => {
  if (file.type.startsWith('image/')) return true
  ElMessage.warning('截图仅支持图片文件。')
  return false
}

const uploadScreenshot = async (options: UploadRequestOptions) => {
  screenshotUploading.value = true
  try {
    const uploadedFile = (await uploadFiles([options.file], 'trade_records_screenshots'))[0]
    if (!uploadedFile) throw new Error('截图上传没有返回文件信息。')
    form.screenshots = [...form.screenshots, uploadedFile]
    const fileItem = screenshotFiles.value.find((item) => item.uid === options.file.uid)
    if (fileItem) {
      fileItem.name = uploadedFile.original_name
      fileItem.response = uploadedFile
      fileItem.status = 'success'
      fileItem.url = getUploadedFileUrl(uploadedFile.path)
    }
    ElMessage.success('截图已上传。')
    return uploadedFile
  } finally {
    screenshotUploading.value = false
  }
}

const removeScreenshot = (file: UploadUserFile) => {
  const uploadedFile = file.response as TradeScreenshot | undefined
  if (uploadedFile?.path)
    form.screenshots = form.screenshots.filter(
      (screenshot) => screenshot.path !== uploadedFile.path,
    )
}

const previewScreenshot = (file: UploadUserFile) => {
  if (!file.url) return
  screenshotPreviewUrl.value = file.url
  screenshotPreviewVisible.value = true
}

const uploadPastedScreenshot = async (file: File) => {
  if (form.screenshots.length >= 10) {
    ElMessage.warning('最多上传 10 张截图。')
    return
  }

  screenshotUploading.value = true
  try {
    const uploadedFile = (await uploadFiles([file], 'trade_records_screenshots'))[0]
    if (!uploadedFile) throw new Error('截图上传没有返回文件信息。')

    form.screenshots = [...form.screenshots, uploadedFile]
    screenshotFiles.value.push({
      uid: genFileId(),
      name: uploadedFile.original_name,
      response: uploadedFile,
      status: 'success',
      url: getUploadedFileUrl(uploadedFile.path),
    })
    ElMessage.success('截图已上传。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '截图上传失败。')
  } finally {
    screenshotUploading.value = false
  }
}

const handleScreenshotPaste = (event: ClipboardEvent) => {
  if (!visible.value || screenshotUploading.value) return

  const image = Array.from(event.clipboardData?.files ?? []).find((file) =>
    file.type.startsWith('image/'),
  )
  if (!image) return

  event.preventDefault()
  void uploadPastedScreenshot(image)
}

const save = async () => {
  if (!props.account) return
  if (
    !form.underlyingName.trim() ||
    !form.underlyingCode.trim() ||
    !form.quantity ||
    !form.openPrice ||
    !form.fee
  ) {
    ElMessage.warning('请填写标的、手数、开仓价格和手续费。')
    return
  }

  const payload = {
    accountId: props.account.id,
    underlyingName: form.underlyingName.trim(),
    underlyingCode: form.underlyingCode.trim(),
    direction: form.direction,
    quantity: form.quantity,
    openTime: formatApiDateTime(form.openTime),
    openPrice: form.openPrice,
    openReason: form.openReason.trim() || null,
    screenshots: form.screenshots.length > 0 ? form.screenshots : null,
    reflection: form.reflection.trim() || null,
    tags: form.tags,
    closeTime: form.closeTime ? formatApiDateTime(form.closeTime) : null,
    closePrice: form.closePrice || null,
    closeReason: form.closeReason.trim() || null,
    realizedPnl: form.realizedPnl || null,
    fee: form.fee,
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
    ElMessage.error(
      error instanceof Error ? error.message : `交易记录${isEditing.value ? '更新' : '新增'}失败。`,
    )
  } finally {
    saving.value = false
  }
}

watch(
  visible,
  (isVisible) => {
    if (isVisible) {
      resetForm()
      window.addEventListener('paste', handleScreenshotPaste)
      return
    }
    window.removeEventListener('paste', handleScreenshotPaste)
  },
  { immediate: true },
)

onBeforeUnmount(() => window.removeEventListener('paste', handleScreenshotPaste))
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="min(1080px, calc(100vw - 32px))"
    destroy-on-close
  >
    <div
      class="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-sm text-blue-700"
    >
      <Landmark :size="17" /><span>{{ isEditing ? '记录所属账户：' : '记录将添加到：' }}</span
      ><strong>{{ account?.name }} · {{ account?.account }}（{{ account?.currency }}）</strong>
    </div>
    <el-form label-position="top" @submit.prevent="save">
      <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-5">
        <el-form-item label="标的名称" required
          ><el-input v-model="form.underlyingName" placeholder="例如：沪深300"
        /></el-form-item>
        <el-form-item label="标的代码" required
          ><el-input v-model="form.underlyingCode" placeholder="例如：000300"
        /></el-form-item>
        <el-form-item label="开仓方向" required
          ><el-radio-group v-model="form.direction"
            ><el-radio-button value="LONG">做多</el-radio-button
            ><el-radio-button value="SHORT">做空</el-radio-button></el-radio-group
          ></el-form-item
        >
        <el-form-item label="手数" required
          ><el-input v-model="form.quantity" inputmode="decimal" placeholder="例如：1"
        /></el-form-item>
        <el-form-item label="开仓时间" required
          ><el-date-picker v-model="form.openTime" type="datetime" class="!w-full"
        /></el-form-item>
        <el-form-item label="开仓价格" required
          ><el-input v-model="form.openPrice" inputmode="decimal" placeholder="例如：4000.25"
        /></el-form-item>
        <el-form-item label="平仓时间"
          ><el-date-picker v-model="form.closeTime" type="datetime" class="!w-full" clearable
        /></el-form-item>
        <el-form-item label="平仓价格"
          ><el-input v-model="form.closePrice" inputmode="decimal" placeholder="未平仓可留空"
        /></el-form-item>
        <el-form-item label="手续费" required
          ><el-input v-model="form.fee" inputmode="decimal" placeholder="例如：12.50"
        /></el-form-item>
        <el-form-item label="真实盈亏"
          ><el-input v-model="form.realizedPnl" inputmode="decimal" placeholder="未平仓可留空"
        /></el-form-item>
        <el-form-item class="col-span-2" label="开仓缘由"
          ><el-input
            type="textarea"
            :rows="5"
            v-model="form.openReason"
            placeholder="例如：突破关键压力位"
        /></el-form-item>
        <el-form-item class="col-span-2" label="平仓缘由"
          ><el-input
            type="textarea"
            :rows="5"
            v-model="form.closeReason"
            placeholder="例如：止盈离场"
        /></el-form-item>
        <el-form-item class="col-span-2" label="交易反思"
          ><el-input
            v-model="form.reflection"
            type="textarea"
            :rows="5"
            placeholder="记录本次交易中做得好或需要改进的地方"
        /></el-form-item>
        <el-form-item class="col-span-2" label="标签">
          <el-select
            v-model="form.tags"
            class="!w-full"
            multiple
            filterable
            allow-create
            default-first-option
            :reserve-keyword="false"
            placeholder="选择或输入标签"
          >
            <el-option v-for="tag in historicalTags ?? []" :key="tag" :label="tag" :value="tag" />
          </el-select>
        </el-form-item>
        <el-form-item class="col-span-5" label="截图">
          <div>
            <el-upload
              v-model:file-list="screenshotFiles"
              accept="image/*"
              list-type="picture-card"
              :auto-upload="true"
              :before-upload="beforeScreenshotUpload"
              :http-request="uploadScreenshot"
              :limit="10"
              multiple
              :disabled="screenshotUploading"
              @preview="previewScreenshot"
              @remove="removeScreenshot"
              ><span class="text-xl leading-none">+</span></el-upload
            >
            <p class="mt-1 text-xs text-slate-400">支持单张图片，上传后可点击预览。</p>
          </div>
        </el-form-item>
      </div>
      <div class="mt-2 flex justify-end gap-2">
        <el-button @click="visible = false">取消</el-button
        ><el-button type="primary" native-type="submit" :loading="saving">{{
          isEditing ? '保存修改' : '保存记录'
        }}</el-button>
      </div>
    </el-form>
    <el-dialog
      v-model="screenshotPreviewVisible"
      append-to-body
      title="交易截图"
      width="min(920px, calc(100vw - 32px))"
    >
      <img
        :src="screenshotPreviewUrl"
        class="mx-auto max-h-[70vh] max-w-full object-contain"
        alt="交易截图"
      />
    </el-dialog>
  </el-dialog>
</template>
