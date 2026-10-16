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
  { href: "/dashboard/facturacion", key: "billingLabel", Icon: ReceiptText },
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
        className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2.5
          text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-brand-500/60 data-[popup-open]:bg-white/10"
      >
        <Avatar name={props.businessName} src={props.logoUrl} className="size-8" />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:block">
          {props.businessName}
        </span>
        <ChevronDown
          className="size-4 text-slate-400 transition-transform group-data-[popup-open]:rotate-180"
          aria-hidden="true"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <Menu.Popup
            className="min-w-52 rounded-xl border border-white/10 bg-slate-900/95 p-1 shadow-xl
              shadow-black/40 backdrop-blur-xl"
          >
            {ITEMS.map(({ href, key, Icon }) => (
              <Menu.LinkItem
                key={href}
                render={<Link href={href} />}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-200
                  outline-none transition-colors data-[highlighted]:bg-white/10"
              >
                <Icon className="size-4 text-slate-400" aria-hidden="true" />
                {props[key]}
              </Menu.LinkItem>
            ))}
            <Menu.Separator className="my-1 h-px bg-white/10" />
            <form action={props.logoutAction}>
              <Menu.Item
                nativeButton
                render={<button type="submit" />}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm
                  text-rose-300 outline-none transition-colors data-[highlighted]:bg-rose-500/10"
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
