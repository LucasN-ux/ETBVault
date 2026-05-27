import axios from 'axios'

const BASE_URL = 'https://api.pokemontcg.io/v2'

// Récupère l'URL du logo d'un set depuis PokémonTCG.io
export async function getSetImage(setId: string): Promise<string | null> {
  try {
    const res = await axios.get<{ data: { images: { logo: string } } }>(
      `${BASE_URL}/sets/${setId}`,
      { headers: { 'X-Api-Key': process.env['POKEMONTCG_API_KEY'] } }
    )
    return res.data.data.images.logo
  } catch {
    return null
  }
}
