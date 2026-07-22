import type { RolUsuario } from '@/stores/useSessionStore'

// ── Usuarios ─────────────────────────────────────────────────────────────────

export interface UserResponse {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  activo: boolean
  ultimoLogin: string | null
  sucursal: { id: string; codigo: string; nombre: string; ciudad: string | null } | null
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
  sucursal_id?: string | null
}

export interface UpdateUserInput {
  nombre?: string
  email?: string
  password?: string
  rol?: RolUsuario
  sucursal_id?: string | null
  activo?: boolean
}

// ── Roles, Módulos y Permisos ─────────────────────────────────────────────────

export interface ModuloRef {
  id: string
  nombre: string
  orden: number
}

export interface PermisoEntry {
  id: string
  nombre: string
  descripcion: string | null
  moduloId: string
  modulo: ModuloRef
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface ModuloEntry {
  id: string
  nombre: string
  descripcion: string | null
  orden: number
  activo: boolean
  permisos: Pick<PermisoEntry, 'id' | 'nombre' | 'descripcion'>[]
  createdAt: string
  updatedAt: string
}

export interface RolPermisoEntry {
  id: string
  permisoId: string
  permiso: {
    id: string
    nombre: string
    descripcion: string | null
    modulo: ModuloRef
  }
}

export interface RolEntry {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  permisos: RolPermisoEntry[]
  createdAt: string
  updatedAt: string
}

export interface MatrixRole {
  id: string
  nombre: string
  descripcion: string | null
  permisoIds: string[]
}

export interface MatrixResponse {
  modulos: (ModuloEntry & { permisos: Pick<PermisoEntry, 'id' | 'nombre' | 'descripcion'>[] })[]
  roles: MatrixRole[]
}

// ── Feature Flags ────────────────────────────────────────────────────────────
// Nota: ids numéricos (no UUID) — coinciden con el backend real de feature-flags,
// a diferencia de RolEntry/ModuloEntry de arriba que están desactualizados.

export type FeatureFlagEntorno = 'all' | 'dev' | 'staging' | 'prod'

export interface FeatureFlagRolRef {
  id: number
  codigo: string
  nombre: string
}

export interface FeatureFlagUsuarioRef {
  id: number
  nombre: string
  email: string
}

export interface FeatureFlagResponse {
  id: number
  codigo: string
  descripcion: string | null
  activo: boolean
  entorno: FeatureFlagEntorno
  roles: FeatureFlagRolRef[]
  usuarios: FeatureFlagUsuarioRef[]
  createdAt: string
  updatedAt: string
}

export interface CreateFeatureFlagInput {
  codigo: string
  descripcion?: string
  activo: boolean
  entorno: FeatureFlagEntorno
}

export interface UpdateFeatureFlagInput {
  descripcion?: string
  activo?: boolean
  entorno?: FeatureFlagEntorno
}

export interface RolDisponible {
  idroles: number
  codigoroles: string
  nombreroles: string
  activoroles: boolean
}
