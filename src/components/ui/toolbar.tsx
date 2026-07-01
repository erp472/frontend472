import * as React from 'react'
import { Toolbar as ToolbarPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

const Toolbar = React.forwardRef<
  React.ComponentRef<typeof ToolbarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.Root
    ref={ref}
    className={cn(
      'flex items-center gap-0.5 rounded-lg border bg-background p-1',
      className,
    )}
    {...props}
  />
))
Toolbar.displayName = 'Toolbar'

const ToolbarButton = React.forwardRef<
  React.ComponentRef<typeof ToolbarPrimitive.Button>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Button>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.Button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
      'hover:bg-muted hover:text-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
ToolbarButton.displayName = 'ToolbarButton'

const ToolbarSeparator = React.forwardRef<
  React.ComponentRef<typeof ToolbarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.Separator
    ref={ref}
    className={cn('mx-1 w-px self-stretch bg-border', className)}
    {...props}
  />
))
ToolbarSeparator.displayName = 'ToolbarSeparator'

const ToolbarToggleGroup = React.forwardRef<
  React.ComponentRef<typeof ToolbarPrimitive.ToggleGroup>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.ToggleGroup>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.ToggleGroup
    ref={ref}
    className={cn('flex items-center gap-0.5', className)}
    {...props}
  />
))
ToolbarToggleGroup.displayName = 'ToolbarToggleGroup'

const ToolbarToggleItem = React.forwardRef<
  React.ComponentRef<typeof ToolbarPrimitive.ToggleItem>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.ToggleItem>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.ToggleItem
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
      'text-muted-foreground hover:bg-muted hover:text-foreground',
      'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
ToolbarToggleItem.displayName = 'ToolbarToggleItem'

export { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarToggleGroup, ToolbarToggleItem }
