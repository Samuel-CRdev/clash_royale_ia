// URL DO BACKEND NO RENDER
const API_URL = "https://clash-royale-ia.onrender.com";

let cachedPlayer = null;
let cachedAllCards = null;

// ----------------------------
// Pré-carregar todas as cartas do jogo
// ----------------------------
async function preloadAllCards() {
  try {
    const res = await fetch(`${API_URL}/cards`);
    if (!res.ok) {
      console.warn("Falha ao carregar /cards:", res.status);
      return;
    }
    const data = await res.json();
    cachedAllCards = data;
    console.log(
      "Cartas do jogo carregadas:",
      Array.isArray(data) ? data.length : "formato inesperado"
    );
  } catch (e) {
    console.warn(
      "Não consegui pré-carregar as cartas do jogo. O chat ainda funciona, só fica um pouco menos preciso.",
      e
    );
  }
}

window.addEventListener("load", preloadAllCards);

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

    if (!res.ok || data.error) {
      out.innerHTML = `<p><b>Erro:</b> ${
        data.error || "Falha ao carregar jogador."
      }</p>`;
      return;
    }

    // Guarda o jogador em memória para o chat
    cachedPlayer = data;

    const nome = data.name || "Desconhecido";
    const nivelRei = data.kingLevel ?? data.expLevel ?? "??";
    const trofeus = data.trophies ?? "?";
    const clan = data.clan ? data.clan.name : "Sem clã";
    const arenaNome = data.arena ? data.arena.name : "Desconhecida";

    let html = `
      <p><b>Nome:</b> ${nome}</p>
      <p><b>Nível do Rei (conta):</b> ${nivelRei}</p>
      <p><b>Troféus:</b> ${trofeus}</p>
      <p><b>Clã:</b> ${clan}</p>
      <p><b>Arena:</b> ${arenaNome}</p>
      <hr>
      <p><b>Cartas do jogador:</b></p>
    `;

    if (Array.isArray(data.cards) && data.cards.length > 0) {
      html += "<ul>";
      for (const c of data.cards) {
        const nomeCarta = c.name || "Carta desconhecida";
        const nivelUi = c.levelUi ?? c.level ?? "?";
        html += `<li>${nomeCarta} — nível: ${nivelUi}</li>`;
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
async function sendChat() {
  const msgInput = document.getElementById("msg");
  const msg = msgInput.value.trim();

  if (!msg) return;

  if (!cachedPlayer) {
    alert("Carregue um jogador antes de falar com a IA.");
    return;
  }

  const payload = {
    mensagem: msg,
    contexto: {
      player: cachedPlayer,
      cards: cachedAllCards
    }
  };

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
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
    chatDiv.innerHTML += `<p><b>IA:</b> ${
      data.resposta || "(sem resposta do servidor)"
    }</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    msgInput.value = "";
  } catch (e) {
    console.error(e);
    alert("Erro ao enviar mensagem.");
  }
}
