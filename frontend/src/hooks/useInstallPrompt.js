import { useEffect, useState } from 'react'

// Captured globally so the prompt is not lost before the Settings page mounts.
let deferred = null
const listeners = new Set()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e
  listeners.forEach((l) => l(e))
})
window.addEventListener('appinstalled', () => {
  deferred = null
  listeners.forEach((l) => l(null))
})

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState(deferred)
  useEffect(() => {
    listeners.add(setPrompt)
    return () => listeners.delete(setPrompt)
  }, [])

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    deferred = null
    setPrompt(null)
  }
  return { canInstall: !!prompt, install }
}
