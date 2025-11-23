// URL do backend
const API_URL = "https://clash-royale-ia.onrender.com";

let cachedPlayer = null;
let cachedAllCards = null;
let contextoEnviado = false;
let loadingPlayer = false;

/* ----------------------------------------------
   Preload das cartas
---------------------------------------------- */
async function preloadAllCards() {
    try {
        const res = await fetch(`${API_URL}/cards`);
        cachedAllCards = await res.json();
    } catch (e) {
        console.warn("Falha ao carregar cartas:", e);
    }
}
window.addEventListener("load", preloadAllCards);

/* ----------------------------------------------
   Carregar Jogador
---------------------------------------------- */
async function loadPlayer() {
    if (loadingPlayer) return;

    const tag = document.getElementById("tag").value.trim().toUpperCase();
    const out = document.getElementById("player-output");

    if (!tag) return alert("Digite uma TAG válida.");

    loadingPlayer = true;
    contextoEnviado = false;
    out.innerHTML = "<p>Carregando dados...</p>";

    try {
        const res = await fetch(`${API_URL}/player`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tag })
        });
        const data = await res.json();

        if (!res.ok || data.error) {
            out.innerHTML = `<p><b>Erro:</b> ${data.error}</p>`;
            return;
        }

        cachedPlayer = data;

        const nome = data.name;
        const king = data.kingLevel;
        const trophies = data.trophies;
        const arena = data.arena?.name;

        let html = `
            <div class="player-info-top">
                <div class="tag-input-row inside-box">
                    <input id="tag" type="text" placeholder="Digite sua TAG (#ABC123)" value="${tag}" />
                    <button id="btn-load-player" onclick="loadPlayer()">Carregar</button>
                </div>
            </div>

            <div class="player-info-box">
                <p><span class="section-title">Nome:</span> ${nome}</p>
                <p><span class="section-title">Rei:</span> ${king}</p>
                <p><span class="section-title">Troféus:</span> ${trophies}</p>
                <p><span class="section-title">Arena:</span> ${arena}</p>
            </div>

            <div class="player-info-box">
                <p class="section-title">Cartas</p>

                <div class="cards-scroll-box">
                    <div class="card-grid">
        `;

        for (const c of data.cards) {
            const url = c.iconUrls?.medium || c.iconUrls?.small || "";
            html += `
                <div class="card">
                    <img src="${url}">
                    <span>Nv ${c.levelUi}</span>
                </div>
            `;
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        out.innerHTML = html;

    } catch {
        out.innerHTML = "<p>Erro ao carregar jogador.</p>";
    }

    loadingPlayer = false;
}

/* ----------------------------------------------
   Chat
---------------------------------------------- */
function addChatMessage(role, text) {
    const chat = document.getElementById("chat");

    const msg = document.createElement("div");
    msg.className = `chat-message ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    msg.appendChild(bubble);
    chat.appendChild(msg);

    chat.scrollTop = chat.scrollHeight;
}

async function enviarChat() {
    const input = document.getElementById("msg");
    const msg = input.value.trim();
    if (!msg) return;

    if (!cachedPlayer) return alert("Carregue um jogador primeiro.");

    addChatMessage("user", msg);
    input.value = "";

    addChatMessage("ia", "Pensando...");

    let payload = contextoEnviado
        ? { mensagem: msg }
        : { mensagem: msg, contexto: { player: cachedPlayer, cards: cachedAllCards } };

    contextoEnviado = true;

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        const chat = document.getElementById("chat");

        const iaThinking = chat.querySelectorAll(".chat-message.ia");
        const lastIa = iaThinking[iaThinking.length - 1];
        if (lastIa && lastIa.textContent.includes("Pensando")) lastIa.remove();

        addChatMessage("ia", data.resposta);

    } catch {
        addChatMessage("ia", "Erro ao enviar.");
    }
}
