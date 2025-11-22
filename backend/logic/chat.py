import os
import json
from typing import Any, Dict, Optional

import google.generativeai as genai

# ------------------------------------------------------------
# Configuração do Gemini
# ------------------------------------------------------------

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Variável de ambiente GEMINI_API_KEY não configurada.")

genai.configure(api_key=GEMINI_API_KEY)

# Modelo padrão (mais leve que 2.5 pra evitar quota estourando tão fácil)
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

SYSTEM_PROMPT = """
Você é um agente especialista em Clash Royale, chamado 'Clash Royale IA Deckbuilder'.

Seu objetivo é:
- analisar o perfil do jogador (nível, arena, troféus, cartas, deck atual);
- tirar dúvidas sobre cartas, arenas, metas, matchups e mecânicas do jogo;
- sugerir e ajustar decks de acordo com as cartas que o jogador possui;
- dar dicas práticas para subir troféus e jogar melhor.

REGRAS IMPORTANTES:
1) Responda SEMPRE em português do Brasil.
2) Use um tom amigável e direto, como se estivesse conversando com um amigo.
3) Por padrão, seja objetivo: 2 a 4 parágrafos curtos.
   Só faça respostas mais longas se o jogador pedir mais detalhes.
4) Você receberá um CONTEXTO com:
   - JSON completo do jogador (com níveis normalizados em 'levelUi' e 'powerLabel');
   - Lista completa de cartas do jogo.
   Use esse contexto apenas para raciocinar.
   NÃO copie nem mostre o JSON cru na resposta.
5) Sobre níveis:
   - Use os campos 'levelUi' e 'powerLabel' para entender quão forte está a carta.
6) Não invente dados da conta do jogador. Se algo não aparecer no contexto, seja honesto.
7) Ao sugerir decks:
   - priorize cartas que o jogador possui;
   - considere as cartas em nível mais alto;
   - explique o plano de jogo (condição de vitória, defesa, suporte, feitiços);
   - se usar alguma carta que talvez ele não tenha, avise.

NUNCA responda com JSON, tabelas ou blocos de código. Use apenas texto normal, com listas usando "- " quando ajudar.
Exemplo: "Baseado no meta atual e nos níveis das cartas na sua conta, montei o melhor deck possível:

PEKKA - Evolução, Nivel 15
Esqueletos - Evolução, Nivel 14
Mago elétrico - Nivel 14
Tornado - Nivel 15
Poison - Nível 13
Babê dragão - Nível 13
Dart Goblin - Nível 14
Cavaleiro - Nível 13

'Separe em paragrafos sobre como jogar'
"
"""

model = genai.GenerativeModel(
    model_name=MODEL_NAME,
    system_instruction=SYSTEM_PROMPT,
)

# Sessão única, suficiente para uso pessoal/protótipo
chat_session = model.start_chat(history=[])


def _contexto_para_texto(contexto: Any) -> str:
    """
    Converte o contexto vindo do frontend em um texto que ajude a IA,
    sem ser mostrado diretamente ao jogador.
    Espera algo como:
    {
      "player": {...},
      "cards": [...]
    }
    """
    if not contexto:
        return ""

    # Se vier em formato estranho, só faz um dump simples
    if not isinstance(contexto, dict):
        return f"(Contexto bruto)\n{str(contexto)}"

    partes = []

    player = contexto.get("player")
    all_cards = contexto.get("cards")

    # Resumo amigável do jogador
    if isinstance(player, dict):
        nome = player.get("name") or "Desconhecido"
        tag = player.get("tag") or "?"
        king = player.get("kingLevel")
        trofeus = player.get("trophies")
        arena = (player.get("arena") or {}).get("name")

        partes.append(
            f"Resumo do jogador: nome {nome}, tag {tag}, nível do Rei {king}, "
            f"{trofeus} troféus, arena atual: {arena}."
        )

        # Destacar deck atual de forma compacta
        current_deck = player.get("currentDeck") or []
        if current_deck:
            nomes_deck = []
            for c in current_deck:
                if not isinstance(c, dict):
                    continue
                nome_c = c.get("name")
                lvl = c.get("levelUi")
                if nome_c:
                    if isinstance(lvl, int):
                        nomes_deck.append(f"{nome_c} (nívelUi {lvl})")
                    else:
                        nomes_deck.append(nome_c)
            if nomes_deck:
                partes.append(
                    "Deck atual (segundo a API, com nívelUi aproximado): "
                    + ", ".join(nomes_deck)
                )

        # Guardar JSON completo para raciocínio
        partes.append("\nJSON COMPLETO DO JOGADOR (não mostrar ao usuário):")
        partes.append(json.dumps(player, ensure_ascii=False))

    # Lista completa de cartas do jogo (não mostrar)
    if isinstance(all_cards, list) and all_cards:
        partes.append("\nLISTA COMPLETA DE CARTAS DO JOGO (não mostrar ao usuário):")
        try:
            partes.append(json.dumps(all_cards, ensure_ascii=False))
        except TypeError:
            partes.append("(Não foi possível serializar todas as cartas.)")

    return "\n".join(partes)


def enviar_para_ia(mensagem: str, contexto: Optional[Any] = None) -> str:
    """
    Envia uma mensagem do jogador para a IA, incluindo (opcionalmente)
    o contexto com dados do jogador e cartas do jogo.
    """
    partes_prompt = []

    ctx_txt = _contexto_para_texto(contexto)
    if ctx_txt:
        partes_prompt.append(
            "### CONTEXTO (INVISÍVEL PARA O JOGADOR, APENAS PARA RACIOCINAR)\n"
            + ctx_txt
        )

    partes_prompt.append(
        "### PERGUNTA DO JOGADOR (responda em PT-BR, de forma amigável e objetiva, "
        "sem mostrar JSON nem tabelas):"
    )
    partes_prompt.append(mensagem)

    prompt = "\n\n".join(partes_prompt)

    resposta = chat_session.send_message(prompt)
    return resposta.text.strip()
