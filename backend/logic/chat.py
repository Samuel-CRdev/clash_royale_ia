import os
import google.generativeai as genai

GEMINI_KEY = os.getenv("GEMINI_API_KEY")  # recebido pela Render

genai.configure(api_key=GEMINI_KEY)

model = genai.GenerativeModel("gemini-flash-latest")

# Sessão de chat com memória
chat_session = model.start_chat(history=[])

def enviar_para_ia(mensagem, contexto=""):
    if contexto:
        chat_session.history.append({"role": "user", "parts": [contexto]})

    resposta = chat_session.send_message(mensagem)
    return resposta.text
