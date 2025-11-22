import os
import requests

# ------------------------------------------------------------
# FUNÇÕES DE ACESSO À API OFICIAL DO CLASH ROYALE
# ------------------------------------------------------------

API_URL = "https://api.clashroyale.com/v1"
API_KEY = os.getenv("CLASH_API_TOKEN")


def _headers():
    """Cabeçalho de autenticação da API"""
    return {
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "application/json",
    }


def baixar_tudo_do_jogador(tag: str):
    """
    Faz o download completo dos dados de um jogador pela tag.
    Exemplo de tag: #2PP
    """
    if not tag:
        raise ValueError("TAG do jogador é obrigatória.")
    tag = tag.replace("#", "%23")
    url = f"{API_URL}/players/{tag}"

    r = requests.get(url, headers=_headers())
    if r.status_code != 200:
        raise ValueError(f"Erro ao acessar jogador: {r.text}")
    return r.json()


def baixar_todas_as_cartas():
    """
    Baixa a lista completa de cartas disponíveis no jogo.
    """
    url = f"{API_URL}/cards"
    r = requests.get(url, headers=_headers())
    if r.status_code != 200:
        raise ValueError(f"Erro ao acessar lista de cartas: {r.text}")
    return r.json().get("items", [])


# ------------------------------------------------------------
# NORMALIZAÇÃO DE NÍVEIS DE CARTAS E JOGADOR (API ANTIGA -> ATUAL)
# ------------------------------------------------------------

# Conversão oficial baseada em raridade:
#   Common     1–14 → 13–26 (capado em 15 padrão)
#   Rare       1–12 → 11–22
#   Epic       1–9  → 8–16
#   Legendary  1–6  → 5–10
#   Champion   1–5  → 4–8
LEVEL_CONVERSION = {
    "Common": lambda lvl: lvl + 12,
    "Rare": lambda lvl: lvl + 10,
    "Epic": lambda lvl: lvl + 7,
    "Legendary": lambda lvl: lvl + 4,
    "Champion": lambda lvl: lvl + 3,
}


def _infer_rarity_from_maxlevel(max_level):
    """Inferir raridade com base no maxLevel retornado pela API."""
    if not max_level:
        return "Common"
    if max_level >= 14:
        return "Common"
    elif max_level >= 12:
        return "Rare"
    elif max_level >= 9:
        return "Epic"
    elif max_level >= 6:
        return "Legendary"
    return "Champion"


def normalize_card(card: dict) -> dict:
    """Normaliza o nível de uma carta para o formato atual do jogo."""
    if not isinstance(card, dict):
        return card

    raw_level = card.get("level")
    rarity = card.get("rarity") or _infer_rarity_from_maxlevel(card.get("maxLevel"))

    # Corrige nível com base na raridade
    if isinstance(raw_level, int):
        convert = LEVEL_CONVERSION.get(rarity, lambda x: x)
        fixed_level = min(convert(raw_level), 15)  # Limite de 15 para cartas não evoluídas
    else:
        fixed_level = raw_level

    new_card = dict(card)
    new_card["rarity"] = rarity
    new_card["levelApi"] = raw_level
    new_card["levelUi"] = fixed_level  # Nível visível no jogo (corrigido)

    return new_card


def normalize_player(raw: dict) -> dict:
    """Adapta o jogador completo, incluindo cartas e deck atual, para níveis atuais."""
    if not isinstance(raw, dict):
        return raw

    player = dict(raw)

    # Normaliza todas as cartas e o deck
    cards = raw.get("cards", [])
    deck = raw.get("currentDeck", [])
    player["cards"] = [normalize_card(c) for c in cards]
    player["currentDeck"] = [normalize_card(c) for c in deck]

    # Corrige nível do Rei (expLevel é o nível real)
    player["kingLevel"] = raw.get("expLevel", 0)

    # Corrige nome e ID da arena
    arena = raw.get("arena") or {}
    player["arena"] = {
        "id": arena.get("id", 0),
        "name": arena.get("name", "Desconhecida"),
    }

    return player
