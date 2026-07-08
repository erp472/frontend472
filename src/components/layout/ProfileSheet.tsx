import { useState } from 'react'
import { toast } from 'sonner'
import { User, KeyRound, LogOut, Pencil, X, Check } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useSessionStore } from '@/stores/useSessionStore'
import { useUpdateUser } from '@/queries/users.queries'
import { rolLabels } from './AppSidebar'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function ProfileSheet({ open, onOpenChange }: Props) {
  const user         = useSessionStore((s) => s.user)
  const setUser      = useSessionStore((s) => s.setUser)
  const clearSession = useSessionStore((s) => s.clearSession)
  const update       = useUpdateUser()

  const [editingInfo,     setEditingInfo]     = useState(false)
  const [nombre,          setNombre]          = useState('')
  const [email,           setEmail]           = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  if (!user) return null

  const initials = user.nombre
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function startEdit() {
    setNombre(user!.nombre)
    setEmail(user!.email)
    setEditingInfo(true)
  }

  function cancelEdit() {
    setEditingInfo(false)
    setNombre('')
    setEmail('')
  }

  function handleSavePerfil() {
    if (!nombre.trim() || !email.trim()) return
    update.mutate(
      { id: Number(user!.id), data: { nombre: nombre.trim(), email: email.trim() } },
      {
        onSuccess: (res) => {
          setUser({ ...user!, nombre: res.nombre, email: res.email })
          setEditingInfo(false)
          toast.success('Perfil actualizado')
        },
        onError: () => toast.error('No se pudo actualizar el perfil'),
      },
    )
  }

  function handleChangePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    update.mutate(
      { id: Number(user!.id), data: { password: newPassword } },
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

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) cancelEdit(); onOpenChange(v) }}>
      <SheetContent className="w-[360px] sm:w-[400px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <User className="size-4" />
            Mi perfil
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-6">
          {/* Avatar + info + cerrar sesión */}
          <div className="px-6 pb-4 space-y-3">
            <div className="flex items-center gap-4">
              <Avatar className="size-14 rounded-xl">
                <AvatarFallback className="rounded-xl text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-sm truncate">{user.nombre}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {rolLabels[user.rol] ?? user.rol}
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
                {!editingInfo ? (
                  // Vista de solo lectura
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Nombre</p>
                      <p className="text-sm font-medium">{user.nombre}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Correo electrónico</p>
                      <p className="text-sm font-medium">{user.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={startEdit}
                    >
                      <Pencil className="size-3.5 mr-2" />
                      Editar
                    </Button>
                  </div>
                ) : (
                  // Formulario de edición
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Nombre</label>
                      <Input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Correo electrónico</label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleSavePerfil}
                        disabled={
                          update.isPending ||
                          !nombre.trim() ||
                          !email.trim() ||
                          (nombre.trim() === user.nombre && email.trim() === user.email)
                        }
                      >
                        <Check className="size-3.5 mr-2" />
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={update.isPending}
                      >
                        <X className="size-3.5 mr-2" />
                        Cancelar
                      </Button>
                    </div>
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
                  <label className="text-sm font-medium">Nueva contraseña</label>
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Confirmar contraseña</label>
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
