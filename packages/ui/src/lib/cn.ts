/**
 * Class-name composition (task T100).
 *
 * `cn` merges conditional class names (clsx) and de-duplicates conflicting
 * Tailwind utilities (tailwind-merge) so later variants win predictably.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
