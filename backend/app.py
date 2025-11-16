from flask import Flask, request, jsonify
from flask_cors import CORS
from logic.clash import baixar_tudo_do_jogador, baixar_todas_as_cartas
from logic.chat import enviar_para_ia

app = Flask(__name__)
CORS(app)  # <<< IMPORTANTE!

@app.route("/")
def home():
    return {
        "status": "online",
        "message": "Clash Royale IA Deckbuilder - Backend ativo!"
    }

@app.route("/player", methods=["POST"])
def route_player():
    data = request.json
    tag = data.get("tag")

    if not tag:
        return {"error": "TAG obrigatória."}, 400

    player = baixar_tudo_do_jogador(tag)
    return jsonify(player)

@app.route("/cards", methods=["GET"])
def route_cards():
    cards = baixar_todas_as_cartas()
    return jsonify(cards)

@app.route("/chat", methods=["POST"])
def route_chat():
    data = request.json
    mensagem = data.get("mensagem", "")
    contexto = data.get("contexto", "")

    resposta = enviar_para_ia(mensagem, contexto)
    return {"resposta": resposta}

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
