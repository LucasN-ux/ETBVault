// Série quotidienne de la valeur du coffre dans le temps.
//   entries        : [{ etbId, prixAchat, quantite, dateAchat:'YYYY-MM-DD' }]
//   histParProduit : { etbId: [{ date:'YYYY-MM-DD', cmPrixMoyen }] } (ordre chronologique)
// → [{ date, valeur, investi }]
// Règles : une position compte à partir de sa date d'achat ; report du dernier prix
// connu sur les jours sans relevé ; avant le 1er prix connu, on prend le prix d'achat.

export function valeurHistorique(entries, histParProduit = {}) {
  if (!entries || !entries.length) return []

  const minAchat = entries.map((e) => e.dateAchat).sort()[0]

  const dates = new Set()
  for (const e of entries) dates.add(e.dateAchat)
  for (const h of Object.values(histParProduit)) for (const p of h ?? []) dates.add(p.date)
  const axe = [...dates].filter((d) => d >= minAchat).sort()
  if (!axe.length) return []

  // Prix d'un produit à une date donnée (dernier relevé <= d), sinon null.
  function prixA(etbId, d) {
    const h = histParProduit[etbId]
    if (!h || !h.length) return null
    let prix = null
    for (const p of h) {
      if (p.date <= d) prix = Number(p.cmPrixMoyen)
      else break
    }
    return prix
  }

  return axe.map((d) => {
    let valeur = 0
    let investi = 0
    for (const e of entries) {
      if (e.dateAchat > d) continue
      const q = e.quantite || 1
      investi += e.prixAchat * q
      const px = prixA(e.etbId, d)
      valeur += (px != null ? px : e.prixAchat) * q
    }
    return { date: d, valeur: Math.round(valeur * 100) / 100, investi: Math.round(investi * 100) / 100 }
  })
}
