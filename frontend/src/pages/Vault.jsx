import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ETBSelecteur from '../components/ETBSelecteur'
import { useVault } from '../hooks/useVault'
import { fetchETBs, fetchPrixActuels } from '../services/api'

export default function Vault() {
  const navigate = useNavigate()
  const { entries, addEntry, removeEntry } = useVault()
  const [etbs, setEtbs] = useState([])
  const [prixActuels, setPrixActuels] = useState({})
  const [formVisible, setFormVisible] = useState(false)
  const [ajout, setAjout] = useState({ etbId: '', prixAchat: '', quantite: 1 })

  useEffect(() => {
    fetchETBs().then(setEtbs).catch(() => {})
    fetchPrixActuels().then(setPrixActuels).catch(() => {})
  }, [])

  const etbsMap = useMemo(
    () => Object.fromEntries(etbs.map((e) => [e.id, e])),
    [etbs]
  )

  function soumettre(e) {
    e.preventDefault()
    if (!ajout.etbId || !ajout.prixAchat) return
    addEntry(ajout)
    setAjout({ etbId: '', prixAchat: '', quantite: 1 })
    setFormVisible(false)
  }

  // Calculs globaux
  const { totalInvesti, valeurActuelle } = useMemo(() => {
    const investi = entries.reduce((s, e) => s + e.prixAchat * e.quantite, 0)
    const actuelle = entries.reduce((s, e) => {
      // Priorité : prix marché CM → prix de sortie → prix d'achat
      const ref = prixActuels[e.etbId]?.prixActuel
        ?? Number(etbsMap[e.etbId]?.prixSortie ?? e.prixAchat)
      return s + ref * e.quantite
    }, 0)
    return { totalInvesti: investi, valeurActuelle: actuelle }
  }, [entries, etbsMap, prixActuels])

  const plusvalue = valeurActuelle - totalInvesti
  const pctGlobal = totalInvesti > 0 ? (plusvalue / totalInvesti) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      {/* ── Header Vault ─────────────────────────────────────── */}
      <div className="border-b border-gray-800 bg-gray-900/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl">Mon Vault</h1>
            <p className="text-gray-500 text-xs mt-0.5">{entries.length} ETB{entries.length > 1 ? 's' : ''} · Stockage local</p>
          </div>
          <button
            onClick={() => setFormVisible(!formVisible)}
            className="bg-pokemon-yellow text-gray-900 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-yellow-400 transition-colors"
          >
            + Ajouter
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Résumé ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Investi" value={`${totalInvesti.toFixed(2).replace('.', ',')} €`} />
          <SummaryCard
            label="Valeur estimée"
            value={`${valeurActuelle.toFixed(2).replace('.', ',')} €`}
            sublabel="Prix marché CM"
          />
          <SummaryCard
            label="Plus-value"
            value={`${plusvalue >= 0 ? '+' : ''}${plusvalue.toFixed(2).replace('.', ',')} €`}
            sublabel={`${pctGlobal >= 0 ? '+' : ''}${pctGlobal.toFixed(1)}%`}
            color={plusvalue >= 0 ? 'text-green-400' : 'text-red-400'}
            sublabelColor={plusvalue >= 0 ? 'text-green-600' : 'text-red-600'}
          />
        </div>

        {/* ── Formulaire d'ajout ────────────────────────────── */}
        {formVisible && (
          <form
            onSubmit={soumettre}
            className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold text-base">Ajouter une ETB à votre Vault</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Sélecteur ETB avec image */}
              <div>
                <label className="text-gray-400 text-xs block mb-1.5">ETB</label>
                <ETBSelecteur
                  etbs={etbs}
                  value={ajout.etbId}
                  onChange={(id) => setAjout({ ...ajout, etbId: id })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1.5">Prix d'achat (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={ajout.prixAchat}
                    onChange={(e) => setAjout({ ...ajout, prixAchat: e.target.value })}
                    className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-gray-700 focus:border-pokemon-yellow focus:ring-0 transition-colors"
                    placeholder="54,99"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1.5">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    value={ajout.quantite}
                    onChange={(e) => setAjout({ ...ajout, quantite: e.target.value })}
                    className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-gray-700 focus:border-pokemon-yellow focus:ring-0 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="bg-pokemon-yellow text-gray-900 font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-yellow-400 transition-colors"
                >
                  Ajouter au Vault
                </button>
                <button
                  type="button"
                  onClick={() => setFormVisible(false)}
                  className="bg-gray-800 text-gray-400 font-medium text-sm px-6 py-2.5 rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── Liste des ETBs ────────────────────────────────── */}
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-5xl">🔒</p>
            <p className="text-white font-semibold text-base">Votre Vault est vide</p>
            <p className="text-gray-500 text-sm">Ajoutez vos ETBs achetées pour suivre leur valeur</p>
            <button
              onClick={() => setFormVisible(true)}
              className="mt-2 bg-pokemon-yellow text-gray-900 font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-yellow-400 transition-colors"
            >
              + Ajouter ma première ETB
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {entries.map((entree) => (
              <VaultRow
                key={entree.id}
                entree={entree}
                etb={etbsMap[entree.etbId]}
                prixMarche={prixActuels[entree.etbId]}
                onSupprimer={() => removeEntry(entree.id)}
                onNaviguer={() => navigate(`/etb/${entree.etbId}`)}
              />
            ))}
          </div>
        )}

        <p className="text-gray-700 text-xs text-center pb-4">
          Données stockées localement · Valeurs basées sur le prix tendance Cardmarket
        </p>
      </main>
    </div>
  )
}

