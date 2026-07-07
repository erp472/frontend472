import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  ProductoResponse, PaginatedProductos,
  ProductoQueryParams, CreateProductoInput, UpdateProductoInput,
} from '@/types/api'

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
