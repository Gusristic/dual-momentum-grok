/**
 * Layout del dashboard — 7 vistas.
 * Auth obligatoria (middleware se añade en siguiente iteración).
 */

import Link from 'next/link';

const NAV = [
  { href: '/config', label: 'Configuración' },
  { href: '/backtest', label: 'Backtest' },
  { href: '/signal', label: 'Señal Hoy' },
  { href: '/allocation', label: 'Asignación 5A' },
  { href: '/tax', label: 'Fiscalidad' },
  { href: '/correlations', label: 'Correlaciones' },
  { href: '/reports', label: 'Informes' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r bg-muted/30 p-4 shrink-0">
        <div className="font-semibold text-sm mb-6 tracking-tight">
          Dual Momentum
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 text-xs text-muted-foreground leading-relaxed">
          Uso educativo.<br />
          No es asesoramiento financiero ni fiscal.
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
