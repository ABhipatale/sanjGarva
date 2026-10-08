import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'

const ConfirmContext = createContext(null)

/**
 * const confirm = useConfirm(); if (await confirm({ title, message, confirmText, danger })) { ... }
 */
export function ConfirmProvider({ children }) {
  const { t } = useTranslation()
  const [state, setState] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((opts) => {
    setState(opts)
    return new Promise((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (result) => {
    resolver.current?.(result)
    resolver.current = null
    setState(null)
  }

  const Icon = state?.danger ? AlertTriangle : HelpCircle

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} size="sm" hideHeader>
        {state && (
          <div className="text-center">
            <div
              className={`mx-auto mb-3 flex size-14 items-center justify-center rounded-full ${state.danger ? 'bg-rose-100 text-rose-600' : 'bg-brand-100 text-brand-700'}`}
            >
              <Icon className="size-7" aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{state.title}</h2>
            {state.message && <p className="mt-2 text-[15px] text-slate-600">{state.message}</p>}
            {state.children}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" onClick={() => close(false)}>
                {state.cancelText || t('common.cancel')}
              </Button>
              <Button variant={state.danger ? 'danger' : 'primary'} size="lg" onClick={() => close(true)} autoFocus>
                {state.confirmText || t('common.confirm')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmContext)
}
