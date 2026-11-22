"use client";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <main className="fixed top-12 left-18 right-0 bottom-0 overflow-auto">
      {children}
    </main>
  );
}