function VaultRow({ entree, etb, prixMarche, onSupprimer, onNaviguer }) {
  const image = etb?.imageUrl ?? etb?.image_url
  const prixRef = prixMarche?.prixActuel ?? Number(etb?.prixSortie ?? entree.prixAchat)
  const plusv = (prixRef - entree.prixAchat) * entree.quantite
  const pct = entree.prixAchat > 0 ? ((prixRef - entree.prixAchat) / entree.prixAchat) * 100 : 0

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 flex items-center gap-3 px-4 py-3 hover:border-gray-700 transition-colors">

      {/* Image ETB */}
      <button onClick={onNaviguer} className="shrink-0">
        <div className="w-16 h-11 bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
          {image ? (
            <img src={image} alt={etb?.nom} className="w-full h-full object-contain p-1" />
          ) : (
            <span className="text-gray-600 text-[9px] font-mono">{entree.etbId}</span>
          )}
        </div>
      </button>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <button onClick={onNaviguer} className="text-left">
          <p className="text-white font-semibold text-sm truncate hover:text-pokemon-yellow transition-colors">
            {etb?.nom ?? entree.etbId}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {entree.quantite > 1 ? `${entree.quantite}×` : ''} {entree.prixAchat.toFixed(2).replace('.', ',')} € · {entree.dateAchat}
          </p>
        </button>
      </div>

      {/* Valeur & Plus-value */}
      <div className="text-right shrink-0">
        <p className="text-gray-300 font-semibold text-sm">
          {prixRef.toFixed(2).replace('.', ',')} €
        </p>
        <p className={`text-xs font-medium ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {plusv >= 0 ? '+' : ''}{plusv.toFixed(0)} € ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
        </p>
      </div>

      {/* Supprimer */}
      <button
        onClick={onSupprimer}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors ml-1"
        title="Retirer du Vault"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

function SummaryCard({ label, value, sublabel, color = 'text-white', sublabelColor = 'text-gray-600' }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 text-center">
      <p className="text-gray-500 text-xs mb-1.5">{label}</p>
      <p className={`font-bold text-base leading-tight ${color}`}>{value}</p>
      {sublabel && <p className={`text-xs mt-0.5 ${sublabelColor}`}>{sublabel}</p>}
    </div>
  )
}
