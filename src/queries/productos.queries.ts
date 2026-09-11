import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  ProductoResponse, PaginatedProductos,
  ProductoQueryParams, CreateProductoInput, UpdateProductoInput,
  EstampillaQueryParams, CreateEstampillaInput, UpdateEstampillaInput,
  FilateliaQueryParams, CreateFilateliaInput, UpdateFilateliaInput,
  EstampillaDisponible,
  ProductoEspecialResponse, PaginatedProductosEspeciales,
  ProductoEspecialQueryParams, CreateProductoEspecialInput, UpdateProductoEspecialInput,
  TarifaEscalonada,
} from '@/types/api'

// ── Productos generales ───────────────────────────────────────────────────────

export const PRODUCTO_KEYS = {
  all:    ()                        => ['productos'] as const,
  list:   (p: ProductoQueryParams)  => ['productos', 'list', p] as const,
  detail: (id: number)              => ['productos', id] as const,
}

export function useProductos(params: ProductoQueryParams = {}) {
  const qs = new URLSearchParams()
  if (params.tipo)           qs.set('tipo',   params.tipo)
  if (params.buscar)         qs.set('buscar', params.buscar)
  if (params.activo != null) qs.set('activo', String(params.activo))
  if (params.pagina)         qs.set('pagina', String(params.pagina))
  if (params.limite)         qs.set('limite', String(params.limite))

  return useQuery({
    queryKey:        PRODUCTO_KEYS.list(params),
    queryFn:         () => apiFetch<PaginatedProductos>(`/productos?${qs}`),
    placeholderData: keepPreviousData,
  })
}

export function useCreateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProductoInput) =>
      apiFetch<ProductoResponse>('/productos', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTO_KEYS.all() }),
  })
}

export function useUpdateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductoInput }) =>
      apiFetch<ProductoResponse>(`/productos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: PRODUCTO_KEYS.all() })
      qc.invalidateQueries({ queryKey: PRODUCTO_KEYS.detail(id) })
    },
  })
}

export function useDeleteProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<ProductoResponse>(`/productos/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTO_KEYS.all() }),
  })
}

// ── Estampillas admin ─────────────────────────────────────────────────────────

export const ESTAMPILLA_KEYS = {
  all:    ()                          => ['admin-estampillas'] as const,
  list:   (p: EstampillaQueryParams)  => ['admin-estampillas', 'list', p] as const,
  detail: (id: number)                => ['admin-estampillas', id] as const,
}

export function useEstampillas(params: EstampillaQueryParams = {}) {
  const qs = new URLSearchParams()
  if (params.buscar)         qs.set('buscar', params.buscar)
  if (params.activo != null) qs.set('activo', String(params.activo))
  if (params.pagina)         qs.set('pagina', String(params.pagina))
  if (params.limite)         qs.set('limite', String(params.limite))

  return useQuery({
    queryKey:        ESTAMPILLA_KEYS.list(params),
    queryFn:         () => apiFetch<PaginatedProductos>(`/admin/estampillas?${qs}`),
    placeholderData: keepPreviousData,
  })
}

export function useCreateEstampilla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEstampillaInput) =>
      apiFetch<ProductoResponse>('/admin/estampillas', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESTAMPILLA_KEYS.all() }),
  })
}

export function useUpdateEstampilla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEstampillaInput }) =>
      apiFetch<ProductoResponse>(`/admin/estampillas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ESTAMPILLA_KEYS.all() })
      qc.invalidateQueries({ queryKey: ESTAMPILLA_KEYS.detail(id) })
    },
  })
}

export function useDeleteEstampilla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<ProductoResponse>(`/admin/estampillas/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESTAMPILLA_KEYS.all() }),
  })
}

// ── Filatelia admin ───────────────────────────────────────────────────────────

export const FILATELIA_KEYS = {
  all:    ()                          => ['admin-filatelia'] as const,
  list:   (p: FilateliaQueryParams)   => ['admin-filatelia', 'list', p] as const,
  detail: (id: number)                => ['admin-filatelia', id] as const,
}

