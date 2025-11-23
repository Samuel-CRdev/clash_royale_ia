import os
import json
from typing import Any, Dict, Optional

import google.generativeai as genai

# ------------------------------------------------------------
# Configuração da API Gemini
# ------------------------------------------------------------

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Variável de ambiente GEMINI_API_KEY não configurada.")

genai.configure(api_key=GEMINI_API_KEY)

# Modelo leve recomendado (100% compatível e gratuito)
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

SYSTEM_PROMPT = """
Você é uma agente especialista em Clash Royale, chamada 'Mini Pekka'.

Seu objetivo é:
- responder os questionamentos do player sobre clash royale de forma clara e simples.

REGRAS IMPORTANTES:
1) Responda o que o player pedir
2) Seja objetivo: Respostas curtas e bem formatadas, evite usar muitos caracteres diferentes. Responda em 1 ou 2 parágrafos, e dê espaço entre os parágrafos.
3) Use um tom amigável e direto, como se estivesse conversando com um amigo.
4) Você receberá um CONTEXTO com:
   - JSON completo do jogador (com níveis normalizados em 'levelUi');
   - Lista completa de cartas do jogo.
   Use esse contexto apenas para raciocinar.
5) Sobre níveis:
   - Use os campos 'levelUi' e 'powerLabel' para entender quão forte está a carta.
6) Não invente dados da conta do jogador. Se algo não aparecer no contexto, seja honesto.
7) Ao sugerir decks:
   - priorize cartas que o jogador possui;
   - considere as cartas em nível mais alto;

NUNCA responda com JSON, tabelas ou blocos de código. Use apenas texto normal.
"""

# Criar modelo
model = genai.GenerativeModel(
    model_name=MODEL_NAME,
    system_instruction=SYSTEM_PROMPT,
)

# Sessão de chat global (vamos reiniciar quando chegar novo contexto)
chat_session = model.start_chat(history=[])

# Contexto guardado na memória (último contexto recebido)
chat_context_cached = None


# ------------------------------------------------------------
# Converte contexto em texto útil APENAS para a IA
# ------------------------------------------------------------
def _contexto_para_texto(contexto: Any) -> str:
    if not isinstance(contexto, dict):
        return str(contexto)

    partes = []

    player = contexto.get("player")
    all_cards = contexto.get("cards")

    if isinstance(player, dict):
        nome = player.get("name") or "Desconhecido"
        tag = player.get("tag") or "?"
        king = player.get("kingLevel")
        trofeus = player.get("trophies")
        arena = (player.get("arena") or {}).get("name")

        partes.append(
            f"Jogador: {nome}, tag {tag}, Rei nível {king}, {trofeus} troféus, arena {arena}."
        )

        deck = player.get("currentDeck") or []
        nomes = []
        for c in deck:
            nome_c = c.get("name")
            lvl = c.get("levelUi")
            if nome_c:
                if isinstance(lvl, int):
                    nomes.append(f"{nome_c} (nívelUi {lvl})")
                else:
                    nomes.append(nome_c)

        if nomes:
            partes.append("Deck atual: " + ", ".join(nomes))

        partes.append("JSON completo do jogador (não mostrar ao usuário):")
        partes.append(json.dumps(player, ensure_ascii=False))

    if isinstance(all_cards, list):
        partes.append("Lista completa de cartas do jogo (não mostrar ao usuário):")
        try:
            partes.append(json.dumps(all_cards, ensure_ascii=False))
        except Exception:
            partes.append("(Não foi possível serializar)")

    return "\n".join(partes)


# ------------------------------------------------------------
# Salvar o contexto (sempre sobrescreve para o último jogador)
# ------------------------------------------------------------
def registrar_contexto_inicial(contexto):
    global chat_context_cached
    chat_context_cached = contexto


# ------------------------------------------------------------
# Função principal: enviar mensagem à IA
# ------------------------------------------------------------
def enviar_para_ia(mensagem: str, contexto: Optional[Any] = None) -> str:
    global chat_context_cached, chat_session

    # -------------------------------------------
    # SE VEIO CONTEXTO → NOVO JOGADOR / NOVA CONVERSA
    # -------------------------------------------
    if contexto:
        # guarda o novo contexto (sobrescreve o anterior)
        registrar_contexto_inicial(contexto)

        # transforma em texto interno pra IA
        contexto_txt = _contexto_para_texto(chat_context_cached)

        # REINICIA A SESSÃO DE CHAT para não misturar jogador antigo com novo
        chat_session = model.start_chat(history=[])

        prompt = f"""
### CONTEXTO INICIAL (não mostrar ao usuário)
{contexto_txt}

### PRIMEIRA MENSAGEM DO JOGADOR:
{mensagem}
        """.strip()

        resposta = chat_session.send_message(prompt)
        return resposta.text.strip()

    # -------------------------------------------
    # MENSAGENS SEGUINTES → Só continua a conversa atual
    # -------------------------------------------
    if chat_session is None:
        # fallback de segurança: se por algum motivo não houver sessão, cria uma nova
        chat_session = model.start_chat(history=[])

    prompt = f"Jogador: {mensagem}"
    resposta = chat_session.send_message(prompt)
    return resposta.text.strip()
