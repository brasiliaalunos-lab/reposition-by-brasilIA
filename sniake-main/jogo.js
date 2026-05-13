/* ======================================================
   🐍 Jogo da Cobra Neon Retrô (com música)
   ====================================================== */

const canvas = document.getElementById("jogo");
const ctx = canvas.getContext("2d");

const inputBg = document.getElementById("input-bg");
const btnIniciar = document.getElementById("btn-iniciar");
const overlay = document.getElementById("overlay");
const mensagemEl = document.getElementById("mensagem");
const resultadoEl = document.getElementById("resultado");
const btnPlayAgain = document.getElementById("btn-play-again");
const scoreEl = document.getElementById("score");
const fpsEl = document.getElementById("fps");
const recordeEl = document.getElementById("recorde");
const btnModo = document.getElementById("btn-modo");

// NOVOS ELEMENTOS
const inputMusica = document.getElementById("input-musica");
const playerMusica = document.getElementById("player-musica");
const volumeMusica = document.getElementById("volume-musica");


const CONFIG = {
    tamanhoCelula: 32,
    fpsInicial: 8,
    aumentoVelocidade: 0.5,
    corComida: "#00ffe7",
    corFundo: "#020617"
};

let estado = {
    cols: 0,
    rows: 0,
    tamanho: CONFIG.tamanhoCelula,
    fps: CONFIG.fpsInicial,
    pontuacao: 0,
    recorde: parseInt(localStorage.getItem("recordeCobra") || "0"),
    jogoAtivo: false,
    intervalo: null,
    imagemCobra: new Image(),
    imagemFundo: null,
    brilho: 0
};

estado.imagemCobra.src =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB8ElEQVR4Ae2W0XGDMAyFZ2D8v3MkmZ+8qvZwKzGhETgfKcw0NTZ48zvLK+xIs5hBCElb3v8wogc8MbpD7wFGTnMwb8qA/Bz8pDF2CBfx+KAz9gAHGmKk2EM4wn0t3QfYoR/YfEIIAUpzMIYAzACgDM3XcK1AmqDVbYYtElXzO0GJpvlDaA4xv9BAOg4AD7Osmq8AObQec7yA+0+uA+A9cM4uAXUfK0h0MCx9jToAwUQgI0R3hJgFD1SGpAh8IghX2MCmx4JtTtBiYMYxoiT/BYfNE53+3q3ZHYMiLlfRIFfQFwUgToAIdA9xPWh41zLK+iLx3pmlXU+4tkNQDqsXcFQ6GApmryVZTj+AqEsyFxtJ9f7Wb8fIv/3P0yk0AMmD9K6dTEkOrECqvTLcfFXhsyKiMJED8t3sLPRs1n3Sjo9vZr5mMNmf47Gq9xCJ+LKJkMIy++G3MCgB6PYiug0nAos88gsX37wEyqA+K6APM7f4MwoKHtchQSTeCyn2I89UybNB7uULSWUoDCmWoDR7Qj9/zwBD0C7B37IkFgUAAAAASUVORK5CYII=";

const audioCtx = new(window.AudioContext || window.webkitAudioContext)();

function somCurto(freq = 880, dur = 0.08, tipo = "triangle") {
    if (audioCtx.state === "suspended") return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = tipo;
    o.frequency.value = freq;
    g.gain.value = 0.15;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur + 0.02);
}

function somFim() {
    if (audioCtx.state === "suspended") return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(400, now);
    o.frequency.linearRampToValueAtTime(100, now + 0.6);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 0.8);
}

function ajustarCanvas() {
    canvas.width = Math.max(320, Math.floor(window.innerWidth * 0.7));
    canvas.height = Math.max(240, Math.floor(window.innerHeight - 180));
    estado.tamanho = Math.max(16, Math.floor(Math.min(canvas.width, canvas.height) / 20));
    estado.cols = Math.floor(canvas.width / estado.tamanho);
    estado.rows = Math.floor(canvas.height / estado.tamanho);
}

let cobra = { direcao: null, corpo: [] };
let comida = { x: 0, y: 0 };

function iniciarJogo() {
    ajustarCanvas();
    estado.pontuacao = 0;
    estado.fps = CONFIG.fpsInicial;
    cobra.direcao = "right";
    cobra.corpo = [];
    const cx = Math.floor(estado.cols / 2);
    const cy = Math.floor(estado.rows / 2);

    for (let i = 0; i < 5; i++) {
        cobra.corpo.unshift({ x: cx - i, y: cy });
    }

    gerarComida();
    estado.jogoAtivo = true;
    overlay.classList.add("hidden");
    atualizarPlacar();
    clearInterval(estado.intervalo);
    estado.intervalo = setInterval(loop, 1000 / estado.fps);

    // ADICIONADO: Garante que a música toque se já estiver carregada
    if (playerMusica.src) {
        playerMusica.play();
    }
}

function gerarComida() {
    comida.x = Math.floor(Math.random() * estado.cols);
    comida.y = Math.floor(Math.random() * estado.rows);
    if (cobra.corpo.some(s => s.x === comida.x && s.y === comida.y)) {
        gerarComida();
    }
}

