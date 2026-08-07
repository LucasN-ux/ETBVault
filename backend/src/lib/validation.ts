// Validation des entrées, partagée par toutes les routes.
// Chaque fonction lève une ErreurHttp 400 explicite plutôt que de renvoyer un
// booléen : l'appelant n'a rien à décider, et le message est écrit une fois.

import { requeteInvalide } from './erreurs'

const ID_ETB = /^[a-z0-9.\-]+$/i
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/

export function exigerIdEtb(valeur: unknown): string {
  if (typeof valeur !== 'string' || !ID_ETB.test(valeur)) {
    throw requeteInvalide('Identifiant ETB invalide')
  }
  return valeur
}

export function exigerDateIso(valeur: unknown, champ = 'date'): string {
  if (typeof valeur !== 'string' || !DATE_ISO.test(valeur)) {
    throw requeteInvalide(`Champ ${champ} invalide (format YYYY-MM-DD attendu)`)
  }
  return valeur
}

export function exigerPrix(valeur: unknown, champ: string): number {
  if (typeof valeur !== 'number' || !Number.isFinite(valeur) || valeur < 0) {
    throw requeteInvalide(`${champ} doit être un nombre positif`)
  }
  return valeur
}

export function exigerEntierPositif(valeur: unknown, champ: string): number {
  if (typeof valeur !== 'number' || !Number.isInteger(valeur) || valeur < 0) {
    throw requeteInvalide(`${champ} doit être un entier positif`)
  }
  return valeur
}

// Provenance d'un point de prix : collecte quotidienne ou amorçage rétroactif.
export function exigerOrigine(valeur: unknown): string {
  if (valeur !== 'collecte' && valeur !== 'import_cm') {
    throw requeteInvalide("origine doit valoir 'collecte' ou 'import_cm'")
  }
  return valeur
}

// Nombre de jours d'une fenêtre d'analyse, borné. Une valeur absente ou
// illisible retombe sur `defaut` — c'est un paramètre de confort, pas une
// donnée métier, on ne rejette pas la requête pour ça.
export function lireJours(valeur: unknown, defaut: number, min: number, max: number): number {
  const n = Number(valeur)
  if (!Number.isFinite(n) || n <= 0) return defaut
  return Math.min(max, Math.max(min, Math.trunc(n)))
}
