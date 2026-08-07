import type { NextFunction, Request, Response } from 'express'
import { ErreurHttp, introuvable, requeteInvalide } from '../lib/erreurs'
import { gestionnaireErreurs, routeIntrouvable } from './erreurs'

// Le point capital : le client ne doit jamais recevoir de détail interne.
// Avant ce middleware, chaque route faisait `res.json({ error: e.message })`,
// et une panne Prisma renvoyait la requête échouée avec le chemin absolu du
// fichier source sur la machine du serveur.

// Double de test minimal : on n'a besoin que de `status` et `json` chaînés.
interface ReponseCapturee {
  code: number
  corps: unknown
  express: Response
}

function reponseFactice(): ReponseCapturee {
  const capture: ReponseCapturee = { code: 0, corps: null, express: null as unknown as Response }
  const faux = {
    status(code: number) {
      capture.code = code
      return faux
    },
    json(corps: unknown) {
      capture.corps = corps
      return faux
    },
  }
  capture.express = faux as unknown as Response
  return capture
}

const suivant = (() => {}) as NextFunction

describe('gestionnaireErreurs', () => {
  it('transmet le statut et le message des ErreurHttp', () => {
    const res = reponseFactice()
    gestionnaireErreurs(introuvable('ETB non trouvée'), {} as Request, res.express, suivant)
    expect(res.code).toBe(404)
    expect(res.corps).toEqual({ error: 'ETB non trouvée' })
  })

  it('conserve le statut des autres erreurs métier', () => {
    const res = reponseFactice()
    gestionnaireErreurs(requeteInvalide('Identifiant ETB invalide'), {} as Request, res.express, suivant)
    expect(res.code).toBe(400)
    expect(res.corps).toEqual({ error: 'Identifiant ETB invalide' })
  })

  it('masque les erreurs inattendues derrière un message générique', () => {
    const res = reponseFactice()
    const fuite = new Error(
      'Invalid `prisma.etb.findMany()` invocation in C:\\Users\\lucas\\Desktop\\ETBVault\\backend\\src\\routes\\etbs.ts:19',
    )
    jest.spyOn(console, 'error').mockImplementation(() => {})

    gestionnaireErreurs(fuite, {} as Request, res.express, suivant)

    expect(res.code).toBe(500)
    expect(res.corps).toEqual({ error: 'Erreur serveur' })
    expect(JSON.stringify(res.corps)).not.toContain('prisma')
    expect(JSON.stringify(res.corps)).not.toContain('C:\\Users')
  })

  it('journalise l’erreur masquée côté serveur', () => {
    const res = reponseFactice()
    const journal = jest.spyOn(console, 'error').mockImplementation(() => {})
    const bug = new Error('connexion perdue')

    gestionnaireErreurs(bug, {} as Request, res.express, suivant)

    expect(journal).toHaveBeenCalledWith('[erreur]', bug)
  })

  it('ne se laisse pas berner par un objet qui ressemble à une ErreurHttp', () => {
    const res = reponseFactice()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    gestionnaireErreurs({ statut: 403, message: 'Accès refusé' }, {} as Request, res.express, suivant)
    expect(res.code).toBe(500)
    expect(res.corps).toEqual({ error: 'Erreur serveur' })
  })
})

describe('routeIntrouvable', () => {
  it('répond en JSON plutôt qu’avec la page HTML d’Express', () => {
    const res = reponseFactice()
    routeIntrouvable({ method: 'GET', originalUrl: '/api/produits' } as Request, res.express)
    expect(res.code).toBe(404)
    expect(res.corps).toEqual({ error: 'Route inconnue : GET /api/produits' })
  })
})

describe('ErreurHttp', () => {
  it('porte son statut', () => {
    expect(new ErreurHttp(418, 'théière').statut).toBe(418)
  })
})
