#!/usr/bin/env python3
# Supprime le fond des images de boîtes ETB avec IA (birefnet-general)
# Usage :
#   python3 src/db/remove-bg-boxes.py           → traite uniquement les nouvelles images
#   python3 src/db/remove-bg-boxes.py --force   → retraite toutes les images
#   python3 src/db/remove-bg-boxes.py sv03.5    → retraite une image spécifique

import os
import sys
from pathlib import Path
from rembg import remove, new_session
from PIL import Image
import numpy as np

BOXES_DIR = Path(__file__).parent.parent.parent.parent / "frontend" / "public" / "boxes"

# isnet-general-use : meilleur rapport qualité/poids (~168MB) — bords plus précis que u2net
SESSION = None


def get_session():
    global SESSION
    if SESSION is None:
        print("  Chargement du modèle isnet-general-use...", flush=True)
        SESSION = new_session("isnet-general-use")
    return SESSION


def deja_traitee(chemin: Path) -> bool:
    if chemin.suffix.lower() != ".png":
        return False
    try:
        img = Image.open(chemin)
        return img.mode == "RGBA"
    except Exception:
        return False


def nettoyer_bords(img_rgba: Image.Image, seuil: int = 15) -> Image.Image:
    """Supprime les pixels semi-transparents résiduels sur les bords."""
    data = np.array(img_rgba, dtype=np.float32)
    alpha = data[:, :, 3]

    # Pixels presque transparents → complètement transparents
    alpha[alpha < seuil] = 0
    # Pixels presque opaques → complètement opaques
    alpha[alpha > 255 - seuil] = 255

    data[:, :, 3] = alpha
    return Image.fromarray(data.astype(np.uint8), "RGBA")


def traiter_image(chemin: Path) -> None:
    print(f"  Traitement : {chemin.name} ...", end=" ", flush=True)

    with open(chemin, "rb") as f:
        données = f.read()

    résultat = remove(données, session=get_session())

    img = Image.open(__import__("io").BytesIO(résultat)).convert("RGBA")
    img = nettoyer_bords(img)

    sortie = chemin.with_suffix(".png")
    img.save(sortie, "PNG")

    if chemin.suffix.lower() != ".png" and chemin != sortie:
        chemin.unlink()

    print(f"✓  → {sortie.name}")


def main():
    args = sys.argv[1:]
    force = "--force" in args
    cibles = [a for a in args if not a.startswith("--")]

    tous = [
        p for p in BOXES_DIR.iterdir()
        if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")
    ]

    if not tous:
        print("Aucune image trouvée dans frontend/public/boxes/")
        return

    if cibles:
        à_traiter = [
            p for p in tous
            if p.stem in cibles or p.name in cibles
        ]
        if not à_traiter:
            print(f"Aucune image trouvée pour : {', '.join(cibles)}")
            return
    elif force:
        à_traiter = sorted(tous)
    else:
        à_traiter = [p for p in sorted(tous) if not deja_traitee(p)]
        déjà_ok = len(tous) - len(à_traiter)
        if déjà_ok:
            print(f"  {déjà_ok} image(s) déjà traitée(s) — ignorée(s)")

    if not à_traiter:
        print("Rien à faire.")
        return

    print(f"  {len(à_traiter)} image(s) à traiter\n")
    ok = 0
    for f in à_traiter:
        try:
            traiter_image(f)
            ok += 1
        except Exception as e:
            print(f"✗  Erreur sur {f.name} : {e}")

    print(f"\nTerminé : {ok}/{len(à_traiter)} traitée(s).")


if __name__ == "__main__":
    main()
