// Íconos de trazo simple (24x24) para la navegación. Usan el color del texto (currentColor).
const paths: Record<string, React.ReactNode> = {
  resumen: <><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></>,
  productos: <><circle cx="12" cy="12" r="5" /><path d="M7 9.5 2.5 7v10L7 14.5M17 9.5 21.5 7v10L17 14.5" /></>,
  ventas: <><path d="M3 12.5V4h8.5L21 13.5 13.5 21 3 12.5z" /><circle cx="7.5" cy="8.5" r="1.3" /></>,
  compras: <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  clientes: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  proveedores: <><path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3v3.5h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  cartera: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><path d="M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5z" /><circle cx="16" cy="13.5" r="1.2" /></>,
  cierre: <><rect x="6" y="3" width="12" height="5" rx="1" /><path d="M4 21v-8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8z" /><path d="M8 15h2M12 15h2M8 18h2M12 18h2" /></>,
  usuarios: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.8" /><path d="M17.5 14.2A5.5 5.5 0 0 1 21.5 20" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  colapsar: <path d="M12 6l-6 6 6 6M19 6l-6 6 6 6" />,
  expandir: <path d="M5 6l6 6-6 6M12 6l6 6-6 6" />,
}

export type IconName = keyof typeof paths

export default function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}
