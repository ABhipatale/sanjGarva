import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { onUnauthorized, tokenStore } from '../services/api'
import { authApi } from '../services/endpoints'
import { storage } from '../utils/storage'

const AuthContext = createContext(null)
const USER_KEY = 'sg_user'

function cachedUser() {
  try {
    return JSON.parse(storage.get(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const qc = useQueryClient()
  const [user, setUser] = useState(() => (tokenStore.get() ? cachedUser() : null))
  const [checking, setChecking] = useState(() => !!tokenStore.get() && !cachedUser())

  const clear = useCallback(() => {
    tokenStore.clear()
    storage.remove(USER_KEY)
    setUser(null)
    qc.clear()
  }, [qc])

  useEffect(() => {
    onUnauthorized(clear)
  }, [clear])

  // Validate the stored token in the background (user stays logged in when offline).
  useEffect(() => {
    if (!tokenStore.get()) return
    authApi
      .me()
      .then((r) => {
        setUser(r.data)
        storage.set(USER_KEY, JSON.stringify(r.data))
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  const login = useCallback(async ({ login, password, remember }) => {
    const res = await authApi.login({ login, password, remember })
    tokenStore.set(res.data.token, remember)
    storage.set(USER_KEY, JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      /* token may already be invalid */
    }
    clear()
  }, [clear])

  const value = useMemo(() => ({ user, checking, login, logout }), [user, checking, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
