import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { TopNavBar } from '@/components/layout/TopNavBar'
import { useUIStore } from '@/stores/useUIStore'
import { isTauri } from '@/lib/tauri'

const tricolorBar = (
  <div
    className="h-[3px] w-full shrink-0"
    style={{ background: 'linear-gradient(to right, #FDC52F 33.33%, #1E4093 33.33% 66.66%, #E51937 66.66%)' }}
    aria-hidden="true"
  />
)

export function AdminLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

  useEffect(() => {
    if (isTauri()) {
      import('@/lib/tauri-menu').then((m) => m.setupNativeMenu())
    }
  }, [])

  if (isTauri()) {
    return (
      <div className="flex h-screen flex-col">
        {tricolorBar}
        <TopNavBar />
        <main className="flex flex-1 flex-col gap-4 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        {tricolorBar}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>
                  <span style={{ color: '#FDC52F' }}>«</span>
                  {' '}Panel de Administración{' '}
                  <span style={{ color: '#E51937' }}>»</span>
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
