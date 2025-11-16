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
