// URL DO BACKEND NO RENDER
const API_URL = "https://clash-royale-ia.onrender.com";

// Estado em memória no frontend
let currentPlayer = null; // JSON completo do /player
let allCards = null;      // Lista completa do /cards
let isLoadingCards = false;

// ----------------------------
// FUNÇÃO: carregar lista completa de cartas do jogo
// ----------------------------
async function carregarCartasSePrecisar() {
    if (allCards || isLoadingCards) return;

    isLoadingCards = true;
    try {
        const res = await fetch(`${API_URL}/cards`);
        let data;

        try {
            data = await res.json();
        } catch (e) {
            console.error("Erro ao parsear JSON de /cards:", e);
            return;
        }

        // backend retorna diretamente a lista (items[])
        allCards = data;
        console.log("Cartas carregadas:", Array.isArray(allCards) ? allCards.length : allCards);
    } catch (e) {
        console.error("Erro ao carregar cartas:", e);
    } finally {
        isLoadingCards = false;
    }
}

// ----------------------------
// FUNÇÃO: buscar dados do player
// ----------------------------
async function loadPlayer() {
    const tag = document.getElementById("tag").value.trim();

    if (!tag) {
        alert("Digite uma TAG válida.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/player`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tag })
        });

        let data;
        try {
            data = await res.json();
        } catch (e) {
            console.error("Erro ao parsear JSON:", e);
            alert("Erro inesperado no servidor.");
            return;
        }

        const out = document.getElementById("player-output");

        // Se o backend retornar erro padronizado
        if (!res.ok || data.error) {
            out.innerHTML = `<p><b>Erro:</b> ${data.error || "Falha ao carregar jogador."}</p>`;
            currentPlayer = null;
            return;
        }

        // Guarda o JSON completo do jogador para usar no contexto do chat
        currentPlayer = data;

        // Campos principais
        const nome = data.name || "Desconhecido";
        const nivelRei = data.expLevel ?? "??";
        const trofeus = data.trophies ?? "?";
        const clan = data.clan ? data.clan.name : "Sem clã";
        const arena = data.arena ? data.arena.name : "Desconhecida";

        let html = `
            <p><b>Nome:</b> ${nome}</p>
            <p><b>Nível do Rei:</b> ${nivelRei}</p>
            <p><b>Troféus:</b> ${trofeus}</p>
            <p><b>Clã:</b> ${clan}</p>
            <p><b>Arena:</b> ${arena}</p>
            <hr>
            <p><b>Cartas do jogador:</b></p>
        `;

        if (Array.isArray(data.cards) && data.cards.length > 0) {
            html += "<ul>";
            for (const c of data.cards) {
                const nomeCarta = c.name || "Carta desconhecida";
                const nivelApi = c.level ?? "?";
                html += `<li>${nomeCarta} — nível API: ${nivelApi}</li>`;
            }
            html += "</ul>";
        } else {
            html += "<p>Esse jogador não possui cartas listadas.</p>";
        }

        out.innerHTML = html;

        // Assim que carregar o player, tenta carregar a lista completa de cartas
        carregarCartasSePrecisar();
    } catch (e) {
        console.error(e);
        alert("Erro ao carregar jogador.");
        currentPlayer = null;
    }
}

// ----------------------------
// FUNÇÃO: enviar mensagem ao chat da IA
// ----------------------------
async function enviarChat() {
    const msgInput = document.getElementById("msg");
    const msg = msgInput.value.trim();
    if (!msg) return;

    const chatDiv = document.getElementById("chat");

    // Mostra a mensagem do usuário imediatamente
    chatDiv.innerHTML += `<p><b>Você:</b> ${msg}</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;
    msgInput.value = "";

    // Monta contexto: player + cartas (se já tiver carregado)
    const contexto = {
        player: currentPlayer,
        cards: allCards,
    };

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensagem: msg, contexto })
        });

        let data;
        try {
            data = await res.json();
        } catch (e) {
            console.error("Erro ao parsear JSON do chat:", e);
            alert("Erro inesperado no chat.");
            return;
        }

        chatDiv.innerHTML += `<p><b>IA:</b> ${data.resposta || "(sem resposta do servidor)"} </p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;
    } catch (e) {
        console.error(e);
        alert("Erro ao enviar mensagem.");
    }
}
