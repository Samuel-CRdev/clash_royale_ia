// URL DO BACKEND NO RENDER
const API_URL = "https://clash-royale-ia.onrender.com";

let cachedPlayer = null;
let cachedAllCards = null;
let loadingPlayer = false;
let loadingCards = false;

// ---------------------------------------------
// Pré-carregar lista completa de cartas do jogo
// ---------------------------------------------
async function preloadAllCards() {
  if (loadingCards || cachedAllCards) return;
  loadingCards = true;

  try {
    const res = await fetch(`${API_URL}/cards`);
    if (!res.ok) {
      console.warn("Falha ao carregar /cards:", res.status);
      return;
    }
    const data = await res.json();
    cachedAllCards = data;
    console.log(
      "Cartas carregadas:",
      Array.isArray(data) ? data.length : "formato inesperado"
    );
  } catch (err) {
    console.warn("Erro ao carregar /cards:", err);
  } finally {
    loadingCards = false;
  }
}

window.addEventListener("load", () => {
  preloadAllCards();
  const msgInput = document.getElementById("msg");
  if (msgInput) {
    msgInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviarChat();
      }
    });
  }
});

// ---------------------------------------------
// Buscar dados do jogador
// ---------------------------------------------
async function loadPlayer() {
  if (loadingPlayer) return;

  const tagInput = document.getElementById("tag");
  const out = document.getElementById("player-output");

  const tag = tagInput.value.trim();
  if (!tag) {
    alert("Digite uma TAG válida.");
    return;
  }

  loadingPlayer = true;
  out.innerHTML = "<p>Carregando dados do jogador...</p>";

  try {
    const res = await fetch(`${API_URL}/player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      out.innerHTML = `<p><b>Erro:</b> ${
        data.error || "Falha ao carregar jogador."
      }</p>`;
      cachedPlayer = null;
      return;
    }

    cachedPlayer = data;

    const nome = data.name || "Desconhecido";
    const king = data.kingLevel ?? data.expLevel ?? "?";
    const trofeus = data.trophies ?? "?";
    const clan = data.clan ? data.clan.name : "Sem clã";
    const arenaNome = data.arena ? data.arena.name : "Desconhecida";

    let html = `
      <p><b>Nome:</b> ${nome}</p>
      <p><b>Nível do Rei:</b> ${king}</p>
      <p><b>Troféus:</b> ${trofeus}</p>
      <p><b>Clã:</b> ${clan}</p>
      <p><b>Arena:</b> ${arenaNome}</p>
      <hr>
      <p><b>Cartas do jogador (nível aproximado atual):</b></p>
    `;

    if (Array.isArray(data.cards) && data.cards.length > 0) {
      html += "<ul>";
      for (const c of data.cards) {
        const nomeCarta = c.name || "Carta desconhecida";
        const nivelUi = c.levelUi ?? c.level ?? "?";
        const label = c.powerLabel ? ` (${c.powerLabel})` : "";
        html += `<li>${nomeCarta} — nível: ${nivelUi}${label}</li>`;
      }
      html += "</ul>";
    } else {
      html += "<p>Esse jogador não possui cartas listadas.</p>";
    }

    out.innerHTML = html;

    // Garante que as cartas globais sejam carregadas também
    preloadAllCards();
  } catch (err) {
    console.error(err);
    out.innerHTML = "<p><b>Erro:</b> não foi possível carregar o jogador.</p>";
    cachedPlayer = null;
  } finally {
    loadingPlayer = false;
  }
}

// ---------------------------------------------
// Chat com a IA
// ---------------------------------------------
function addChatMessage(role, text) {
  const chatDiv = document.getElementById("chat");
  if (!chatDiv) return;

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
    alert("Carregue um jogador antes de falar com a IA.");
    return;
  }

  // Mostra mensagem do usuário
  addChatMessage("user", msg);
  input.value = "";

  // Mostra indicador de "pensando"
  addChatMessage("ia", "Pensando...");

  const payload = {
    mensagem: msg,
    contexto: {
      player: cachedPlayer,
      cards: cachedAllCards,
    },
  };

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    // Remove último "Pensando..." (última mensagem da IA)
    const chatDiv = document.getElementById("chat");
    const allMessages = chatDiv.querySelectorAll(".chat-message.ia");
    const lastIa = allMessages[allMessages.length - 1];
    if (lastIa && lastIa.textContent.trim() === "Pensando...") {
      chatDiv.removeChild(lastIa);
    }

    if (!res.ok || data.error) {
      addChatMessage(
        "ia",
        data.error || "Não consegui responder agora. Tente novamente em instantes."
      );
      return;
    }

    addChatMessage("ia", data.resposta || "(sem resposta do servidor)");
  } catch (err) {
    console.error(err);
    addChatMessage("ia", "Tive um erro ao responder. Tente novamente.");
  }
}
