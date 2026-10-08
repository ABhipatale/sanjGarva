import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import clsx from 'clsx'

const SIZES = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

/**
 * Bottom sheet on phones, centered dialog on larger screens.
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md', hideHeader = false }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const lastFocus = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current?.()
    window.addEventListener('keydown', onKey)
    // Keep focus inside the dialog; fields marked autoFocus focus themselves (avoids popping the keyboard otherwise).
    requestAnimationFrame(() => {
      const panel = panelRef.current
      if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true })
    })
    return () => {
      document.body.style.overflow = overflow
      if (!document.querySelector('.modal-root')) document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', onKey)
      lastFocus.current?.focus?.({ preventScroll: true })
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="modal-root fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="modal-backdrop absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hideHeader ? undefined : titleId}
        tabIndex={-1}
        className={clsx(
          'modal-panel relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl outline-none animate-slide-up sm:rounded-3xl',
          SIZES[size],
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        {!hideHeader && (
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 pb-3 pt-3 sm:pt-5">
            <h2 id={titleId} className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            <button onClick={onClose} className="-mr-2 rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className={clsx('flex-1 overflow-y-auto overscroll-contain px-5 py-4', hideHeader && 'pt-6')}>{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">{footer}</div>}
        {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
      </div>
    </div>,
    document.body,
  )
}
