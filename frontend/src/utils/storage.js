// Safe wrappers: storage can throw in private mode or when blocked.
function make(getStore) {
  return {
    get(key) {
      try { return getStore().getItem(key) } catch { return null }
    },
    set(key, value) {
      try { getStore().setItem(key, value) } catch { /* ignore */ }
    },
    remove(key) {
      try { getStore().removeItem(key) } catch { /* ignore */ }
    },
  }
}

export const storage = make(() => window.localStorage)
export const session = make(() => window.sessionStorage)
