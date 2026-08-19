import type { CanvasRenderingTarget2D } from 'fancy-canvas'
import type {
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts'

export type PineTableCell = {
  bgcolor?: string
  height?: number
  text?: string
  text_color?: string
  text_font_family?: string
  text_halign?: 'center' | 'left' | 'right'
  text_size?: 'auto' | 'huge' | 'large' | 'normal' | 'small' | 'tiny'
  text_valign?: 'bottom' | 'center' | 'top'
  width?: number
}

export type PineTable = {
  bgcolor?: { border_width?: number }
  border_color?: string
  border_width?: number
  cells: PineTableCell[][]
  columns: number
  frame_color?: string
  frame_width?: number
  id: number
  position?: string
  rows: number
}

const fontSizeByTextSize: Record<NonNullable<PineTableCell['text_size']>, number> = {
  auto: 14,
  huge: 24,
  large: 18,
  normal: 14,
  small: 12,
  tiny: 10,
}

const TABLE_MARGIN = 12

const tableOrigin = (
  position: string | undefined,
  paneWidth: number,
  paneHeight: number,
  tableWidth: number,
  tableHeight: number,
) => {
  const left = TABLE_MARGIN
  const centerX = Math.max(TABLE_MARGIN, (paneWidth - tableWidth) / 2)
  const right = Math.max(TABLE_MARGIN, paneWidth - tableWidth - TABLE_MARGIN)
  const top = TABLE_MARGIN
  const centerY = Math.max(TABLE_MARGIN, (paneHeight - tableHeight) / 2)
  const bottom = Math.max(TABLE_MARGIN, paneHeight - tableHeight - TABLE_MARGIN)

  const origins = {
    bottom_center: { x: centerX, y: bottom },
    bottom_left: { x: left, y: bottom },
    bottom_right: { x: right, y: bottom },
    middle_center: { x: centerX, y: centerY },
    middle_left: { x: left, y: centerY },
    middle_right: { x: right, y: centerY },
    top_center: { x: centerX, y: top },
    top_left: { x: left, y: top },
    top_right: { x: right, y: top },
  }

  return origins[position as keyof typeof origins] ?? origins.bottom_right
}

class PineTableRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly tables: PineTable[]) {}

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(
      ({ bitmapSize, context, horizontalPixelRatio, verticalPixelRatio }) => {
        context.save()
        for (const table of this.tables) {
          const columns = Math.max(table.columns, ...table.cells.map((row) => row.length), 1)
          const rows = Math.max(table.rows, table.cells.length, 1)
          const columnWidths = Array.from({ length: columns }, (_, column) =>
            Math.max(
              ...table.cells.map((row) => {
                const cell = row[column]
                if (!cell) return 0
                const fontSize = fontSizeByTextSize[cell.text_size ?? 'normal']
                context.font = `${fontSize * verticalPixelRatio}px ${cell.text_font_family === 'monospace' ? 'monospace' : 'sans-serif'}`
                const defaultWidth =
                  context.measureText(cell.text ?? '').width / horizontalPixelRatio + 20
                return cell.width && cell.width > 0 ? cell.width : Math.max(defaultWidth, 56)
              }),
              56,
            ),
          )
          const rowHeights = Array.from({ length: rows }, (_, row) =>
            Math.max(
              ...(table.cells[row] ?? []).map((cell) =>
                cell.height && cell.height > 0
                  ? cell.height
                  : Math.max(fontSizeByTextSize[cell.text_size ?? 'normal'] * 1.5, 28),
              ),
              28,
            ),
          )
          const tableWidth = columnWidths.reduce((total, width) => total + width, 0)
          const tableHeight = rowHeights.reduce((total, height) => total + height, 0)
          const origin = tableOrigin(
            table.position,
            bitmapSize.width / horizontalPixelRatio,
            bitmapSize.height / verticalPixelRatio,
            tableWidth,
            tableHeight,
          )
          const borderColor = table.border_color || '#64748b'
          const borderWidth = table.bgcolor?.border_width ?? table.border_width ?? 1
          let y = origin.y

          for (let row = 0; row < rows; row += 1) {
            let x = origin.x
            for (let column = 0; column < columns; column += 1) {
              const cell = table.cells[row]?.[column] ?? {}
              const width = columnWidths[column]
              const height = rowHeights[row]
              const left = x * horizontalPixelRatio
              const top = y * verticalPixelRatio
              const scaledWidth = width * horizontalPixelRatio
              const scaledHeight = height * verticalPixelRatio
              context.fillStyle = cell.bgcolor ?? 'rgba(255, 255, 255, 0.85)'
              context.fillRect(left, top, scaledWidth, scaledHeight)
              if (borderWidth > 0) {
                context.strokeStyle = borderColor
                context.lineWidth = borderWidth * horizontalPixelRatio
                context.strokeRect(left, top, scaledWidth, scaledHeight)
              }
              const fontSize = fontSizeByTextSize[cell.text_size ?? 'normal'] * verticalPixelRatio
              context.font = `${fontSize}px ${cell.text_font_family === 'monospace' ? 'monospace' : 'sans-serif'}`
              context.fillStyle = cell.text_color ?? '#0f172a'
              context.textAlign = cell.text_halign ?? 'center'
              context.textBaseline =
                cell.text_valign === 'top'
                  ? 'top'
                  : cell.text_valign === 'bottom'
                    ? 'bottom'
                    : 'middle'
              const textX =
                cell.text_halign === 'left'
                  ? left + 8 * horizontalPixelRatio
                  : cell.text_halign === 'right'
                    ? left + scaledWidth - 8 * horizontalPixelRatio
                    : left + scaledWidth / 2
              const textY =
                cell.text_valign === 'top'
                  ? top + 5 * verticalPixelRatio
                  : cell.text_valign === 'bottom'
                    ? top + scaledHeight - 5 * verticalPixelRatio
                    : top + scaledHeight / 2
              context.fillText(cell.text ?? '', textX, textY)
              x += width
            }
            y += rowHeights[row]
          }
          if ((table.frame_width ?? 0) > 0) {
            context.strokeStyle = table.frame_color || borderColor
            context.lineWidth = table.frame_width! * horizontalPixelRatio
            context.strokeRect(
              origin.x * horizontalPixelRatio,
              origin.y * verticalPixelRatio,
              tableWidth * horizontalPixelRatio,
              tableHeight * verticalPixelRatio,
            )
          }
        }
        context.restore()
      },
    )
  }
}

class PineTablePaneView implements IPrimitivePaneView {
  constructor(private readonly tables: () => PineTable[]) {}

  update() {}

  renderer() {
    const tables = this.tables()
    return tables.length === 0 ? null : new PineTableRenderer(tables)
  }
}

export class PineTablePrimitive implements ISeriesPrimitive<Time> {
  private paneView = new PineTablePaneView(() => this.tables)
  private requestUpdate: (() => void) | undefined
  private tables: PineTable[] = []

  attached(parameter: SeriesAttachedParameter<Time, SeriesType>) {
    this.requestUpdate = parameter.requestUpdate
  }

  paneViews() {
    return [this.paneView]
  }

  setTables(tables: PineTable[]) {
    this.tables = tables
    this.requestUpdate?.()
  }
}
