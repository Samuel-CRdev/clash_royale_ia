// URL DO BACKEND NO RENDER
const API_URL = "https://clash-royale-ia.onrender.com";

let cachedPlayer = null;
let cachedAllCards = null;
let loadingPlayer = false;
let loadingCards = false;
let contextoEnviado = false; // <--- IMPORTANTE


// ------------------------------------------------------------
// Pré-carregar lista completa de cartas
// ------------------------------------------------------------
async function preloadAllCards() {
  if (loadingCards || cachedAllCards) return;
  loadingCards = true;

  try {
    const res = await fetch(`${API_URL}/cards`);
    if (!res.ok) return;

    const data = await res.json();
    cachedAllCards = data;
    console.log("Cartas carregadas:", data.length);
  } catch (e) {
    console.warn("Falha ao carregar cartas:", e);
  } finally {
    loadingCards = false;
  }
}

window.addEventListener("load", () => {
  preloadAllCards();

  const msgInput = document.getElementById("msg");
  msgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      enviarChat();
    }
  });
});


// ------------------------------------------------------------
// Carregar Jogador
// ------------------------------------------------------------
async function loadPlayer() {
  if (loadingPlayer) return;

  const tagInput = document.getElementById("tag");
  const out = document.getElementById("player-output");

  const tag = tagInput.value.trim().toUpperCase();
  if (!tag) {
    alert("Digite uma TAG válida.");
    return;
  }

  loadingPlayer = true;
  out.innerHTML = "<p>Carregando dados...</p>";
  contextoEnviado = false; // <--- RESETAR AO CARREGAR PLAYER NOVO

  try {
    const res = await fetch(`${API_URL}/player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      out.innerHTML = `<p><b>Erro:</b> ${data.error || "Falha ao carregar"}</p>`;
      cachedPlayer = null;
      return;
    }

    cachedPlayer = data;

    const nome = data.name || "Desconhecido";
    const king = data.kingLevel;
    const trofeus = data.trophies;
    const arena = data.arena ? data.arena.name : "Arena";

    let html = `
      <p><b>Nome:</b> ${nome}</p>
      <p><b>Nível do Rei:</b> ${king}</p>
      <p><b>Troféus:</b> ${trofeus}</p>
      <p><b>Arena:</b> ${arena}</p>
      <hr>
      <p><b>Cartas:</b></p>
      <ul>
    `;

    for (const c of data.cards) {
      html += `<li>${c.name} — nível: ${c.levelUi} (${c.powerLabel})</li>`;
    }

    html += "</ul>";

    out.innerHTML = html;

  } catch (e) {
    console.error(e);
    out.innerHTML = "<p>Erro ao carregar jogador.</p>";
  } finally {
    loadingPlayer = false;
  }
}


// ------------------------------------------------------------
// Chat com a IA
// ------------------------------------------------------------
function addChatMessage(role, text) {
  const chatDiv = document.getElementById("chat");
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chatDiv.appendChild(wrapper);

  chatDiv.scrollTop = chatDiv.scrollHeight;
}


async function enviarChat() {
  const input = document.getElementById("msg");
  const msg = input.value.trim();
  if (!msg) return;
  if (!cachedPlayer) {
    alert("Carregue um jogador primeiro.");
    return;
  }

  addChatMessage("user", msg);
  input.value = "";

  addChatMessage("ia", "Pensando...");

  let payload;

  // PRIMEIRA MENSAGEM: enviar contexto completo
  if (!contextoEnviado) {
    payload = {
      mensagem: msg,
      contexto: {
        player: cachedPlayer,
        cards: cachedAllCards
      }
    };
    contextoEnviado = true;
  } else {
    // MENSAGENS SEGUINTES: somente texto
    payload = { mensagem: msg };
  }

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    // Remove "Pensando..."
    const chatDiv = document.getElementById("chat");
    const iaMessages = chatDiv.querySelectorAll(".chat-message.ia");
    const lastIa = iaMessages[iaMessages.length - 1];
    if (lastIa && lastIa.textContent === "Pensando...") {
      lastIa.remove();
    }

    if (!res.ok || data.error) {
      addChatMessage("ia", data.error || "Erro ao responder.");
      return;
    }

    addChatMessage("ia", data.resposta);

  } catch (err) {
    console.error(err);
    addChatMessage("ia", "Erro ao enviar mensagem.");
  }
}
