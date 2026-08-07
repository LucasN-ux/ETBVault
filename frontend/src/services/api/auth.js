import { appelApi } from './client'

export function register(email, motDePasse) {
  return appelApi('/auth/register', { methode: 'POST', corps: { email, motDePasse } })
}

export function login(email, motDePasse) {
  return appelApi('/auth/login', { methode: 'POST', corps: { email, motDePasse } })
}

export function fetchMe() {
  return appelApi('/auth/me', { auth: true })
}
