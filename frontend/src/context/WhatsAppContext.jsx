import { createContext, useCallback, useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle } from 'lucide-react'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { Textarea } from '../components/ui/Field'
import { openWhatsApp } from '../utils/whatsapp'

const WhatsAppContext = createContext(null)

/**
 * After a save, offer to send the details on WhatsApp:
 * const offerWhatsApp = useWhatsApp(); offerWhatsApp({ name, mobile, message })
 * The owner sees the message, can change it, and taps Send (or Skip).
 */
export function WhatsAppProvider({ children }) {
  const { t } = useTranslation()
  const [state, setState] = useState(null)

  const offer = useCallback((opts) => setState(opts), [])
  const close = () => setState(null)

  const send = () => {
    openWhatsApp(state.mobile, state.message)
    close()
  }

  return (
    <WhatsAppContext.Provider value={offer}>
      {children}
      <Modal
        open={!!state}
        onClose={close}
        size="sm"
        title={state ? t('whatsapp.title', { name: state.name }) : ''}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" onClick={close}>
              {t('whatsapp.skip')}
            </Button>
            <Button variant="success" size="lg" icon={MessageCircle} onClick={send} autoFocus>
              {t('whatsapp.send')}
            </Button>
          </div>
        }
      >
        {state && (
          <div className="space-y-2">
            {!state.mobile && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{t('whatsapp.noMobile')}</p>}
            <Textarea label={t('whatsapp.message')} rows={9} value={state.message} onChange={(e) => setState((s) => ({ ...s, message: e.target.value }))} />
          </div>
        )}
      </Modal>
    </WhatsAppContext.Provider>
  )
}

export function useWhatsApp() {
  return useContext(WhatsAppContext)
}
