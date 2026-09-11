import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { User, KeyRound, LogOut, Pencil, X, Check, Phone, MapPin, Building2, Clock } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useSessionStore } from '@/stores/useSessionStore'
import { useOwnProfile, useUpdateOwnProfile } from '@/queries/users.queries'
import { usePaises, useDepartamentos, useCiudades } from '@/queries/geo.queries'
import { rolLabels } from './AppSidebar'
import type { UserResponse } from '@/types/api'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

// ── Vista de campo ────────────────────────────────────────────────────────────
function Campo({ label, value, icon: Icon }: {
  label: string
  value: string | null | undefined
  icon?: React.ElementType
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="size-3" />}
        {label}
      </p>
      <p className="text-sm font-medium">
        {value ?? <span className="text-muted-foreground italic font-normal">—</span>}
      </p>
    </div>
  )
}

// ── Formulario de edición ─────────────────────────────────────────────────────
interface EditFormProps {
  full: UserResponse
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
  saving: boolean
}

function EditForm({ full, onSave, onCancel, saving }: EditFormProps) {
  const [nombre,   setNombre]   = useState(full.nombre)
  const [email,    setEmail]    = useState(full.email)
  const [telefono, setTelefono] = useState(full.telefono ?? '')
  const [paisId,   setPaisId]   = useState<number | null>(full.pais?.id ?? null)
  const [deptoId,  setDeptoId]  = useState<number | null>(full.departamento?.id ?? null)
  const [ciudadId, setCiudadId] = useState<number | null>(full.ciudad?.id ?? null)

  const { data: paises }      = usePaises()
  const { data: departamentos } = useDepartamentos(paisId)
  const { data: ciudades }    = useCiudades(deptoId)

  function handlePais(val: string) {
    setPaisId(val === 'none' ? null : Number(val))
    setDeptoId(null)
    setCiudadId(null)
  }

  function handleDepto(val: string) {
    setDeptoId(val === 'none' ? null : Number(val))
    setCiudadId(null)
  }

  function submit() {
    onSave({
      nombre:          nombre.trim()   || undefined,
      email:           email.trim()    || undefined,
      telefono:        telefono.trim() || null,
      pais_id:         paisId,
      departamento_id: deptoId,
      ciudad_id:       ciudadId,
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nombre completo</label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Correo electrónico</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Teléfono</label>
          <Input
            type="tel"
            placeholder="Ej: 3001234567"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">País</label>
          <Select value={paisId ? String(paisId) : 'none'} onValueChange={handlePais}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Seleccionar país" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Sin país —</SelectItem>
              {paises?.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Departamento</label>
          <Select
            value={deptoId ? String(deptoId) : 'none'}
            onValueChange={handleDepto}
            disabled={!paisId}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={paisId ? 'Seleccionar departamento' : 'Selecciona un país primero'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Sin departamento —</SelectItem>
              {departamentos?.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Ciudad</label>
          <Select
            value={ciudadId ? String(ciudadId) : 'none'}
            onValueChange={(v) => setCiudadId(v === 'none' ? null : Number(v))}
            disabled={!deptoId}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={deptoId ? 'Seleccionar ciudad' : 'Selecciona un departamento primero'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Sin ciudad —</SelectItem>
              {ciudades?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="flex-1" onClick={submit} disabled={saving || !nombre.trim() || !email.trim()}>
          <Check className="size-3.5 mr-2" />
          Guardar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          <X className="size-3.5 mr-2" />
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function ProfileSheet({ open, onOpenChange }: Props) {
  const sessionUser  = useSessionStore((s) => s.user)
  const setUser      = useSessionStore((s) => s.setUser)
  const clearSession = useSessionStore((s) => s.clearSession)
  const update       = useUpdateOwnProfile()

  const [editingInfo, setEditingInfo] = useState(false)
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { data: full, isLoading } = useOwnProfile()

  // Resetear estado al cerrar
  useEffect(() => {
    if (!open) {
      setEditingInfo(false)
      setNewPassword('')
      setConfirmPassword('')
    }
  }, [open])

  if (!sessionUser) return null

  const initials = sessionUser.nombre
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function handleSavePerfil(data: Record<string, unknown>) {
    update.mutate(
      data,
      {
        onSuccess: (res) => {
          setUser({ ...sessionUser!, nombre: res.nombre, email: res.email })
          setEditingInfo(false)
          toast.success('Perfil actualizado')
        },
        onError: () => toast.error('No se pudo actualizar el perfil'),
      },
    )
  }

  function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    update.mutate(
      { password: newPassword },
      {
        onSuccess: () => {
          setNewPassword('')
          setConfirmPassword('')
          toast.success('Contraseña actualizada')
        },
        onError: () => toast.error('No se pudo cambiar la contraseña'),
      },
    )
  }

  function formatFecha(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <User className="size-4" />
            Mi perfil
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-6">
          {/* Avatar + info básica + cerrar sesión */}
          <div className="px-6 pb-4 space-y-3">
            <div className="flex items-center gap-4">
              <Avatar className="size-14 rounded-xl">
                <AvatarFallback className="rounded-xl text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-sm truncate">{sessionUser.nombre}</p>
                <p className="text-xs text-muted-foreground truncate">{sessionUser.email}</p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {rolLabels[sessionUser.rol] ?? sessionUser.rol}
                </Badge>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => { onOpenChange(false); clearSession() }}
            >
              <LogOut className="size-3.5 mr-2" />
              Cerrar sesión
            </Button>
          </div>

          <Separator />

          <Accordion type="single" collapsible className="px-6">
            {/* Información personal */}
            <AccordionItem value="personal">
              <AccordionTrigger className="text-sm font-medium py-4">
                Información personal
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : editingInfo && full ? (
                  <EditForm
                    full={full}
                    onSave={handleSavePerfil}
                    onCancel={() => setEditingInfo(false)}
                    saving={update.isPending}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Campo label="Nombre completo"    value={full?.nombre} />
                      <Campo label="Correo electrónico" value={full?.email} />
                      <Campo label="Teléfono"           value={full?.telefono} icon={Phone} />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3" />
                        Ubicación
                      </p>
                      <Campo label="País"         value={full?.pais?.nombre} />
                      <Campo label="Departamento" value={full?.departamento?.nombre} />
                      <Campo label="Ciudad"       value={full?.ciudad?.nombre} />
                    </div>

                    {full?.sucursal && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Building2 className="size-3" />
                            Sucursal asignada
                          </p>
                          <Campo label="Sucursal" value={full.sucursal.nombre} />
                          {full.sucursal.ciudad && (
                            <Campo label="Ciudad" value={full.sucursal.ciudad} />
                          )}
                        </div>
                      </>
                    )}

                    {full?.ultimoLogin && (
                      <>
                        <Separator />
                        <Campo
                          label="Último acceso"
                          value={formatFecha(full.ultimoLogin)}
                          icon={Clock}
                        />
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setEditingInfo(true)}
                    >
                      <Pencil className="size-3.5 mr-2" />
                      Editar información
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Cambio de contraseña */}
            <AccordionItem value="password" className="border-b-0">
              <AccordionTrigger className="text-sm font-medium py-4">
                <span className="flex items-center gap-2">
                  <KeyRound className="size-3.5" />
                  Cambiar contraseña
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Nueva contraseña</label>
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Confirmar contraseña</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleChangePassword}
                  disabled={update.isPending || !newPassword || !confirmPassword}
                >
                  Actualizar contraseña
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  )
}
