import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  // Les tests portent sur la logique pure (validation, dates, gestion d'erreur).
  // Tout ce qui touche la base ou Cardmarket demande un environnement réel et
  // n'est pas couvert ici.
  clearMocks: true,
}

export default config
