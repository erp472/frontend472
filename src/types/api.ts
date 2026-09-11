import type { RolUsuario } from '@/stores/useSessionStore'

// ── Meta paginación ───────────────────────────────────────────────────────────

export interface PaginaMeta {
  total:   number
  pagina:  number
  limite:  number
  paginas: number
}

// ── Usuarios ─────────────────────────────────────────────────────────────────

export interface UserResponse {
  id:              number
  nombre:          string
  email:           string
  rol:             RolUsuario
  activo:          boolean
  telefono:        string | null
  tipoDocumento:   string | null
  numeroDocumento: string | null
  ultimoLogin:     string | null
  sucursal:        { id: number; codigo: string; nombre: string; ciudad: string | null } | null
  pais:            { id: number; nombre: string } | null
  departamento:    { id: number; nombre: string } | null
  ciudad:          { id: number; nombre: string } | null
  createdAt:       string
  updatedAt:       string
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
  buscar?:      string | undefined
  rol?:         string | undefined
  sucursal_id?: number | undefined
  activo?:      boolean | undefined
  pagina?:      number | undefined
  limite?:      number | undefined
}

export interface CreateUserInput {
  nombre:           string
  email:            string
  password:         string
  rol:              RolUsuario
  sucursal_id?:     number | null | undefined
  tipo_documento?:  string | null | undefined
  numero_documento?: string | null | undefined
}

