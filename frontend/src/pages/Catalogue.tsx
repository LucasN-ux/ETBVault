import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CarteEtb from '../components/catalogue/CarteEtb'
import GrilleSquelette from '../components/catalogue/GrilleSquelette'
import { Icon } from '../components/Icon'
import { Chip, EtatErreur, EtatVide, SearchInput } from '../components/ui'
import { useCatalogue, type EtbEnrichie } from '../hooks/useCatalogue'
import { ordonnerSeries } from '../utils/series'

// Catalogue des ETB : recherche, filtre par ère, tri.
// Le filtre par type de produit a disparu avec le retour au périmètre ETB.

type CleTri = 'date' | 'prix' | 'variation' | 'nom'

interface GroupeEre {
  ere: string
  liste: EtbEnrichie[]
}

const TRIS: ReadonlyArray<{ cle: CleTri; label: string }> = [
  { cle: 'date', label: 'Sortie' },
  { cle: 'prix', label: 'Prix' },
  { cle: 'variation', label: 'Évolution' },
  { cle: 'nom', label: 'A–Z' },
]

const TOUTES = 'Toutes'
const SANS_SERIE = 'Sans série'
const MAX_PAR_GROUPE = 18

const nomDe = (e: EtbEnrichie): string => e.nomFr ?? e.nom
const dateDe = (e: EtbEnrichie): number => new Date(e.dateSortie ?? 0).getTime()

