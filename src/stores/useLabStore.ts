import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface LabSession {
  token:   string
  usuario: string
  rol:     string
}

interface LabStore {
  session:      LabSession | null
  setSession:   (s: LabSession) => void
  clearSession: () => void
}

export const useLabStore = create<LabStore>()(
  persist(
    (set) => ({
      session:      null,
      setSession:   (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name:    'lab-session',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
