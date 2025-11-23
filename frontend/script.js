// URL DO BACKEND
const API_URL = "https://clash-royale-ia.onrender.com";

let cachedPlayer = null;
let cachedAllCards = null;
let loadingPlayer = false;
let loadingCards = false;
let contextoEnviado = false;


// ------------------------------------------------------------
// Pré-carregar lista de cartas
// ------------------------------------------------------------
async function preloadAllCards() {
  if (loadingCards || cachedAllCards) return;
  loadingCards = true;

  try {
    const res = await fetch(`${API_URL}/cards`);
    if (!res.ok) return;

    const data = await res.json();
    cachedAllCards = data;
  } catch (e) {
    console.warn("Falha ao carregar cartas:", e);
  } finally {
    loadingCards = false;
  }
}

window.addEventListener("load", () => {
  preloadAllCards();
});


// ------------------------------------------------------------
// Carregar jogador
// ------------------------------------------------------------
async function loadPlayer() {
  if (loadingPlayer) return;

  const tag = document.getElementById("tag").value.trim().toUpperCase();
  const out = document.getElementById("player-output");

  if (!tag) {
    alert("Digite uma TAG válida.");
    return;
  }

  loadingPlayer = true;
  out.innerHTML = "<p>Carregando dados...</p>";
  contextoEnviado = false;

  try {
    const res = await fetch(`${API_URL}/player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag })
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      out.innerHTML = `<p><b>Erro:</b> ${data.error || "Falha ao carregar"}</p>`;
      return;
    }

    cachedPlayer = data;

    const nome = data.name;
    const king = data.kingLevel;
    const trofeus = data.trophies;
    const arena = data.arena?.name;

    let html = `
      <div class="player-info-box">
          <p><span class="section-title">Nome:</span> ${nome}</p>
          <p><span class="section-title">Rei:</span> ${king}</p>
          <p><span class="section-title">Troféus:</span> ${trofeus}</p>
          <p><span class="section-title">Arena:</span> ${arena}</p>
      </div>

      <div class="player-info-box">
          <p class="section-title">Cartas</p>
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
    `;

    out.innerHTML = html;

  } catch (e) {
    out.innerHTML = "<p>Erro ao carregar jogador.</p>";
  } finally {
    loadingPlayer = false;
  }
}


// ------------------------------------------------------------
// Chat
// ------------------------------------------------------------
function addChatMessage(role, text) {
  const chat = document.getElementById("chat");

  const wrapper = document.createElement("div");
  wrapper.className = `chat-message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chat.appendChild(wrapper);

  chat.scrollTop = chat.scrollHeight;
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

  if (!contextoEnviado) {
    payload = {
      mensagem: msg,
      contexto: { player: cachedPlayer, cards: cachedAllCards }
    };
    contextoEnviado = true;
  } else {
    payload = { mensagem: msg };
  }

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    const chat = document.getElementById("chat");
    const iaMsgs = chat.querySelectorAll(".chat-message.ia");
    const lastIa = iaMsgs[iaMsgs.length - 1];
    if (lastIa.textContent === "Pensando...") lastIa.remove();

    addChatMessage("ia", data.resposta);

  } catch (e) {
    addChatMessage("ia", "Erro ao enviar.");
  }
}
