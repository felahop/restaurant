/** Права ролей. Владелец — всё; менеджер — заказы, меню и брони. */

export type AdminRoleName = "OWNER" | "MANAGER";

export type AdminSection =
  | "orders"
  | "menu"
  | "reservations"
  | "delivery"
  | "marketing"
  | "reviews"
  | "analytics"
  | "settings"
  | "staff"
  | "journal";

const MANAGER_SECTIONS: readonly AdminSection[] = ["orders", "menu", "reservations"];

export function canAccess(role: AdminRoleName, section: AdminSection): boolean {
  return role === "OWNER" || MANAGER_SECTIONS.includes(section);
}

export const roleLabels: Record<AdminRoleName, string> = { OWNER: "Владелец", MANAGER: "Менеджер" };
