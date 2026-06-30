import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface FeatureFlagsState {
  flags: Set<string>
  setFlags: (codigos: string[]) => void
  isEnabled: (codigo: string) => boolean
}

export const useFeatureFlagsStore = create<FeatureFlagsState>()(
  devtools(
    (set, get) => ({
      flags: new Set(),
      setFlags: (codigos) => set({ flags: new Set(codigos) }),
      isEnabled: (codigo) => get().flags.has(codigo),
    }),
    { name: 'FeatureFlagsStore' },
  ),
)
