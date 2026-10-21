import i18n from '../locales'
import { isoDate } from './format'

/**
 * Excel-style PDF reports, built in the browser and downloaded directly (no print dialog).
 *
 *   await downloadPdf({
 *     filename, title, subtitle?, meta: [[label, value]], orientation: 'portrait' | 'landscape',
 *     sections: [{ heading?, columns: [{ header, align?: 'right', width? }], rows: [[...cells] | { cells, style: 'subtotal' }], foot?: [...cells] }],
 *     summary?: [[label, value, { strong?, tone?: 'green' | 'red' }]],
 *   })
 *
 * PDF base fonts are Latin-only, so any Marathi text (and ₹) is drawn as a sharp image rendered by the
 * browser with the app font — names, labels and headings stay readable in both languages.
 * jsPDF is loaded only when a PDF is made, so it never slows the app down.
 */

// Anything outside the PDF base font (Marathi, ₹, −, …) is drawn as an image instead.
const SCRIPT = /[^\x20-\xFF]/
const MARGIN = 28
const COLORS = {
  ink: [15, 23, 42],
  muted: [100, 116, 139],
  line: [203, 213, 225],
  head: [30, 41, 59],
  zebra: [248, 250, 252],
  subtotal: [237, 233, 254],
  foot: [226, 232, 240],
  green: [4, 120, 87],
  red: [190, 18, 60],
}

