import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchETB, fetchCartes, fetchPrixHistorique, fetchScore, fetchEraStats, fetchPrixActuels } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import PriceChart from '../components/PriceChart'
import ScoreDetail from '../components/ScoreDetail'

const RARETE_ORDER = [
  'Special Illustration Rare',
  'Hyper Rare',
  'Illustration Rare',
  'Ultra Rare',
  'Double Rare',
  'Rare',
  'Uncommon',
  'Common',
  'Promo',
]

const RARETE_LABEL = {
  'Special Illustration Rare': 'SIR',
  'Hyper Rare': 'HR',
  'Illustration Rare': 'IR',
  'Ultra Rare': 'UR',
  'Double Rare': 'RR',
  'Rare': 'R',
  'Uncommon': 'U',
  'Common': 'C',
  'Promo': 'P',
}

const TABS = [
  { key: 'cartes',  label: 'Cartes' },
  { key: 'analyse', label: 'Analyse' },
  { key: 'score',   label: 'Score' },
]

export default function ETBDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [etb, setEtb] = useState(null)
  const [cartes, setCartes] = useState([])
  const [loadingEtb, setLoadingEtb] = useState(true)
  const [loadingCartes, setLoadingCartes] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [rareteActive, setRareteActive] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [onglet, setOnglet] = useState('analyse')

  // Données prix & score & analyse
  const [historique, setHistorique] = useState([])
  const [scoreData, setScoreData] = useState(null)
  const [eraStats, setEraStats] = useState(null)
  const [prixActuels, setPrixActuels] = useState({})
  const [loadingPrix, setLoadingPrix] = useState(false)
  const [loadingScore, setLoadingScore] = useState(false)
  const [loadingEra, setLoadingEra] = useState(false)

  useEffect(() => {
    setLoadingEtb(true)
    setEtb(null)
    setErreur(null)
    fetchETB(id)
      .then(setEtb)
      .catch(() => setErreur('ETB introuvable.'))
      .finally(() => setLoadingEtb(false))
  }, [id])

  useEffect(() => {
    if (!etb) return
    setCartes([])
    setRareteActive(null)
    setRecherche('')
    setOnglet('cartes')
    setLoadingCartes(true)
    fetchCartes(id)
      .then(setCartes)
      .catch(() => {})
      .finally(() => setLoadingCartes(false))
  }, [id, etb])

  // Chargement des prix au montage de la page (graphique dans le header)
  useEffect(() => {
    if (!etb) return
    setLoadingPrix(true)
    fetchPrixHistorique(id)
      .then(setHistorique)
      .catch(() => {})
      .finally(() => setLoadingPrix(false))
  }, [id, etb])

  // Chargement des prix actuels de tous les ETBs — pour calculer les quartiles du catalogue
  useEffect(() => {
    fetchPrixActuels()
      .then(setPrixActuels)
      .catch(() => {})
  }, [])

  // Chargement du score uniquement si on ouvre l'onglet Score
  useEffect(() => {
    if (onglet !== 'score' || !etb || scoreData) return
    setLoadingScore(true)
    fetchScore(id)
      .then(setScoreData)
      .catch(() => {})
      .finally(() => setLoadingScore(false))
  }, [onglet, id, etb])

  // Chargement des stats ère uniquement si on ouvre l'onglet Analyse
  useEffect(() => {
    if (onglet !== 'analyse' || !etb?.era || eraStats) return
    setLoadingEra(true)
    fetchEraStats(etb.era)
      .then(setEraStats)
      .catch(() => {})
      .finally(() => setLoadingEra(false))
  }, [onglet, etb, eraStats])

  const raretesDisponibles = useMemo(() => {
    const found = new Set(cartes.map((c) => c.rarete).filter(Boolean))
    return RARETE_ORDER.filter((r) => found.has(r))
  }, [cartes])

  const cartesFiltrees = useMemo(() => {
    let list = cartes
    if (rareteActive) list = list.filter((c) => c.rarete === rareteActive)
    if (recherche.trim()) {
      const q = recherche.toLowerCase()
      list = list.filter((c) => c.nom?.toLowerCase().includes(q) || c.numero?.includes(q))
    }
    return list
  }, [cartes, rareteActive, recherche])

  const valeurTotale = useMemo(
    () => cartes.reduce((s, c) => s + Number(c.prixMarche ?? 0), 0),
    [cartes]
  )
  const nbAvecPrix = useMemo(
    () => cartes.filter((c) => Number(c.prixMarche ?? 0) > 0).length,
    [cartes]
  )

  // Déclaré ici (avant les useMemos qui en dépendent) pour éviter la zone morte JS
  const prixSortie = useMemo(
    () => etb ? Number(etb.prixSortie ?? etb.prix_sortie ?? 0) : 0,
    [etb]
  )

  // Top 10 cartes les plus chères du set (signal pression déscellage)
  const valeurTop10 = useMemo(() => {
    return [...cartes]
      .filter((c) => Number(c.prixMarche ?? 0) > 0)
      .sort((a, b) => Number(b.prixMarche) - Number(a.prixMarche))
      .slice(0, 10)
      .reduce((s, c) => s + Number(c.prixMarche), 0)
  }, [cartes])

  // Prix actuel de marché (dernier cmPrixMoyen disponible)
  const prixActuelMarche = useMemo(() => {
    if (!historique.length) return null
    const dernier = [...historique].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    return dernier?.cmPrixMoyen ? Number(dernier.cmPrixMoyen) : null
  }, [historique])

  const ratioDescellage = useMemo(() => {
    if (!prixActuelMarche || prixActuelMarche <= 0 || valeurTop10 <= 0) return null
    return valeurTop10 / prixActuelMarche
  }, [valeurTop10, prixActuelMarche])

  // ── Signaux d'investissement ─────────────────────────────────────────────────

  const cagr = useMemo(() => {
    if (!prixSortie || !prixActuelMarche || prixSortie <= 0) return null
    const dateStr = etb?.dateSortie ?? etb?.date_sortie
    if (!dateStr) return null
    const annees = (Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24 * 365.25)
    if (annees < 0.5) return null
    return (Math.pow(prixActuelMarche / prixSortie, 1 / annees) - 1) * 100
  }, [prixSortie, prixActuelMarche, etb])

  const phase = useMemo(() => {
    if (!prixSortie || !prixActuelMarche || prixSortie <= 0) return null
    const dateStr = etb?.dateSortie ?? etb?.date_sortie
    if (!dateStr) return null
    const ageMois = (Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24 * 30)
    const mult = prixActuelMarche / prixSortie
    if (ageMois < 6 && mult <= 1.15)
      return { num: 1, label: 'Sortie récente', action: 'Observer', actionColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30', desc: 'Encore en distribution, tendance pas encore établie.' }
    if (mult <= 1.3 && ageMois < 30)
      return { num: 2, label: 'Distribution', action: 'Fenêtre d\'achat', actionColor: 'bg-green-500/20 text-green-400 border-green-500/30', desc: 'Prix proche du prix de sortie. Meilleur moment si le set est prometteur.' }
    if (mult < 2.0)
      return { num: 3, label: 'Valorisation', action: 'Surveiller', actionColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', desc: 'La rareté commence à être reconnue par le marché.' }
    return { num: 4, label: 'Maturité', action: 'Tenir / Liquider', actionColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30', desc: 'Valeur établie. Attention à la liquidité à la revente.' }
  }, [prixSortie, prixActuelMarche, etb])

  const natureHausse = useMemo(() => {
    if (!ratioDescellage || !prixActuelMarche) return null
    const sortedHist = [...historique].sort((a, b) => new Date(a.date) - new Date(b.date))
    const trend = sortedHist.length >= 3 &&
      Number(sortedHist.at(-1).cmPrixMoyen) > Number(sortedHist.at(-3).cmPrixMoyen)
    if (ratioDescellage >= 1.3 && trend)
      return { label: 'Tirée par les cartes', risk: 'Fondamentale — plus durable', color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/10', desc: 'La valeur des cartes intérieures justifie l\'appréciation. Les gens achètent pour ouvrir.' }
    if (ratioDescellage < 0.8 && trend)
      return { label: 'Tirée par la rareté', risk: 'Spéculative — plus volatile', color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10', desc: 'Hausse due au stock limité, pas à la valeur des cartes. Plus risqué.' }
    if (trend)
      return { label: 'Hausse mixte', risk: 'Cartes + rareté', color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', desc: 'Les deux facteurs contribuent à la hausse.' }
    return { label: 'Pas de tendance claire', risk: 'Marché stable ou baissier', color: 'text-gray-400', border: 'border-gray-600/30', bg: 'bg-gray-700/20', desc: 'Aucune pression haussière détectée sur les données disponibles.' }
  }, [ratioDescellage, historique, prixActuelMarche])

  const positionEra = useMemo(() => {
    if (!eraStats || !prixSortie || !prixActuelMarche || prixSortie <= 0) return null
    const myMultiple = Math.round(prixActuelMarche / prixSortie * 100) / 100
    const rank = eraStats.multiples.findIndex((e) => e.id === id) + 1
    const total = eraStats.multiples.length
    const diff = Math.round((myMultiple - eraStats.avgMultiple) * 100) / 100
    const top25 = Math.ceil(total * 0.25)
    const bot25 = Math.floor(total * 0.75)
    const perf = rank > 0 && rank <= top25 ? 'Surperforme l\'ère'
               : rank > bot25 ? 'Sous-performe l\'ère'
               : 'Dans la moyenne'
    const perfColor = rank > 0 && rank <= top25 ? 'text-green-400'
                    : rank > bot25 ? 'text-red-400'
                    : 'text-yellow-400'
    return { rank, total, myMultiple, avgMultiple: eraStats.avgMultiple, diff, perf, perfColor }
  }, [eraStats, prixSortie, prixActuelMarche, id])

  // Évolution du ratio dans le temps (signal spéculatif)
  const ratioHistorique = useMemo(() => {
    return historique
      .filter((h) => h.cmPrixMoyen && h.valeurTop10Cartes)
      .map((h) => ({
        date: h.date,
        ratio: Math.round(Number(h.valeurTop10Cartes) / Number(h.cmPrixMoyen) * 100) / 100,
        valeurCartes: Number(h.valeurTop10Cartes),
        prixETB: Number(h.cmPrixMoyen),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [historique])

  // Ticket d'entrée : analyse du capital requis basée sur les quartiles réels du catalogue
  const ticketEntree = useMemo(() => {
    if (!prixActuelMarche) return null
    const prix = prixActuelMarche

    // Calcul des quartiles à partir de tous les prix actuels du vault
    const tousPrix = Object.values(prixActuels)
      .map((v) => v.prixActuel)
      .filter((p) => p > 0)
      .sort((a, b) => a - b)

    // Si pas encore de données globales, fallback sur l'axe relatif au prix de sortie
    let tier // 0=Accessible, 1=Intermédiaire, 2=Élevé, 3=Premium
    if (tousPrix.length >= 4) {
      const q1 = tousPrix[Math.floor(tousPrix.length * 0.25)]
      const q2 = tousPrix[Math.floor(tousPrix.length * 0.5)]
      const q3 = tousPrix[Math.floor(tousPrix.length * 0.75)]
      tier = prix <= q1 ? 0 : prix <= q2 ? 1 : prix <= q3 ? 2 : 3
    } else if (prixSortie && prixSortie > 0) {
      // Fallback : basé sur le multiple depuis le prix de sortie
      const mult = prix / Number(prixSortie)
      tier = mult < 1.2 ? 0 : mult < 2 ? 1 : mult < 4 ? 2 : 3
    } else {
      tier = 0
    }

    const TIERS_CAPITAL = [
      { label: 'Accessible',    color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  desc: 'Dans les 25% les moins chers du catalogue — large pool d\'acheteurs, bonne liquidité dans les deux sens.' },
      { label: 'Intermédiaire', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', desc: 'Moitié basse du catalogue — acheteurs sérieux, marché encore actif.' },
      { label: 'Élevé',        color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', desc: 'Moitié haute du catalogue — capital important, peu d\'acheteurs à ce niveau.' },
      { label: 'Premium',      color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    desc: 'Top 25% du catalogue — marché de niche, très peu d\'acheteurs, revente lente.' },
    ]
    const capital = TIERS_CAPITAL[tier]

    const upside =
      !phase ? null
      : phase.num === 1 ? { label: 'Fort', pct: '+100 à +300%', color: 'text-green-400', desc: 'Set récent, cycle entier devant vous.' }
      : phase.num === 2 ? { label: 'Fort', pct: '+50 à +200%', color: 'text-green-400', desc: 'Meilleur rapport risque/rendement — fenêtre d\'achat ouverte.' }
      : phase.num === 3 ? { label: 'Modéré', pct: '+20 à +80%', color: 'text-yellow-400', desc: 'L\'essentiel de l\'appréciation facile est derrière.' }
      : { label: 'Limité', pct: '+10 à +40%', color: 'text-orange-400', desc: 'Set mature — les gains futurs sont plus lents et plus incertains.' }

    const TIERS_LIQUIDITE = [
      { label: 'Bonne',   color: 'text-green-400',  desc: 'Revente rapide — beaucoup d\'acheteurs à ce niveau de prix.' },
      { label: 'Correcte', color: 'text-yellow-400', desc: 'Délai raisonnable — acheteurs disponibles mais moins nombreux.' },
      { label: 'Limitée', color: 'text-orange-400', desc: 'Prévoir plusieurs semaines — peu d\'acheteurs à ce prix.' },
      { label: 'Faible',  color: 'text-red-400',    desc: 'Marché très étroit — la revente peut prendre des mois.' },
    ]
    const liquidite = TIERS_LIQUIDITE[tier]

    // Profil global : croise le tier de prix et la phase du cycle
    const profil =
      tier === 0 && phase?.num <= 2 ? { label: 'Opportunité',         color: 'text-green-400',  border: 'border-green-500/40',  bg: 'bg-green-500/10',  desc: 'Prix accessible et phase précoce — meilleur rapport risque/rendement du catalogue.' }
      : tier <= 1 && phase?.num <= 2 ? { label: 'Favorable',           color: 'text-green-400',  border: 'border-green-500/30',  bg: 'bg-green-500/10',  desc: 'Encore tôt dans le cycle avec un ticket raisonnable. Risque maîtrisé.' }
      : tier >= 2 && phase?.num <= 2 ? { label: 'Spéculatif',          color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', desc: 'Potentiel encore présent mais le capital élevé amplifie le risque en cas de réimpression.' }
      : tier <= 1 && phase?.num === 3 ? { label: 'Risque modéré',       color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', desc: 'Prix accessible mais l\'upside se réduit. Surveiller avant de rentrer.' }
      : tier >= 2 && phase?.num >= 3  ? { label: 'Investissement lourd', color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10', desc: 'Capital important, upside limité, liquidité réduite. Réservé aux collectors convaincus du long terme.' }
      : { label: 'Risque modéré', color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', desc: 'Profil intermédiaire — analyse au cas par cas selon le set.' }

    // Contexte affiché sous le prix pour expliquer le tier
    const contexteTier = tousPrix.length >= 4
      ? `Top ${tier === 3 ? 25 : tier === 2 ? 50 : tier === 1 ? 75 : 100}% des prix du vault (${tousPrix.length} ETBs)`
      : 'Basé sur le multiple depuis le prix de sortie'

    return { capital, upside, liquidite, profil, prix, contexteTier }
  }, [prixActuelMarche, prixActuels, phase, prixSortie])

  if (loadingEtb) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm animate-pulse">Chargement...</p>
      </div>
    )
  }

  if (erreur || !etb) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400 text-sm">{erreur || 'ETB introuvable.'}</p>
      </div>
    )
  }

  const annee = (etb.dateSortie || etb.date_sortie)
    ? new Date(etb.dateSortie ?? etb.date_sortie).toLocaleDateString('fr-FR', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—'
  const contenu = etb.contenu || {}

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <div className="bg-gray-950 border-b border-gray-800/50 px-4 sm:px-6 py-2">
        <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-gray-500">
          <button onClick={() => navigate('/')} className="hover:text-gray-300 transition-colors">Accueil</button>
          <span>/</span>
          <button onClick={() => navigate('/catalogue')} className="hover:text-gray-300 transition-colors">Catalogue</button>
          <span>/</span>
          <span className="text-gray-400 truncate max-w-[160px]">{etb.nom}</span>
        </div>
      </div>

      {/* ── Header ETB ──────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-5">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-5">

          {/* Gauche : image + infos */}
          <div className="flex gap-4 items-start shrink-0">
            <div className="bg-gray-800 rounded-xl flex items-center justify-center w-32 h-24 shrink-0 overflow-hidden">
              {(etb.boxImageUrl ?? etb.box_image_url) ? (
                <img
                  src={etb.boxImageUrl ?? etb.box_image_url}
                  alt={etb.nom}
                  className="w-full h-full object-cover"
                />
              ) : (etb.imageUrl || etb.image_url) ? (
                <img
                  src={etb.imageUrl ?? etb.image_url}
                  alt={etb.nom}
                  className="h-20 object-contain p-2"
                />
              ) : (
                <span className="text-gray-600 text-xs">{etb.id}</span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="bg-gray-700 text-gray-300 text-xs font-mono px-2 py-0.5 rounded">
                  {etb.id?.toUpperCase()}
                </span>
                {etb.era && <span className="text-gray-500 text-xs">{etb.era}</span>}
              </div>
              <h1 className="text-xl font-bold text-white mb-0.5 leading-tight">{etb.nom}</h1>
              <p className="text-gray-400 text-xs mb-2">{annee}</p>

              <div className="flex flex-wrap gap-3 text-sm">
                <div>
                  <span className="text-pokemon-yellow font-bold">
                    {prixSortie ? `${prixSortie.toFixed(2).replace('.', ',')} €` : '—'}
                  </span>
                  <span className="text-gray-500 text-xs ml-1">sortie</span>
                </div>
                {cartes.length > 0 && (
                  <>
                    <div>
                      <span className="text-white font-semibold">{cartes.length}</span>
                      <span className="text-gray-500 text-xs ml-1">cartes</span>
                    </div>
                    <div>
                      <span className="text-pokemon-yellow font-semibold">
                        {valeurTotale > 0 ? `${valeurTotale.toFixed(2).replace('.', ',')} €` : '—'}
                      </span>
                      <span className="text-gray-500 text-xs ml-1">set</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.entries(contenu).map(([k, v]) => (
                  <span key={k} className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded-lg">
                    {v} {k.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Droite : graphique des prix */}
          <div className="flex-1 min-w-0">
            {loadingPrix ? (
              <div className="flex items-center justify-center h-36">
                <div className="w-6 h-6 border-2 border-pokemon-yellow border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <PriceChart historique={historique} prixSortie={prixSortie} compact />
            )}
          </div>

        </div>
      </div>

      {/* ── Barre signaux rapides — toujours visible ────────── */}
      {(phase || prixActuelMarche || ratioDescellage !== null || cagr !== null) && (
        <div className="bg-gray-900/80 border-b border-gray-800 px-4 sm:px-6 py-2.5">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-x-5 gap-y-1.5">

            {phase && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 text-[10px] uppercase tracking-wider">Phase</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${phase.actionColor}`}>
                  {phase.num} — {phase.label}
                </span>
                <span className={`text-[10px] font-bold ${phase.actionColor.split(' ')[1]}`}>→ {phase.action}</span>
              </div>
            )}

            {prixActuelMarche && prixSortie > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 text-[10px] uppercase tracking-wider">Valori.</span>
                <span className="text-white font-black text-xs">×{(prixActuelMarche / prixSortie).toFixed(2)}</span>
                <span className="text-gray-600 text-[10px]">depuis sortie</span>
              </div>
            )}

            {cagr !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 text-[10px] uppercase tracking-wider">ROI/an</span>
                <span className={`font-black text-xs ${cagr >= 20 ? 'text-green-400' : cagr >= 5 ? 'text-yellow-400' : cagr >= 0 ? 'text-gray-300' : 'text-red-400'}`}>
                  {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%
                </span>
              </div>
            )}

            {ratioDescellage !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 text-[10px] uppercase tracking-wider">Déscellage</span>
                <span className={`font-black text-xs ${ratioDescellage >= 1.3 ? 'text-orange-400' : ratioDescellage >= 0.8 ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {ratioDescellage >= 1.3 ? '⚠ Forte' : ratioDescellage >= 0.8 ? 'Modérée' : 'Faible'} ({ratioDescellage.toFixed(2)}×)
                </span>
              </div>
            )}

            {ticketEntree && (
              <div className="flex items-center gap-1.5 sm:ml-auto">
                <span className="text-gray-600 text-[10px] uppercase tracking-wider">Profil</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${ticketEntree.profil.bg} ${ticketEntree.profil.border} ${ticketEntree.profil.color}`}>
                  {ticketEntree.profil.label}
                </span>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Onglets ──────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4">
        <div className="max-w-5xl mx-auto flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setOnglet(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                onglet === tab.key
                  ? 'border-pokemon-yellow text-pokemon-yellow'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu onglet Cartes ─────────────────────────────── */}
      {onglet === 'cartes' && (
        <>
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-10">
            <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-2">
              <button
                onClick={() => setRareteActive(null)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  rareteActive === null ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Tout
              </button>
              {raretesDisponibles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRareteActive(rareteActive === r ? null : r)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    rareteActive === r ? 'bg-pokemon-yellow text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                  title={r}
                >
                  {RARETE_LABEL[r] ?? r}
                </button>
              ))}
              <div className="ml-auto flex-1 min-w-[160px] max-w-xs">
                <input
                  type="text"
                  placeholder="Recherchez une carte..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none placeholder-gray-500 focus:ring-1 focus:ring-pokemon-yellow"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 py-5">
            <div className="max-w-5xl mx-auto">
              {loadingCartes ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-10 h-10 border-2 border-pokemon-yellow border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">
                    Chargement des cartes
                    <span className="text-gray-600 text-xs ml-1">(première fois ~10s)</span>
                  </p>
                </div>
              ) : cartes.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-20">Aucune carte trouvée.</p>
              ) : (
                <>
                  {cartesFiltrees.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-10">Aucune carte ne correspond.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {cartesFiltrees.map((carte) => (
                        <CarteCard key={carte.id} carte={carte} />
                      ))}
                    </div>
                  )}
                  <p className="text-gray-600 text-xs text-center mt-5">
                    {cartesFiltrees.length} carte{cartesFiltrees.length > 1 ? 's' : ''} · Source : Cardmarket via TCGdex
                  </p>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Contenu onglet Analyse ───────────────────────────── */}
      {onglet === 'analyse' && (
        <div className="flex-1 px-4 py-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* 4 signaux d'investissement */}
            <div>
              <h2 className="text-white font-bold text-base mb-4">Signaux d'investissement</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

                {/* Phase du cycle */}
                <div className="bg-gray-800/60 rounded-xl border border-gray-700/60 p-4 flex flex-col gap-2">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">Phase du cycle</p>
                  {phase ? (
                    <>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-white font-black text-2xl">{phase.num}</span>
                        <span className="text-gray-400 text-sm font-semibold">/ 4</span>
                      </div>
                      <p className="text-white text-sm font-bold leading-tight">{phase.label}</p>
                      <p className="text-gray-500 text-xs leading-relaxed flex-1">{phase.desc}</p>
                      <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full border ${phase.actionColor}`}>
                        {phase.action}
                      </span>
                    </>
                  ) : <p className="text-gray-600 text-xs">Prix de sortie manquant</p>}
                </div>

                {/* CAGR */}
                <div className="bg-gray-800/60 rounded-xl border border-gray-700/60 p-4 flex flex-col gap-2">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">ROI annualisé</p>
                  {cagr !== null ? (
                    <>
                      <p className={`font-black text-2xl leading-none ${cagr >= 20 ? 'text-green-400' : cagr >= 5 ? 'text-yellow-400' : cagr >= 0 ? 'text-gray-300' : 'text-red-400'}`}>
                        {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%
                      </p>
                      <p className="text-gray-500 text-xs">par an depuis la sortie</p>
                      <p className="text-gray-600 text-[10px] flex-1">Référence : bourse ~8%/an, immobilier ~4%/an</p>
                      <div className="flex gap-1.5 mt-auto">
                        <span className="text-pokemon-yellow text-[10px] font-bold">{prixSortie.toFixed(0)}€</span>
                        <span className="text-gray-600 text-[10px]">→</span>
                        <span className="text-white text-[10px] font-bold">{prixActuelMarche?.toFixed(0)}€</span>
                      </div>
                    </>
                  ) : <p className="text-gray-600 text-xs">Données insuffisantes (set trop récent ou prix sortie manquant)</p>}
                </div>

                {/* Nature de la hausse */}
                <div className={`rounded-xl border p-4 flex flex-col gap-2 ${natureHausse ? natureHausse.bg + ' ' + natureHausse.border : 'bg-gray-800/60 border-gray-700/60'}`}>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">Nature de la hausse</p>
                  {natureHausse ? (
                    <>
                      <p className={`font-bold text-sm leading-snug ${natureHausse.color}`}>{natureHausse.label}</p>
                      <p className="text-gray-400 text-xs leading-relaxed flex-1">{natureHausse.desc}</p>
                      <span className={`self-start text-[10px] font-semibold ${natureHausse.color}`}>{natureHausse.risk}</span>
                    </>
                  ) : <p className="text-gray-600 text-xs">Données insuffisantes</p>}
                </div>

                {/* Position dans l'ère */}
                <div className="bg-gray-800/60 rounded-xl border border-gray-700/60 p-4 flex flex-col gap-2">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">vs son ère ({etb.era})</p>
                  {loadingEra ? (
                    <div className="flex items-center gap-2 py-2">
                      <div className="w-4 h-4 border border-gray-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-600 text-xs">Chargement…</span>
                    </div>
                  ) : positionEra ? (
                    <>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-white font-black text-2xl">#{positionEra.rank}</span>
                        <span className="text-gray-500 text-sm">/ {positionEra.total}</span>
                      </div>
                      <p className={`font-bold text-xs ${positionEra.perfColor}`}>{positionEra.perf}</p>
                      <p className="text-gray-500 text-xs">
                        ×{positionEra.myMultiple.toFixed(2)} ce set · moy. ×{positionEra.avgMultiple.toFixed(2)}
                      </p>
                      <p className={`text-[10px] font-semibold mt-auto ${positionEra.diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {positionEra.diff >= 0 ? '+' : ''}{positionEra.diff.toFixed(2)}× vs moyenne ère
                      </p>
                    </>
                  ) : <p className="text-gray-600 text-xs">Prix de sortie manquant</p>}
                </div>

              </div>
            </div>

            {/* Ticket d'entrée & Profil risque */}
            {ticketEntree && (
              <div>
                <h2 className="text-white font-bold text-base mb-4">Ticket d'entrée & Profil risque</h2>
                <div className={`rounded-xl border p-4 sm:p-5 ${ticketEntree.profil.bg} ${ticketEntree.profil.border}`}>

                  {/* Profil global en tête */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 pb-4 border-b border-gray-700/40">
                    <div className="flex-1">
                      <p className={`font-black text-lg leading-none ${ticketEntree.profil.color}`}>{ticketEntree.profil.label}</p>
                      <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">{ticketEntree.profil.desc}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-white font-black text-2xl leading-none">{ticketEntree.prix.toFixed(0)} €</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">prix actuel</p>
                      <p className="text-gray-700 text-[9px] mt-1 max-w-[140px]">{ticketEntree.contexteTier}</p>
                    </div>
                  </div>

                  {/* 3 dimensions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    {/* Capital requis */}
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Capital requis</p>
                      <p className={`font-bold text-base ${ticketEntree.capital.color}`}>{ticketEntree.capital.label}</p>
                      <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">{ticketEntree.capital.desc}</p>
                    </div>

                    {/* Upside potentiel */}
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Upside potentiel</p>
                      {ticketEntree.upside ? (
                        <>
                          <div className="flex items-baseline gap-1.5">
                            <p className={`font-bold text-base ${ticketEntree.upside.color}`}>{ticketEntree.upside.label}</p>
                            <p className={`text-xs font-semibold ${ticketEntree.upside.color} opacity-70`}>{ticketEntree.upside.pct}</p>
                          </div>
                          <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">{ticketEntree.upside.desc}</p>
                        </>
                      ) : <p className="text-gray-600 text-xs">Phase non déterminée</p>}
                    </div>

                    {/* Liquidité à la revente */}
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Liquidité revente</p>
                      <p className={`font-bold text-base ${ticketEntree.liquidite.color}`}>{ticketEntree.liquidite.label}</p>
                      <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">{ticketEntree.liquidite.desc}</p>
                    </div>

                  </div>

                  {/* Note explicative */}
                  <p className="text-gray-700 text-[10px] mt-4 pt-3 border-t border-gray-700/30">
                    ⚠️ Une réimpression peut effacer la totalité de la plus-value, indépendamment du prix d'achat. Ce signal ne remplace pas une veille active sur les annonces Nintendo.
                  </p>
                </div>
              </div>
            )}

            {/* Comparaison ère complète */}
            {eraStats && eraStats.multiples.length > 0 && (
              <div>
                <h2 className="text-white font-bold text-base mb-4">
                  Classement {etb.era} — valorisation depuis le prix de sortie
                </h2>
                <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 divide-y divide-gray-700/40 overflow-hidden">
                  {eraStats.multiples.map((e, i) => {
                    const isMe = e.id === id
                    const maxMult = eraStats.multiples[0].multiple
                    return (
                      <div key={e.id} className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? 'bg-pokemon-yellow/5' : ''}`}>
                        <span className={`text-xs font-bold w-5 shrink-0 ${isMe ? 'text-pokemon-yellow' : 'text-gray-600'}`}>
                          {i + 1}
                        </span>
                        <span className={`text-xs flex-1 truncate ${isMe ? 'text-pokemon-yellow font-bold' : 'text-gray-300'}`}>
                          {e.nom}
                          {isMe && <span className="ml-1.5 text-[9px] bg-pokemon-yellow/20 text-pokemon-yellow px-1.5 py-0.5 rounded-full">vous</span>}
                        </span>
                        <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden shrink-0">
                          <div
                            className={`h-full rounded-full ${isMe ? 'bg-pokemon-yellow' : 'bg-gray-500'}`}
                            style={{ width: `${Math.min(100, (e.multiple / maxMult) * 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-10 text-right shrink-0 ${isMe ? 'text-pokemon-yellow' : e.multiple >= eraStats.avgMultiple ? 'text-green-400' : 'text-gray-500'}`}>
                          ×{e.multiple.toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900/40">
                    <span className="text-xs text-gray-600 w-5">—</span>
                    <span className="text-xs text-gray-500 flex-1">Moyenne ère</span>
                    <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden shrink-0">
                      <div className="h-full bg-gray-500 rounded-full" style={{ width: `${Math.min(100, (eraStats.avgMultiple / eraStats.multiples[0].multiple) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-400 w-10 text-right">×{eraStats.avgMultiple.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pression de déscellage */}
            {!loadingCartes && !loadingPrix && ratioDescellage !== null && (
              <div>
                <h2 className="text-white font-bold text-base mb-4">Pression de déscellage</h2>
                <PressionDescellageInline
                  valeurTop10={valeurTop10}
                  prixActuel={prixActuelMarche}
                  ratio={ratioDescellage}
                  nbBoosters={contenu.boosters ?? null}
                  ratioHistorique={ratioHistorique}
                />
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Contenu onglet Score ─────────────────────────────── */}
      {onglet === 'score' && (
        <div className="flex-1 px-4 py-5">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-white font-semibold text-base mb-3">Score d'investissement</h2>
            <ScoreDetail scoreData={scoreData} loading={loadingScore} />
          </div>
        </div>
      )}
    </div>
  )
}

function PressionDescellageInline({ valeurTop10, prixActuel, ratio, nbBoosters, ratioHistorique }) {
  const signal =
    ratio >= 2.0 ? { label: 'Très forte',  color: 'text-red-400',    bar: 'bg-red-500',    pct: 100 } :
    ratio >= 1.3 ? { label: 'Forte',        color: 'text-orange-400', bar: 'bg-orange-500', pct: Math.round(ratio / 2 * 100) } :
    ratio >= 0.8 ? { label: 'Modérée',      color: 'text-yellow-400', bar: 'bg-yellow-500', pct: Math.round(ratio / 2 * 100) } :
                   { label: 'Faible',       color: 'text-gray-400',   bar: 'bg-gray-600',   pct: Math.round(ratio / 2 * 100) }

  // Tendance : le ratio monte, descend ou est stable sur les derniers points ?
  const tendance = useMemo(() => {
    if (!ratioHistorique || ratioHistorique.length < 3) return null
    const recent = ratioHistorique.slice(-5)
    const diff = recent[recent.length - 1].ratio - recent[0].ratio
    if (diff > 0.05) return { label: '↑ Pression qui monte', color: 'text-green-400' }
    if (diff < -0.05) return { label: '↓ Pression qui baisse', color: 'text-red-400' }
    return { label: '→ Stable', color: 'text-gray-400' }
  }, [ratioHistorique])

  const aGraphique = ratioHistorique && ratioHistorique.length >= 3

  return (
    <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-4 sm:p-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {tendance && (
                <span className={`text-[10px] font-bold ${tendance.color}`}>{tendance.label}</span>
              )}
            </div>
            <p className="text-gray-500 text-xs leading-relaxed">
              Quand les cartes valent plus que la boîte, les collectionneurs achètent pour ouvrir.
              Le stock scellé fond et le prix monte mécaniquement.
            </p>
          </div>

          {/* Chiffres actuels */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center">
              <p className="text-pokemon-yellow font-black text-lg leading-none">
                {valeurTop10.toFixed(0)} €
              </p>
              <p className="text-gray-500 text-[10px] mt-0.5">top 10 cartes</p>
            </div>
            <div className="text-gray-700 text-sm">÷</div>
            <div className="text-center">
              <p className="text-white font-black text-lg leading-none">{prixActuel.toFixed(0)} €</p>
              <p className="text-gray-500 text-[10px] mt-0.5">boîte scellée</p>
            </div>
            <div className="text-gray-700 text-sm">=</div>
            <div className="text-center">
              <p className={`font-black text-xl leading-none ${signal.color}`}>{ratio.toFixed(2)}×</p>
              <p className={`text-[10px] font-semibold mt-0.5 ${signal.color}`}>{signal.label}</p>
            </div>
          </div>
        </div>

        {/* Barre actuelle */}
        <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${signal.bar}`} style={{ width: `${signal.pct}%` }} />
        </div>

        {/* Graphique d'évolution du ratio */}
        {aGraphique ? (
          <div className="mt-5">
            <p className="text-gray-500 text-[10px] mb-2">
              Évolution du ratio — une courbe qui monte = pression croissante = signal haussier sur le scellé
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={ratioHistorique} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#4B5563', fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#4B5563', fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}×`}
                  domain={['auto', 'auto']}
                  width={38}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-2 text-xs shadow-xl">
                        <p className="text-gray-400 mb-1">
                          {new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-orange-400 font-bold">{d.ratio.toFixed(2)}× ratio</p>
                        <p className="text-gray-500 mt-0.5">{d.valeurCartes.toFixed(0)} € cartes · {d.prixETB.toFixed(0)} € boîte</p>
                      </div>
                    )
                  }}
                />
                {/* Ligne d'équilibre (ratio = 1) */}
                <ReferenceLine y={1} stroke="#374151" strokeDasharray="4 3" label={{ value: 'Équilibre', position: 'insideTopLeft', fill: '#4B5563', fontSize: 8 }} />
                {/* Seuil "Forte pression" */}
                <ReferenceLine y={1.3} stroke="#f97316" strokeDasharray="3 3" strokeWidth={0.5} label={{ value: 'Forte', position: 'insideTopLeft', fill: '#f97316', fontSize: 8 }} />
                <Line
                  type="monotone"
                  dataKey="ratio"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#f97316', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-700 text-[10px] mt-3">
            Graphique disponible après plusieurs jours de données — le ratio sera tracé automatiquement.
          </p>
        )}

        {/* Disclaimer */}
        <p className="text-gray-700 text-[10px] mt-2">
          EV approximative — taux de pull non inclus
          {nbBoosters ? ` · ${nbBoosters} boosters par ETB` : ''}
          {' '}· Top 10 cartes Cardmarket
        </p>
    </div>
  )
}

function CarteCard({ carte }) {
  const prix = Number(carte.prixMarche ?? 0)
  const [imgErr, setImgErr] = useState(false)

  return (
    <div className="flex flex-col items-center gap-1.5 group cursor-default">
      <div className="relative w-full aspect-[2.5/3.5] bg-gray-800 rounded-xl overflow-hidden">
        {carte.imageUrl && !imgErr ? (
          <img
            src={carte.imageUrl}
            alt={carte.nom}
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2">
            <span className="text-gray-600 text-[10px] text-center">{carte.nom}</span>
          </div>
        )}
        {carte.rarete && (
          <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-gray-300 text-[10px] px-1.5 py-0.5 rounded">
            {RARETE_LABEL[carte.rarete] ?? carte.rarete}
          </span>
        )}
      </div>
      <div className="w-full text-center">
        <p className="text-white text-xs font-medium truncate leading-tight">{carte.nom}</p>
        <p className="text-gray-500 text-[10px]">#{carte.numero}</p>
        <p className={`text-xs font-bold mt-0.5 ${prix > 0 ? 'text-pokemon-yellow' : 'text-gray-600'}`}>
          {prix > 0 ? `${prix.toFixed(2).replace('.', ',')} €` : '—'}
        </p>
      </div>
    </div>
  )
}
