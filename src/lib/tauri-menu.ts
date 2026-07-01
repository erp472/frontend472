import { isTauri } from './tauri'

export async function setupNativeMenu() {
  if (!isTauri()) return

  const { Menu, Submenu, MenuItem, PredefinedMenuItem } = await import('@tauri-apps/api/menu')

  const archivo = await Submenu.new({
    text: 'Archivo',
    items: [
      await MenuItem.new({ id: 'preferences', text: 'Preferencias\tCtrl+,' }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'CloseWindow' }),
    ],
  })

  const editar = await Submenu.new({
    text: 'Editar',
    items: [
      await PredefinedMenuItem.new({ item: 'Undo' }),
      await PredefinedMenuItem.new({ item: 'Redo' }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Cut' }),
      await PredefinedMenuItem.new({ item: 'Copy' }),
      await PredefinedMenuItem.new({ item: 'Paste' }),
      await PredefinedMenuItem.new({ item: 'SelectAll' }),
    ],
  })

  const menu = await Menu.new({ items: [archivo, editar] })
  await menu.setAsAppMenu()
}
