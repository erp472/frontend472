import { useEffect } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { usePaises, useDepartamentos, useCiudades } from '@/queries/geo.queries'

export interface GeoValue {
  paisId:         number | null
  departamentoId: number | null
  ciudadId:       number | null
}

interface GeoSelectorProps {
  value:    GeoValue
  onChange: (v: GeoValue) => void
  disabled?: boolean
  required?: boolean
}

const COLOMBIA_ID = 82

export function GeoSelector({ value, onChange, disabled, required }: GeoSelectorProps) {
  const { data: paises,        isLoading: loadingPaises }  = usePaises()
  const { data: departamentos, isLoading: loadingDeptos }  = useDepartamentos(value.paisId)
  const { data: ciudades,      isLoading: loadingCiudades } = useCiudades(value.departamentoId)

  // si se elige Colombia por defecto y no hay país seleccionado, pre-seleccionamos CO
  useEffect(() => {
    if (!value.paisId && paises?.length && paises.find(p => p.id === COLOMBIA_ID)) {
      onChange({ paisId: COLOMBIA_ID, departamentoId: null, ciudadId: null })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paises])

  function handlePais(raw: string) {
    const id = raw === '_none' ? null : Number(raw)
    onChange({ paisId: id, departamentoId: null, ciudadId: null })
  }

  function handleDepartamento(raw: string) {
    const id = raw === '_none' ? null : Number(raw)
    onChange({ ...value, departamentoId: id, ciudadId: null })
  }

  function handleCiudad(raw: string) {
    const id = raw === '_none' ? null : Number(raw)
    onChange({ ...value, ciudadId: id })
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* País */}
      <div className="space-y-1.5">
        <Label>{required ? 'País *' : 'País'}</Label>
        <Select
          value={value.paisId ? String(value.paisId) : '_none'}
          onValueChange={handlePais}
          disabled={disabled || loadingPaises}
        >
          <SelectTrigger>
            <SelectValue placeholder={loadingPaises ? 'Cargando…' : 'Seleccionar'} />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {!required && <SelectItem value="_none">Sin país</SelectItem>}
            {paises?.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Departamento */}
      <div className="space-y-1.5">
        <Label>Departamento</Label>
        <Select
          value={value.departamentoId ? String(value.departamentoId) : '_none'}
          onValueChange={handleDepartamento}
          disabled={disabled || !value.paisId || loadingDeptos}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !value.paisId ? 'Elige un país' :
              loadingDeptos ? 'Cargando…' :
              'Seleccionar'
            } />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="_none">Sin departamento</SelectItem>
            {departamentos?.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ciudad */}
      <div className="space-y-1.5">
        <Label>Ciudad</Label>
        <Select
          value={value.ciudadId ? String(value.ciudadId) : '_none'}
          onValueChange={handleCiudad}
          disabled={disabled || !value.departamentoId || loadingCiudades}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !value.departamentoId ? 'Elige un departamento' :
              loadingCiudades ? 'Cargando…' :
              'Seleccionar'
            } />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="_none">Sin ciudad</SelectItem>
            {ciudades?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
