import 'dotenv/config'
import listEndpoints from 'express-list-endpoints'
import app from '../app'

// Liste toutes les routes HTTP enregistrées sur l'app Express.
// Usage : npm run routes
const endpoints = listEndpoints(app)
  .sort((a, b) => a.path.localeCompare(b.path))

console.log(`\n${endpoints.length} chemins enregistrés :\n`)
for (const e of endpoints) {
  console.log(`${e.methods.join(', ').padEnd(14)} ${e.path}`)
}
console.log()
process.exit(0)
