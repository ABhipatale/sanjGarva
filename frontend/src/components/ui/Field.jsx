import { forwardRef, useId } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const control =
  'block w-full rounded-xl border-0 bg-white text-[16px] text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 disabled:bg-slate-50 disabled:text-slate-500'

export function Field({ label, hint, error, optional, children, className, id }) {
  const { t } = useTranslation()
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[15px] font-semibold text-slate-700">
          {label}
          {optional && <span className="ml-1 text-xs font-normal text-slate-400">({t('common.optional')})</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-sm font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ label, hint, error, optional, className, prefix, suffix, size = 'md', ...props }, ref) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className} id={id}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">{prefix}</span>}
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error || undefined}
          className={clsx(
            control,
            size === 'lg' ? 'h-14 text-xl font-bold' : 'h-12',
            prefix ? 'pl-9' : 'pl-3.5',
            suffix ? 'pr-12' : 'pr-3.5',
            error && 'ring-rose-400',
          )}
          {...props}
        />
        {suffix && <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">{suffix}</span>}
      </div>
    </Field>
  )
})

export const Select = forwardRef(function Select({ label, hint, error, optional, className, children, ...props }, ref) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className} id={id}>
      <div className="relative">
        <select ref={ref} id={id} className={clsx(control, 'h-12 appearance-none pl-3.5 pr-10', error && 'ring-rose-400')} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
      </div>
    </Field>
  )
})

export const Textarea = forwardRef(function Textarea({ label, hint, error, optional, className, rows = 2, ...props }, ref) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className} id={id}>
      <textarea ref={ref} id={id} rows={rows} className={clsx(control, 'px-3.5 py-3', error && 'ring-rose-400')} {...props} />
    </Field>
  )
})

/** Numeric money input with currency prefix and decimal keypad on mobile. */
export const MoneyInput = forwardRef(function MoneyInput(props, ref) {
  return <Input ref={ref} type="number" inputMode="decimal" step="0.01" min="0" prefix="₹" {...props} />
})

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-[15px] font-semibold text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx('relative h-7 w-12 rounded-full transition-colors', checked ? 'bg-emerald-500' : 'bg-slate-300')}
      >
        <span className={clsx('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  )
}
