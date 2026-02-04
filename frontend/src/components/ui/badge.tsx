import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border border-ink/20 bg-haze px-2.5 py-0.5 text-xs font-semibold text-ink",
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
