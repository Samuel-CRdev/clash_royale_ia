// URL DO BACKEND NO RENDER (TROQUE SE O NOME FOR OUTRO)
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

        const data = await res.json();

        document.getElementById("player-output").innerText =
            JSON.stringify(data, null, 2);
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

        const data = await res.json();

        const chatDiv = document.getElementById("chat");

        chatDiv.innerHTML += `<p><b>Você:</b> ${msg}</p>`;
        chatDiv.innerHTML += `<p><b>IA:</b> ${data.resposta}</p>`;

        chatDiv.scrollTop = chatDiv.scrollHeight;

        document.getElementById("msg").value = "";
    } catch (e) {
        console.error(e);
        alert("Erro ao enviar mensagem.");
    }
}
