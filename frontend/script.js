// URL DO BACKEND NO RENDER
const API_URL = "https://clash-royale-ia.onrender.com";

let cachedPlayer = null;
let cachedAllCards = null;
let contextoEnviado = false;
let loadingPlayer = false;
let loadingCards = false;

// Array com as cartas normalizadas, usado para filtros
let normalizedCards = [];

// --------------------------------------------------
// PRÉ-CARREGAR TODAS AS CARTAS
// --------------------------------------------------
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

// --------------------------------------------------
// AO CARREGAR A PÁGINA
// --------------------------------------------------
window.addEventListener("load", () => {
  preloadAllCards();

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

// --------------------------------------------------
// FUNÇÃO: CARREGAR JOGADOR
// --------------------------------------------------
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
  normalizedCards = [];

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

    // --------------------------------------------------
    // Normalizar todas as cartas para o modelo atual
    // --------------------------------------------------
    const cardsNorm = [];

    for (const c of data.cards || []) {
      const url =
        (c.iconUrls && (c.iconUrls.medium || c.iconUrls.small)) || "";

      let levelApi = Number(c.level ?? c.levelUi ?? 0);
      let maxLevelApi = Number(c.maxLevel ?? 14);

      if (!Number.isFinite(levelApi) || levelApi <= 0) levelApi = 1;
      if (!Number.isFinite(maxLevelApi) || maxLevelApi <= 0) {
        maxLevelApi = 14;
      }

      // Fórmula geral: UI = levelApi + (14 - maxLevelApi)
      let levelUi = levelApi + (14 - maxLevelApi);

      if (levelUi < 1) levelUi = 1;
      if (levelUi > 15) levelUi = 15;

      const evolutionLevel = Number(c.evolutionLevel ?? 0);
      let evolutionTag = "";
      if (Number.isFinite(evolutionLevel) && evolutionLevel > 0) {
        evolutionTag = ` • Evo ${evolutionLevel}`;
      }

      let status;
      if (levelUi === 15) status = "Elite";
      else if (levelUi === 14) status = "Máx";
      else if (levelUi >= 13) status = "Excelente";
      else if (levelUi >= 12) status = "Bom";
      else if (levelUi >= 10) status = "Ok";
      else status = "Fraco";

      let rarityRaw = c.rarity || "Unknown";
      let elixirCost = c.elixirCost ?? null;

      if (Array.isArray(cachedAllCards)) {
        const full = cachedAllCards.find(
          (fc) => fc.id === c.id || fc.name === c.name
        );
        if (full) {
          rarityRaw = full.rarity || rarityRaw;
          if (full.elixirCost != null) {
            elixirCost = full.elixirCost;
          }
        }
      }

      const rarity = String(rarityRaw).toLowerCase();

      c.levelUi = levelUi;
      c.levelStatus = status;
      c.evolutionUi = evolutionLevel;
      c.rarityUi = rarityRaw;
      c.elixirUi = elixirCost;

      cardsNorm.push({
        name: c.name || "Carta",
        iconUrl: url,
        levelUi,
        status,
        rarity,
        rarityLabel: rarityRaw,
        elixirCost: Number.isFinite(elixirCost) ? elixirCost : null,
        evolutionLevel,
        evolutionTag,
      });
    }

    normalizedCards = cardsNorm;

    // --------------------------------------------------
    // Montar HTML do painel (sem ainda preencher as cartas)
    // --------------------------------------------------
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
        <div class="cards-header-row">
          <p class="section-title">Cartas</p>
          <div class="cards-filters">
            <select id="filter-rarity">
              <option value="all">Todas</option>
              <option value="common">Comuns</option>
              <option value="rare">Raras</option>
              <option value="epic">Épicas</option>
              <option value="legendary">Lendárias</option>
              <option value="champion">Campeões</option>
            </select>
            <select id="filter-sort">
              <option value="level_desc">Nível ↓</option>
              <option value="level_asc">Nível ↑</option>
              <option value="elixir_asc">Elixir ↑</option>
              <option value="elixir_desc">Elixir ↓</option>
            </select>
          </div>
        </div>

        <div class="cards-scroll-box">
          <div class="card-grid" id="card-grid"></div>
        </div>
      </div>
    `;

    out.innerHTML = html;

    setupCardFilters();
    renderCardsGrid();
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

// --------------------------------------------------
// FILTROS DAS CARTAS
// --------------------------------------------------
function setupCardFilters() {
  const raritySel = document.getElementById("filter-rarity");
  const sortSel = document.getElementById("filter-sort");

  if (raritySel) {
    raritySel.addEventListener("change", renderCardsGrid);
  }
  if (sortSel) {
    sortSel.addEventListener("change", renderCardsGrid);
  }
}

function renderCardsGrid() {
  const grid = document.getElementById("card-grid");
  if (!grid) return;

  let cards = [...normalizedCards];

  const raritySel = document.getElementById("filter-rarity");
  const sortSel = document.getElementById("filter-sort");

  const rarityValue = (raritySel?.value || "all").toLowerCase();
  const sortValue = sortSel?.value || "level_desc";

  if (rarityValue !== "all") {
    cards = cards.filter(
      (c) => c.rarity && c.rarity.toLowerCase() === rarityValue
    );
  }

  cards.sort((a, b) => {
    switch (sortValue) {
      case "level_asc":
        return a.levelUi - b.levelUi;
      case "level_desc":
        return b.levelUi - a.levelUi;
      case "elixir_asc": {
        const ea = a.elixirCost ?? 99;
        const eb = b.elixirCost ?? 99;
        return ea - eb;
      }
      case "elixir_desc": {
        const ea = a.elixirCost ?? -1;
        const eb = b.elixirCost ?? -1;
        return eb - ea;
      }
      default:
        return 0;
    }
  });

  grid.innerHTML = cards
    .map((card) => {
      const elixirTag =
        card.elixirCost != null ? ` • ${card.elixirCost}⚡` : "";
      const evoTag = card.evolutionTag || "";
      return `
        <div class="card">
          <div class="card-top">
            <img src="${card.iconUrl}" alt="${card.name}">
            <div class="card-name">${card.name}</div>
          </div>
          <div class="card-bottom">
            <span>Nv ${card.levelUi} (${card.status})${evoTag}${elixirTag}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

// --------------------------------------------------
// CHAT — UI
// --------------------------------------------------
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

// --------------------------------------------------
// CHAT — ENVIAR MENSAGEM
// --------------------------------------------------
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

// --------------------------------------------------
// LIMPAR CACHE AO FECHAR/RECARREGAR A PÁGINA
// --------------------------------------------------
window.addEventListener("beforeunload", () => {
  cachedPlayer = null;
  cachedAllCards = null;
  contextoEnviado = false;
  normalizedCards = [];
});
