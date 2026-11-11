import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Navbar } from '@/components/Navbar'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  listAllRecords,
  type UnifiedRecord,
  RECORD_CATEGORIES,
  type RecordCategoryId,
  CATEGORY_ICON,
} from '@/lib/recordsData'

/**
 * Página Records (padrão Guava): linha do tempo cronológica de tudo que foi
 * inserido no app — exames, uploads, medições, medicações, vacinas, condições,
 * procedimentos, refeições, sintomas, check-ins do diário — com busca e
 * filtros de SOURCE e CATEGORY na lateral.
 */

export default function RecordsPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<UnifiedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sources, setSources] = useState<string[]>([])
  const [categories, setCategories] = useState<RecordCategoryId[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listAllRecords()
        setRecords(data)
      } catch (err) {
        console.error('Erro ao carregar records:', err)
      } finally {
        setLoading(false)
      }
    }
    if (pb.authStore.record?.id) load()
  }, [])

  const toggle = <T,>(list: T[], v: T, set: (l: T[]) => void) => {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records.filter((r) => {
      if (sources.length && !sources.includes(r.source)) return false
      if (categories.length && !categories.includes(r.category)) return false
      if (q && !`${r.title} ${r.origin}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [records, query, sources, categories])

  const groupedByYear = useMemo(() => {
    const map = new Map<number, UnifiedRecord[]>()
    for (const r of filtered) {
      const y = Number(r.date.slice(0, 4))
      if (!map.has(y)) map.set(y, [])
      map.get(y)!.push(r)
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [filtered])

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<RecordCategoryId, number>> = {}
    for (const r of records) counts[r.category] = (counts[r.category] || 0) + 1
    return counts
  }, [records])

  const categoriesWithCount = useMemo(
    () => RECORD_CATEGORIES.filter((c) => categoryCounts[c.id]),
    [categoryCounts],
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar currentTab="records" />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar filtros */}
          <aside className="space-y-5 lg:sticky lg:top-6 self-start">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-2">
                Fonte
              </p>
              <div className="space-y-2">
                {(
                  [
                    { id: 'upload', label: 'Arquivos enviados', icon: '☁️' },
                    { id: 'manual', label: 'Registro manual', icon: '✍️' },
                    { id: 'ai', label: 'Gerado por IA', icon: '✨' },
                  ] as const
                ).map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 text-xs cursor-pointer text-foreground/90"
                  >
                    <Checkbox
                      checked={sources.includes(s.id)}
                      onCheckedChange={() => toggle(sources, s.id, setSources)}
                      className="h-4 w-4"
                    />
                    <span>{s.icon}</span>
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-2">
                Categoria
              </p>
              <div className="space-y-2">
                {categoriesWithCount.map((c) => {
                  const SideIcon = CATEGORY_ICON[c.id].Icon
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 text-xs cursor-pointer text-foreground/90"
                    >
                      <Checkbox
                        checked={categories.includes(c.id)}
                        onCheckedChange={() => toggle(categories, c.id, setCategories)}
                        className="h-4 w-4"
                      />
                      <span className={cn('text-sm', CATEGORY_ICON[c.id].colorClass)}>
                        <SideIcon className="h-3.5 w-3.5" />
                      </span>
                      {c.label}
                      <span className="text-muted-foreground ml-auto text-[10px]">
                        {categoryCounts[c.id]}
                      </span>
                    </label>
                  )
                })}
                {categoriesWithCount.length === 0 && !loading && (
                  <p className="text-[11px] text-muted-foreground">Nenhuma categoria com dados.</p>
                )}
              </div>
            </div>
          </aside>

          {/* Coluna principal */}
          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ex: Exame de sangue, Colesterol"
                className="pl-9 h-11 rounded-full bg-muted/50 border-border text-sm"
              />
            </div>

            {/* Lista */}
            {loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum registro encontrado{query ? ` para "${query}"` : ''}.
              </div>
            ) : (
              groupedByYear.map(([year, items]) => (
                <div key={year} className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">{year}</h2>
                  <div className="rounded-2xl border bg-card divide-y divide-border overflow-hidden">
                    {items.map((r) => {
                      const cat = CATEGORY_ICON[r.category]
                      return (
                        <button
                          key={r.id}
                          onClick={() => r.navigateTo && navigate(r.navigateTo)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors',
                            !r.navigateTo && 'cursor-default',
                          )}
                        >
                          <div
                            className={cn(
                              'h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-white',
                              cat.bgClass,
                            )}
                          >
                            <cat.Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-muted-foreground">
                              {r.formattedDate} • {r.sourceLabel}
                              {r.origin ? ` • ${r.origin}` : ''}
                            </p>
                            <p className="text-sm font-semibold text-foreground truncate">
                              {r.title}
                            </p>
                            {r.subtitle && (
                              <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
