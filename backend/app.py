from flask import Flask, request, jsonify
from flask_cors import CORS

from logic.clash import (
    baixar_tudo_do_jogador,
    baixar_todas_as_cartas,
    normalize_player,
)
from logic.chat import enviar_para_ia

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return {
        "status": "online",
        "message": "Clash Royale IA Deckbuilder - Backend ativo!",
    }


@app.route("/player", methods=["POST"])
def route_player():
    data = request.get_json(force=True) or {}
    tag = (data.get("tag") or "").strip()

    if not tag:
        return jsonify({"error": "TAG do jogador é obrigatória."}), 400

    try:
        bruto = baixar_tudo_do_jogador(tag)
        player = normalize_player(bruto)
        return jsonify(player)
    except Exception as e:
        print("Erro em /player:", e)
        return jsonify({"error": "Falha ao carregar jogador. Confira a TAG."}), 500


@app.route("/cards", methods=["GET"])
def route_cards():
    try:
        cards = baixar_todas_as_cartas()
        return jsonify(cards)
    except Exception as e:
        print("Erro em /cards:", e)
        return jsonify({"error": "Falha ao carregar lista de cartas."}), 500


@app.route("/chat", methods=["POST"])
def route_chat():
    data = request.get_json(force=True) or {}
    mensagem = data.get("mensagem", "").strip()
    contexto = data.get("contexto")

    if not mensagem:
        return jsonify({"error": "Mensagem vazia."}), 400

    try:
        resposta = enviar_para_ia(mensagem, contexto)
        return jsonify({"resposta": resposta})
    except Exception as e:
        print("Erro em /chat:", e)
        return jsonify({"error": "Falha ao conversar com a IA."}), 500


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
