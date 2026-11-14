type ClassValue = string | false | null | undefined | 0;

/** Склеивает классы, отбрасывая пустые значения. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
