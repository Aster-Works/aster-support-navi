import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind クラスを安全に結合（重複は後勝ち）。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
