// Etiqueta de precio inclinada (elemento firma del diseño).
export default function PriceTag({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`inline-block -rotate-3 ${className}`} style={{ filter: 'drop-shadow(0 6px 8px var(--tag-shadow))' }}>
      <div className="relative bg-candy-lemon text-ink font-extrabold tracking-tight py-3 pr-5 pl-16"
        style={{ clipPath: 'polygon(0 50%, 3.2rem 0, 100% 0, 100% 100%, 3.2rem 100%)' }}>
        <span className="absolute left-[1.35rem] top-1/2 size-3 -translate-y-1/2 rounded-full bg-zinc-950" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}
