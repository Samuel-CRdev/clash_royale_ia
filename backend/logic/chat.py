import os
import json
import google.generativeai as genai

GEMINI_KEY = os.getenv("GEMINI_API_KEY")  # recebido pela Render

if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)

AGENT_SYSTEM_PROMPT = """
Você é um agente especializado em Clash Royale, chamado 'Clash Royale IA Deckbuilder'.

Seu objetivo principal é ajudar o jogador a:
1. Entender os próprios dados (nível, troféus, arena, histórico, cartas etc.).
2. Tirar dúvidas sobre cartas, metas, matchups, mecânicas e estratégias.
3. Montar e ajustar decks de forma inteligente, considerando as cartas que o jogador possui e o nível delas.
4. Dar dicas práticas para subir troféus, melhorar a rotação, gestão de elixir e decisões de jogo.

Regras de comportamento:
- Responda sempre em português do Brasil.
- Use linguagem clara e direta, adaptada para iniciantes, mas você pode aprofundar quando fizer sentido.
- Sempre que sugerir um deck:
  - Priorize cartas que o jogador possui (com base no contexto recebido).
  - Se usar alguma carta que não aparece nas cartas do jogador, avise explicitamente que ela pode não estar desbloqueada.
  - Explique o plano de jogo do deck (condição de vitória, defesa, suportes, possíveis substituições).
- Use os dados enviados no contexto (JSON do jogador e lista de todas as cartas do jogo) como fonte principal de verdade.
- Se alguma informação não aparecer no contexto ou parecer desatualizada, seja honesto e responda de forma mais genérica, sem inventar dados específicos.
"""

# Modelo com prompt de sistema
model = genai.GenerativeModel(
    model_name="gemini-flash-latest",
    system_instruction=AGENT_SYSTEM_PROMPT,
)

# Sessão de chat com memória
chat_session = model.start_chat(history=[])


def _montar_contexto_texto(contexto):
    """
    Recebe um dict com:
    {
      "player": {...},
      "cards": [...]
    }
    e transforma em texto que o modelo consiga usar.
    """
    if not contexto:
        return ""

    if isinstance(contexto, str):
        return contexto

    partes = []
    try:
        jogador = contexto.get("player") or contexto.get("jogador")
        cartas = contexto.get("cards") or contexto.get("cartas") or contexto.get("all_cards")

        if jogador:
            partes.append("DADOS ATUAIS DO JOGADOR EM JSON:")
            partes.append(json.dumps(jogador, ensure_ascii=False))

        if cartas:
            partes.append("\nLISTA COMPLETA DE CARTAS DO JOGO EM JSON:")
            partes.append(json.dumps(cartas, ensure_ascii=False))
    except Exception as e:
        partes.append(f"[AVISO] Erro ao processar contexto para texto: {e}")
        partes.append(str(contexto))

    return "\n".join(partes)


def enviar_para_ia(mensagem, contexto=None):
    """
    Envia uma mensagem para a IA, incluindo, se disponível,
    o contexto com dados do jogador e lista de cartas.
    """
    if contexto:
        contexto_texto = _montar_contexto_texto(contexto)
        prompt = f"""{contexto_texto}

--------------------------------
Com base APENAS nessas informações de contexto e no seu conhecimento geral de Clash Royale,
responda à pergunta do jogador abaixo. Não repita o JSON inteiro na resposta, apenas use-o
mentalmente para fundamentar suas recomendações.

PERGUNTA DO JOGADOR:
{mensagem}
"""
    else:
        prompt = mensagem

    resposta = chat_session.send_message(prompt)
    return resposta.text
