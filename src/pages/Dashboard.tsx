import { useSessionStore } from '@/stores/useSessionStore'

export default function Dashboard() {
  const user = useSessionStore((s) => s.user)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Panel 4-72</h1>
      {user && (
        <p className="mt-2 text-muted-foreground">
          Bienvenido,{' '}
          <span className="font-medium text-foreground">{user.nombre}</span> —{' '}
          {user.rol}
        </p>
      )}
    </div>
  )
}
