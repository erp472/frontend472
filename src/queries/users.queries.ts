import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'

const RolUsuario = z.enum([
  'CAJERO', 'ADMINISTRATIVO', 'TESORERIA', 'INVENTARIOS',
  'SUPERVISOR_REGIONAL', 'ADMIN_NACIONAL', 'ADMIN_SISTEMA',
])

const SucursalSchema = z.object({
  id:     z.string().uuid(),
  codigo: z.string(),
  nombre: z.string(),
  ciudad: z.string(),
})

export const UserSchema = z.object({
  id:          z.string().uuid(),
  nombre:      z.string(),
  email:       z.string().email(),
  rol:         RolUsuario,
  activo:      z.boolean(),
  ultimoLogin: z.string().nullable(),
  sucursal:    SucursalSchema.nullable(),
  createdAt:   z.string(),
  updatedAt:   z.string(),
})
export type UserRow = z.infer<typeof UserSchema>

const UsersPageSchema = z.object({
  datos: z.array(UserSchema),
  meta:  z.object({ total: z.number(), pagina: z.number(), limite: z.number(), paginas: z.number() }),
})

export const CreateUserSchema = z.object({
  nombre:      z.string().min(2),
  email:       z.string().email(),
  password:    z.string().min(8),
  rol:         RolUsuario,
  sucursal_id: z.string().uuid().nullable().optional(),
})
export type CreateUserDto = z.infer<typeof CreateUserSchema>

export const UpdateUserSchema = z.object({
  nombre:      z.string().min(2).optional(),
  email:       z.string().email().optional(),
  password:    z.string().min(8).optional(),
  rol:         RolUsuario.optional(),
  sucursal_id: z.string().uuid().nullable().optional(),
  activo:      z.boolean().optional(),
})
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>

export interface UsersFilters {
  buscar?:      string
  rol?:         string
  activo?:      boolean
  sucursal_id?: string
  pagina?:      number
  limite?:      number
}

export const userKeys = {
  all:    ()                      => ['users'] as const,
  list:   (f?: UsersFilters)      => ['users', 'list', f] as const,
  detail: (id: string)            => ['users', 'detail', id] as const,
}

export function useUsers(filters: UsersFilters = {}) {
  const params = new URLSearchParams()
  if (filters.buscar)      params.set('buscar',      filters.buscar)
  if (filters.rol)         params.set('rol',         filters.rol)
  if (filters.activo !== undefined) params.set('activo', String(filters.activo))
  if (filters.sucursal_id) params.set('sucursal_id', filters.sucursal_id)
  if (filters.pagina)      params.set('pagina',      String(filters.pagina))
  if (filters.limite)      params.set('limite',      String(filters.limite))

  const qs = params.toString()
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn:  () => apiFetch(`/users${qs ? `?${qs}` : ''}`, {}, UsersPageSchema),
    staleTime: 30_000,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateUserDto) =>
      apiFetch('/users', { method: 'POST', body: JSON.stringify(dto) }, UserSchema),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all() }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserDto }) =>
      apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }, UserSchema),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all() }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all() }),
  })
}
