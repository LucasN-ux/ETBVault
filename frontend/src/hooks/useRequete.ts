import { useCallback, useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// useRequete — un appel API, trois états explicites.
//
// Chaque écran faisait auparavant `fetch(...).then(setX).catch(() => {})`, ce
// qui rendait toute panne invisible : base absente, API en 500, réseau coupé,
// l'interface restait sur son squelette de chargement indéfiniment. Ici une
// requête est forcément dans l'un de ces états, et « erreur » en fait partie.
//
//   useRequete(fetchEtbs)                    → fetchEtbs()
//   useRequete(fetchEtb, id)                 → fetchEtb(id), relancé si id change
//   useRequete(fetchSparklines, 90)          → fetchSparklines(90)
//
// L'appel est une fonction importée, jamais une lambda : elle reste stable
// d'un rendu à l'autre, et c'est `argument` seul qui pilote les relances.
// ─────────────────────────────────────────────────────────────────────────────

export interface Requete<T> {
  donnees: T | null
  chargement: boolean
  erreur: Error | null
  recharger: () => Promise<void>
}

interface Options {
  /** À false, l'appel est différé — rien à charger pour l'instant. */
  actif?: boolean
  /** Identité de la requête quand `argument` n'est pas une primitive. */
  cle?: string | number
}

/**
 * @param appel     fonction de la couche API, appelée avec `argument`
 * @param argument  valeur passée à `appel` ; en changer relance la requête
 */
export function useRequete<T, A = undefined>(
  appel: (argument: A) => Promise<T>,
  argument: A,
  options?: Options,
): Requete<T>
export function useRequete<T>(appel: () => Promise<T>, argument?: undefined, options?: Options): Requete<T>
export function useRequete<T, A>(
  appel: (argument: A) => Promise<T>,
  argument: A,
  { actif = true, cle }: Options = {},
): Requete<T> {
  const [donnees, setDonnees] = useState<T | null>(null)
  const [chargement, setChargement] = useState(actif)
  const [erreur, setErreur] = useState<Error | null>(null)

  // Numéro du dernier appel demandé : la réponse d'une requête déjà remplacée
  // ne doit pas écraser le résultat de la requête courante.
  const numeroCourant = useRef(0)

  const identite = cle ?? argument

  const executer = useCallback(async (): Promise<void> => {
    if (!actif) {
      setChargement(false)
      return
    }

    const numero = ++numeroCourant.current
    setChargement(true)
    setErreur(null)

    try {
      const resultat = await appel(argument)
      if (numero === numeroCourant.current) setDonnees(resultat)
    } catch (e) {
      if (numero === numeroCourant.current) {
        setErreur(e instanceof Error ? e : new Error(String(e)))
      }
    } finally {
      if (numero === numeroCourant.current) setChargement(false)
    }
    // `argument` est volontairement remplacé par `identite` : c'est elle qui
    // décrit l'identité de la requête, y compris quand l'argument est un objet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appel, actif, identite])

  useEffect(() => {
    // `executer` marque le chargement de façon synchrone, et c'est voulu :
    // repasser en « chargement » dès que la clé change évite d'afficher les
    // données de la requête précédente comme si elles étaient à jour.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void executer()
  }, [executer])

  return { donnees, chargement, erreur, recharger: executer }
}
