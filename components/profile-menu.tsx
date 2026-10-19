"use client";

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, LayoutDashboard, LogOut, ReceiptText, Settings } from "lucide-react";

import Avatar from "@/components/ui/avatar";

export interface ProfileMenuProps
{
  readonly businessName: string;
  readonly logoUrl: string | null;
  readonly logoutAction: () => void | Promise<void>;
  readonly menuLabel: string;
  readonly dashboardLabel: string;
  readonly configLabel: string;
  readonly billingLabel: string;
  readonly logoutLabel: string;
}

const ITEMS = [
  { href: "/dashboard", key: "dashboardLabel", Icon: LayoutDashboard },
  { href: "/dashboard/config", key: "configLabel", Icon: Settings },
  { href: "/dashboard/suscripcion", key: "billingLabel", Icon: ReceiptText },
] as const;

/**
 * Menú de cuenta del header: avatar + nombre del negocio con acciones.
 *
 * @param props identidad, Server Action de logout y etiquetas i18n.
 * @return Trigger con avatar y dropdown de navegación.
 */
export default function ProfileMenu(props: ProfileMenuProps)
{
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={props.menuLabel}
        className="group flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-2.5
          text-ink transition-colors hover:border-primary/40 hover:bg-soft focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-primary/30 data-[popup-open]:bg-soft"
      >
        <Avatar name={props.businessName} src={props.logoUrl} className="size-8" />
        <span className="hidden max-w-[10rem] truncate text-sm font-semibold sm:block">
          {props.businessName}
        </span>
        <ChevronDown
          className="size-4 text-muted-foreground transition-transform duration-200
            group-data-[popup-open]:rotate-180"
          aria-hidden="true"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <Menu.Popup
            className="animate-fade-in min-w-52 origin-top-right rounded-lg border border-line bg-white p-1
              shadow-[var(--shadow-modal)]"
          >
            {ITEMS.map(({ href, key, Icon }) => (
              <Menu.LinkItem
                key={href}
                render={<Link href={href} />}
                className="flex items-center gap-2.5 rounded px-3 py-2 text-sm text-ink
                  outline-none transition-colors data-[highlighted]:bg-soft"
              >
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {props[key]}
              </Menu.LinkItem>
            ))}
            <Menu.Separator className="my-1 h-px bg-line" />
            <form action={props.logoutAction}>
              <Menu.Item
                nativeButton
                render={<button type="submit" />}
                className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-sm
                  text-danger outline-none transition-colors data-[highlighted]:bg-danger-soft"
              >
                <LogOut className="size-4" aria-hidden="true" />
                {props.logoutLabel}
              </Menu.Item>
            </form>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
