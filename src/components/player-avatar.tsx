import { Shirt } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES: Record<string, { wrapper: string; text: string }> = {
  sm: { wrapper: "size-8", text: "text-[10px] mt-1" },
  md: { wrapper: "size-10", text: "text-xs mt-1" },
  lg: { wrapper: "size-14", text: "text-base mt-1.5" },
};

export function PlayerAvatar({
  squadNumber,
  size = "sm",
  className,
}: {
  squadNumber?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { wrapper, text } = SIZE_CLASSES[size];
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        wrapper,
        className,
      )}
    >
      <Shirt
        className="absolute inset-0 size-full fill-primary text-primary"
        strokeWidth={1.5}
      />
      <span
        className={cn(
          "relative font-bold tabular-nums text-primary-foreground",
          text,
        )}
      >
        {squadNumber ?? "-"}
      </span>
    </span>
  );
}
