import { cn } from "@/lib/utils"
import Image from "next/image"

/**
 * The RJ.connect circular mark, without background. The dark version swaps
 * the navy for a light tone so it stays visible on the dark theme.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block size-16 flex-none", className)}>
      <Image
        src="/logo-mark.png"
        width={64}
        height={64}
        alt="RJ"
        className="size-full object-contain dark:hidden"
        priority
      />
      <Image
        src="/logo-mark-dark.png"
        width={64}
        height={64}
        alt="RJ"
        className="hidden size-full object-contain dark:block"
        priority
      />
    </span>
  )
}