/** 1,23,456.00 — plain numbers, like an Excel sheet. */
export function pdfMoney(value) {
  const n = Number(value) || 0
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function pdfQty(value) {
  return (Number(value) || 0).toLocaleString('en-IN')
}

/** 22-10-2026 */
export function pdfDate(value) {
  if (!value) return ''
  const s = String(value)
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}-${m}-${y}`
}

export function pdfDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pdfDate(isoDate(d))} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "01-10-2026 to 22-10-2026 (October 2026)" from an API range { from, to }. */
export function pdfPeriod(range) {
  const t = i18n.t.bind(i18n)
  if (!range?.from && !range?.to) return t('pdf.allTime')
  const from = range.from ? pdfDate(range.from) : '…'
  const to = range.to ? pdfDate(range.to) : pdfDate(isoDate())
  const lang = i18n.language === 'mr' ? 'mr-IN' : 'en-IN'
  const monthOf = (iso) => new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', numberingSystem: 'latn' }).format(new Date(`${iso}T00:00:00`))
  const months = range.from && range.to ? [monthOf(range.from), monthOf(range.to)] : []
  const label = months.length ? (months[0] === months[1] ? months[0] : `${months[0]} – ${months[1]}`) : ''
  return `${from} ${t('pdf.to')} ${to}${label ? `  (${label})` : ''}`
}

// ---------------------------------------------------------------------------------------------
// Marathi / ₹ text as images

const imageCache = new Map()

function textImage(text, sizePt, bold, rgb) {
  const key = `${text}|${sizePt}|${bold}|${rgb}`
  if (imageCache.has(key)) return imageCache.get(key)
  const scale = 4 // canvas px per PDF pt: sharp when zoomed and printed
  const font = `${bold ? 700 : 500} ${sizePt * scale}px Mukta, "Noto Sans Devanagari", system-ui, sans-serif`
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.font = font
  const width = Math.ceil(ctx.measureText(text).width) + 4
  const height = Math.ceil(sizePt * scale * 1.5)
  canvas.width = width
  canvas.height = height
  ctx.font = font
  ctx.fillStyle = `rgb(${rgb.join(',')})`
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 2, height / 2 + sizePt * scale * 0.08)
  const image = { data: canvas.toDataURL('image/png'), w: width / scale, h: height / scale }
  imageCache.set(key, image)
  return image
}

/** Draw a line of text at (x, baseline y); Marathi goes through the image path. */
function drawText(doc, text, x, y, { size = 10, bold = false, color = COLORS.ink, align = 'left' } = {}) {
  const value = String(text ?? '')
  if (!value) return
  if (SCRIPT.test(value)) {
    const img = textImage(value, size, bold, color)
    const left = align === 'right' ? x - img.w : align === 'center' ? x - img.w / 2 : x
    doc.addImage(img.data, 'PNG', left, y - img.h * 0.68, img.w, img.h)
    return
  }
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.setFontSize(size)
  doc.setTextColor(...color)
  doc.text(value, x, y, { align })
}

/** autoTable hooks that swap Marathi cell text for images (sized into the column width). */
function scriptCellHooks(doc) {
  return {
    didParseCell(data) {
      const text = (Array.isArray(data.cell.text) ? data.cell.text.join(' ') : String(data.cell.text ?? '')).trim()
      if (!SCRIPT.test(text)) return
      const color = Array.isArray(data.cell.styles.textColor) ? data.cell.styles.textColor : COLORS.ink
      const img = textImage(text, data.cell.styles.fontSize, data.cell.styles.fontStyle === 'bold', color)
      data.cell.scriptImage = img
      data.cell.text = ['']
      const pad = data.cell.padding('horizontal')
      data.cell.styles.minCellWidth = Math.max(data.cell.styles.minCellWidth || 0, Math.min(img.w + pad, 220))
    },
    didDrawCell(data) {
      const img = data.cell.scriptImage
      if (!img) return
      const room = data.cell.width - data.cell.padding('horizontal')
      const k = Math.min(1, room / img.w)
      const w = img.w * k
      const h = img.h * k
      const align = data.cell.styles.halign
      const x = align === 'right' ? data.cell.x + data.cell.width - data.cell.padding('right') - w
        : align === 'center' ? data.cell.x + (data.cell.width - w) / 2
          : data.cell.x + data.cell.padding('left')
      doc.addImage(img.data, 'PNG', x, data.cell.y + (data.cell.height - h) / 2, w, h)
    },
  }
}

// ---------------------------------------------------------------------------------------------

export async function downloadPdf({ filename, title, subtitle, meta = [], orientation = 'portrait', sections = [], summary = [], format = 'a4' }) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const t = i18n.t.bind(i18n)
  const doc = new jsPDF({ orientation, unit: 'pt', format, compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const hooks = scriptCellHooks(doc)

  // Title block
  let y = MARGIN + 10
  drawText(doc, title, MARGIN, y, { size: 15, bold: true })
  drawText(doc, `${t('pdf.generated')}: ${pdfDateTime(new Date())}`, pageWidth - MARGIN, y, { size: 8, color: COLORS.muted, align: 'right' })
  if (subtitle) {
    y += 16
    drawText(doc, subtitle, MARGIN, y, { size: 11, bold: true, color: [76, 29, 149] })
  }
  y += 6
  for (const [label, value] of meta) {
    if (value == null || value === '') continue
    y += 13
    drawText(doc, `${label}:`, MARGIN, y, { size: 9, bold: true, color: COLORS.muted })
    drawText(doc, value, MARGIN + 78, y, { size: 9 })
  }
  y += 8
  doc.setDrawColor(...COLORS.head)
  doc.setLineWidth(1)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)
  y += 10

  for (const section of sections) {
    if (section.heading) {
      if (y > doc.internal.pageSize.getHeight() - 80) {
        doc.addPage()
        y = MARGIN
      }
      drawText(doc, section.heading, MARGIN, y + 8, { size: 10.5, bold: true })
      y += 14
    }
    const columnStyles = {}
    section.columns.forEach((c, i) => {
      columnStyles[i] = { halign: c.align || 'left', ...(c.width ? { cellWidth: c.width } : {}) }
    })
    const subtotalRows = new Set()
    const body = section.rows.map((r, i) => {
      if (Array.isArray(r)) return r
      if (r.style === 'subtotal') subtotalRows.add(i)
      return r.cells
    })

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN + 6 },
      head: [section.columns.map((c) => c.header)],
      body,
      foot: section.foot ? [section.foot] : undefined,
      showHead: 'everyPage',
      showFoot: 'lastPage',
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 7.6, cellPadding: { top: 2.1, bottom: 2.1, left: 3.5, right: 3.5 }, lineColor: COLORS.line, lineWidth: 0.5, textColor: COLORS.ink, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: COLORS.head, textColor: 255, fontStyle: 'bold', fontSize: 7.6, cellPadding: { top: 3.2, bottom: 3.2, left: 3.5, right: 3.5 } },
      footStyles: { fillColor: COLORS.foot, textColor: COLORS.ink, fontStyle: 'bold', fontSize: 8, cellPadding: { top: 3.2, bottom: 3.2, left: 3.5, right: 3.5 } },
      alternateRowStyles: { fillColor: COLORS.zebra },
      columnStyles,
      didParseCell(data) {
        if (data.section === 'head' || data.section === 'foot') data.cell.styles.halign = columnStyles[data.column.index]?.halign
        if (data.section === 'body' && subtotalRows.has(data.row.index)) {
          data.cell.styles.fillColor = COLORS.subtotal
          data.cell.styles.fontStyle = 'bold'
        }
        hooks.didParseCell(data)
      },
      didDrawCell: hooks.didDrawCell,
    })
    y = doc.lastAutoTable.finalY + 16
  }

  // Summary box (right side): label / value, last strong line highlighted.
  if (summary.length) {
    const width = 250
    if (y > doc.internal.pageSize.getHeight() - (summary.length * 18 + 40)) {
      doc.addPage()
      y = MARGIN
    }
    autoTable(doc, {
      startY: y,
      margin: { left: pageWidth - MARGIN - width, right: MARGIN },
      tableWidth: width,
      head: [[t('pdf.summary'), '']],
      body: summary.map(([label, value]) => [label, value]),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, lineColor: COLORS.line, lineWidth: 0.5, textColor: COLORS.ink },
      headStyles: { fillColor: COLORS.head, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      didParseCell(data) {
        const opts = data.section === 'body' ? summary[data.row.index][2] : null
        if (opts?.strong) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fontSize = 10.5
          data.cell.styles.fillColor = COLORS.foot
        }
        if (opts?.tone && data.column.index === 1) data.cell.styles.textColor = COLORS[opts.tone]
        hooks.didParseCell(data)
      },
      didDrawCell: hooks.didDrawCell,
    })
  }

  // Footer on every page: amounts note + page x of n.
  const pages = doc.getNumberOfPages()
  const pageHeight = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...COLORS.line)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, pageHeight - MARGIN + 2, pageWidth - MARGIN, pageHeight - MARGIN + 2)
    drawText(doc, t('pdf.amountsNote'), MARGIN, pageHeight - MARGIN + 13, { size: 7.5, color: COLORS.muted })
    drawText(doc, t('pdf.page', { page: i, pages }), pageWidth - MARGIN, pageHeight - MARGIN + 13, { size: 7.5, color: COLORS.muted, align: 'right' })
  }

  doc.save(filename)
}

/** Safe file name part: "Ramesh Patil" → "ramesh-patil" (Marathi letters kept). */
export function fileSlug(text) {
  return String(text || '').trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'report'
}
