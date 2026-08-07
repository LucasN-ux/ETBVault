import 'dotenv/config'
import prisma from './client'
import { hashPassword } from '../lib/auth'

// Seed des comptes de test (idempotent). À lancer avec `npm run seed:users`.
// L'admin reprend l'email ADMIN_EMAIL du .env pour rester cohérent avec l'auth.

async function main(): Promise<void> {
  const adminEmail = (process.env['ADMIN_EMAIL'] ?? 'admin@etbvault.local').trim().toLowerCase()
  const comptes = [
    { email: adminEmail, motDePasse: 'Admin1234!', role: 'ADMIN' as const },
    { email: 'user1@etbvault.local', motDePasse: 'User1234!', role: 'USER' as const },
  ]
  for (const c of comptes) {
    const motDePasseHash = await hashPassword(c.motDePasse)
    await prisma.user.upsert({
      where: { email: c.email },
      update: { role: c.role, motDePasseHash },
      create: { email: c.email, motDePasseHash, role: c.role },
    })
    console.log(`✔ ${c.role.padEnd(5)} — ${c.email}  (mot de passe : ${c.motDePasse})`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    return prisma.$disconnect().finally(() => process.exit(1))
  })
