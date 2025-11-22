import os
import math
import requests
from typing import Any, Dict, List

# ------------------------------------------------------------
# Configuração da API oficial do Clash Royale
# ------------------------------------------------------------

BASE_URL = "https://api.clashroyale.com/v1"
API_TOKEN = os.getenv("CLASH_API_TOKEN")


def _auth_headers() -> Dict[str, str]:
    if not API_TOKEN:
        raise RuntimeError("Variável de ambiente CLASH_API_TOKEN não configurada.")
    return {
        "Accept": "application/json",
        "Authorization": f"Bearer {API_TOKEN}",
    }


# ------------------------------------------------------------
# Funções de acesso cru à API
# ------------------------------------------------------------

def baixar_tudo_do_jogador(tag: str) -> Dict[str, Any]:
    """
    Busca todos os dados de um jogador pela TAG na API oficial.
    Exemplo de tag: "#2PP" ou "2PP" (o # é tratado automaticamente).
    """
    if not tag:
        raise ValueError("TAG do jogador é obrigatória.")

    norm_tag = tag.strip()
    if not norm_tag:
        raise ValueError("TAG do jogador é obrigatória.")

    if not norm_tag.startswith("#"):
        norm_tag = "#" + norm_tag

    encoded_tag = norm_tag.replace("#", "%23")
    url = f"{BASE_URL}/players/{encoded_tag}"

    resp = requests.get(url, headers=_auth_headers(), timeout=15)
    if resp.status_code != 200:
        raise RuntimeError(f"Erro ao buscar jogador: {resp.status_code} - {resp.text}")
    return resp.json()


def baixar_todas_as_cartas() -> List[Dict[str, Any]]:
    """
    Retorna a lista de TODAS as cartas do jogo.
    """
    url = f"{BASE_URL}/cards"
    resp = requests.get(url, headers=_auth_headers(), timeout=15)
    if resp.status_code != 200:
        raise RuntimeError(f"Erro ao buscar lista de cartas: {resp.status_code} - {resp.text}")
    data = resp.json()
    return data.get("items", [])


# ------------------------------------------------------------
# Normalização de níveis (API antiga -> escala atual amigável)
# ------------------------------------------------------------

def _calc_level_ui(level_api: Any, max_level_api: Any) -> Dict[str, Any]:
    """
    Converte o nível da API antiga (1..maxLevel) para:
      - levelUi: escala 1..15, proporcional
      - powerLabel: 'baixo' | 'médio' | 'alto' | 'máximo'
    Não é uma conversão oficial 1:1, mas produz um número
    coerente visualmente e, principalmente, preserva a noção
    de quão perto a carta está do máximo.
    """
    if not isinstance(level_api, int) or not isinstance(max_level_api, int) or max_level_api <= 0:
        return {"levelUi": level_api, "powerLabel": None}

    ratio = level_api / max_level_api  # 0..1
    # Escala para 1..15
    level_ui = max(1, min(15, int(round(ratio * 15))))

    if ratio >= 0.95:
        label = "máximo"
    elif ratio >= 0.75:
        label = "alto"
    elif ratio >= 0.4:
        label = "médio"
    else:
        label = "baixo"

    return {"levelUi": level_ui, "powerLabel": label}


def normalize_card(card: Dict[str, Any]) -> Dict[str, Any]:
    """
    Devolve a carta com campos extras amigáveis:
      - rarity
      - levelApi
      - maxLevelApi
      - levelUi  (1..15, escala normalizada)
      - powerLabel ('baixo'/'médio'/'alto'/'máximo')
    """
    if not isinstance(card, dict):
        return card

    new_card = dict(card)

    rarity = card.get("rarity")
    level_api = card.get("level")
    max_level_api = card.get("maxLevel")

    new_card["rarity"] = rarity
    new_card["levelApi"] = level_api
    new_card["maxLevelApi"] = max_level_api

    info = _calc_level_ui(level_api, max_level_api)
    new_card["levelUi"] = info["levelUi"]
    new_card["powerLabel"] = info["powerLabel"]

    return new_card


def normalize_player(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recebe o JSON cru do jogador e adiciona campos
    normalizados e amigáveis para a IA e o frontend.
    """
    if not isinstance(raw, dict):
        return raw

    player = dict(raw)

    # Nível do Rei
    player["kingLevel"] = raw.get("expLevel")

    # Arena (garantir estrutura simples)
    arena = raw.get("arena") or {}
    player["arena"] = {
        "id": arena.get("id"),
        "name": arena.get("name") or "Arena desconhecida",
    }

    # Cartas do jogador
    cards = raw.get("cards") or []
    player["cards"] = [normalize_card(c) for c in cards]

    # Deck atual
    current_deck = raw.get("currentDeck") or []
    player["currentDeck"] = [normalize_card(c) for c in current_deck]

    return player


# Alias para compatibilidade com versões antigas do código
def formatar_jogador(raw: Dict[str, Any]) -> Dict[str, Any]:
    return normalize_player(raw)
