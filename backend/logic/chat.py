import os
import json
import google.generativeai as genai

GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY não configurada no ambiente.")

genai.configure(api_key=GOOGLE_API_KEY)

SYSTEM_PROMPT = """
Você é um agente especialista em Clash Royale que responde SEMPRE em português do Brasil.

Seu trabalho é:
- explicar os dados do perfil do jogador (nível, arena, troféus, cartas, deck atual);
- tirar dúvidas sobre cartas, arenas, mecânicas, modos de jogo e meta;
- sugerir decks que façam sentido para as cartas e níveis que o jogador já tem.

REGRAS DE ESTILO
1) Seja amigável e direto. Por padrão, responda em no máximo 2–4 parágrafos curtos
   ou em até 8 frases.
2) Só faça respostas muito longas se o jogador pedir explicitamente mais detalhes.
3) NUNCA devolva tabelas, markdown, blocos de código ou JSON.
   Use apenas texto corrido e, quando ajudar, listas simples com "- ".
4) Você poderá receber um CONTEXTO com dados completos do jogador e uma lista de
   todas as cartas do jogo em JSON. Use essas informações apenas para raciocinar.
   Nunca copie nem descreva o JSON literalmente, nem liste todas as cartas.

REGRAS DE CONTEÚDO
5) Ao montar decks, priorize:
   - sinergia entre win conditions, suporte e defesa;
   - curva de elixir razoável (geralmente entre 2,8 e 4,3);
   - cartas que o jogador tem em níveis mais altos.
6) Se algo não estiver claro (por exemplo, balanceamentos muito recentes),
   explique a incerteza em vez de inventar.
7) Se o jogador não tiver carta X, ofereça alternativas com função parecida.

Sempre fale como se estivesse conversando com o jogador, não com um programador.
"""

model = genai.GenerativeModel(
    model_name="gemini-flash-latest",
    system_instruction=SYSTEM_PROMPT,
)

chat_session = model.start_chat(history=[])


def _montar_texto_contexto(contexto):
    """
    Recebe o 'contexto' vindo do frontend:
    {
      "player": { ... },
      "cards": [ ... ]   # todas as cartas do jogo
    }
    Transforma em um texto que a IA entende, mas deixa claro
    que esse JSON não é para ser exibido ao usuário.
    """
    if not contexto:
        return ""

    if not isinstance(contexto, dict):
        # fallback se vier string
        return str(contexto)

    partes = []

    player = contexto.get("player")
    all_cards = contexto.get("cards")

    if player:
        nome = player.get("name") or "desconhecido"
        tag = player.get("tag") or "?"
        exp = player.get("expLevel")
        king = player.get("kingLevel", exp)
        tr = player.get("trophies")
        arena = (player.get("arena") or {}).get("name")

        partes.append(
            f"Resumo do jogador: nome {nome}, tag {tag}, nível do Rei {king}, "
            f"troféus {tr}, arena atual {arena}."
        )
        partes.append("JSON completo do jogador (NÃO mostrar ao usuário):")
        partes.append(json.dumps(player, ensure_ascii=False))

    if all_cards:
        partes.append("Lista completa de cartas do jogo em JSON (NÃO mostrar ao usuário):")
        partes.append(json.dumps(all_cards, ensure_ascii=False))

    return "\n".join(partes)


def enviar_para_ia(mensagem, contexto=None):
    """
    Envia mensagem para a IA, incluindo (opcionalmente)
    contexto com dados do jogador e lista de cartas.
    """
    partes_prompt = []

    ctx_txt = _montar_texto_contexto(contexto)
    if ctx_txt:
        partes_prompt.append(
            "### CONTEXTO (apenas para você, NÃO mostrar ao jogador)\n" + ctx_txt
        )

    partes_prompt.append(
        "### Pergunta do jogador (responda em PT-BR, de forma objetiva, sem tabelas/JSON):"
    )
    partes_prompt.append(mensagem)

    prompt = "\n\n".join(partes_prompt)

    resposta = chat_session.send_message(prompt)
    return resposta.text.strip()
