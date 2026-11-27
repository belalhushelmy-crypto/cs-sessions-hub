import { cn } from "@/lib/utils";
import Image from "next/image";

export function BrandMark({
  className,
  size = 9,
  variant = "auto",
}: {
  className?: string;
  size?: number;
  /** "auto" follows the theme; "dark" is for always-dark panels. */
  variant?: "auto" | "light" | "dark";
}) {
  const sizeClass = `size-${size}`;
  const darkClass = variant === "auto" ? "hidden dark:block" : variant === "dark" ? "block" : "hidden";
  const lightClass = variant === "auto" ? "block dark:hidden" : variant === "light" ? "block" : "hidden";

  return (
    <span className={cn("flex shrink-0", className)} aria-hidden="true">
      {/* Dark mode logo */}
      <Image
        src="/brand/logo-dark-trim.png"
        alt=""
        width={size * 4}
        height={size * 4}
        className={cn(darkClass, sizeClass)}
        priority
      />
      {/* Light mode logo */}
      <Image
        src="/brand/logo-light-trim.png"
        alt=""
        width={size * 4}
        height={size * 4}
        className={cn(lightClass, sizeClass)}
        priority
      />
    </span>
  );
}