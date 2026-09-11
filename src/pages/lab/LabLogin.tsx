import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { labLogin } from '@/queries/lab.queries'
import { useLabStore } from '@/stores/useLabStore'

const schema = z.object({
  usuario:    z.string().min(1, 'Requerido'),
  contraseña: z.string().min(1, 'Requerido'),
})
type FormData = z.infer<typeof schema>

export default function LabLogin() {
  const navigate   = useNavigate()
  const setSession = useLabStore((s) => s.setSession)
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    try {
      const session = await labLogin(data.usuario, data.contraseña)
      setSession(session)
      navigate('/lab', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4"
      data-cy="lab-login-page"
    >
      <div className="w-full max-w-sm space-y-3">
        <Card className="shadow-lg border-border/60">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-3">
                <FlaskConical className="size-7 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl">Lab 4-72</CardTitle>
            <CardDescription className="text-xs">
              Entorno de desarrollo · Auth independiente · MongoDB
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-cy="lab-login-form">
              <div className="space-y-1.5">
                <Label htmlFor="usuario">Usuario</Label>
                <Input
                  id="usuario"
                  autoComplete="username"
                  autoFocus
                  data-cy="lab-login-usuario"
                  {...register('usuario')}
                />
                {errors.usuario && (
                  <p className="text-xs text-destructive">{errors.usuario.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contraseña">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="contraseña"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="pr-9"
                    data-cy="lab-login-password"
                    {...register('contraseña')}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.contraseña && (
                  <p className="text-xs text-destructive">{errors.contraseña.message}</p>
                )}
              </div>

              {error && (
                <p className="text-xs text-destructive text-center" data-cy="lab-login-error">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-cy="lab-login-submit"
              >
                {isSubmitting ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" />Entrando…</>
                ) : (
                  'Entrar al Lab'
                )}
              </Button>
            </form>
          </CardContent>


        </Card>

      </div>
    </div>
  )
}
