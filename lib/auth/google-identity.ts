/**
 * Tipos y helpers de Google Identity Services (GIS).
 *
 * El login obtiene un ID token en el navegador y lo canjea por una sesión de
 * Supabase con `signInWithIdToken`. No se solicitan scopes de Google APIs.
 */

export interface GoogleCredentialResponse
{
  readonly credential: string;
}

export interface GoogleInitializeConfig
{
  readonly client_id: string;
  readonly callback: (response: GoogleCredentialResponse) => void;
  readonly nonce?: string;
  readonly use_fedcm_for_prompt?: boolean;
  readonly ux_mode?: "popup" | "redirect";
}

export interface GoogleButtonOptions
{
  readonly type?: "standard" | "icon";
  readonly theme?: "outline" | "filled_blue" | "filled_black";
  readonly size?: "large" | "medium" | "small";
  readonly text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  readonly shape?: "rectangular" | "pill" | "circle" | "square";
  readonly width?: number;
  readonly logo_alignment?: "left" | "center";
}

export interface GoogleAccountsId
{
  initialize(config: GoogleInitializeConfig): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
  cancel?(): void;
}

export interface GoogleIdentityServices
{
  readonly accounts?: {
    readonly id?: GoogleAccountsId;
  };
}

declare global
{
  interface Window
  {
    google?: GoogleIdentityServices;
  }
}

export interface GoogleNoncePair
{
  readonly raw: string;
  readonly hashed: string;
}

/** Genera el nonce crudo para Supabase y su SHA-256 hexadecimal para Google. */
export async function createNoncePair(): Promise<GoogleNoncePair>
{
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw = btoa(String.fromCharCode(...bytes));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");

  return { raw, hashed };
}
