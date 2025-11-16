import os
import requests

TOKEN = os.getenv("CLASH_API_TOKEN")  # recebido pela Render

BASE_URL = "https://api.clashroyale.com/v1"

headers = {
    "Accept": "application/json",
    "Authorization": f"Bearer {TOKEN}",
}

def baixar_tudo_do_jogador(TAG):
    encoded = TAG.replace("#", "%23")
    url = f"{BASE_URL}/players/{encoded}"

    response = requests.get(url, headers=headers)
    response.raise_for_status()

    return response.json()


def baixar_todas_as_cartas():
    url = f"{BASE_URL}/cards"

    response = requests.get(url, headers=headers)
    response.raise_for_status()

    return response.json().get("items", [])
