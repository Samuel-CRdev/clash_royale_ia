// USE SEU BACKEND LOCAL ENQUANTO ESTÁ TESTANDO
const backend = "http://127.0.0.1:10000";

async function loadPlayer() {
    const tag = document.getElementById("tag").value.trim();

    if (!tag) {
        alert("Digite uma TAG válida.");
        return;
    }

    const res = await fetch(`${backend}/player`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({tag})
    });

    const data = await res.json();
    document.getElementById("player-output").innerText =
        JSON.stringify(data, null, 2);
}

async function enviarChat() {
    const msg = document.getElementById("msg").value.trim();

    if (!msg) return;

    const res = await fetch(`${backend}/chat`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({mensagem: msg})
    });

    const data = await res.json();

    const chatDiv = document.getElementById("chat");
    chatDiv.innerHTML += `<p><b>Você:</b> ${msg}</p>`;
    chatDiv.innerHTML += `<p><b>IA:</b> ${data.resposta}</p>`;

    chatDiv.scrollTop = chatDiv.scrollHeight;

    document.getElementById("msg").value = "";
}
