import { listPineScripts, type PineScript } from '@/api/pine-scripts'

export type AdvancedIndicatorsDropdownApi = {
  applyOptions: (options: { items: Array<{ onSelect: () => void; title: string }> }) => void
  remove: () => void
}

type ChartDropdownApi = AdvancedIndicatorsDropdownApi

type ChartWidgetWithDropdown = {
  createDropdown: (options: {
    align: 'left' | 'right'
    icon?: string
    items: Array<{ onSelect: () => void; title: string }>
    title: string
    tooltip?: string
  }) => Promise<ChartDropdownApi>
}

const getScriptName = (script: PineScript) =>
  script.content.match(/indicator\s*\(\s*["']([^"']+)["']/)?.[1] ?? script.description

export const createAdvancedIndicatorsDropdown = async (
  widget: ChartWidgetWithDropdown,
  activeScriptIds: () => number[],
  toggleScript: (script: PineScript) => void,
) => {
  const dropdown = await widget.createDropdown({
    align: 'left',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><rect x="15" y="5" width="4" height="12" rx="1"/><rect x="7" y="8" width="4" height="9" rx="1"/></svg>',
    title: '高级指标',
    tooltip: '高级指标',
    items: [{ title: '加载中…', onSelect: () => undefined }],
  })
  let scripts: PineScript[] = []

  const createItems = () =>
    scripts.map((script) => ({
      title: `${activeScriptIds().includes(script.id) ? '✓ ' : ''}${getScriptName(script)}`,
      onSelect: () => {
        toggleScript(script)
        dropdown.applyOptions({ items: createItems() })
      },
    }))

  void listPineScripts('INDICATOR').then(
    (nextScripts) => {
      scripts = nextScripts
      dropdown.applyOptions({ items: createItems() })
    },
    () => {
      dropdown.applyOptions({
        items: [{ title: '指标加载失败', onSelect: () => undefined }],
      })
    },
  )

  return dropdown
}