export default function Catalogue() {
  const navigate = useNavigate()
  const [parametres, setParametres] = useSearchParams()
  const { etbs, chargement, erreur, recharger } = useCatalogue()

  const [recherche, setRecherche] = useState(parametres.get('q') ?? '')
  const [ere, setEre] = useState(parametres.get('ere') ?? TOUTES)
  const [tri, setTri] = useState<CleTri>('date')

  // L'URL reflète les filtres : un lien vers le catalogue filtré reste partageable.
  useEffect(() => {
    const p: Record<string, string> = {}
    if (recherche) p.q = recherche
    if (ere !== TOUTES) p.ere = ere
    setParametres(p, { replace: true })
  }, [recherche, ere, setParametres])

  const eresPresentes = useMemo(() => ordonnerSeries(etbs.map((e) => e.era)), [etbs])
  const aSansEre = useMemo(() => etbs.some((e) => !e.era), [etbs])

  const filtrees = useMemo(() => trier(filtrer(etbs, ere, recherche), tri), [etbs, ere, recherche, tri])

  // Vue groupée par ère : uniquement sans filtre d'ère et en tri par date,
  // sinon les groupes contrediraient le tri demandé.
  const groupes = useMemo(() => {
    if (ere !== TOUTES || tri !== 'date') return null
    const parEre = eresPresentes
      .map((e) => ({ ere: e, liste: filtrees.filter((x) => x.era === e) }))
      .filter((g) => g.liste.length > 0)
    const sansEre = filtrees.filter((e) => !e.era)
    if (sansEre.length > 0) parEre.push({ ere: SANS_SERIE, liste: sansEre })
    return parEre
  }, [filtrees, ere, tri, eresPresentes])

  const reinitialiser = () => {
    setRecherche('')
    setEre(TOUTES)
  }

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <section className="mx-auto" style={{ maxWidth: 1180, padding: 'clamp(24px,4vw,44px) clamp(18px,4vw,40px) 0' }}>
        <h1 className="display" style={{ fontSize: 'clamp(26px,3vw,38px)', marginBottom: 6 }}>
          Catalogue
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
          {etbs.length || '—'} Elite Trainer Box · prix Cardmarket France
        </p>
      </section>

      <div
        style={{
          position: 'sticky',
          top: 57,
          zIndex: 20,
          background: 'color-mix(in oklch, var(--bg) 88%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="mx-auto flex flex-col gap-3" style={{ maxWidth: 1180, padding: '14px clamp(18px,4vw,40px)' }}>
          <SearchInput value={recherche} onChange={setRecherche} placeholder="Rechercher une ETB…" />
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" style={{ paddingBottom: 2 }}>
            <Chip active={ere === TOUTES} onClick={() => setEre(TOUTES)}>
              {TOUTES}
            </Chip>
            {eresPresentes.map((e) => (
              <Chip key={e} active={ere === e} onClick={() => setEre(e)}>
                {e}
              </Chip>
            ))}
            {aSansEre && (
              <Chip active={ere === SANS_SERIE} onClick={() => setEre(SANS_SERIE)}>
                {SANS_SERIE}
              </Chip>
            )}
            <span style={{ width: 1, height: 18, background: 'var(--border-2)', margin: '0 6px', flexShrink: 0 }} />
            <span className="flex items-center shrink-0" style={{ color: 'var(--faint)' }}>
              <Icon name="sort" size={14} />
            </span>
            {TRIS.map((t) => (
              <Chip key={t.cle} active={tri === t.cle} onClick={() => setTri(t.cle)}>
                {t.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <section
        className="mx-auto"
        style={{ maxWidth: 1180, padding: 'clamp(20px,3vw,32px) clamp(18px,4vw,40px) 60px' }}
      >
        {erreur ? (
          <EtatErreur erreur={erreur} onReessayer={recharger} />
        ) : chargement ? (
          <GrilleSquelette />
        ) : filtrees.length === 0 ? (
          <EtatVide
            titre="Aucune ETB ne correspond"
            detail="Essaie un autre terme ou une autre ère."
            action={
              <button className="ulink" onClick={reinitialiser} style={{ marginTop: 4 }}>
                Réinitialiser les filtres
              </button>
            }
          />
        ) : groupes ? (
          <div className="flex flex-col" style={{ gap: 44 }}>
            {groupes.map((g) => (
              <GroupeEre key={g.ere} groupe={g} onVoirTout={() => setEre(g.ere)} onOuvrir={ouvrir} />
            ))}
          </div>
        ) : (
          <Grille etbs={filtrees} onOuvrir={ouvrir} />
        )}
      </section>
    </div>
  )

  function ouvrir(id: string) {
    navigate(`/etb/${id}`)
  }
}

function GroupeEre({
  groupe,
  onVoirTout,
  onOuvrir,
}: {
  groupe: GroupeEre
  onVoirTout: () => void
  onOuvrir: (id: string) => void
}) {
  const visibles = groupe.liste.slice(0, MAX_PAR_GROUPE)
  const reste = groupe.liste.length - visibles.length

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="display" style={{ fontSize: 19 }}>
          {groupe.ere}
        </h2>
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--faint)' }}>
          {groupe.liste.length}
        </span>
      </div>
      <Grille etbs={visibles} onOuvrir={onOuvrir} />
      {reste > 0 && (
        <button
          onClick={onVoirTout}
          className="ulink mt-4 inline-flex items-center gap-1.5"
          style={{ fontSize: 13.5 }}
        >
          Voir les {groupe.liste.length} ETB · {groupe.ere} <Icon name="arrowRight" size={15} />
        </button>
      )}
    </div>
  )
}

function Grille({ etbs, onOuvrir }: { etbs: readonly EtbEnrichie[]; onOuvrir: (id: string) => void }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
      {etbs.map((etb) => (
        <CarteEtb key={etb.id} etb={etb} onOuvrir={onOuvrir} />
      ))}
    </div>
  )
}

function filtrer(etbs: readonly EtbEnrichie[], ere: string, recherche: string): EtbEnrichie[] {
  let liste: EtbEnrichie[] = [...etbs]
  if (ere === SANS_SERIE) liste = liste.filter((e) => !e.era)
  else if (ere !== TOUTES) liste = liste.filter((e) => e.era === ere)

  const terme = recherche.trim().toLowerCase()
  if (terme) {
    liste = liste.filter((e) =>
      [e.nomFr, e.nom, e.id].some((champ) => champ && String(champ).toLowerCase().includes(terme)),
    )
  }
  return liste
}

function trier(etbs: readonly EtbEnrichie[], tri: CleTri): EtbEnrichie[] {
  const liste = etbs.slice()
  if (tri === 'prix') return liste.sort((a, b) => (b.prixActuel ?? 0) - (a.prixActuel ?? 0))
  // Une ETB sans variation connue (trop récente) part en fin de classement.
  if (tri === 'variation') return liste.sort((a, b) => (b.v30 ?? -Infinity) - (a.v30 ?? -Infinity))
  if (tri === 'nom') return liste.sort((a, b) => nomDe(a).localeCompare(nomDe(b), 'fr'))
  return liste.sort((a, b) => {
    const ecart = dateDe(b) - dateDe(a)
    return ecart !== 0 ? ecart : nomDe(a).localeCompare(nomDe(b), 'fr')
  })
}
