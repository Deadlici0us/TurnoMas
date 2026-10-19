import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent text-sm leading-none font-semibold whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        accent: "bg-navy text-white hover:bg-[#163f66]",
        cta: "bg-cta text-white hover:bg-cta-hover",
        outline:
          "border-line bg-white text-navy hover:border-primary/50 hover:bg-soft",
        secondary: "bg-soft text-navy hover:bg-[#e4efff]",
        ghost: "bg-transparent text-muted-foreground hover:bg-soft hover:text-navy",
        destructive:
          "border-danger/30 bg-white text-danger hover:bg-danger-soft",
        link: "min-h-0 border-0 bg-transparent px-0 text-primary hover:text-navy hover:underline",
      },
      size: {
        default: "min-h-9 px-[22px]",
        sm: "min-h-[30px] px-3 text-xs",
        lg: "min-h-11 px-6 text-base",
        icon: "size-9 min-h-9 px-0",
        "icon-sm": "size-[30px] min-h-[30px] px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
