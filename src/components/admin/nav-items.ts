import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  MapPinned,
  MessageSquareQuote,
  ScrollText,
  Settings,
  Tag,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type { AdminSection } from "@/server/admin/roles";

/** Разделы админки. Общий модуль: нужен и серверному layout, и клиентской навигации. */
export const ADMIN_NAV: { section: AdminSection; href: string; label: string; Icon: typeof ClipboardList }[] = [
  { section: "orders", href: "/admin/orders", label: "Заказы", Icon: ClipboardList },
  { section: "menu", href: "/admin/menu", label: "Меню", Icon: UtensilsCrossed },
  { section: "reservations", href: "/admin/reservations", label: "Брони", Icon: CalendarDays },
  { section: "delivery", href: "/admin/delivery", label: "Доставка", Icon: MapPinned },
  { section: "marketing", href: "/admin/marketing", label: "Маркетинг", Icon: Tag },
  { section: "reviews", href: "/admin/reviews", label: "Отзывы", Icon: MessageSquareQuote },
  { section: "analytics", href: "/admin/analytics", label: "Аналитика", Icon: BarChart3 },
  { section: "settings", href: "/admin/settings", label: "Настройки", Icon: Settings },
  { section: "staff", href: "/admin/staff", label: "Сотрудники", Icon: Users },
  { section: "journal", href: "/admin/journal", label: "Журнал", Icon: ScrollText },
];
