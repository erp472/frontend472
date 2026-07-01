import { invoke } from '@tauri-apps/api/core'

/** Detecta si React corre dentro de la shell Tauri (escritorio) o en navegador puro */
export const isTauri = (): boolean => '__TAURI_INTERNALS__' in window

/** Obtiene la dirección MAC del primer adaptador de red vía comando Rust */
export async function getMacAddress(): Promise<string> {
  if (!isTauri()) throw new Error('getMacAddress solo está disponible en la app de escritorio')
  return invoke<string>('get_mac')
}
