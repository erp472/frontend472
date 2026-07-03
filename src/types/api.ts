import type { RolUsuario } from '@/stores/useSessionStore'

// ── Usuarios ─────────────────────────────────────────────────────────────────

export interface UserResponse {
  id: number
  nombre: string
  email: string
  rol: RolUsuario
  activo: boolean
  ultimoLogin: string | null
  sucursal: { id: number; codigo: string; nombre: string; ciudad: string | null } | null
  createdAt: string
  updatedAt: string
}

export interface UserMeta {
  total: number
  pagina: number
  limite: number
  paginas: number
}

export interface PaginatedUsers {
  datos: UserResponse[]
  meta: UserMeta
}

export interface UserQueryParams {
  buscar?: string
  rol?: string
  activo?: boolean
  pagina?: number
  limite?: number
}

export interface CreateUserInput {
  nombre: string
  email: string
  password: string
  rol: RolUsuario
  sucursal_id?: number | null
}

export interface UpdateUserInput {
  nombre?: string
  email?: string
  password?: string
  rol?: RolUsuario
  sucursal_id?: number | null
  activo?: boolean
}

// ── Roles y Permisos ─────────────────────────────────────────────────────────

export interface PermisoEntry {
  id: string
  nombre: string
  createdAt: string
  updatedAt: string
}

export interface RolPermisoEntry {
  rolId: string
  permisoId: string
  permiso: { id: string; nombre: string }
}

export interface RolEntry {
  id: string
  nombre: string
  permisos: RolPermisoEntry[]
  createdAt: string
  updatedAt: string
}
