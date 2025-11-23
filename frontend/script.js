// URL DO BACKEND NO RENDER
const API_URL = "https://clash-royale-ia.onrender.com";

let cachedPlayer = null;
let cachedAllCards = null;
let contextoEnviado = false;
let loadingPlayer = false;
let loadingCards = false;

/* --------------------------------------------------
   PRÉ-CARREGAR TODAS AS CARTAS
-------------------------------------------------- */
async function preloadAllCards() {
  if (loadingCards || cachedAllCards) return;
  loadingCards = true;

  try {
    const res = await fetch(`${API_URL}/cards`);
    if (!res.ok) {
      console.warn("Falha ao carregar lista de cartas.");
      return;
    }
    const data = await res.json();
    cachedAllCards = data;
    console.log("Cartas carregadas:", data.length);
  } catch (e) {
    console.warn("Erro ao carregar cartas:", e);
  } finally {
    loadingCards = false;
  }
}

/* --------------------------------------------------
   AO CARREGAR A PÁGINA
-------------------------------------------------- */
window.addEventListener("load", () => {
  preloadAllCards();

  // Enter no campo de mensagem envia o chat
  const msgInput = document.getElementById("msg");
  if (msgInput) {
    msgInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        enviarChat();
      }
    });
  }
});

/* --------------------------------------------------
   CARREGAR JOGADOR
-------------------------------------------------- */
async function loadPlayer() {
  if (loadingPlayer) return;

  const tagInput = document.getElementById("tag");
  const out = document.getElementById("player-output");
  if (!tagInput || !out) return;

  const tag = tagInput.value.trim().toUpperCase();
  if (!tag) {
    alert("Digite uma TAG válida.");
    return;
  }

  loadingPlayer = true;
  contextoEnviado = false;
  cachedPlayer = null;

  out.innerHTML = "<p>Carregando dados...</p>";

  try {
    const res = await fetch(`${API_URL}/player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      out.innerHTML = `
        <div class="player-info-top">
          <div class="tag-input-row inside-box">
            <input id="tag" type="text" placeholder="Digite sua TAG (#ABC123)" value="${tag}" />
            <button id="btn-load-player" onclick="loadPlayer()">Carregar</button>
          </div>
          <p class="hint"><b>Erro:</b> ${data.error || "Falha ao carregar o jogador."}</p>
        </div>
      `;
      cachedPlayer = null;
      return;
    }

    cachedPlayer = data;

    const nome = data.name || "Desconhecido";
    const king = data.kingLevel ?? "?";
    const trophies = data.trophies ?? "?";
    const arena = data.arena?.name || "Arena desconhecida";

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

    // Renderizar TODAS as cartas dentro do bloco scrollável
    for (const c of data.cards || []) {
      const url = (c.iconUrls && (c.iconUrls.medium || c.iconUrls.small)) || "";
      let level = c.levelUi ?? c.level ?? 0;

      // Normaliza o nível para o novo sistema (máx = 15)
      if (level > 15) level = 15;
      if (level <= 0) level = 1;

      // Define rótulo de status
      let status = "";
      if (level === 15) status = " (Elite)";
      else if (level >= 14) status = " (Máx)";
      else if (level >= 13) status = " (Excelente)";
      else if (level >= 12) status = " (Bom)";
      else if (level >= 10) status = " (Ok)";
      else status = " (Fraco)";

      html += `
        <div class="card">
          <img src="${url}" alt="${c.name || "Carta"}">
          <span>${c.name || "Carta"} — Nv ${level}${status}</span>
        </div>
      `;
    }


    html += `
          </div>
        </div>
      </div>
    `;

    out.innerHTML = html;
  } catch (e) {
    console.error("Erro em loadPlayer:", e);
    out.innerHTML = `
      <div class="player-info-top">
        <div class="tag-input-row inside-box">
          <input id="tag" type="text" placeholder="Digite sua TAG (#ABC123)" value="${tag}" />
          <button id="btn-load-player" onclick="loadPlayer()">Carregar</button>
        </div>
        <p class="hint"><b>Erro:</b> Não foi possível carregar o jogador.</p>
      </div>
    `;
    cachedPlayer = null;
  } finally {
    loadingPlayer = false;
  }
}

/* --------------------------------------------------
   CHAT — UI
-------------------------------------------------- */
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

/* --------------------------------------------------
   CHAT — ENVIAR MENSAGEM
-------------------------------------------------- */
async function enviarChat() {
  const input = document.getElementById("msg");
  if (!input) return;

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

  // PRIMEIRA MENSAGEM: manda contexto completo
  if (!contextoEnviado) {
    payload = {
      mensagem: msg,
      contexto: {
        player: cachedPlayer,
        cards: cachedAllCards,
      },
    };
    contextoEnviado = true;
  } else {
    // MENSAGENS SEGUINTES: só o texto
    payload = { mensagem: msg };
  }

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    const chatDiv = document.getElementById("chat");
    if (chatDiv) {
      const iaMessages = chatDiv.querySelectorAll(".chat-message.ia");
      const lastIa = iaMessages[iaMessages.length - 1];
      if (lastIa && lastIa.textContent.includes("Pensando")) {
        lastIa.remove();
      }
    }

    if (!res.ok || data.error) {
      addChatMessage("ia", data.error || "Erro ao responder.");
      return;
    }

    addChatMessage("ia", data.resposta);
  } catch (err) {
    console.error("Erro no enviarChat:", err);
    const chatDiv = document.getElementById("chat");
    if (chatDiv) {
      const iaMessages = chatDiv.querySelectorAll(".chat-message.ia");
      const lastIa = iaMessages[iaMessages.length - 1];
      if (lastIa && lastIa.textContent.includes("Pensando")) {
        lastIa.remove();
      }
    }
    addChatMessage("ia", "Erro ao enviar mensagem.");
  }
}

/* --------------------------------------------------
   LIMPAR CACHE AO FECHAR/RECARREGAR A PÁGINA
-------------------------------------------------- */
window.addEventListener("beforeunload", () => {
  cachedPlayer = null;
  cachedAllCards = null;
  contextoEnviado = false;
});
