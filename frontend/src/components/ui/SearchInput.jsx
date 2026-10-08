import { forwardRef } from 'react'
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

const SearchInput = forwardRef(function SearchInput({ value, onChange, placeholder, className, autoFocus }, ref) {
  const { t } = useTranslation()
  return (
    <div className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('common.searchPlaceholder')}
        aria-label={placeholder || t('common.search')}
        autoFocus={autoFocus}
        enterKeyHint="search"
        className="block h-12 w-full rounded-2xl border-0 bg-white pl-11 pr-11 text-[16px] text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={t('common.close')}
        >
          <X className="size-5" />
        </button>
      )}
    </div>
  )
})

export default SearchInput
