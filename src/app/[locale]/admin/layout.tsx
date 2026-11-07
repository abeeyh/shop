import type { Metadata } from "next";

// Área da equipe: fora de busca (docs/09)
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
