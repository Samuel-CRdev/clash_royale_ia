import os
import requests

TOKEN = os.getenv("CLASH_API_TOKEN")

BASE_URL = "https://api.clashroyale.com/v1"

headers = {
    "Accept": "application/json",
    "Authorization": f"Bearer {TOKEN}",
}

PUBLIC_IP = None

def get_public_ip():
    global PUBLIC_IP
    if PUBLIC_IP is None:
        try:
            resp = requests.get("https://api.ipify.org", timeout=5)
            PUBLIC_IP = resp.text.strip()
        except Exception as e:
            PUBLIC_IP = f"erro: {e}"
        print(">>> EGRESS IP DO BACKEND (USE ESSE NA SUPERCELL):", PUBLIC_IP)
    return PUBLIC_IP


def baixar_tudo_do_jogador(TAG):
    # Loga o IP de saída uma vez
    get_public_ip()

    encoded = TAG.replace("#", "%23")
    url = f"{BASE_URL}/players/{encoded}"

    # debug extra opcional:
    print(">>> TOKEN (prefixo):", (TOKEN or "")[:20])

    response = requests.get(url, headers=headers)
    print(">>> STATUS SUPERCELL:", response.status_code, response.text[:200])
    response.raise_for_status()

    return response.json()


def baixar_todas_as_cartas():
    get_public_ip()

    url = f"{BASE_URL}/cards"
    response = requests.get(url, headers=headers)
    print(">>> STATUS SUPERCELL /cards:", response.status_code, response.text[:200])
    response.raise_for_status()

    return response.json().get("items", [])

# ----------------------------
# Normalização de níveis (API -> jogo atual)
# ----------------------------

RARITY_ADJUST = {
    "Common": 0,
    "Rare": 2,
    "Epic": 5,
    "Legendary": 8,
    "Champion": 10,
}


def _inferir_raridade(max_level: int | None) -> str | None:
    """
    A API usa maxLevel diferente por raridade (formato antigo).
    Valores típicos:
      - Common: 13/14+
      - Rare:   11/12
      - Epic:   8/9
      - Legendary: 5/6
      - Champion: 5
    """
    if max_level is None:
        return None

    if max_level >= 14:   # comuns (ou cartas com muitos níveis)
        return "Common"
    if max_level >= 12:   # raras
        return "Rare"
    if max_level >= 9:    # épicas
        return "Epic"
    if max_level >= 6:    # lendárias
        return "Legendary"
    return "Champion"     # campeões, etc.


def normalizar_carta(card: dict) -> dict:
    """
    Devolve a carta com campos extras:
      - rarity
      - levelApi (como vem na API)
      - levelUi (nível que o jogador enxerga no jogo)
    """
    if not isinstance(card, dict):
        return card

    max_level = card.get("maxLevel")
    rarity = card.get("rarity") or _inferir_raridade(max_level)

    nivel_api = card.get("level")
    nivel_ui = None
    if isinstance(nivel_api, int):
        ajuste = RARITY_ADJUST.get(rarity, 0)
        nivel_ui = nivel_api + ajuste

    new_card = dict(card)
    new_card["rarity"] = rarity
    new_card["levelApi"] = nivel_api
    new_card["levelUi"] = nivel_ui

    return new_card


def formatar_jogador(raw: dict) -> dict:
    """
    Recebe o JSON cru do /players da API oficial
    e acrescenta campos com níveis 'arrumados'.
    """
    if not isinstance(raw, dict):
        return raw

    player = dict(raw)

    cards = raw.get("cards") or []
    current_deck = raw.get("currentDeck") or []

    player["cards"] = [normalizar_carta(c) for c in cards]
    player["currentDeck"] = [normalizar_carta(c) for c in current_deck]

    # expLevel na API é o nível de experiência da conta (Rei).
    player["kingLevel"] = raw.get("expLevel")

    # Garante que arena sempre exista como dict
    arena = raw.get("arena") or {}
    player["arena"] = arena

    return player
