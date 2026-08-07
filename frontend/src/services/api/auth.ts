import type { Session, Utilisateur } from '../../types/domaine'
import { appelApi } from './client'

export function register(email: string, motDePasse: string): Promise<Session> {
  return appelApi<Session>('/auth/register', { methode: 'POST', corps: { email, motDePasse } })
}

export function login(email: string, motDePasse: string): Promise<Session> {
  return appelApi<Session>('/auth/login', { methode: 'POST', corps: { email, motDePasse } })
}

export function fetchMe(): Promise<{ user: Utilisateur }> {
  return appelApi<{ user: Utilisateur }>('/auth/me', { auth: true })
}