export function useFilatelias(params: FilateliaQueryParams = {}) {
  const qs = new URLSearchParams()
  if (params.buscar)         qs.set('buscar', params.buscar)
  if (params.serie)          qs.set('serie',  params.serie)
  if (params.activo != null) qs.set('activo', String(params.activo))
  if (params.pagina)         qs.set('pagina', String(params.pagina))
  if (params.limite)         qs.set('limite', String(params.limite))

  return useQuery({
    queryKey:        FILATELIA_KEYS.list(params),
    queryFn:         () => apiFetch<PaginatedProductos>(`/admin/filatelia?${qs}`),
    placeholderData: keepPreviousData,
  })
}

export function useCreateFilatelia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFilateliaInput) =>
      apiFetch<ProductoResponse>('/admin/filatelia', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FILATELIA_KEYS.all() }),
  })
}

export function useUpdateFilatelia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFilateliaInput }) =>
      apiFetch<ProductoResponse>(`/admin/filatelia/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: FILATELIA_KEYS.all() })
      qc.invalidateQueries({ queryKey: FILATELIA_KEYS.detail(id) })
    },
  })
}

export function useDeleteFilatelia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<ProductoResponse>(`/admin/filatelia/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FILATELIA_KEYS.all() }),
  })
}

// ── Estampillas disponibles (preporteado) ────────────────────────────────────

export function useEstampillasDisponibles(cajaId: number | null) {
  return useQuery({
    queryKey: ['estampillas-disponibles', cajaId],
    queryFn:  () => apiFetch<EstampillaDisponible[]>(`/ventas/punto/${cajaId}/estampillas-disponibles`),
    enabled:  cajaId != null,
    staleTime: 60_000,
  })
}

// ── Productos especiales admin ────────────────────────────────────────────────

export const ESPECIAL_KEYS = {
  all:    ()                                => ['admin-especiales'] as const,
  list:   (p: ProductoEspecialQueryParams)  => ['admin-especiales', 'list', p] as const,
  detail: (id: number)                      => ['admin-especiales', id] as const,
}

export function useProductosEspeciales(params: ProductoEspecialQueryParams = {}) {
  const qs = new URLSearchParams()
  if (params.buscar)         qs.set('buscar', params.buscar)
  if (params.activo != null) qs.set('activo', String(params.activo))
  if (params.pagina)         qs.set('pagina', String(params.pagina))
  if (params.limite)         qs.set('limite', String(params.limite))

  return useQuery({
    queryKey:        ESPECIAL_KEYS.list(params),
    queryFn:         () => apiFetch<PaginatedProductosEspeciales>(`/admin/productos-especiales?${qs}`),
    placeholderData: keepPreviousData,
  })
}

export function useCreateProductoEspecial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProductoEspecialInput) =>
      apiFetch<ProductoEspecialResponse>('/admin/productos-especiales', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESPECIAL_KEYS.all() }),
  })
}

export function useUpdateProductoEspecial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductoEspecialInput }) =>
      apiFetch<ProductoEspecialResponse>(`/admin/productos-especiales/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ESPECIAL_KEYS.all() })
      qc.invalidateQueries({ queryKey: ESPECIAL_KEYS.detail(id) })
    },
  })
}

export function useDeleteProductoEspecial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<ProductoEspecialResponse>(`/admin/productos-especiales/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESPECIAL_KEYS.all() }),
  })
}

export function useSetTarifasEspeciales(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tarifas: TarifaEscalonada[]) =>
      apiFetch<ProductoEspecialResponse>(`/admin/productos-especiales/${id}/tarifas`, {
        method: 'PUT',
        body:   JSON.stringify(tarifas),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ESPECIAL_KEYS.all() })
      qc.invalidateQueries({ queryKey: ESPECIAL_KEYS.detail(id) })
    },
  })
}
