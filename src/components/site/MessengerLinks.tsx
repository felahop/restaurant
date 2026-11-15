import { TelegramIcon, VkIcon, WhatsAppIcon } from "@/components/icons/Brands";
import { cn } from "@/lib/cn";
import type { Messenger } from "@/server/site-info";

const META = {
  telegram: { label: "Telegram", Icon: TelegramIcon },
  whatsapp: { label: "WhatsApp", Icon: WhatsAppIcon },
  vk: { label: "ВКонтакте", Icon: VkIcon },
} as const;

/** Ссылки на мессенджеры из настроек. Пустые в настройках не показываются. */
export function MessengerLinks({ items, className }: { items: Messenger[]; className?: string }) {
  if (!items.length) return null;
  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {items.map(({ key, href }) => {
        const { label, Icon } = META[key];
        return (
          <li key={key}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} (откроется в новой вкладке)`}
              className="inline-flex size-5.5 items-center justify-center rounded-full border border-line-strong text-fg transition-colors duration-150 hover:border-fg hover:bg-fg hover:text-canvas"
            >
              <Icon className="size-2.5" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
