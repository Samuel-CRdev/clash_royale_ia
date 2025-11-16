// URL DO BACKEND NO RENDER
const API_URL = "https://clash-royale-ia.onrender.com";

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
            return;
        }

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
    } catch (e) {
        console.error(e);
        alert("Erro ao carregar jogador.");
    }
}

// ----------------------------
// FUNÇÃO: enviar mensagem ao chat da IA
// ----------------------------
async function enviarChat() {
    const msg = document.getElementById("msg").value.trim();
    if (!msg) return;

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensagem: msg })
        });

        let data;
        try {
            data = await res.json();
        } catch (e) {
            console.error("Erro ao parsear JSON do chat:", e);
            alert("Erro inesperado no chat.");
            return;
        }

        const chatDiv = document.getElementById("chat");

        chatDiv.innerHTML += `<p><b>Você:</b> ${msg}</p>`;
        chatDiv.innerHTML += `<p><b>IA:</b> ${data.resposta || "(sem resposta do servidor)"} </p>`;

        chatDiv.scrollTop = chatDiv.scrollHeight;

        document.getElementById("msg").value = "";
    } catch (e) {
        console.error(e);
        alert("Erro ao enviar mensagem.");
    }
}
