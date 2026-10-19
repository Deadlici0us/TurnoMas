"use client";

import { createContext } from "react";

/** Estado pendiente compartido entre ActionForm y su SubmitButton. */
export const ActionFormPendingContext = createContext<boolean | null>(null);
