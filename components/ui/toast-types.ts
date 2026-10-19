export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastAction
{
  readonly label: string;
  readonly onClick: () => void;
}

export interface ToastInput
{
  readonly tone?: ToastTone;
  readonly title?: string;
  readonly message: string;
  readonly duration?: number;
  readonly action?: ToastAction;
}

export interface ToastItem extends ToastInput
{
  readonly id: number;
}

export interface ToastApi
{
  readonly showToast: (input: ToastInput) => void;
  readonly dismissToast: (id: number) => void;
}
