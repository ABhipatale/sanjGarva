import i18n from '../locales'

let currencySymbol = '₹'
export function setCurrencySymbol(symbol) {
  currencySymbol = symbol || '₹'
}

const numberFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
const moneyFmt = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function toNumber(value) {
  const n = typeof value === 'number' ? value : parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

/** ₹1,23,456 (decimals only when present). */
export function money(value, { sign = false } = {}) {
  const n = toNumber(value)
  const abs = moneyFmt.format(Math.abs(n))
  const prefix = n < 0 ? '−' : sign && n > 0 ? '+' : ''
  return `${prefix}${currencySymbol}${abs}`
}

export function num(value) {
  return numberFmt.format(toNumber(value))
}

export function percent(value) {
  return `${toNumber(value).toFixed(1)}%`
}

function locale() {
  return i18n.language === 'mr' ? 'mr-IN' : 'en-IN'
}

export function formatDate(value, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return new Intl.DateTimeFormat(locale(), { ...opts, numberingSystem: 'latn' }).format(d)
}

export function formatTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale(), { hour: 'numeric', minute: '2-digit', numberingSystem: 'latn' }).format(new Date(value))
}

export function formatDateTime(value) {
  return `${formatDate(value, { day: '2-digit', month: 'short' })}, ${formatTime(value)}`
}

/** YYYY-MM-DD in local time. */
export function isoDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Display name in current language (falls back to English). */
export function localName(obj, field = 'name') {
  if (!obj) return ''
  return (i18n.language === 'mr' && obj[`${field}_mr`]) || obj[field] || ''
}

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}
