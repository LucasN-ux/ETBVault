// Script ponctuel : récupère les prix ETB depuis Cardmarket et les écrit en base.
// Usage : npx tsx src/db/run-cm-refresh.ts
import { mettreAJourPrixDepuisCM } from '../services/cm-download'

mettreAJourPrixDepuisCM()
  .then((r) => {
    console.log('RESULTAT:', JSON.stringify(r))
    process.exit(0)
  })
  .catch((e) => {
    console.error('ERREUR:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
