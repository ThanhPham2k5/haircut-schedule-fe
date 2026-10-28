"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { SetupNotice } from "@/components/SetupNotice";
import { AuthProvider } from "@/providers/auth-provider";
import { readClientEnv } from "@/lib/env";

export function Providers({ children }: { children: React.ReactNode }) {
  const env = readClientEnv();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="vanguard-theme"
    >
      {env.ok ? <AuthProvider>{children}</AuthProvider> : <SetupNotice problems={env.problems} />}
      <Toaster position="top-right" richColors closeButton />
    </ThemeProvider>
  );
}
