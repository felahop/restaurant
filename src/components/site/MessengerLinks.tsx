import { TelegramIcon, VkIcon, WhatsAppIcon } from "@/components/icons/Brands";
import { restaurant } from "@/config/restaurant";
import { cn } from "@/lib/cn";

const links = [
  { href: restaurant.contacts.telegram, label: "Telegram", Icon: TelegramIcon },
  { href: restaurant.contacts.whatsapp, label: "WhatsApp", Icon: WhatsAppIcon },
  { href: restaurant.contacts.vk, label: "ВКонтакте", Icon: VkIcon },
] as const;

export function MessengerLinks({ className }: { className?: string }) {
  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {links.map(({ href, label, Icon }) => (
        <li key={label}>
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
      ))}
    </ul>
  );
}