export interface UpdateUserInput {
  nombre?:          string | undefined
  email?:           string | undefined
  password?:        string | undefined
  telefono?:        string | null | undefined
  pais_id?:         number | null | undefined
  departamento_id?: number | null | undefined
  ciudad_id?:       number | null | undefined
  rol?:             RolUsuario | undefined
  sucursal_id?:     number | null | undefined
  activo?:          boolean | undefined
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

// ── Geo ───────────────────────────────────────────────────────────────────────

export interface PaisResponse {
  id:     number
  nombre: string
  iso2:   string | null
}

export interface DepartamentoResponse {
  id:     number
  paisId: number
  nombre: string
}

export interface CiudadResponse {
  id:             number
  departamentoId: number
  nombre:         string
}

// ── Comercios ─────────────────────────────────────────────────────────────────

export interface ComercioResponse {
  id:        number
  codigo:    string
  nombre:    string
  nit:       string
  activo:    boolean
  createdAt: string
}

export interface PaginatedComercios {
  datos: ComercioResponse[]
  meta:  PaginaMeta
}

export interface ComercioQueryParams {
  buscar?: string | undefined
  activo?: boolean | undefined
  pagina?: number | undefined
  limite?: number | undefined
}

export interface CreateComercioInput {
  codigo: string
  nombre: string
  nit:    string
}

export interface UpdateComercioInput {
  nombre?: string | undefined
  activo?: boolean | undefined
}

// ── Regionales ────────────────────────────────────────────────────────────────

export interface RegionalResponse {
  id:         number
  comercioId: number
  codigo:     string
  nombre:     string
  activo:     boolean
  createdAt:  string
  comercio:   { id: number; codigo: string; nombre: string } | null
}

export interface PaginatedRegionales {
  datos: RegionalResponse[]
  meta:  PaginaMeta
}

export interface RegionalQueryParams {
  comercio_id?: number | undefined
  buscar?:      string | undefined
  activo?:      boolean | undefined
  pagina?:      number | undefined
  limite?:      number | undefined
}

export interface CreateRegionalInput {
  comercio_id: number
  codigo:      string
  nombre:      string
}

export interface UpdateRegionalInput {
  nombre?: string | undefined
  activo?: boolean | undefined
}

// ── Sucursales ────────────────────────────────────────────────────────────────

export type TipoSucursal = 'unipersonal' | 'multipuesto'

export interface SucursalResponse {
  id:              number
  regionalId:      number
  codigo:          string
  nombre:          string
  tipo:            TipoSucursal
  direccion:       string | null
  telefono:        string | null
  email:           string | null
  horarioApertura: string | null
  horarioCierre:   string | null
  activo:          boolean
  createdAt:       string
  updatedAt:       string
  regional:        { id: number; codigo: string; nombre: string; comercio: { id: number; codigo: string; nombre: string } } | null
  pais:            { id: number; nombre: string } | null
  departamento:    { id: number; nombre: string } | null
  ciudad:          { id: number; nombre: string } | null
}

export interface PaginatedSucursales {
  datos: SucursalResponse[]
  meta:  PaginaMeta
}

export interface SucursalQueryParams {
  regional_id?: number | undefined
  ciudad_id?:   number | undefined
  tipo?:        TipoSucursal | undefined
  buscar?:      string | undefined
  activo?:      boolean | undefined
  pagina?:      number | undefined
  limite?:      number | undefined
}

export interface CreateSucursalInput {
  regional_id:       number
  codigo:            string
  nombre:            string
  tipo:              TipoSucursal
  direccion?:        string | null | undefined
  telefono?:         string | null | undefined
  email?:            string | null | undefined
  horario_apertura?: string | null | undefined
  horario_cierre?:   string | null | undefined
  pais_id?:          number | null | undefined
  departamento_id?:  number | null | undefined
  ciudad_id?:        number | null | undefined
}

export interface UpdateSucursalInput {
  regional_id?:      number | undefined
  nombre?:           string | undefined
  tipo?:             TipoSucursal | undefined
  direccion?:        string | null | undefined
  telefono?:         string | null | undefined
  email?:            string | null | undefined
  horario_apertura?: string | null | undefined
  horario_cierre?:   string | null | undefined
  pais_id?:          number | null | undefined
  departamento_id?:  number | null | undefined
  ciudad_id?:        number | null | undefined
  activo?:           boolean | undefined
}

// ── Equipos ───────────────────────────────────────────────────────────────────

export type SistemaOperativo = 'windows' | 'linux' | 'macos'

export interface EquipoResponse {
  id:               number
  sucursalId:       number
  mac:              string
  nombre:           string | null
  sistemaOperativo: SistemaOperativo | null
  activo:           boolean
  createdAt:        string
  sucursal:         { id: number; codigo: string; nombre: string } | null
}

export interface PaginatedEquipos {
  datos: EquipoResponse[]
  meta:  PaginaMeta
}

export interface EquipoQueryParams {
  sucursal_id?:       number | undefined
  sistema_operativo?: SistemaOperativo | undefined
  buscar?:            string | undefined
  activo?:            boolean | undefined
  pagina?:            number | undefined
  limite?:            number | undefined
}

export interface CreateEquipoInput {
  sucursal_id:        number
  mac:                string
  nombre?:            string | null | undefined
  sistema_operativo?: SistemaOperativo | null | undefined
}

export interface UpdateEquipoInput {
  nombre?:            string | null | undefined
  sistema_operativo?: SistemaOperativo | null | undefined
  activo?:            boolean | undefined
}

// ── Productos ─────────────────────────────────────────────────────────────────

export type TipoProducto = 'estampilla' | 'filatelia' | 'empaque' | 'material_oficina' | 'otro'

export interface ProductoResponse {
  id:                number
  codigo:            string
  nombre:            string
  descripcion:       string | null
  serie:             string | null
  tipo:              TipoProducto
  precio:            number
  precioSinTax:      number | null
  porcentajeTax:     number
  peso:              number | null
  factorVolumetrico: number | null
  imagenUrl:         string | null
  activo:            boolean
  createdAt:         string
  updatedAt:         string
}

export interface PaginatedProductos {
  datos: ProductoResponse[]
  meta:  PaginaMeta
}

export interface ProductoQueryParams {
  tipo?:   TipoProducto | undefined
  buscar?: string | undefined
  activo?: boolean | undefined
  pagina?: number | undefined
  limite?: number | undefined
}

export interface CreateProductoInput {
  codigo:              string
  nombre:              string
  descripcion?:        string | null | undefined
  tipo:                TipoProducto
  precio:              number
  porcentaje_tax?:     number | undefined
  peso?:               number | null | undefined
  factor_volumetrico?: number | null | undefined
  imagen_url?:         string | null | undefined
}

export interface UpdateProductoInput {
  nombre?:             string | undefined
  descripcion?:        string | null | undefined
  precio?:             number | undefined
  porcentaje_tax?:     number | undefined
  peso?:               number | null | undefined
  factor_volumetrico?: number | null | undefined
  imagen_url?:         string | null | undefined
  activo?:             boolean | undefined
}

// ── Estampillas Admin ─────────────────────────────────────────────────────────
// Uses ProductoResponse — same shape, just forced tipo='estampilla' on backend

export interface EstampillaQueryParams {
  buscar?: string | undefined
  activo?: boolean | undefined
  pagina?: number | undefined
  limite?: number | undefined
}

export interface CreateEstampillaInput {
  codigo: string
  nombre: string
  precio: number
  serie?: string | null
}

export interface UpdateEstampillaInput {
  nombre?: string
  precio?: number
  serie?:  string | null
  activo?: boolean
}

// ── Filatelia Admin ──────────────────────────────────────────────────────────

export interface FilateliaQueryParams {
  buscar?: string | undefined
  activo?: boolean | undefined
  serie?:  string | undefined
  pagina?: number | undefined
  limite?: number | undefined
}

export interface CreateFilateliaInput {
  codigo:       string
  nombre:       string
  precio:       number
  serie?:       string | null
  descripcion?: string | null
}

export interface UpdateFilateliaInput {
  nombre?:      string
  precio?:      number
  serie?:       string | null
  descripcion?: string | null
  activo?:      boolean
}

// ── Estampillas disponibles (preporteado) ────────────────────────────────────

export interface EstampillaDisponible {
  denominacion: string
  stock:        number
  serie:        string | null
}

// ── Productos Especiales Admin ────────────────────────────────────────────────

export interface TarifaEscalonada {
  minCantidad: number
  maxCantidad: number | null
  precio:      number
}

export interface ProductoEspecialResponse {
  id:             number
  codigo:         string
  nombre:         string
  precio:         number
  cantidadMinima: number | null
  cantidadMaxima: number | null
  activo:         boolean
  createdAt:      string
  updatedAt:      string
  tarifas:        TarifaEscalonada[]
}

export interface PaginatedProductosEspeciales {
  datos: ProductoEspecialResponse[]
  meta:  PaginaMeta
}

export interface ProductoEspecialQueryParams {
  buscar?: string | undefined
  activo?: boolean | undefined
  pagina?: number | undefined
  limite?: number | undefined
}

export interface CreateProductoEspecialInput {
  codigo:          string
  nombre:          string
  precio:          number
  cantidadMinima?: number | null
  cantidadMaxima?: number | null
  tarifas?:        TarifaEscalonada[]
}

export interface UpdateProductoEspecialInput {
  nombre?:         string
  precio?:         number
  cantidadMinima?: number | null
  cantidadMaxima?: number | null
  activo?:         boolean
}

// ── Servicios ─────────────────────────────────────────────────────────────────

export type TipoServicio = 'nacional' | 'internacional_ms' | 'internacional_courier' | 'apartado_postal' | 'alistamiento'

export interface ServicioResponse {
  id:                     number
  codigo:                 string
  nombre:                 string
  descripcion:            string | null
  tipo:                   TipoServicio
  requiereEstampilla:     boolean
  requiereDimensiones:    boolean
  requiereValorDeclarado: boolean
  pesoMaximoKg:           number | null
  factorVolumetrico:      number
  tiempoEntregaDias:      number | null
  codigoSigma:            string | null
  tarifaCertificacion:    number | null
  minimoSeguroPostal:     number | null
  altoMaxCm:              number | null
  anchoMaxCm:             number | null
  largoMaxCm:             number | null
  activo:                 boolean
  createdAt:              string
}

export interface TarifaEnvioResponse {
  id:                number
  servicioId:        number
  paisDestino:       string
  ciudadDestino:     string | null
  pesoMinKg:         number
  pesoMaxKg:         number | null
  tarifa:            number
  tarifaKgAdicional: number | null
  activa:            boolean
  vigenciaInicio:    string | null
  vigenciaFin:       string | null
}

export interface CreateTarifaInput {
  paisDestino:        string
  ciudadDestino?:     string | null
  pesoMinKg:          number
  pesoMaxKg?:         number | null
  tarifa:             number
  tarifaKgAdicional?: number | null
}

export interface UpdateTarifaInput {
  tarifa?:            number
  tarifaKgAdicional?: number | null
  activa?:            boolean
}

export interface PaginatedServicios {
  datos: ServicioResponse[]
  meta:  PaginaMeta
}

export interface ServicioQueryParams {
  tipo?:   TipoServicio | undefined
  buscar?: string | undefined
  activo?: boolean | undefined
  pagina?: number | undefined
  limite?: number | undefined
}

export interface CreateServicioInput {
  codigo:                    string
  nombre:                    string
  descripcion?:              string | null | undefined
  tipo:                      TipoServicio
  requiere_estampilla?:      boolean | undefined
  requiere_dimensiones?:     boolean | undefined
  requiere_valor_declarado?: boolean | undefined
  peso_maximo_kg?:           number | null | undefined
  factor_volumetrico?:       number | undefined
  tiempo_entrega_dias?:      number | null | undefined
  codigo_sigma?:             string | null | undefined
  minimo_seguro_postal?:     number | null | undefined
  alto_max_cm?:              number | null | undefined
  ancho_max_cm?:             number | null | undefined
  largo_max_cm?:             number | null | undefined
}

export interface UpdateServicioInput {
  nombre?:                   string | undefined
  descripcion?:              string | null | undefined
  requiere_estampilla?:      boolean | undefined
  requiere_dimensiones?:     boolean | undefined
  requiere_valor_declarado?: boolean | undefined
  peso_maximo_kg?:           number | null | undefined
  factor_volumetrico?:       number | undefined
  tiempo_entrega_dias?:      number | null | undefined
  codigo_sigma?:             string | null | undefined
  activo?:                   boolean | undefined
  minimo_seguro_postal?:     number | null | undefined
  alto_max_cm?:              number | null | undefined
  ancho_max_cm?:             number | null | undefined
  largo_max_cm?:             number | null | undefined
}

// ── Permisos Matrix ───────────────────────────────────────────────────────────

export interface MatrixRole {
  id:         string
  nombre:     string
  descripcion?: string | null
  activo?:    boolean
  permisoIds: string[]
  [key: string]: unknown
}

export interface MatrixResponse {
  roles:    MatrixRole[]
  modulos:  ModuloEntry[]
  permisos: PermisoEntry[]
}

// ── Feature Flags (extended) ──────────────────────────────────────────────────

export type FeatureFlagEntorno = 'all' | 'dev' | 'staging' | 'prod'

export interface FeatureFlagResponse {
  id:          number
  codigo:      string
  descripcion: string | null
  activo:      boolean
  entorno:     FeatureFlagEntorno
  plataforma:  string
  createdAt:   string
  updatedAt:   string
  roles:       { id: number; nombre: string; codigo?: string }[]
  usuarios:    { id: number; nombre: string; email: string }[]
}

// ── Registro de Diferencias de Cierre ────────────────────────────────────────

export interface DiferenciaRegistro {
  id:             number
  sesionCajaId:   number
  cajaNombre:     string
  tipoDiferencia: 'faltante' | 'sobrante'
  monto:          string
  estado:         'pendiente' | 'aprobada' | 'rechazada'
  observaciones:  string | null
  createdAt:      string
}

export interface DiferenciaRegistroFiltros {
  tipo?:   'faltante' | 'sobrante'
  estado?: 'pendiente' | 'aprobada' | 'rechazada'
  desde?:  string
  hasta?:  string
  limite?: number
  pagina?: number
}
