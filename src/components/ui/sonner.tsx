import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ theme: themeProp, ...props }: ToasterProps) => {
  const { theme: systemTheme = "system" } = useTheme()
  const resolvedTheme = (themeProp ?? systemTheme) as "system" | "light" | "dark"

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-[#1E4093]" />,
        info:    <InfoIcon className="size-4 text-[#1E4093]" />,
        warning: <TriangleAlertIcon className="size-4 text-[#FDC52F]" />,
        error:   <OctagonXIcon className="size-4 text-[#E51937]" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg":      "var(--popover)",
          "--normal-text":    "var(--popover-foreground)",
          "--normal-border":  "var(--border)",
          "--success-bg":     "var(--popover)",
          "--success-text":   "#1E4093",
          "--success-border": "var(--border)",
          "--error-bg":       "var(--popover)",
          "--error-text":     "#E51937",
          "--error-border":   "var(--border)",
          "--warning-bg":     "var(--popover)",
          "--warning-text":   "#7A5500",
          "--warning-border": "var(--border)",
          "--info-bg":        "var(--popover)",
          "--info-text":      "#1E4093",
          "--info-border":    "var(--border)",
          "--border-radius":  "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