function desenhar() {
    if (estado.imagemFundo) {
        ctx.drawImage(estado.imagemFundo, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = CONFIG.corFundo;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (estado.brilho > 0) {
        ctx.fillStyle = `rgba(0,255,200,${estado.brilho})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        estado.brilho -= 0.02;
    }

    const fx = comida.x * estado.tamanho + estado.tamanho / 2;
    const fy = comida.y * estado.tamanho + estado.tamanho / 2;
    ctx.fillStyle = CONFIG.corComida;
    ctx.shadowColor = CONFIG.corComida;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(fx, fy, estado.tamanho * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    for (let i = 0; i < cobra.corpo.length; i++) {
        const seg = cobra.corpo[i];
        const x = seg.x * estado.tamanho;
        const y = seg.y * estado.tamanho;
        if (i === cobra.corpo.length - 1) {
            ctx.drawImage(estado.imagemCobra, x, y, estado.tamanho, estado.tamanho);
        } else {
            ctx.fillStyle = "rgba(0,200,255,0.9)";
            ctx.fillRect(x + 2, y + 2, estado.tamanho - 4, estado.tamanho - 4);
        }
    }
}


function atualizarLogica() {
    if (!estado.jogoAtivo || !cobra.direcao) return;

    const head = cobra.corpo[cobra.corpo.length - 1];
    let nx = head.x, ny = head.y;

    if (cobra.direcao === "left") nx--;
    if (cobra.direcao === "right") nx++;
    if (cobra.direcao === "up") ny--;
    if (cobra.direcao === "down") ny++;

    if (nx < 0) nx = estado.cols - 1;
    if (nx >= estado.cols) nx = 0;
    if (ny < 0) ny = estado.rows - 1;
    if (ny >= estado.rows) ny = 0;
    
    if (cobra.corpo.some(s => s.x === nx && s.y === ny)) {
        return fimDeJogo();
    }

    const novaCabeca = { x: nx, y: ny };
    cobra.corpo.push(novaCabeca); 

    if (nx === comida.x && ny === comida.y) {
        estado.pontuacao++;
        somCurto(1000, 0.06);
        estado.brilho = 0.4;
        gerarComida();
        atualizarPlacar();
        if (estado.pontuacao % 5 === 0) {
            estado.fps = Math.min(60, estado.fps + CONFIG.aumentoVelocidade);
            clearInterval(estado.intervalo);
            estado.intervalo = setInterval(loop, 1000 / estado.fps);
        }
    } else {
        cobra.corpo.shift(); 
    }
}

function atualizarPlacar() {
    scoreEl.textContent = estado.pontuacao;
    fpsEl.textContent = Math.floor(estado.fps);
    recordeEl.textContent = estado.recorde;
}

function loop() {
    atualizarLogica();
    desenhar();
}

function fimDeJogo() {
    // ADICIONADO: Pausa a música ao dar Game Over
    playerMusica.pause();

    estado.jogoAtivo = false;
    clearInterval(estado.intervalo);
    somFim();
    if (estado.pontuacao > estado.recorde) {
        estado.recorde = estado.pontuacao;
        localStorage.setItem("recordeCobra", estado.recorde);
        recordeEl.style.textShadow = "0 0 25px #00ffe7";
    }
    mensagemEl.textContent = "GAME OVER";
    resultadoEl.textContent = `Score: ${estado.pontuacao} | Recorde: ${estado.recorde}`;
    overlay.classList.remove("hidden");
}

const teclas = { 37: "left", 65: "left", 39: "right", 68: "right", 38: "up", 87: "up", 40: "down", 83: "down" };

function inversaDe(dir) {
    if (dir === "left") return "right";
    if (dir === "right") return "left";
    if (dir === "up") return "down";
    if (dir === "down") return "up";
    return null;
}

window.addEventListener("keydown", e => {
    if (!estado.jogoAtivo) return;
    const nova = teclas[e.keyCode];
    if (!nova) return;
    const inversa = inversaDe(cobra.direcao);
    if (nova === inversa) return;
    cobra.direcao = nova;
});

inputBg.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
        const img = new Image();
        img.onload = () => {
            estado.imagemFundo = img;
            if (!estado.jogoAtivo) desenhar();
        };
        img.src = fr.result;
    };
    fr.readAsDataURL(f);
});

btnIniciar.onclick = () => {
    if (audioCtx.state === "suspended") audioCtx.resume();
    iniciarJogo();
};

btnPlayAgain.onclick = () => iniciarJogo();
btnModo.onclick = () => document.body.classList.toggle("claro");

window.addEventListener("resize", () => {
    ajustarCanvas();
    if (!estado.jogoAtivo) desenhar();
});

(function inicio() {
    ajustarCanvas();
    mensagemEl.textContent = "PRESSIONE INICIAR";
    resultadoEl.textContent = "";
    desenhar();
    recordeEl.textContent = estado.recorde;
})();


/* --- Lógica da Música de Fundo --- */
inputMusica.addEventListener("change", (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const urlMusica = URL.createObjectURL(arquivo);
    playerMusica.src = urlMusica;
    playerMusica.volume = volumeMusica.value / 100;
    playerMusica.play();
});

volumeMusica.addEventListener("input", (e) => {
    playerMusica.volume = e.target.value / 100;
});