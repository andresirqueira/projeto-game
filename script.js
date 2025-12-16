const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Detecção de dispositivo mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || (window.innerWidth <= 768 && window.innerHeight <= 1024);
let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Controles touch para mobile
let touchControls = {
    up: false,
    down: false,
    left: false,
    right: false,
    active: false
};

// Configurar canvas responsivo
function resizeCanvas() {
    if (!canvas) return;
    
    const maxWidth = Math.min(window.innerWidth - 20, 800);
    const maxHeight = Math.min(window.innerHeight - 250, 500);
    const aspectRatio = 800 / 500;
    
    let newWidth, newHeight;
    
    if (maxWidth / maxHeight > aspectRatio) {
        newHeight = maxHeight;
        newWidth = newHeight * aspectRatio;
    } else {
        newWidth = maxWidth;
        newHeight = newWidth / aspectRatio;
    }
    
    // Manter proporção mínima
    if (newWidth < 320) {
        newWidth = 320;
        newHeight = 200;
    }
    
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';
}

// Inicializar controles mobile
function initMobileControls() {
    if (!isMobile && !isTouchDevice) return;
    
    const mobileControls = document.getElementById('mobileControls');
    if (!mobileControls) return;
    
    // Mostrar controles mobile
    mobileControls.style.display = 'flex';
    
    // Botões de direção
    const btnUp = document.getElementById('btnUp');
    const btnDown = document.getElementById('btnDown');
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    
    // Função para ativar controle
    const activateControl = (direction) => {
        touchControls[direction] = true;
        touchControls.active = true;
    };
    
    // Função para desativar controle
    const deactivateControl = (direction) => {
        touchControls[direction] = false;
        // Verificar se ainda há algum controle ativo
        if (!touchControls.up && !touchControls.down && 
            !touchControls.left && !touchControls.right) {
            touchControls.active = false;
        }
    };
    
    // Eventos para cada botão
    if (btnUp) {
        btnUp.addEventListener('touchstart', (e) => {
            e.preventDefault();
            activateControl('up');
        });
        btnUp.addEventListener('touchend', (e) => {
            e.preventDefault();
            deactivateControl('up');
        });
        btnUp.addEventListener('mousedown', () => activateControl('up'));
        btnUp.addEventListener('mouseup', () => deactivateControl('up'));
        btnUp.addEventListener('mouseleave', () => deactivateControl('up'));
    }
    
    if (btnDown) {
        btnDown.addEventListener('touchstart', (e) => {
            e.preventDefault();
            activateControl('down');
        });
        btnDown.addEventListener('touchend', (e) => {
            e.preventDefault();
            deactivateControl('down');
        });
        btnDown.addEventListener('mousedown', () => activateControl('down'));
        btnDown.addEventListener('mouseup', () => deactivateControl('down'));
        btnDown.addEventListener('mouseleave', () => deactivateControl('down'));
    }
    
    if (btnLeft) {
        btnLeft.addEventListener('touchstart', (e) => {
            e.preventDefault();
            activateControl('left');
        });
        btnLeft.addEventListener('touchend', (e) => {
            e.preventDefault();
            deactivateControl('left');
        });
        btnLeft.addEventListener('mousedown', () => activateControl('left'));
        btnLeft.addEventListener('mouseup', () => deactivateControl('left'));
        btnLeft.addEventListener('mouseleave', () => deactivateControl('left'));
    }
    
    if (btnRight) {
        btnRight.addEventListener('touchstart', (e) => {
            e.preventDefault();
            activateControl('right');
        });
        btnRight.addEventListener('touchend', (e) => {
            e.preventDefault();
            deactivateControl('right');
        });
        btnRight.addEventListener('mousedown', () => activateControl('right'));
        btnRight.addEventListener('mouseup', () => deactivateControl('right'));
        btnRight.addEventListener('mouseleave', () => deactivateControl('right'));
    }
}

// Estado do jogo
let gameRunning = false;
let gameStarted = false;
let timeLeft = 60;
let playerScore = 0;
let cpuScore = 0;

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        resizeCanvas();
        initMobileControls();
        window.addEventListener('resize', resizeCanvas);
    });
} else {
    resizeCanvas();
    initMobileControls();
    window.addEventListener('resize', resizeCanvas);
}

// ========== SISTEMA DE ÁUDIO ==========
const sounds = {
    countdown: new Audio('sounds/countdown.mp3'),
    // Adicione mais sons aqui conforme baixar:
    eat: new Audio('sounds/eat.mp3'),
    stunLoaded: new Audio('sounds/stun-carregado.mp3'),
    stun: new Audio('sounds/stun.mp3'),
    win: new Audio('sounds/win.mp3'),
    bossWin: new Audio('sounds/boss-win.mp3'), // Música de vitória do boss
    lose: new Audio('sounds/lose.mp3'),
    yummy: new Audio('sounds/yummy.mp3'),
    worm: new Audio('sounds/worm.mp3'),
    hawk: new Audio('sounds/hawk.mp3'),
    powerup: new Audio('sounds/powerup.mp3'),
    introSound: new Audio('sounds/Intro-sound.mp3'),
    owl: new Audio('sounds/owl-sound.mp3'), // Som da coruja boss
};

// Volume geral (0 a 1)
let masterVolume = 0.5;

// Configurar volumes
Object.values(sounds).forEach(sound => {
    if (sound) sound.volume = masterVolume;
});

// Configurar música de introdução para loop e preload
if (sounds.introSound) {
    sounds.introSound.loop = true;
    sounds.introSound.volume = masterVolume * 0.6; // Música de fundo um pouco mais baixa
    sounds.introSound.preload = 'auto'; // Garantir pré-carregamento
    
    // Adicionar tratamento de erro para carregamento
    sounds.introSound.addEventListener('error', function(e) {
        console.error('Erro ao carregar música de introdução:', e);
        console.error('Caminho tentado:', sounds.introSound.src);
    });
    
    // Tentar carregar o arquivo explicitamente
    sounds.introSound.load();
}

// Configurar som de vitória do boss (efeito sonoro, não música)
if (sounds.bossWin) {
    // NÃO configurar loop - é efeito sonoro, não música
    sounds.bossWin.volume = masterVolume; // Volume normal de efeito sonoro
    sounds.bossWin.preload = 'auto';
    
    // Adicionar listeners para debug
    sounds.bossWin.addEventListener('loadeddata', () => {
        console.log('✅ boss-win.mp3 carregado com sucesso');
    });
    sounds.bossWin.addEventListener('canplaythrough', () => {
        console.log('✅ boss-win.mp3 pronto para tocar');
    });
    sounds.bossWin.addEventListener('error', (e) => {
        console.error('❌ Erro ao carregar boss-win.mp3');
        console.error('Verifique se o arquivo existe em: sounds/boss-win.mp3');
    });
}

// Controles de áudio
let musicMuted = false;
let sfxMuted = false;

// Carregar preferências salvas
const savedMusicMuted = localStorage.getItem('musicMuted');
const savedSfxMuted = localStorage.getItem('sfxMuted');
if (savedMusicMuted !== null) musicMuted = savedMusicMuted === 'true';
if (savedSfxMuted !== null) sfxMuted = savedSfxMuted === 'true';

// Aplicar estado inicial dos botões
function updateAudioButtons() {
    const musicBtn = document.getElementById('musicBtn');
    const musicBtnGame = document.getElementById('musicBtnGame');
    const sfxBtn = document.getElementById('sfxBtn');
    const sfxBtnGame = document.getElementById('sfxBtnGame');
    
    if (musicBtn) {
        musicBtn.textContent = musicMuted ? '🔇' : '🎵';
        musicBtn.classList.toggle('muted', musicMuted);
    }
    if (musicBtnGame) {
        musicBtnGame.textContent = musicMuted ? '🔇' : '🎵';
        musicBtnGame.classList.toggle('muted', musicMuted);
    }
    if (sfxBtn) {
        sfxBtn.textContent = sfxMuted ? '🔇' : '🔊';
        sfxBtn.classList.toggle('muted', sfxMuted);
    }
    if (sfxBtnGame) {
        sfxBtnGame.textContent = sfxMuted ? '🔇' : '🔊';
        sfxBtnGame.classList.toggle('muted', sfxMuted);
    }
    
    // Aplicar mute na música
    if (sounds.introSound) {
        if (musicMuted) {
            sounds.introSound.pause();
        } else {
            playIntroMusic();
        }
    }
}

// Função para mutar/desmutar música
function toggleMusic() {
    musicMuted = !musicMuted;
    localStorage.setItem('musicMuted', musicMuted);
    updateAudioButtons();
    
    // Controlar som de vitória do boss se estiver tocando (efeito sonoro)
    if (sounds.bossWin) {
        if (sfxMuted) {
            // Se efeitos sonoros estão mutados, pausar
            sounds.bossWin.pause();
        } else if (sounds.bossWin.paused && document.getElementById('gameOver').style.display === 'block' && currentSubstage === 7) {
            // Se estiver na tela de vitória do boss e efeitos não estiverem mutados, tocar
            sounds.bossWin.play().catch(e => {
                console.log('Erro ao tocar boss-win:', e);
            });
        }
    }
}

// Função para mutar/desmutar efeitos sonoros
function toggleSFX() {
    sfxMuted = !sfxMuted;
    localStorage.setItem('sfxMuted', sfxMuted);
    updateAudioButtons();
}

// Função para tocar música de introdução
function playIntroMusic() {
    if (sounds.introSound && !musicMuted) {
        // Verificar se o menu está visível
        const menuOverlay = document.getElementById('menuOverlay');
        if (menuOverlay && menuOverlay.style.display !== 'none') {
            // Se a música já está tocando, não fazer nada
            if (!sounds.introSound.paused) {
                return;
            }
            
            sounds.introSound.currentTime = 0;
            sounds.introSound.play().catch(e => {
                // Se falhar, tentar novamente após interação do usuário
                console.log('Erro ao tocar música de introdução:', e);
                const tryPlayAgain = function() {
                    if (sounds.introSound && sounds.introSound.paused) {
                        sounds.introSound.play().catch(() => {});
                    }
                    document.removeEventListener('click', tryPlayAgain);
                    document.removeEventListener('keydown', tryPlayAgain);
                    document.removeEventListener('touchstart', tryPlayAgain);
                };
                document.addEventListener('click', tryPlayAgain, { once: true });
                document.addEventListener('keydown', tryPlayAgain, { once: true });
                document.addEventListener('touchstart', tryPlayAgain, { once: true });
            });
        }
    }
}

// Função para tocar som
function playSound(soundName, volumeMultiplier = 1) {
    // Não tocar se efeitos sonoros estiverem mutados (exceto música de introdução)
    if (sfxMuted && soundName !== 'introSound') {
        return;
    }
    
    const sound = sounds[soundName];
    if (sound) {
        sound.currentTime = 0; // Reinicia o som
        sound.volume = masterVolume * volumeMultiplier;
        sound.play().catch(e => {
            // Ignora erros de autoplay (navegadores bloqueiam)
            console.log('Áudio bloqueado pelo navegador');
        });
    }
}

// Função para parar som
function stopSound(soundName) {
    const sound = sounds[soundName];
    if (sound) {
        sound.pause();
        sound.currentTime = 0;
    }
}

// Jogador
const player = {
    x: 100,
    y: canvas.height / 2,
    size: 35,
    speed: 3, // Velocidade base
    baseSpeed: 3,
    boostedSpeed: 5,
    color: '#2ecc71',
    dx: 0,
    dy: 0,
    stunCharge: 0, // Comidas coletadas para o stun
    stunChargeMax: 20, // Precisa comer 20 para stunnar
    stunChargeTimer: 0, // Tempo restante para usar o stun (5 segundos = 300 frames)
    speedBoost: 0, // Tempo restante do boost de velocidade
    eatAnimation: 0, // Animação de comer
    lastEatenEmoji: '', // Último emoji comido
    facingRight: true, // Direção que está olhando
    wingTime: 0 // Tempo para animação das asas
};

// CPU
// Configurações das áreas
const areaConfig = {
    1: { name: 'Floresta', icon: '🌳', color: '#27ae60' },
    2: { name: 'Deserto', icon: '🏜️', color: '#f39c12' },
    3: { name: 'Gelo', icon: '❄️', color: '#3498db' },
    4: { name: 'Vulcão', icon: '🌋', color: '#e74c3c' },
    5: { name: 'Castelo', icon: '🏰', color: '#9b59b6' }
};

// Configurações de dificuldade por sub-fase
const substageConfig = {
    1: { difficulty: 'Fácil', time: 60, cpuSpeed: 1.5, goalScore: 10 },
    2: { difficulty: 'Normal', time: 55, cpuSpeed: 1.8, goalScore: 12 },
    3: { difficulty: 'Normal', time: 55, cpuSpeed: 1.8, goalScore: 12 },
    4: { difficulty: '🪱 BÔNUS', time: 30, cpuSpeed: 0, goalScore: 25, isBonus: true }, // Fase bônus - pegar minhocas!
    5: { difficulty: 'Normal', time: 55, cpuSpeed: 1.8, goalScore: 12 },
    6: { difficulty: 'Normal + 🦅', time: 55, cpuSpeed: 1.8, goalScore: 12 }, // Com gavião!
    7: { difficulty: '🏆 CHEFE', time: 60, cpuSpeed: 2.8, goalScore: 25, isBoss: true }
};

// CPUs das sub-fases (pássaros genéricos da área)
// Índices: 0=1-1, 1=1-2, 2=1-3, 3=1-4(bônus), 4=1-5, 5=1-6
const areaCpuColors = {
    1: [ // Floresta - pássaros verdes/marrons
        { color: '#228B22', wingColor: '#006400', name: 'Pardal' },
        { color: '#6B8E23', wingColor: '#556B2F', name: 'Canário' },
        { color: '#8FBC8F', wingColor: '#2E8B57', name: 'Periquito' },
        { color: '#9ACD32', wingColor: '#6B8E23', name: 'Sabiá' }, // Bônus (não usado)
        { color: '#556B2F', wingColor: '#3D5A2E', name: 'Tucano' },
        { color: '#3D5E1A', wingColor: '#2B4513', name: 'Beija-flor' }
    ],
    2: [ // Deserto - pássaros amarelos/laranjas
        { color: '#DAA520', wingColor: '#B8860B', name: 'Canário' },
        { color: '#CD853F', wingColor: '#8B4513', name: 'Pomba' },
        { color: '#D2691E', wingColor: '#A0522D', name: 'Gavião' },
        { color: '#F4A460', wingColor: '#CD853F', name: 'Arara' }, // Bônus (não usado)
        { color: '#DEB887', wingColor: '#D2B48C', name: 'Condor' },
        { color: '#E6A83C', wingColor: '#C49232', name: 'Carcará' }
    ],
    3: [ // Gelo - pássaros azuis/brancos
        { color: '#87CEEB', wingColor: '#4682B4', name: 'Gaivota' },
        { color: '#B0E0E6', wingColor: '#5F9EA0', name: 'Albatroz' },
        { color: '#ADD8E6', wingColor: '#4169E1', name: 'Petrel' },
        { color: '#E0FFFF', wingColor: '#00CED1', name: 'Cisne' }, // Bônus (não usado)
        { color: '#AFEEEE', wingColor: '#48D1CC', name: 'Harpia' },
        { color: '#6CACE4', wingColor: '#3A8BC2', name: 'Andorinha' }
    ],
    4: [ // Vulcão - pássaros vermelhos/laranjas
        { color: '#FF6347', wingColor: '#DC143C', name: 'Cardeal' },
        { color: '#FF4500', wingColor: '#B22222', name: 'Flamingo' },
        { color: '#FF8C00', wingColor: '#FF4500', name: 'Papagaio' },
        { color: '#CD5C5C', wingColor: '#8B0000', name: 'Arara' }, // Bônus (não usado)
        { color: '#FA8072', wingColor: '#E9967A', name: 'Quetzal' },
        { color: '#E55039', wingColor: '#B33829', name: 'Colibri' }
    ],
    5: [ // Castelo - pássaros roxos/cinzas
        { color: '#778899', wingColor: '#696969', name: 'Corvo' },
        { color: '#708090', wingColor: '#2F4F4F', name: 'Falcão' },
        { color: '#A9A9A9', wingColor: '#808080', name: 'Pombo' },
        { color: '#8A2BE2', wingColor: '#4B0082', name: 'Pavão' }, // Bônus (não usado)
        { color: '#9370DB', wingColor: '#663399', name: 'Gralha' },
        { color: '#5D5D5D', wingColor: '#3D3D3D', name: 'Abutre' }
    ]
};

// Tipos de CPU CHEFE para cada área
const bossCpuTypes = {
    1: { // Floresta - Coruja
        name: 'Coruja',
        color: '#8B4513',
        wingColor: '#654321',
        type: 'owl',
        eyeColor: '#FFD700',
        beakColor: '#D2691E'
    },
    2: { // Deserto - Falcão
        name: 'Falcão',
        color: '#DAA520',
        wingColor: '#B8860B',
        type: 'hawk',
        eyeColor: '#000000',
        beakColor: '#4a4a4a'
    },
    3: { // Gelo - Pinguim
        name: 'Pinguim',
        color: '#2c3e50',
        wingColor: '#1a252f',
        type: 'penguin',
        eyeColor: '#000000',
        beakColor: '#f39c12'
    },
    4: { // Vulcão - Fênix
        name: 'Fênix',
        color: '#e74c3c',
        wingColor: '#c0392b',
        type: 'phoenix',
        eyeColor: '#f1c40f',
        beakColor: '#f39c12'
    },
    5: { // Castelo - Águia Real
        name: 'Águia Real',
        color: '#34495e',
        wingColor: '#2c3e50',
        type: 'eagle',
        eyeColor: '#f1c40f',
        beakColor: '#f39c12'
    }
};

// Manter compatibilidade
const cpuTypes = bossCpuTypes;

const cpu = {
    x: canvas.width - 100,
    y: canvas.height / 2,
    size: 35,
    speed: 2, // Velocidade base
    baseSpeed: 2,
    boostedSpeed: 5,
    color: '#8B4513',
    wingColor: '#654321',
    type: 'owl',
    eyeColor: '#FFD700',
    beakColor: '#D2691E',
    stunned: false,
    stunTime: 0,
    reactionDelay: 0, // Delay para reagir
    targetFood: null,
    stunCharge: 0, // CPU também carrega stun
    stunChargeMax: 20, // Precisa comer 20 para stunnar
    stunChargeTimer: 0, // Tempo restante para usar o stun
    specialFoodDelay: 0,
    goingForSpecial: false,
    goingForSpeed: false, // Se está indo atrás do item de velocidade
    speedBoost: 0, // Tempo restante do boost de velocidade
    eatAnimation: 0, // Animação de comer
    lastEatenEmoji: '', // Último emoji comido
    facingRight: false, // CPU começa olhando para esquerda
    wingTime: 0 // Tempo para animação das asas
};

// Jogador também pode ser stunnado
player.stunned = false;
player.stunTime = 0;

// Comidas
let foods = [];
let specialFoods = []; // Comidas especiais ficam separadas
let speedItems = []; // Itens de velocidade
const foodEmojis = ['🍎', '🍊', '🍇', '🍒', '🥭', '🍓'];
const groundY = canvas.height - 60; // Nível do chão

// Gavião inimigo (aparece na fase 1-2)
let hawk = {
    active: false,
    x: -100,
    y: 100,
    speed: 8,
    direction: 1, // 1 = direita, -1 = esquerda
    warningTime: 0, // Tempo de aviso antes de atacar
    cooldown: 0, // Tempo até próximo ataque
    targetY: 100 // Altura do ataque
};

// Iniciar ataque do gavião
function spawnHawk() {
    if (hawk.active || hawk.cooldown > 0) return;
    
    // Escolhe direção aleatória
    hawk.direction = Math.random() > 0.5 ? 1 : -1;
    hawk.x = hawk.direction === 1 ? -80 : canvas.width + 80;
    
    // Mira na altura do player (com variação)
    hawk.targetY = player.y + (Math.random() - 0.5) * 100;
    hawk.targetY = Math.max(80, Math.min(canvas.height - 100, hawk.targetY));
    hawk.y = hawk.targetY;
    
    hawk.warningTime = 90; // 1.5 segundos de aviso
    hawk.active = true;
    
    // 🔊 Som do gavião aparecendo
    playSound('hawk');
}

// Atualizar gavião
function updateHawk() {
    // Ativa na fase 1-6 (floresta) e 2-6 (deserto)
    if ((currentArea !== 1 || currentSubstage !== 6) && 
        (currentArea !== 2 || currentSubstage !== 6)) {
        hawk.active = false;
        return;
    }
    
    // Cooldown entre ataques
    if (hawk.cooldown > 0) {
        hawk.cooldown--;
    }
    
    // Spawn aleatório (a cada ~5-8 segundos)
    if (!hawk.active && hawk.cooldown <= 0 && Math.random() < 0.003) {
        spawnHawk();
    }
    
    if (!hawk.active) return;
    
    // Fase de aviso (pisca na borda)
    if (hawk.warningTime > 0) {
        hawk.warningTime--;
        return;
    }
    
    // Movimento do gavião
    hawk.x += hawk.speed * hawk.direction;
    
    // Verificar colisão com player
    if (!player.stunned) {
        const dist = Math.sqrt(
            Math.pow(hawk.x - player.x, 2) + 
            Math.pow(hawk.y - player.y, 2)
        );
        
        if (dist < 50) {
            // Player foi atingido!
            player.stunned = true;
            player.stunTime = 90; // 1.5 segundos de stun
            
            // 🔊 Sons de ataque do gavião
            playSound('hawk');
            playSound('stun');
        }
    }
    
    // Desativar quando sair da tela
    if ((hawk.direction === 1 && hawk.x > canvas.width + 100) ||
        (hawk.direction === -1 && hawk.x < -100)) {
        hawk.active = false;
        hawk.cooldown = 300; // 5 segundos até próximo ataque
    }
}

// Desenhar gavião
function drawHawk() {
    // Ativa na fase 1-6 (floresta) e 2-6 (deserto)
    if ((currentArea !== 1 || currentSubstage !== 6) && 
        (currentArea !== 2 || currentSubstage !== 6)) return;
    if (!hawk.active) return;
    
    ctx.save();
    
    // Fase de aviso - pisca na borda da tela
    if (hawk.warningTime > 0) {
        const blink = Math.floor(hawk.warningTime / 10) % 2 === 0;
        if (blink) {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            
            // Indicador de perigo na borda
            const warningX = hawk.direction === 1 ? 50 : canvas.width - 50;
            ctx.fillText('⚠️ GAVIÃO!', warningX, hawk.targetY);
            
            // Seta indicando direção
            ctx.fillText(hawk.direction === 1 ? '➡️' : '⬅️', warningX, hawk.targetY + 30);
        }
        ctx.restore();
        return;
    }
    
    ctx.translate(hawk.x, hawk.y);
    
    // Espelhar se voando para esquerda
    if (hawk.direction === -1) {
        ctx.scale(-1, 1);
    }
    
    // Sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 60, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Corpo do gavião
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Cabeça
    ctx.fillStyle = '#A0522D';
    ctx.beginPath();
    ctx.arc(30, -5, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Bico
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(42, -5);
    ctx.lineTo(55, -3);
    ctx.lineTo(42, 0);
    ctx.closePath();
    ctx.fill();
    
    // Olho (bravo)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(35, -8, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(36, -8, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Sobrancelha brava
    ctx.strokeStyle = '#5D3A1A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, -15);
    ctx.lineTo(40, -12);
    ctx.stroke();
    
    // Asas (batendo)
    const wingFlap = Math.sin(Date.now() / 50) * 15;
    ctx.fillStyle = '#6B4423';
    
    // Asa superior
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.quadraticCurveTo(-30, -30 + wingFlap, -50, -10 + wingFlap);
    ctx.quadraticCurveTo(-30, 0, -10, 0);
    ctx.closePath();
    ctx.fill();
    
    // Asa inferior
    ctx.beginPath();
    ctx.moveTo(-10, 5);
    ctx.quadraticCurveTo(-30, 30 - wingFlap, -50, 10 - wingFlap);
    ctx.quadraticCurveTo(-30, 5, -10, 5);
    ctx.closePath();
    ctx.fill();
    
    // Cauda
    ctx.fillStyle = '#5D3A1A';
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-50, -8);
    ctx.lineTo(-55, 0);
    ctx.lineTo(-50, 8);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

// ========== FASE BÔNUS - MINHOCAS E COBRAS ==========
let wormHoles = []; // Buracos no chão
let worms = []; // Minhocas e cobras ativas (worms têm propriedade isSnake)
let wormEatEffects = []; // Efeitos visuais ao comer minhoca ou ser stunnado
let isBonusStage = false;
let snakeSpawnCounter = 0; // Contador para spawnar cobras ocasionalmente

// ========== SISTEMA DE SUOR NO DESERTO ==========
let sweatDrops = []; // Gotas de suor dos pássaros no deserto

// ========== SISTEMA DE CHUVA NA FLORESTA ==========
let rainDrops = []; // Gotas de chuva na floresta

// Inicializar buracos para fase bônus
function initWormHoles() {
    wormHoles = [];
    worms = [];
    wormEatEffects = [];
    snakeSpawnCounter = 0; // Reset contador de cobras
    
    // Criar 5 buracos distribuídos no chão
    const spacing = canvas.width / 6;
    for (let i = 1; i <= 5; i++) {
        wormHoles.push({
            x: spacing * i,
            y: groundY + 15,
            width: 50,
            height: 20,
            cooldown: 0,
            hasWorm: false
        });
    }
}

// Spawn de minhoca ou cobra em um buraco aleatório
function spawnWorm() {
    if (!isBonusStage) return;
    
    // Encontrar buracos disponíveis
    const availableHoles = wormHoles.filter(h => !h.hasWorm && h.cooldown <= 0);
    if (availableHoles.length === 0) return;
    
    // Escolher buraco aleatório
    const hole = availableHoles[Math.floor(Math.random() * availableHoles.length)];
    hole.hasWorm = true;
    
    // Incrementar contador de cobras
    snakeSpawnCounter++;
    
    // Chance de spawnar cobra aumenta com o tempo (a cada 3-5 minhocas, uma cobra)
    // Base: 15% de chance, aumenta para 25% após muitas minhocas
    const isSnake = snakeSpawnCounter >= 3 && Math.random() < (0.15 + (snakeSpawnCounter > 10 ? 0.1 : 0));
    
    // Se spawnou cobra, resetar contador parcialmente
    if (isSnake) {
        snakeSpawnCounter = Math.max(0, snakeSpawnCounter - 5);
    }
    
    worms.push({
        x: hole.x,
        y: hole.y - 10,
        hole: hole,
        emergeProgress: 0, // 0 = enterrado, 1 = totalmente exposto
        timeVisible: 0,
        maxTimeVisible: isSnake ? 90 + Math.random() * 60 : 60 + Math.random() * 60, // Cobras ficam mais tempo
        retreating: false,
        eaten: false,
        isSnake: isSnake // Marca se é cobra ou minhoca
    });
}

// Atualizar minhocas
function updateWorms() {
    if (!isBonusStage) return;
    
    // Atualizar cooldown dos buracos
    wormHoles.forEach(hole => {
        if (hole.cooldown > 0) hole.cooldown--;
    });
    
    // Atualizar minhocas
    for (let i = worms.length - 1; i >= 0; i--) {
        const worm = worms[i];
        
        if (worm.eaten) {
            worms.splice(i, 1);
            continue;
        }
        
        if (!worm.retreating) {
            // Emergindo
            if (worm.emergeProgress < 1) {
                worm.emergeProgress += 0.05;
            } else {
                // Totalmente visível
                worm.timeVisible++;
                
                if (worm.timeVisible >= worm.maxTimeVisible) {
                    worm.retreating = true;
                }
            }
        } else {
            // Voltando para o buraco
            worm.emergeProgress -= 0.08;
            
            if (worm.emergeProgress <= 0) {
                worm.hole.hasWorm = false;
                worm.hole.cooldown = 30 + Math.random() * 30; // 0.5-1s de cooldown
                worms.splice(i, 1);
            }
        }
    }
}

// Verificar colisão com minhocas e cobras
function checkWormCollisions() {
    if (!isBonusStage) return;
    
    for (let i = worms.length - 1; i >= 0; i--) {
        const worm = worms[i];
        if (worm.eaten || worm.emergeProgress < 0.5) continue;
        
        const wormY = worm.y - 20 * worm.emergeProgress;
        const dist = Math.hypot(player.x - worm.x, player.y - wormY);
        if (dist < player.size + 20) {
            if (worm.isSnake) {
                // Player tocou na COBRA - stunnar!
                if (!player.stunned) {
                    player.stunned = true;
                    player.stunTime = 180; // 3 segundos de stun (180 frames a 60fps)
                    
                    // 🔊 Som de stun
                    playSound('stun');
                    
                    // Criar efeito visual de stun
                    createSnakeStunEffect(worm.x, wormY);
                }
                
                // Cobra desaparece após atacar
                worm.eaten = true;
                worm.hole.hasWorm = false;
                worm.hole.cooldown = 60 + Math.random() * 60; // Cooldown maior após atacar
            } else {
                // Player tocou na MINHOCA - dar pontos!
                worm.eaten = true;
                worm.hole.hasWorm = false;
                worm.hole.cooldown = 20 + Math.random() * 20;
                
                playerScore++;
                
                // Atualizar contador de minhocas (fase bônus)
                document.getElementById('wormCount').textContent = playerScore;
                
                // 🔊 Som de pegar minhoca
                playSound('worm');
                
                // Animação de comer
                player.eatAnimation = 15;
                player.eatEmoji = '🪱';
                
                // Criar efeito visual de captura
                createWormEatEffect(worm.x, wormY);
            }
        }
    }
}

// Criar efeito visual ao ser stunnado por cobra
function createSnakeStunEffect(x, y) {
    // Partículas vermelhas (perigo)
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        wormEatEffects.push({
            type: 'particle',
            x: x,
            y: y,
            vx: Math.cos(angle) * (4 + Math.random() * 3),
            vy: Math.sin(angle) * (4 + Math.random() * 3),
            life: 40,
            maxLife: 40,
            color: '#e74c3c' // Cor vermelha de perigo
        });
    }
    
    // Texto STUNNED! subindo
    wormEatEffects.push({
        type: 'text',
        x: x,
        y: y,
        vy: -2.5,
        life: 60,
        maxLife: 60,
        text: '💥 STUNNED!'
    });
    
    // Anel de expansão vermelho
    wormEatEffects.push({
        type: 'ring',
        x: x,
        y: y,
        radius: 15,
        maxRadius: 80,
        life: 30,
        maxLife: 30,
        text: 'STUNNED' // Marca para identificar cor vermelha
    });
}

// Criar efeito visual ao comer minhoca (mantido para compatibilidade, mas não usado mais)
function createWormEatEffect(x, y) {
    // Partículas explodindo
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        wormEatEffects.push({
            type: 'particle',
            x: x,
            y: y,
            vx: Math.cos(angle) * (3 + Math.random() * 2),
            vy: Math.sin(angle) * (3 + Math.random() * 2),
            life: 30,
            maxLife: 30,
            color: '#E8B4B8' // Cor rosa da minhoca
        });
    }
    
    // Texto +1 subindo
    wormEatEffects.push({
        type: 'text',
        x: x,
        y: y,
        vy: -2,
        life: 45,
        maxLife: 45,
        text: '+1 🪱'
    });
    
    // Anel de expansão
    wormEatEffects.push({
        type: 'ring',
        x: x,
        y: y,
        radius: 10,
        maxRadius: 50,
        life: 20,
        maxLife: 20
    });
}

// Atualizar efeitos visuais
function updateWormEatEffects() {
    for (let i = wormEatEffects.length - 1; i >= 0; i--) {
        const effect = wormEatEffects[i];
        effect.life--;
        
        if (effect.type === 'particle') {
            effect.x += effect.vx;
            effect.y += effect.vy;
            effect.vy += 0.2; // Gravidade
        }
        
        if (effect.type === 'text') {
            effect.y += effect.vy;
        }
        
        if (effect.type === 'ring') {
            effect.radius += (effect.maxRadius - 10) / effect.maxLife;
        }
        
        if (effect.life <= 0) {
            wormEatEffects.splice(i, 1);
        }
    }
}

// Desenhar efeitos visuais
function drawWormEatEffects() {
    wormEatEffects.forEach(effect => {
        const alpha = effect.life / effect.maxLife;
        
        if (effect.type === 'particle') {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = effect.color;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        if (effect.type === 'text') {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 20px Arial';
            // Cor vermelha para stun, verde para captura antiga
            const textColor = effect.text && effect.text.includes('STUNNED') ? '#e74c3c' : '#2ecc71';
            ctx.fillStyle = textColor;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';
            ctx.strokeText(effect.text, effect.x, effect.y);
            ctx.fillText(effect.text, effect.x, effect.y);
            ctx.restore();
        }
        
        if (effect.type === 'ring') {
            ctx.save();
            ctx.globalAlpha = alpha * 0.5;
            // Cor vermelha para stun, roxa para captura antiga
            const ringColor = effect.text && effect.text.includes('STUNNED') ? '#e74c3c' : '#9b59b6';
            ctx.strokeStyle = ringColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    });
}

// Desenhar buracos e minhocas
function drawWormHoles() {
    if (!isBonusStage) return;
    
    // Desenhar buracos
    wormHoles.forEach(hole => {
        ctx.save();
        
        // Sombra do buraco
        ctx.fillStyle = '#2C1810';
        ctx.beginPath();
        ctx.ellipse(hole.x, hole.y, hole.width / 2, hole.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Borda do buraco
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Terra ao redor
        ctx.fillStyle = '#8B5A2B';
        ctx.beginPath();
        ctx.ellipse(hole.x, hole.y, hole.width / 2 + 5, hole.height / 2 + 3, 0, 0, Math.PI);
        ctx.fill();
        
        ctx.restore();
    });
    
    // Desenhar minhocas e cobras
    worms.forEach(worm => {
        if (worm.eaten) return;
        
        ctx.save();
        ctx.translate(worm.x, worm.y);
        
        const emergeY = worm.isSnake ? -35 * worm.emergeProgress : -30 * worm.emergeProgress;
        const wiggle = Math.sin(Date.now() / (worm.isSnake ? 80 : 100)) * (worm.isSnake ? 4 : 3) * worm.emergeProgress;
        
        if (worm.isSnake) {
            // DESENHAR COBRA
            const bodyWiggle = Math.sin(Date.now() / 100 + 1) * 2 * worm.emergeProgress;
            
            // Corpo da cobra (segmentos mais longos e sinuosos)
            ctx.fillStyle = '#2d5016'; // Verde escuro
            ctx.strokeStyle = '#1a3009';
            ctx.lineWidth = 2;
            
            for (let j = 0; j < 6; j++) {
                const segY = emergeY + j * 10;
                if (segY < 0) { // Só desenha acima do buraco
                    const segWiggle = wiggle * (1 - j * 0.15) + bodyWiggle * Math.sin(j * 0.5);
                    const segSize = 10 - j * 0.5; // Diminui gradualmente
                    ctx.beginPath();
                    ctx.ellipse(segWiggle, segY, segSize, 6, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
            }
            
            // Cabeça da cobra (maior e mais ameaçadora)
            if (emergeY + 10 < 0) {
                const headWiggle = wiggle;
                
                // Cabeça
                ctx.fillStyle = '#3d6b1f';
                ctx.beginPath();
                ctx.ellipse(headWiggle, emergeY - 8, 12, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Padrão de escamas na cabeça
                ctx.fillStyle = '#2d5016';
                for (let s = 0; s < 3; s++) {
                    ctx.beginPath();
                    ctx.arc(headWiggle - 6 + s * 6, emergeY - 8, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Olhos vermelhos (ameaçadores)
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(headWiggle - 5, emergeY - 10, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(headWiggle + 5, emergeY - 10, 2.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Língua bifurcada (piscando)
                const tongueOut = Math.sin(Date.now() / 200) > 0.5;
                if (tongueOut) {
                    ctx.strokeStyle = '#ff6b9d';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(headWiggle + 10, emergeY - 6);
                    ctx.lineTo(headWiggle + 15, emergeY - 8);
                    ctx.lineTo(headWiggle + 15, emergeY - 4);
                    ctx.moveTo(headWiggle + 10, emergeY - 6);
                    ctx.lineTo(headWiggle + 15, emergeY - 6);
                    ctx.lineTo(headWiggle + 15, emergeY - 2);
                    ctx.stroke();
                }
                
                // Aura de perigo (brilho vermelho sutil)
                if (worm.emergeProgress > 0.7) {
                    ctx.globalAlpha = (worm.emergeProgress - 0.7) * 0.3;
                    ctx.shadowColor = '#e74c3c';
                    ctx.shadowBlur = 15;
                    ctx.beginPath();
                    ctx.arc(headWiggle, emergeY - 8, 15, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = 1;
                }
            }
        } else {
            // DESENHAR MINHOCA NORMAL
            // Corpo da minhoca (segmentos)
            ctx.fillStyle = '#E8B4B8';
            for (let j = 0; j < 4; j++) {
                const segY = emergeY + j * 8;
                if (segY < 0) { // Só desenha acima do buraco
                    const segWiggle = wiggle * (1 - j * 0.2);
                    ctx.beginPath();
                    ctx.ellipse(segWiggle, segY, 8, 5, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // Cabeça da minhoca
            if (emergeY + 8 < 0) {
                ctx.fillStyle = '#D4A5A5';
                ctx.beginPath();
                ctx.arc(wiggle, emergeY - 5, 10, 0, Math.PI * 2);
                ctx.fill();
                
                // Olhinhos
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(wiggle - 4, emergeY - 7, 2, 0, Math.PI * 2);
                ctx.arc(wiggle + 4, emergeY - 7, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    });
}

// Controles
const keys = {};

// Modo Debug (ativar no console: window.debugMode = true)
let debugMode = false;
window.debugMode = false; // Pode ser ativado no console do navegador

// Atalho para ativar/desativar debug: Ctrl+Shift+D
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        debugMode = !debugMode;
        window.debugMode = debugMode;
        console.log('🔧 Modo Debug:', debugMode ? 'ATIVADO' : 'DESATIVADO');
        
        // Mostrar/esconder indicador de debug
        const debugIndicator = document.getElementById('debugIndicator');
        if (debugIndicator) {
            if (debugMode) {
                debugIndicator.classList.add('active');
            } else {
                debugIndicator.classList.remove('active');
            }
        }
        
        // Mostrar/esconder painel de debug
        const debugPanel = document.getElementById('debugPanel');
        if (debugPanel) {
            if (debugMode && gameRunning) {
                debugPanel.classList.add('active');
            } else {
                debugPanel.classList.remove('active');
            }
        }
        
        e.preventDefault();
    }
});

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[e.code] = true;
    
    // Atalhos de debug (só funcionam se debugMode estiver ativo)
    if (debugMode && gameRunning) {
        // Pressionar 'D' + 'B' para simular vitória do boss
        if (e.key.toLowerCase() === 'b' && keys['d']) {
            simulateBossVictory();
            e.preventDefault();
        }
        // Pressionar 'D' + 'V' para simular vitória normal
        else if (e.key.toLowerCase() === 'v' && keys['d']) {
            simulateVictory();
            e.preventDefault();
        }
        // Pressionar 'D' + 'L' para simular derrota
        else if (e.key.toLowerCase() === 'l' && keys['d']) {
            simulateDefeat();
            e.preventDefault();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.code] = false;
});

// Criar comida normal (cai do céu)
function spawnFood() {
    if (foods.length < 10) { // Máximo de 10 comidas na tela
        foods.push({
            x: Math.random() * (canvas.width - 100) + 50,
            y: -30, // Começa acima da tela
            size: 25,
            emoji: foodEmojis[Math.floor(Math.random() * foodEmojis.length)],
            vy: 2 + Math.random() * 2, // Velocidade vertical
            vx: 0, // Velocidade horizontal
            grounded: false, // Só pode comer quando parou
            bounces: 0, // Contagem de quiques
            maxBounces: 2 + Math.floor(Math.random() * 2), // 2-3 quiques
            isSpecial: false,
            points: 1
        });
    }
}

// Criar comida especial (fica fixa no céu)
function spawnSpecialFood() {
    if (specialFoods.length < 1) { // Só 1 especial por vez
        specialFoods.push({
            x: Math.random() * (canvas.width - 150) + 75,
            y: 80 + Math.random() * 100, // Fica no céu
            size: 45, // Maior
            emoji: foodEmojis[Math.floor(Math.random() * foodEmojis.length)],
            isSpecial: true,
            points: 5,
            timeLeft: 300, // 5 segundos (60fps * 5)
            pulseTime: 0
        });
        
        cpu.goingForSpecial = false;
    }
}

// Criar item de velocidade
function spawnSpeedItem() {
    if (speedItems.length < 1) { // Só 1 por vez
        speedItems.push({
            x: Math.random() * (canvas.width - 150) + 75,
            y: 100 + Math.random() * 80,
            size: 40,
            timeLeft: 240, // 4 segundos
            pulseTime: 0
        });
    }
}

// Atualizar comidas (fazer cair e quicar)
function updateFood() {
    for (let food of foods) {
        if (!food.grounded) {
            // Gravidade
            food.vy += 0.15;
            
            // Movimento
            food.y += food.vy;
            food.x += food.vx;
            
            // Fricção horizontal
            food.vx *= 0.98;
            
            // Quicar no chão
            if (food.y >= groundY) {
                food.y = groundY;
                food.bounces++;
                
                if (food.bounces >= food.maxBounces) {
                    // Parou de quicar
                    food.grounded = true;
                    food.vx = 0;
                    food.vy = 0;
                } else {
                    // Quica! Direção aleatória
                    food.vy = -(food.vy * 0.6); // Perde energia
                    food.vx = (Math.random() - 0.5) * 8; // Direção aleatória
                }
            }
            
            // Quicar nas paredes
            if (food.x <= 30) {
                food.x = 30;
                food.vx = Math.abs(food.vx) * 0.7;
            } else if (food.x >= canvas.width - 30) {
                food.x = canvas.width - 30;
                food.vx = -Math.abs(food.vx) * 0.7;
            }
        }
    }
    
    // Atualizar comidas especiais (contagem regressiva)
    for (let i = specialFoods.length - 1; i >= 0; i--) {
        specialFoods[i].timeLeft--;
        specialFoods[i].pulseTime++;
        
        // Desaparece se o tempo acabou
        if (specialFoods[i].timeLeft <= 0) {
            specialFoods.splice(i, 1);
        }
    }

    // Atualizar itens de velocidade
    for (let i = speedItems.length - 1; i >= 0; i--) {
        speedItems[i].timeLeft--;
        speedItems[i].pulseTime++;
        
        if (speedItems[i].timeLeft <= 0) {
            speedItems.splice(i, 1);
        }
    }

    // Atualizar boost de velocidade do jogador
    if (player.speedBoost > 0) {
        player.speedBoost--;
        player.speed = player.boostedSpeed;
        if (player.speedBoost <= 0) {
            player.speed = player.baseSpeed;
        }
    }

    // Atualizar boost de velocidade da CPU
    if (cpu.speedBoost > 0) {
        cpu.speedBoost--;
        cpu.speed = cpu.boostedSpeed;
        if (cpu.speedBoost <= 0) {
            cpu.speed = cpu.baseSpeed;
        }
    }
}

// Distância entre dois pontos
function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Escurecer cor
function darkenColor(hex) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.floor(r * 0.6);
    g = Math.floor(g * 0.6);
    b = Math.floor(b * 0.6);
    return `rgb(${r}, ${g}, ${b})`;
}

// Desenhar detalhes específicos de cada tipo de CPU
function drawCpuTypeDetails(bird, hasStunReady) {
    const time = Date.now() / 1000;
    
    switch(bird.type) {
        case 'owl': // Coruja
            // Orelhas/Tufos - posicionadas no topo da cabeça
            const owlSize = bird.size;
            const earHeight = owlSize * 0.6; // Altura das orelhas
            const earWidth = owlSize * 0.25; // Largura da base das orelhas
            const topOfHead = bird.y - owlSize * 0.85; // Topo da cabeça (dentro do círculo)
            
            // Orelha esquerda (mais escura)
            ctx.fillStyle = bird.wingColor || darkenColor(bird.color);
            ctx.beginPath();
            ctx.moveTo(bird.x - owlSize * 0.5, topOfHead + earHeight * 0.3); // Base esquerda
            ctx.lineTo(bird.x - owlSize * 0.35, topOfHead - earHeight * 0.5); // Ponta
            ctx.lineTo(bird.x - owlSize * 0.15, topOfHead + earHeight * 0.3); // Base direita
            ctx.closePath();
            ctx.fill();
            
            // Orelha direita (mais escura)
            ctx.beginPath();
            ctx.moveTo(bird.x + owlSize * 0.15, topOfHead + earHeight * 0.3);
            ctx.lineTo(bird.x + owlSize * 0.35, topOfHead - earHeight * 0.5);
            ctx.lineTo(bird.x + owlSize * 0.55, topOfHead + earHeight * 0.3);
            ctx.closePath();
            ctx.fill();
            
            // Interior das orelhas (mais claro)
            ctx.fillStyle = bird.color;
            ctx.beginPath();
            ctx.moveTo(bird.x - owlSize * 0.45, topOfHead + earHeight * 0.35);
            ctx.lineTo(bird.x - owlSize * 0.35, topOfHead - earHeight * 0.3);
            ctx.lineTo(bird.x - owlSize * 0.22, topOfHead + earHeight * 0.35);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(bird.x + owlSize * 0.22, topOfHead + earHeight * 0.35);
            ctx.lineTo(bird.x + owlSize * 0.35, topOfHead - earHeight * 0.3);
            ctx.lineTo(bird.x + owlSize * 0.48, topOfHead + earHeight * 0.35);
            ctx.closePath();
            ctx.fill();
            
            // Disco facial (círculos ao redor dos olhos - característica da coruja)
            ctx.strokeStyle = darkenColor(bird.color);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bird.x + owlSize * 0.15, bird.y - owlSize * 0.1, owlSize * 0.35, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(bird.x + owlSize * 0.5, bird.y - owlSize * 0.1, owlSize * 0.28, 0, Math.PI * 2);
            ctx.stroke();
            
            // Padrão de penas manchadas no peito
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            for (let row = 0; row < 2; row++) {
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.arc(
                        bird.x - owlSize * 0.3 + i * owlSize * 0.22, 
                        bird.y + owlSize * 0.2 + row * owlSize * 0.2, 
                        owlSize * 0.08, 
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
            }
            break;
            
        case 'hawk': // Falcão
            // Marcas no rosto
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.moveTo(bird.x + 5, bird.y + 5);
            ctx.lineTo(bird.x - 5, bird.y + 20);
            ctx.lineTo(bird.x + 2, bird.y + 20);
            ctx.lineTo(bird.x + 10, bird.y + 8);
            ctx.closePath();
            ctx.fill();
            break;
            
        case 'penguin': // Pinguim
            // Barriga branca
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.ellipse(bird.x, bird.y + 5, 20, 25, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Bochechas rosadas
            ctx.fillStyle = 'rgba(255, 182, 193, 0.5)';
            ctx.beginPath();
            ctx.arc(bird.x - 20, bird.y + 5, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(bird.x + 30, bird.y + 5, 8, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case 'phoenix': // Fênix (simplificado para performance)
            if (!bird.stunned) {
                // Chama simples na cauda (sem shadow)
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.moveTo(bird.x - 25, bird.y);
                ctx.lineTo(bird.x - 45, bird.y + 20);
                ctx.lineTo(bird.x - 25, bird.y + 5);
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#f39c12';
                ctx.beginPath();
                ctx.moveTo(bird.x - 25, bird.y);
                ctx.lineTo(bird.x - 40, bird.y + 15);
                ctx.lineTo(bird.x - 25, bird.y + 5);
                ctx.closePath();
                ctx.fill();
                
                // Crista simples
                ctx.fillStyle = '#f39c12';
                ctx.beginPath();
                ctx.moveTo(bird.x, bird.y - 30);
                ctx.lineTo(bird.x + 5, bird.y - 42);
                ctx.lineTo(bird.x + 10, bird.y - 30);
                ctx.closePath();
                ctx.fill();
            }
            break;
            
        case 'eagle': // Águia Real
            // Crista/penas douradas na cabeça
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.moveTo(bird.x + 5, bird.y - 30);
            ctx.lineTo(bird.x + 10, bird.y - 45);
            ctx.lineTo(bird.x + 15, bird.y - 30);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(bird.x + 15, bird.y - 28);
            ctx.lineTo(bird.x + 20, bird.y - 40);
            ctx.lineTo(bird.x + 25, bird.y - 28);
            ctx.closePath();
            ctx.fill();
            
            // Marca branca na cabeça
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(bird.x + 15, bird.y - 20, 8, 0, Math.PI * 2);
            ctx.fill();
            break;
    }
}

// Atualizar jogador
function updatePlayer() {
    // Se estiver atordoado, não se move
    if (player.stunned) {
        player.stunTime--;
        if (player.stunTime <= 0) {
            player.stunned = false;
        }
        return;
    }
    
    // WASD, Setas E Controles Touch (mobile)
    if (keys['w'] || keys['arrowup'] || keys['ArrowUp'] || touchControls.up) {
        player.dy = -player.speed;
    } else if (keys['s'] || keys['arrowdown'] || keys['ArrowDown'] || touchControls.down) {
        player.dy = player.speed;
    } else {
        player.dy = 0;
    }

    if (keys['a'] || keys['arrowleft'] || keys['ArrowLeft'] || touchControls.left) {
        player.dx = -player.speed;
        player.facingRight = false;
    } else if (keys['d'] || keys['arrowright'] || keys['ArrowRight'] || touchControls.right) {
        player.dx = player.speed;
        player.facingRight = true;
    } else {
        player.dx = 0;
    }

    player.x += player.dx;
    player.y += player.dy;

    // Limites da tela
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
}

// Atualizar CPU (IA com reação mais lenta)
function updateCPU() {
    // Se estiver atordoado, não se move
    if (cpu.stunned) {
        cpu.stunTime--;
        if (cpu.stunTime <= 0) {
            cpu.stunned = false;
            cpu.reactionDelay = 30; // Demora para reagir após stun
        }
        return;
    }

    // Delay de reação (CPU demora para processar)
    if (cpu.reactionDelay > 0) {
        cpu.reactionDelay--;
        return;
    }

    // Considera comida que já quicou (bounces > 0) ou está no chão
    const availableFoods = foods.filter(f => f.bounces > 0 || f.grounded);
    
    // Verifica se tem comida especial disponível
    const specialAvailable = specialFoods.length > 0;
    
    // Verifica se tem item de velocidade disponível
    const speedAvailable = speedItems.length > 0 && cpu.speedBoost === 0;
    
    // Se não tem nada disponível
    if (availableFoods.length === 0 && !specialAvailable && !speedAvailable) {
        cpu.targetFood = null;
        cpu.goingForSpecial = false;
        cpu.goingForSpeed = false;
        return;
    }

    // Prioridade: velocidade > especial > normal
    // Decide se vai atrás do item de velocidade (50% de chance)
    const shouldGoSpeed = speedAvailable && 
        (speedItems[0].timeLeft < 120 || Math.random() < 0.5) &&
        !cpu.goingForSpeed && !cpu.goingForSpecial;

    if (shouldGoSpeed && speedItems.length > 0) {
        cpu.goingForSpeed = true;
        cpu.goingForSpecial = false;
        cpu.targetFood = null;
    }

    // Decide se vai atrás da especial (40% de chance quando disponível)
    const shouldGoSpecial = specialAvailable && 
        (specialFoods[0].timeLeft < 180 || Math.random() < 0.4) &&
        !cpu.goingForSpecial && !cpu.goingForSpeed;

    if (shouldGoSpecial && specialFoods.length > 0) {
        cpu.goingForSpecial = true;
        cpu.goingForSpeed = false;
        cpu.targetFood = null;
    }

    // Se está indo atrás do item de velocidade
    if (cpu.goingForSpeed && speedItems.length > 0) {
        const speed = speedItems[0];
        
        // Atualizar direção
        if (speed.x > cpu.x) cpu.facingRight = true;
        else if (speed.x < cpu.x) cpu.facingRight = false;
        
        // Mover em direção ao item de velocidade
        const wobble = (Math.random() - 0.5) * 0.3;
        const angle = Math.atan2(speed.y - cpu.y, speed.x - cpu.x) + wobble;
        cpu.x += Math.cos(angle) * cpu.speed;
        cpu.y += Math.sin(angle) * cpu.speed;
    }
    // Se está indo atrás de especial
    else if (cpu.goingForSpecial && specialFoods.length > 0) {
        const special = specialFoods[0];
        
        // Atualizar direção
        if (special.x > cpu.x) cpu.facingRight = true;
        else if (special.x < cpu.x) cpu.facingRight = false;
        
        // Mover em direção à especial
        const wobble = (Math.random() - 0.5) * 0.3;
        const angle = Math.atan2(special.y - cpu.y, special.x - cpu.x) + wobble;
        cpu.x += Math.cos(angle) * cpu.speed;
        cpu.y += Math.sin(angle) * cpu.speed;
    } else {
        // Comportamento normal para comidas regulares
        cpu.goingForSpecial = false;
        cpu.goingForSpeed = false;
        
        if (availableFoods.length === 0) return;

        // Só muda de alvo a cada 45 frames (~0.75s) ou se o alvo sumiu
        if (!cpu.targetFood || !availableFoods.includes(cpu.targetFood) || Math.random() < 0.02) {
            // Escolhe uma comida (nem sempre a mais próxima - 30% de chance de errar)
            if (Math.random() < 0.3 && availableFoods.length > 1) {
                cpu.targetFood = availableFoods[Math.floor(Math.random() * availableFoods.length)];
            } else {
                // Encontrar comida mais próxima
                let nearestFood = availableFoods[0];
                let nearestDist = distance(cpu, availableFoods[0]);

                for (let food of availableFoods) {
                    const dist = distance(cpu, food);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestFood = food;
                    }
                }
                cpu.targetFood = nearestFood;
            }
        }

        // Atualizar direção
        if (cpu.targetFood.x > cpu.x) cpu.facingRight = true;
        else if (cpu.targetFood.x < cpu.x) cpu.facingRight = false;
        
        // Mover em direção ao alvo
        const wobble = (Math.random() - 0.5) * 0.3;
        const angle = Math.atan2(cpu.targetFood.y - cpu.y, cpu.targetFood.x - cpu.x) + wobble;
        cpu.x += Math.cos(angle) * cpu.speed;
        cpu.y += Math.sin(angle) * cpu.speed;
    }

    // Limites da tela
    cpu.x = Math.max(cpu.size, Math.min(canvas.width - cpu.size, cpu.x));
    cpu.y = Math.max(cpu.size, Math.min(canvas.height - cpu.size, cpu.y));
}

// Verificar colisão entre pássaros
function checkBirdCollision() {
    const dist = distance(player, cpu);
    
    // Verifica se colidiu
    if (dist < player.size + cpu.size) {
        const playerHasStun = player.stunCharge >= player.stunChargeMax;
        const cpuHasStun = cpu.stunCharge >= cpu.stunChargeMax;
        
        // Ambos com stun carregado - stun mútuo!
        if (playerHasStun && cpuHasStun && !player.stunned && !cpu.stunned) {
            player.stunned = true;
            player.stunTime = 120;
            player.stunCharge = 0;
            player.stunChargeTimer = 0;
            
            cpu.stunned = true;
            cpu.stunTime = 120;
            cpu.stunCharge = 0;
            cpu.stunChargeTimer = 0;
            
            // 🔊 Som de stun (mútuo)
            playSound('stun');
            
            updateStunUI();
        }
        // Só jogador tem stun
        else if (playerHasStun && !cpu.stunned && !player.stunned) {
            cpu.stunned = true;
            cpu.stunTime = 120;
            player.stunCharge = 0;
            player.stunChargeTimer = 0;
            
            // 🔊 Som de stun (CPU stunnada - mais baixo)
            const stunSound = sounds.stun;
            if (stunSound) {
                stunSound.volume = masterVolume * 0.6;
                playSound('stun');
                stunSound.volume = masterVolume;
            }
            
            updateStunUI();
        }
        // Só CPU tem stun
        else if (cpuHasStun && !player.stunned && !cpu.stunned) {
            player.stunned = true;
            player.stunTime = 120;
            cpu.stunCharge = 0;
            cpu.stunChargeTimer = 0;
            
            // 🔊 Som de stun (player stunnado)
            playSound('stun');
        }
    }
}

// Atualizar UI do stun
function updateStunUI() {
    const cooldownFill = document.getElementById('cooldownFill');
    const cooldownText = document.getElementById('cooldownText');
    
    const progress = player.stunCharge / player.stunChargeMax;
    cooldownFill.style.width = (progress * 100) + '%';
    
    if (player.stunCharge >= player.stunChargeMax) {
        // Mostrar tempo restante para usar
        const secondsLeft = Math.ceil(player.stunChargeTimer / 60);
        cooldownText.textContent = `⚡ ${secondsLeft}s`;
        cooldownText.className = 'ready';
        
        // Cor muda conforme o tempo acaba
        if (secondsLeft <= 2) {
            cooldownFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
            cooldownFill.style.animation = 'pulse 0.3s infinite';
        } else {
            cooldownFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
            cooldownFill.style.animation = '';
        }
    } else {
        cooldownText.textContent = player.stunCharge + '/' + player.stunChargeMax;
        cooldownText.className = 'charging';
        cooldownFill.style.background = 'linear-gradient(90deg, #9b59b6, #e74c3c)';
        cooldownFill.style.animation = '';
    }
}

// Verificar colisões com comida
function checkCollisions() {
    // Comidas normais
    for (let i = foods.length - 1; i >= 0; i--) {
        const food = foods[i];

        // Só pode comer se a comida estiver no chão!
        if (!food.grounded) continue;

        // Jogador comeu
        if (distance(player, food) < player.size + food.size / 2) {
            player.eatAnimation = 20; // Inicia animação
            player.lastEatenEmoji = food.emoji;
            foods.splice(i, 1);
            playerScore += food.points;
            // Placar agora é desenhado no canvas
            
            // 🔊 Som de comer
            playSound('eat');
            
            // Carrega o stun
            if (player.stunCharge < player.stunChargeMax) {
                player.stunCharge = Math.min(player.stunCharge + 1, player.stunChargeMax);
                // Iniciar timer quando carregou completamente
                if (player.stunCharge >= player.stunChargeMax) {
                    player.stunChargeTimer = 300; // 5 segundos
                    // 🔊 Som de stun carregado
                    playSound('stunLoaded');
                }
                updateStunUI();
            }
            continue;
        }

        // CPU comeu
        if (distance(cpu, food) < cpu.size + food.size / 2) {
            cpu.eatAnimation = 20; // Inicia animação
            cpu.lastEatenEmoji = food.emoji;
            foods.splice(i, 1);
            cpuScore += food.points;
            // Placar agora é desenhado no canvas
            
            // 🔊 Som de comer (mais baixo para CPU)
            const eatSound = sounds.eat;
            if (eatSound) {
                eatSound.volume = masterVolume * 0.6; // 60% do volume para CPU
                playSound('eat');
                eatSound.volume = masterVolume; // Restaura volume
            }
            
            // CPU também carrega stun
            if (cpu.stunCharge < cpu.stunChargeMax) {
                cpu.stunCharge++;
                // Iniciar timer quando carregou completamente
                if (cpu.stunCharge >= cpu.stunChargeMax) {
                    cpu.stunChargeTimer = 300; // 5 segundos
                    // 🔊 Som de stun carregado (mais baixo para CPU)
                    const stunSound = sounds.stunLoaded;
                    if (stunSound) {
                        stunSound.volume = masterVolume * 0.5; // 50% do volume para CPU
                        playSound('stunLoaded');
                        stunSound.volume = masterVolume; // Restaura volume
                    }
                }
            }
        }
    }
    
    // Comidas especiais (no céu)
    for (let i = specialFoods.length - 1; i >= 0; i--) {
        const food = specialFoods[i];

        // Jogador comeu especial
        if (distance(player, food) < player.size + food.size / 2) {
            player.eatAnimation = 30; // Animação maior para especial
            player.lastEatenEmoji = food.emoji;
            specialFoods.splice(i, 1);
            playerScore += food.points;
            // Placar agora é desenhado no canvas
            
            // 🔊 Som yummy (comida especial)
            playSound('yummy');
            
            // Comida especial carrega +5 stun
            if (player.stunCharge < player.stunChargeMax) {
                const wasNotFull = player.stunCharge < player.stunChargeMax;
                player.stunCharge = Math.min(player.stunCharge + 5, player.stunChargeMax);
                // Iniciar timer quando carregou completamente
                if (wasNotFull && player.stunCharge >= player.stunChargeMax) {
                    player.stunChargeTimer = 300; // 5 segundos
                    // 🔊 Som de stun carregado
                    playSound('stunLoaded');
                }
                updateStunUI();
            }
            continue;
        }

        // CPU comeu especial
        if (distance(cpu, food) < cpu.size + food.size / 2) {
            cpu.eatAnimation = 30; // Animação maior para especial
            cpu.lastEatenEmoji = food.emoji;
            specialFoods.splice(i, 1);
            cpuScore += food.points;
            // Placar agora é desenhado no canvas
            
            // 🔊 Som yummy (mais baixo para CPU)
            const yummySound = sounds.yummy;
            if (yummySound) {
                yummySound.volume = masterVolume * 0.6; // 60% do volume para CPU
                playSound('yummy');
                yummySound.volume = masterVolume; // Restaura volume
            }
            
            // CPU também ganha +5 stun
            if (cpu.stunCharge < cpu.stunChargeMax) {
                const wasNotFull = cpu.stunCharge < cpu.stunChargeMax;
                cpu.stunCharge = Math.min(cpu.stunCharge + 5, cpu.stunChargeMax);
                // Iniciar timer quando carregou completamente
                if (wasNotFull && cpu.stunCharge >= cpu.stunChargeMax) {
                    cpu.stunChargeTimer = 300; // 5 segundos
                    // 🔊 Som de stun carregado (mais baixo para CPU)
                    const stunSound = sounds.stunLoaded;
                    if (stunSound) {
                        stunSound.volume = masterVolume * 0.5; // 50% do volume para CPU
                        playSound('stunLoaded');
                        stunSound.volume = masterVolume; // Restaura volume
                    }
                }
            }
        }
    }

    // Itens de velocidade
    for (let i = speedItems.length - 1; i >= 0; i--) {
        const item = speedItems[i];

        // Jogador pegou
        if (distance(player, item) < player.size + item.size / 2) {
            speedItems.splice(i, 1);
            player.speedBoost = 300; // 5 segundos de boost
            player.speed = player.boostedSpeed;
            
            // 🔊 Som de powerup
            playSound('powerup');
            
            continue;
        }

        // CPU pegou
        if (distance(cpu, item) < cpu.size + item.size / 2) {
            speedItems.splice(i, 1);
            cpu.speedBoost = 300; // 5 segundos de boost
            cpu.speed = cpu.boostedSpeed;
            
            // 🔊 Som de powerup (mais baixo para CPU)
            const powerupSound = sounds.powerup;
            if (powerupSound) {
                powerupSound.volume = masterVolume * 0.6; // 60% do volume para CPU
                playSound('powerup');
                powerupSound.volume = masterVolume; // Restaura volume
            }
        }
    }
}

// Desenhar pássaro
function drawBird(bird, isPlayer) {
    ctx.save();
    
    // Verificar se tem stun pronto
    const hasStunReady = bird.stunCharge >= bird.stunChargeMax;
    
    // Atualizar animação de comer
    if (bird.eatAnimation > 0) {
        bird.eatAnimation--;
    }
    
    // Efeito de atordoamento (pisca e treme) - para qualquer pássaro stunnado
    if (bird.stunned) {
        // Tremor
        const shake = Math.sin(Date.now() / 30) * 5;
        ctx.translate(shake, 0);
        
        // Pisca (visibilidade alternada)
        if (Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }
    }
    
    // Animação de comer - escala e efeitos
    let eatScale = 1;
    if (bird.eatAnimation > 0) {
        // Pássaro cresce e volta ao normal
        eatScale = 1 + Math.sin(bird.eatAnimation * 0.3) * 0.15;
    }
    
    // Pássaro maior quando stun carregado (cheio de comida)
    let stunScale = 1;
    if (hasStunReady && !bird.stunned) {
        // Apenas maior, sem pulsação (performance)
        stunScale = 1.2;
    }
    
    // Verificar se está se movendo para efeito de voo
    const isMoving = isPlayer ? (player.dx !== 0 || player.dy !== 0) : !cpu.stunned && (cpu.targetFood || cpu.goingForSpecial || cpu.goingForSpeed);
    let hoverOffset = 0;
    if (isMoving && !bird.stunned) {
        hoverOffset = Math.sin(Date.now() / 100) * 3; // Flutua levemente
    }
    
    // Virar pássaro de acordo com a direção
    ctx.translate(bird.x, bird.y + hoverOffset);
    if (!bird.facingRight) {
        ctx.scale(-1, 1); // Espelha horizontalmente
    }
    ctx.scale(eatScale * stunScale, eatScale * stunScale);
    ctx.translate(-bird.x, -bird.y - hoverOffset);
    
    // Efeito de boost de velocidade (simplificado)
    const hasSpeedBoost = bird.speedBoost > 0;
    if (hasSpeedBoost && !bird.stunned) {
        // Rastro de velocidade (sem shadow para performance)
        ctx.fillStyle = 'rgba(52, 152, 219, 0.4)';
        ctx.beginPath();
        ctx.ellipse(bird.x - 15, bird.y, 25, 15, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    // Aura maligna quando tem stun pronto (sem shadow - muito pesado)
    else if (hasStunReady && !bird.stunned) {
        // Removido shadowBlur - causa lag
    }
    
    // Corpo do pássaro
    let bodyColor = bird.color;
    if (bird.stunned) {
        bodyColor = '#9b59b6'; // Roxo quando stunnado
    } else if (hasStunReady) {
        // Cor mais escura/intensa quando pronto para atacar
        bodyColor = darkenColor(bird.color);
    }
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Capacete de corrida quando tem speed boost
    if (hasSpeedBoost && !bird.stunned) {
        const helmetSize = bird.size * 0.7;
        const helmetY = bird.y - bird.size * 0.6;
        
        // Capacete (meio elíptico)
        ctx.fillStyle = '#3498db'; // Azul
        ctx.beginPath();
        ctx.ellipse(bird.x, helmetY, helmetSize * 0.9, helmetSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Visor do capacete (transparente com brilho)
        ctx.fillStyle = 'rgba(52, 152, 219, 0.6)';
        ctx.beginPath();
        ctx.ellipse(bird.x, helmetY + helmetSize * 0.1, helmetSize * 0.7, helmetSize * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Brilho no visor
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(bird.x - helmetSize * 0.2, helmetY, helmetSize * 0.3, helmetSize * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Borda do capacete
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(bird.x, helmetY, helmetSize * 0.9, helmetSize * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Símbolo de raio no capacete
        ctx.fillStyle = '#f1c40f';
        ctx.font = `${Math.floor(helmetSize * 0.4)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', bird.x, helmetY);
    }
    
    // Detalhes especiais para cada tipo de CPU
    if (!isPlayer && bird.type) {
        drawCpuTypeDetails(bird, hasStunReady);
    }
    
    // Gotas de suor no deserto (área 2)
    if (currentArea === 2 && !bird.stunned) {
        drawSweatDrops(bird, isPlayer);
    }
    
    ctx.shadowBlur = 0; // Reset shadow

    // Olho - diferente para cada tipo de CPU
    const isCpuWithSpecialEyes = !isPlayer && bird.type && ['owl', 'phoenix'].includes(bird.type);
    
    if (isCpuWithSpecialEyes && bird.type === 'owl' && !bird.stunned) {
        // Coruja - dois olhos grandes (escalam com o tamanho)
        const eyeScale = bird.size / 35;
        const leftEyeX = bird.x + 5 * eyeScale;
        const rightEyeX = bird.x + 22 * eyeScale;
        const eyeY = bird.y - 5 * eyeScale;
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, 12 * eyeScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEyeX, eyeY, 10 * eyeScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupilas grandes da coruja (amarelas)
        ctx.fillStyle = bird.eyeColor || '#FFD700';
        ctx.beginPath();
        ctx.arc(leftEyeX + 2 * eyeScale, eyeY, 8 * eyeScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEyeX, eyeY, 6 * eyeScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Centro preto
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(leftEyeX + 2 * eyeScale, eyeY, 3.5 * eyeScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEyeX, eyeY, 3 * eyeScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Brilho nos olhos
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY - 3 * eyeScale, 2 * eyeScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEyeX - 2 * eyeScale, eyeY - 2 * eyeScale, 1.5 * eyeScale, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Olho padrão
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(bird.x + 10, bird.y - 5, 10, 0, Math.PI * 2);
        ctx.fill();

        // Expressões do olho
        if (bird.stunned) {
            // Olho atordoado (X)
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bird.x + 7, bird.y - 10);
            ctx.lineTo(bird.x + 17, bird.y);
            ctx.moveTo(bird.x + 17, bird.y - 10);
            ctx.lineTo(bird.x + 7, bird.y);
            ctx.stroke();
        } else if (hasStunReady) {
            // Olho de mau - pupila vermelha e sobrancelha brava
            ctx.fillStyle = '#c0392b';
            ctx.beginPath();
            ctx.arc(bird.x + 12, bird.y - 5, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Brilho maligno
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(bird.x + 10, bird.y - 7, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Sobrancelha brava
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(bird.x + 2, bird.y - 18);
            ctx.lineTo(bird.x + 20, bird.y - 12);
            ctx.stroke();
        } else {
            // Olho normal - usa cor específica do tipo
            ctx.fillStyle = (!isPlayer && bird.eyeColor) ? bird.eyeColor : 'black';
            ctx.beginPath();
            ctx.arc(bird.x + 12, bird.y - 5, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Bico - animação de comer ou agressivo
    ctx.fillStyle = (!isPlayer && bird.beakColor) ? bird.beakColor : '#f39c12';
    
    if (bird.eatAnimation > 10 && !bird.stunned) {
        // Bico mastigando (abre e fecha)
        const chew = Math.sin(bird.eatAnimation * 0.8) * 4;
        
        // Bico superior
        ctx.beginPath();
        ctx.moveTo(bird.x + bird.size - 5, bird.y - 2);
        ctx.lineTo(bird.x + bird.size + 15, bird.y - chew);
        ctx.lineTo(bird.x + bird.size - 5, bird.y + 2);
        ctx.closePath();
        ctx.fill();
        
        // Bico inferior
        ctx.beginPath();
        ctx.moveTo(bird.x + bird.size - 5, bird.y + 4);
        ctx.lineTo(bird.x + bird.size + 12, bird.y + 8 + chew);
        ctx.lineTo(bird.x + bird.size - 5, bird.y + 10);
        ctx.closePath();
        ctx.fill();
    } else if (hasStunReady && !bird.stunned) {
        // Bico aberto (gritando/ameaçando)
        ctx.beginPath();
        ctx.moveTo(bird.x + bird.size - 5, bird.y - 3);
        ctx.lineTo(bird.x + bird.size + 18, bird.y);
        ctx.lineTo(bird.x + bird.size - 5, bird.y + 3);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(bird.x + bird.size - 5, bird.y + 5);
        ctx.lineTo(bird.x + bird.size + 15, bird.y + 8);
        ctx.lineTo(bird.x + bird.size - 5, bird.y + 12);
        ctx.closePath();
        ctx.fill();
    } else {
        // Bico normal
        ctx.beginPath();
        ctx.moveTo(bird.x + bird.size - 5, bird.y);
        ctx.lineTo(bird.x + bird.size + 15, bird.y + 5);
        ctx.lineTo(bird.x + bird.size - 5, bird.y + 10);
        ctx.closePath();
        ctx.fill();
    }

    // Asa com animação de bater
    let wingColor;
    if (isPlayer) {
        wingColor = selectedPlayerWing || '#27ae60';
    } else {
        wingColor = cpu.wingColor || '#c0392b';
    }
    if (bird.stunned) wingColor = '#8e44ad';
    else if (hasStunReady) {
        // Escurecer a cor da asa quando tem stun
        wingColor = isPlayer ? darkenColor(selectedPlayerWing || '#27ae60') : darkenColor(cpu.wingColor || '#c0392b');
    }
    ctx.fillStyle = wingColor;
    
    if (isMoving && !bird.stunned) {
        // Incrementar tempo da asa
        bird.wingTime += 0.4;
        
        // Animação de bater asas
        const wingFlap = Math.sin(bird.wingTime) * 0.5;
        const wingY = bird.y + 5 + Math.sin(bird.wingTime) * 8;
        const wingHeight = 12 + Math.cos(bird.wingTime) * 6;
        
        ctx.beginPath();
        ctx.ellipse(bird.x - 10, wingY, 20, wingHeight, -0.3 + wingFlap, 0, Math.PI * 2);
        ctx.fill();
        
        // Segunda asa (mais atrás, efeito de profundidade)
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = isPlayer ? '#1e8449' : '#922b21';
        if (bird.stunned) ctx.fillStyle = '#6c3483';
        ctx.beginPath();
        ctx.ellipse(bird.x - 15, wingY - 3, 15, wingHeight * 0.8, -0.3 - wingFlap, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    } else {
        // Asa parada
        ctx.beginPath();
        ctx.ellipse(bird.x - 10, bird.y + 5, 20, 12, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Efeitos visuais
    if (bird.stunned) {
        // Estrelas de atordoamento
        ctx.font = '16px Arial';
        ctx.fillText('💫', bird.x - 20, bird.y - 35);
        ctx.fillText('⭐', bird.x + 15, bird.y - 40);
        ctx.fillText('💫', bird.x, bird.y - 45);
    } else if (hasStunReady) {
        // Indicador de stun pronto (simplificado para performance)
        ctx.font = '24px Arial';
        ctx.fillText('⚡', bird.x, bird.y - 55);
        
        // Apenas um símbolo de raiva (menos desenhos = mais rápido)
        ctx.font = '16px Arial';
        ctx.fillText('💢', bird.x + 25, bird.y - 35);
    }
    
    ctx.restore(); // Restaura antes de desenhar textos (para não espelhar)
    
    // Animação de comer - emoji subindo e partículas (fora do transform)
    if (bird.eatAnimation > 0 && bird.lastEatenEmoji) {
        ctx.save();
        const progress = 1 - (bird.eatAnimation / 30);
        const yOffset = progress * 40;
        const alpha = 1 - progress;
        
        ctx.globalAlpha = alpha;
        
        // Emoji subindo
        ctx.font = `${20 - progress * 10}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bird.lastEatenEmoji, bird.x, bird.y - 50 - yOffset);
        
        // Texto +1
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#f1c40f';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 3;
        ctx.fillText('+1', bird.x + 25, bird.y - 40 - yOffset);
        
        // Partículas de comida
        ctx.shadowBlur = 0;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + progress * 2;
            const dist = 20 + progress * 30;
            const px = bird.x + Math.cos(angle) * dist;
            const py = bird.y - 20 + Math.sin(angle) * dist * 0.5;
            
            ctx.fillStyle = isPlayer ? '#2ecc71' : '#e74c3c';
            ctx.beginPath();
            ctx.arc(px, py, 4 - progress * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Desenhar comida
function drawFood() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Desenhar comidas normais
    for (let food of foods) {
        ctx.save();
        
        if (!food.grounded) {
            // Comida quicando - rotaciona baseado na velocidade
            ctx.globalAlpha = 0.7;
            ctx.font = '28px Arial';
            
            // Rotação baseada no movimento
            ctx.translate(food.x, food.y);
            ctx.rotate(food.vx * 0.1);
            ctx.translate(-food.x, -food.y);
            
            // Sombra no chão
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            const shadowSize = Math.max(5, 20 - (groundY - food.y) / 25);
            ctx.beginPath();
            ctx.ellipse(food.x, groundY + 10, shadowSize, shadowSize / 3, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Comida parada no chão
            ctx.font = '30px Arial';
            ctx.shadowColor = '#f1c40f';
            ctx.shadowBlur = 15;
        }
        
        ctx.fillText(food.emoji, food.x, food.y);
        ctx.restore();
    }
    
    // Desenhar comidas especiais (no céu, douradas)
    for (let food of specialFoods) {
        ctx.save();
        
        const pulse = Math.sin(food.pulseTime / 10) * 5;
        const urgency = food.timeLeft < 90; // Pisca quando falta pouco tempo
        
        // Aura dourada brilhante
        const glowSize = 35 + pulse;
        const gradient = ctx.createRadialGradient(food.x, food.y, 0, food.x, food.y, glowSize);
        gradient.addColorStop(0, 'rgba(241, 196, 15, 0.8)');
        gradient.addColorStop(0.5, 'rgba(241, 196, 15, 0.4)');
        gradient.addColorStop(1, 'rgba(241, 196, 15, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(food.x, food.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Círculo dourado atrás
        ctx.fillStyle = urgency && Math.floor(Date.now() / 100) % 2 === 0 
            ? 'rgba(231, 76, 60, 0.6)' 
            : 'rgba(241, 196, 15, 0.6)';
        ctx.beginPath();
        ctx.arc(food.x, food.y, 30 + pulse / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Borda dourada
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(food.x, food.y, 32 + pulse / 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Emoji maior
        ctx.font = '45px Arial';
        ctx.shadowColor = '#f1c40f';
        ctx.shadowBlur = 20;
        ctx.fillText(food.emoji, food.x, food.y);
        
        // Indicador +5
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#f1c40f';
        ctx.shadowBlur = 5;
        ctx.fillText('+5', food.x, food.y - 45);
        
        // Barra de tempo restante
        ctx.shadowBlur = 0;
        const barWidth = 50;
        const barHeight = 6;
        const timePercent = food.timeLeft / 300;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(food.x - barWidth / 2, food.y + 35, barWidth, barHeight);
        
        ctx.fillStyle = urgency ? '#e74c3c' : '#2ecc71';
        ctx.fillRect(food.x - barWidth / 2, food.y + 35, barWidth * timePercent, barHeight);
        
        ctx.restore();
    }

    // Desenhar itens de velocidade
    for (let item of speedItems) {
        ctx.save();
        
        const pulse = Math.sin(item.pulseTime / 8) * 5;
        const urgency = item.timeLeft < 60;
        
        // Aura azul brilhante
        const glowSize = 35 + pulse;
        const gradient = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, glowSize);
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.9)');
        gradient.addColorStop(0.5, 'rgba(52, 152, 219, 0.4)');
        gradient.addColorStop(1, 'rgba(52, 152, 219, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(item.x, item.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Círculo azul
        ctx.fillStyle = urgency && Math.floor(Date.now() / 80) % 2 === 0 
            ? 'rgba(231, 76, 60, 0.7)' 
            : 'rgba(52, 152, 219, 0.7)';
        ctx.beginPath();
        ctx.arc(item.x, item.y, 28 + pulse / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Borda
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 30 + pulse / 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Ícone de raio
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#3498db';
        ctx.shadowBlur = 15;
        ctx.fillText('⚡', item.x, item.y);
        
        // Texto SPEED
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#3498db';
        ctx.shadowBlur = 5;
        ctx.fillText('SPEED', item.x, item.y - 40);
        
        // Barra de tempo
        ctx.shadowBlur = 0;
        const barWidth = 40;
        const barHeight = 5;
        const timePercent = item.timeLeft / 240;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(item.x - barWidth / 2, item.y + 32, barWidth, barHeight);
        
        ctx.fillStyle = urgency ? '#e74c3c' : '#3498db';
        ctx.fillRect(item.x - barWidth / 2, item.y + 32, barWidth * timePercent, barHeight);
        
        ctx.restore();
    }
}

// Desenhar tudo
// Nuvens móveis
let clouds = [
    { x: 100, y: 60, size: 1, speed: 0.3 },
    { x: 350, y: 90, size: 0.8, speed: 0.5 },
    { x: 600, y: 50, size: 1.2, speed: 0.2 },
    { x: 750, y: 100, size: 0.7, speed: 0.4 }
];

// Elementos decorativos do cenário (variam por subfase)
let backgroundBirds = []; // Pássaros voando no fundo
let butterflies = []; // Borboletas
let fallingLeaves = []; // Folhas caindo
let fireflies = []; // Vaga-lumes

// Elementos decorativos do deserto
let cacti = []; // Cactos
let mirages = []; // Miragens
let heatWaves = []; // Ondas de calor
let desertBirds = []; // Pássaros do deserto

// Desenhar nuvem
function drawCloud(x, y, size) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(x, y, 25 * size, 0, Math.PI * 2);
    ctx.arc(x + 30 * size, y - 10 * size, 30 * size, 0, Math.PI * 2);
    ctx.arc(x + 60 * size, y, 25 * size, 0, Math.PI * 2);
    ctx.arc(x + 30 * size, y + 5 * size, 20 * size, 0, Math.PI * 2);
    ctx.fill();
}

// Desenhar árvore (com progresso de noite opcional)
function drawTree(x, height, trunkWidth, nightProgress = 0) {
    // Tronco (mais escuro conforme anoitece)
    const trunkColor = interpolateColor('#8B4513', '#1a1a1a', nightProgress);
    ctx.fillStyle = trunkColor;
    ctx.fillRect(x - trunkWidth/2, canvas.height - 40 - height * 0.4, trunkWidth, height * 0.4 + 40);
    
    // Copa (3 camadas) - mais escura conforme anoitece
    const leafColor1 = interpolateColor('#228B22', '#0a1a0a', nightProgress);
    const leafColor2 = interpolateColor('#2E8B57', '#0a2a0a', nightProgress);
    const leafColor3 = interpolateColor('#3CB371', '#0a2a0a', nightProgress);
    const leafSize = height * 0.35;
    
    // Camada inferior
    ctx.fillStyle = leafColor1;
    ctx.beginPath();
    ctx.moveTo(x - leafSize, canvas.height - 40 - height * 0.3);
    ctx.lineTo(x + leafSize, canvas.height - 40 - height * 0.3);
    ctx.lineTo(x, canvas.height - 40 - height * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // Camada do meio
    ctx.fillStyle = leafColor2;
    ctx.beginPath();
    ctx.moveTo(x - leafSize * 0.8, canvas.height - 40 - height * 0.5);
    ctx.lineTo(x + leafSize * 0.8, canvas.height - 40 - height * 0.5);
    ctx.lineTo(x, canvas.height - 40 - height * 0.75);
    ctx.closePath();
    ctx.fill();
    
    // Camada superior
    ctx.fillStyle = leafColor3;
    ctx.beginPath();
    ctx.moveTo(x - leafSize * 0.6, canvas.height - 40 - height * 0.65);
    ctx.lineTo(x + leafSize * 0.6, canvas.height - 40 - height * 0.65);
    ctx.lineTo(x, canvas.height - 40 - height * 0.9);
    ctx.closePath();
    ctx.fill();
}

// Inicializar elementos decorativos baseado na subfase
function initBackgroundDecorations() {
    backgroundBirds = [];
    butterflies = [];
    fallingLeaves = [];
    fireflies = [];
    cacti = [];
    mirages = [];
    heatWaves = [];
    desertBirds = [];

    if (currentArea === 1 && currentSubstage >= 1 && currentSubstage <= 6) {
        if (currentSubstage === 1) {
            // 1-1: Pássaros voando no fundo
            for (let i = 0; i < 3; i++) {
                backgroundBirds.push({
                    x: Math.random() * canvas.width,
                    y: 80 + Math.random() * 100,
                    speed: 0.5 + Math.random() * 0.5,
                    size: 0.4 + Math.random() * 0.2,
                    wingFlap: 0,
                    color: ['#8B4513', '#654321', '#A0522D'][Math.floor(Math.random() * 3)]
                });
            }
        } else if (currentSubstage === 2) {
            // 1-2: Borboletas
            for (let i = 0; i < 4; i++) {
                butterflies.push({
                    x: Math.random() * canvas.width,
                    y: 100 + Math.random() * 150,
                    speedX: (Math.random() - 0.5) * 0.8,
                    speedY: Math.sin(Math.random() * Math.PI * 2) * 0.3,
                    size: 0.6 + Math.random() * 0.4,
                    wingFlap: Math.random() * Math.PI * 2,
                    color: ['#FFD700', '#FF69B4', '#87CEEB', '#FF6347'][Math.floor(Math.random() * 4)]
                });
            }
        } else if (currentSubstage === 3) {
            // 1-3: Pássaros + folhas caindo
            for (let i = 0; i < 2; i++) {
                backgroundBirds.push({
                    x: Math.random() * canvas.width,
                    y: 70 + Math.random() * 80,
                    speed: 0.4 + Math.random() * 0.4,
                    size: 0.35 + Math.random() * 0.15,
                    wingFlap: 0,
                    color: ['#8B4513', '#654321'][Math.floor(Math.random() * 2)]
                });
            }
            for (let i = 0; i < 5; i++) {
                fallingLeaves.push({
                    x: Math.random() * canvas.width,
                    y: -20 - Math.random() * 50,
                    speedX: (Math.random() - 0.5) * 0.5,
                    speedY: 0.3 + Math.random() * 0.4,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.05,
                    size: 0.5 + Math.random() * 0.5,
                    color: ['#FF8C00', '#FFA500', '#FF6347'][Math.floor(Math.random() * 3)]
                });
            }
        } else if (currentSubstage === 4) {
            // 1-4: Combinação de todos os elementos
            for (let i = 0; i < 2; i++) {
                backgroundBirds.push({
                    x: Math.random() * canvas.width,
                    y: 90 + Math.random() * 90,
                    speed: 0.5 + Math.random() * 0.5,
                    size: 0.4 + Math.random() * 0.2,
                    wingFlap: 0,
                    color: ['#8B4513', '#654321', '#A0522D'][Math.floor(Math.random() * 3)]
                });
            }
            for (let i = 0; i < 3; i++) {
                butterflies.push({
                    x: Math.random() * canvas.width,
                    y: 120 + Math.random() * 120,
                    speedX: (Math.random() - 0.5) * 0.7,
                    speedY: Math.sin(Math.random() * Math.PI * 2) * 0.3,
                    size: 0.6 + Math.random() * 0.4,
                    wingFlap: Math.random() * Math.PI * 2,
                    color: ['#FFD700', '#FF69B4', '#87CEEB'][Math.floor(Math.random() * 3)]
                });
            }
            for (let i = 0; i < 4; i++) {
                fallingLeaves.push({
                    x: Math.random() * canvas.width,
                    y: -20 - Math.random() * 40,
                    speedX: (Math.random() - 0.5) * 0.4,
                    speedY: 0.3 + Math.random() * 0.3,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.04,
                    size: 0.5 + Math.random() * 0.5,
                    color: ['#FF8C00', '#FFA500', '#FF6347', '#32CD32'][Math.floor(Math.random() * 4)]
                });
            }
        } else if (currentSubstage === 5) {
            // 1-5: Crepúsculo - Morcegos voando
            for (let i = 0; i < 3; i++) {
                backgroundBirds.push({
                    x: Math.random() * canvas.width,
                    y: 100 + Math.random() * 120,
                    speed: 0.6 + Math.random() * 0.4,
                    size: 0.3 + Math.random() * 0.15,
                    wingFlap: 0,
                    color: '#2C2C2C', // Cor escura para morcegos
                    isBat: true
                });
            }
            // Algumas folhas ainda caindo
            for (let i = 0; i < 3; i++) {
                fallingLeaves.push({
                    x: Math.random() * canvas.width,
                    y: -20 - Math.random() * 30,
                    speedX: (Math.random() - 0.5) * 0.3,
                    speedY: 0.2 + Math.random() * 0.3,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.03,
                    size: 0.4 + Math.random() * 0.4,
                    color: ['#8B4513', '#654321', '#5D4037'][Math.floor(Math.random() * 3)] // Folhas mais escuras
                });
            }
        } else if (currentSubstage === 6) {
            // 1-6: Quase noite - Morcegos + primeiros vaga-lumes
            for (let i = 0; i < 4; i++) {
                backgroundBirds.push({
                    x: Math.random() * canvas.width,
                    y: 110 + Math.random() * 100,
                    speed: 0.7 + Math.random() * 0.3,
                    size: 0.3 + Math.random() * 0.15,
                    wingFlap: 0,
                    color: '#1a1a1a', // Morcegos mais escuros
                    isBat: true
                });
            }
            // Primeiros vaga-lumes aparecendo
            for (let i = 0; i < 5; i++) {
                fireflies.push({
                    x: 50 + Math.random() * (canvas.width - 100),
                    y: 150 + Math.random() * 150,
                    speedX: (Math.random() - 0.5) * 0.3,
                    speedY: (Math.random() - 0.5) * 0.3,
                    glowPhase: Math.random() * Math.PI * 2,
                    glowSpeed: 0.02 + Math.random() * 0.02
                });
            }
        }
    } else if (currentArea === 2 && currentSubstage >= 1 && currentSubstage <= 7) {
        // Área 2: Deserto
        if (currentSubstage === 1) {
            // 2-1: Deserto fresco - Cactos e pássaros
            for (let i = 0; i < 3; i++) {
                cacti.push({
                    x: 150 + i * 200,
                    y: canvas.height - 60,
                    size: 60 + Math.random() * 40
                });
            }
            for (let i = 0; i < 2; i++) {
                desertBirds.push({
                    x: Math.random() * canvas.width,
                    y: 100 + Math.random() * 80,
                    speed: 0.4 + Math.random() * 0.3,
                    size: 0.5 + Math.random() * 0.3,
                    wingFlap: Math.random() * Math.PI * 2,
                    color: '#D2691E',
                    wingColor: '#CD853F'
                });
            }
        } else if (currentSubstage === 2) {
            // 2-2: Começando a esquentar - Mais cactos
            for (let i = 0; i < 4; i++) {
                cacti.push({
                    x: 100 + i * 180,
                    y: canvas.height - 60,
                    size: 50 + Math.random() * 50
                });
            }
            for (let i = 0; i < 2; i++) {
                heatWaves.push({
                    x: -200 + i * 400,
                    y: canvas.height / 2,
                    width: 150,
                    height: 30,
                    speed: 0.3,
                    alpha: 0.1,
                    time: Math.random() * 100
                });
            }
        } else if (currentSubstage === 3) {
            // 2-3: Esquentando - Cactos e ondas de calor
            for (let i = 0; i < 3; i++) {
                cacti.push({
                    x: 120 + i * 250,
                    y: canvas.height - 60,
                    size: 55 + Math.random() * 45
                });
            }
            for (let i = 0; i < 3; i++) {
                heatWaves.push({
                    x: -200 + i * 300,
                    y: canvas.height / 2 + 20,
                    width: 180,
                    height: 40,
                    speed: 0.4,
                    alpha: 0.15,
                    time: Math.random() * 100
                });
            }
            for (let i = 0; i < 1; i++) {
                desertBirds.push({
                    x: Math.random() * canvas.width,
                    y: 90 + Math.random() * 70,
                    speed: 0.5 + Math.random() * 0.3,
                    size: 0.4 + Math.random() * 0.3,
                    wingFlap: Math.random() * Math.PI * 2,
                    color: '#CD853F',
                    wingColor: '#D2691E'
                });
            }
        } else if (currentSubstage === 4) {
            // 2-4: Quente - Cactos, ondas de calor e primeira miragem
            for (let i = 0; i < 4; i++) {
                cacti.push({
                    x: 100 + i * 200,
                    y: canvas.height - 60,
                    size: 50 + Math.random() * 50
                });
            }
            for (let i = 0; i < 4; i++) {
                heatWaves.push({
                    x: -200 + i * 250,
                    y: canvas.height / 2 + 10,
                    width: 200,
                    height: 50,
                    speed: 0.5,
                    alpha: 0.2,
                    time: Math.random() * 100
                });
            }
            mirages.push({
                x: canvas.width / 2,
                y: canvas.height / 2 - 50,
                alpha: 0.2,
                time: Math.random() * 100
            });
        } else if (currentSubstage === 5) {
            // 2-5: Muito quente - Mais elementos de calor
            for (let i = 0; i < 3; i++) {
                cacti.push({
                    x: 150 + i * 220,
                    y: canvas.height - 60,
                    size: 45 + Math.random() * 45
                });
            }
            for (let i = 0; i < 5; i++) {
                heatWaves.push({
                    x: -200 + i * 200,
                    y: canvas.height / 2,
                    width: 220,
                    height: 60,
                    speed: 0.6,
                    alpha: 0.25,
                    time: Math.random() * 100
                });
            }
            for (let i = 0; i < 2; i++) {
                mirages.push({
                    x: 200 + i * 400,
                    y: canvas.height / 2 - 40,
                    alpha: 0.3,
                    time: Math.random() * 100
                });
            }
        } else if (currentSubstage === 6) {
            // 2-6: Extremamente quente - Todos os elementos
            for (let i = 0; i < 4; i++) {
                cacti.push({
                    x: 100 + i * 200,
                    y: canvas.height - 60,
                    size: 40 + Math.random() * 40
                });
            }
            for (let i = 0; i < 6; i++) {
                heatWaves.push({
                    x: -200 + i * 180,
                    y: canvas.height / 2 - 10,
                    width: 250,
                    height: 70,
                    speed: 0.7,
                    alpha: 0.3,
                    time: Math.random() * 100
                });
            }
            for (let i = 0; i < 3; i++) {
                mirages.push({
                    x: 150 + i * 300,
                    y: canvas.height / 2 - 30,
                    alpha: 0.4,
                    time: Math.random() * 100
                });
            }
        } else if (currentSubstage === 7) {
            // 2-7: Boss - Deserto extremo
            for (let i = 0; i < 5; i++) {
                cacti.push({
                    x: 80 + i * 160,
                    y: canvas.height - 60,
                    size: 35 + Math.random() * 35
                });
            }
            for (let i = 0; i < 8; i++) {
                heatWaves.push({
                    x: -200 + i * 150,
                    y: canvas.height / 2 - 20,
                    width: 280,
                    height: 80,
                    speed: 0.8,
                    alpha: 0.5,
                    time: Math.random() * 100
                });
            }
            for (let i = 0; i < 4; i++) {
                mirages.push({
                    x: 100 + i * 250,
                    y: canvas.height / 2 - 20,
                    alpha: 0.6,
                    time: Math.random() * 100
                });
            }
        }
    }
}

// Desenhar pássaro de fundo
function drawBackgroundBird(bird) {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.scale(bird.size, bird.size);
    
    bird.wingFlap += 0.15;
    const wingOffset = Math.sin(bird.wingFlap) * 5;
    
    if (bird.isBat) {
        // Desenhar morcego
        // Corpo pequeno
        ctx.fillStyle = bird.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Asas de morcego (mais alongadas e pontiagudas)
        ctx.fillStyle = bird.color;
        ctx.globalAlpha = 0.7;
        
        // Asa superior esquerda
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-15, -8 - wingOffset);
        ctx.lineTo(-25, -5 - wingOffset);
        ctx.lineTo(-20, 0);
        ctx.lineTo(-10, -2);
        ctx.closePath();
        ctx.fill();
        
        // Asa superior direita
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-15, 8 + wingOffset);
        ctx.lineTo(-25, 5 + wingOffset);
        ctx.lineTo(-20, 0);
        ctx.lineTo(-10, 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.globalAlpha = 1;
        
        // Cabeça pequena
        ctx.beginPath();
        ctx.arc(2, 0, 2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Desenhar pássaro normal
        // Corpo
        ctx.fillStyle = bird.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Asas
        ctx.fillStyle = bird.color;
        ctx.beginPath();
        ctx.ellipse(-5, wingOffset, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-5, -wingOffset, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Cabeça
        ctx.beginPath();
        ctx.arc(5, 0, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

// Desenhar borboleta
function drawButterfly(butterfly) {
    ctx.save();
    ctx.translate(butterfly.x, butterfly.y);
    ctx.scale(butterfly.size, butterfly.size);
    
    butterfly.wingFlap += 0.2;
    const wingAngle = Math.sin(butterfly.wingFlap) * 0.3;
    
    // Corpo
    ctx.fillStyle = '#333';
    ctx.fillRect(-1, -8, 2, 16);
    
    // Asas superiores
    ctx.fillStyle = butterfly.color;
    ctx.globalAlpha = 0.8;
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.beginPath();
    ctx.ellipse(-8, -5, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    ctx.save();
    ctx.rotate(-wingAngle);
    ctx.beginPath();
    ctx.ellipse(8, -5, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Asas inferiores
    ctx.globalAlpha = 0.6;
    ctx.save();
    ctx.rotate(wingAngle * 0.7);
    ctx.beginPath();
    ctx.ellipse(-6, 3, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    ctx.save();
    ctx.rotate(-wingAngle * 0.7);
    ctx.beginPath();
    ctx.ellipse(6, 3, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    ctx.globalAlpha = 1;
    ctx.restore();
}

// Desenhar folha caindo
function drawFallingLeaf(leaf) {
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.rotation);
    ctx.scale(leaf.size, leaf.size);
    
    ctx.fillStyle = leaf.color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-8, -5, -5, -10);
    ctx.quadraticCurveTo(0, -12, 5, -10);
    ctx.quadraticCurveTo(8, -5, 0, 0);
    ctx.closePath();
    ctx.fill();
    
    // Veia da folha
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -10);
    ctx.stroke();
    
    ctx.restore();
}

// Desenhar vaga-lume
function drawFirefly(firefly) {
    firefly.glowPhase += firefly.glowSpeed;
    const glow = 0.3 + Math.sin(firefly.glowPhase) * 0.7;
    
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(firefly.x, firefly.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Atualizar elementos decorativos
function updateBackgroundDecorations() {
    // Atualizar pássaros de fundo
    for (let bird of backgroundBirds) {
        bird.x += bird.speed;
        if (bird.x > canvas.width + 30) {
            bird.x = -30;
            bird.y = 80 + Math.random() * 100;
        }
    }
    
    // Atualizar borboletas
    for (let butterfly of butterflies) {
        butterfly.x += butterfly.speedX;
        butterfly.y += butterfly.speedY;
        
        // Movimento flutuante
        butterfly.speedY += Math.sin(Date.now() / 1000 + butterfly.x) * 0.01;
        butterfly.speedY = Math.max(-0.5, Math.min(0.5, butterfly.speedY));
        
        if (butterfly.x < -20) butterfly.x = canvas.width + 20;
        if (butterfly.x > canvas.width + 20) butterfly.x = -20;
        if (butterfly.y < 50) butterfly.speedY = Math.abs(butterfly.speedY);
        if (butterfly.y > canvas.height - 100) butterfly.speedY = -Math.abs(butterfly.speedY);
    }
    
    // Atualizar folhas caindo
    for (let i = fallingLeaves.length - 1; i >= 0; i--) {
        const leaf = fallingLeaves[i];
        leaf.x += leaf.speedX;
        leaf.y += leaf.speedY;
        leaf.rotation += leaf.rotationSpeed;
        
        if (leaf.y > canvas.height + 20) {
            // Reposicionar no topo
            leaf.y = -20 - Math.random() * 50;
            leaf.x = Math.random() * canvas.width;
        }
    }
    
    // Atualizar vaga-lumes
    for (let firefly of fireflies) {
        firefly.x += firefly.speedX;
        firefly.y += firefly.speedY;
        
        // Movimento flutuante suave
        firefly.speedX += Math.sin(Date.now() / 2000 + firefly.y) * 0.01;
        firefly.speedY += Math.cos(Date.now() / 1800 + firefly.x) * 0.01;
        
        // Limitar velocidade
        firefly.speedX = Math.max(-0.5, Math.min(0.5, firefly.speedX));
        firefly.speedY = Math.max(-0.5, Math.min(0.5, firefly.speedY));
        
        // Manter dentro da área visível
        if (firefly.x < 20) firefly.speedX = Math.abs(firefly.speedX);
        if (firefly.x > canvas.width - 20) firefly.speedX = -Math.abs(firefly.speedX);
        if (firefly.y < 100) firefly.speedY = Math.abs(firefly.speedY);
        if (firefly.y > canvas.height - 100) firefly.speedY = -Math.abs(firefly.speedY);
    }
}

// Calcular progresso da transição dia/noite (0 = dia completo, 1 = noite completa)
function getDayNightProgress() {
    if (currentArea !== 1 || currentSubstage >= 7) return 0; // 1-7 usa drawNightForestBackground
    // 1-1 = 0.0, 1-2 = 0.15, 1-3 = 0.3, 1-4 = 0.5, 1-5 = 0.7, 1-6 = 0.85
    const progress = (currentSubstage - 1) / 6;
    return Math.max(0, Math.min(0.85, progress)); // Máximo 0.85 para 1-6
}

// Calcular progresso do calor no deserto (0 = fresco, 1 = muito quente)
function getHeatProgress() {
    if (currentArea !== 2 || currentSubstage >= 7) return 0; // 2-7 usa drawExtremeDesertBackground
    // 2-1 = 0.0 (fresco), 2-2 = 0.2, 2-3 = 0.4, 2-4 = 0.6, 2-5 = 0.8, 2-6 = 1.0 (muito quente)
    const progress = (currentSubstage - 1) / 6;
    return Math.max(0, Math.min(1.0, progress));
}

// Interpolar entre duas cores
function interpolateColor(color1, color2, t) {
    // Converter hex para RGB
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return `rgb(${r}, ${g}, ${b})`;
}

// Desenhar cenário da floresta
function drawForestBackground() {
    const dayNightProgress = getDayNightProgress();
    
    // Interpolar cores do céu entre dia e noite
    const skyTopDay = '#87CEEB';
    const skyTopNight = '#0a0a20';
    const skyBottomDay = '#E0F6FF';
    const skyBottomNight = '#2a2a4a';
    
    const skyTop = interpolateColor(skyTopDay, skyTopNight, dayNightProgress);
    const skyBottom = interpolateColor(skyBottomDay, skyBottomNight, dayNightProgress);
    
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - 40);
    skyGradient.addColorStop(0, skyTop);
    skyGradient.addColorStop(1, skyBottom);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenhar estrelas gradualmente (quanto mais escuro, mais estrelas)
    if (dayNightProgress > 0.3) {
        ctx.fillStyle = 'white';
        const starCount = Math.floor(dayNightProgress * 50);
        for (let i = 0; i < starCount; i++) {
            const x = (i * 137) % canvas.width;
            const y = (i * 73) % (canvas.height - 100);
            const twinkle = 0.3 + Math.sin(Date.now() / 500 + i) * 0.7 * dayNightProgress;
            ctx.globalAlpha = twinkle * dayNightProgress;
            ctx.beginPath();
            ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Desenhar lua gradualmente
    if (dayNightProgress > 0.4) {
        const moonX = 650;
        const moonY = 80;
        const moonAlpha = (dayNightProgress - 0.4) / 0.6; // Aparece gradualmente
        ctx.fillStyle = '#fffacd';
        ctx.shadowColor = '#fffacd';
        ctx.shadowBlur = 30 * moonAlpha;
        ctx.globalAlpha = moonAlpha;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Crateras da lua
        ctx.fillStyle = `rgba(200, 195, 150, ${0.3 * moonAlpha})`;
        ctx.beginPath();
        ctx.arc(moonX - 10, moonY - 5, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(moonX + 15, moonY + 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Atualizar e desenhar nuvens (mais escuras conforme anoitece)
    for (let cloud of clouds) {
        cloud.x += cloud.speed;
        if (cloud.x > canvas.width + 100) {
            cloud.x = -100;
        }
        ctx.globalAlpha = 1 - dayNightProgress * 0.7; // Nuvens desaparecem gradualmente
        drawCloud(cloud.x, cloud.y, cloud.size);
        ctx.globalAlpha = 1;
    }

    // Atualizar elementos decorativos (variam por subfase)
    updateBackgroundDecorations();

    // Montanhas ao fundo (mais escuras conforme anoitece)
    const mountainColor1 = interpolateColor('#6B8E23', '#1a3a1a', dayNightProgress);
    const mountainColor2 = interpolateColor('#556B2F', '#0a2a0a', dayNightProgress);
    
    ctx.fillStyle = mountainColor1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 40);
    ctx.lineTo(150, canvas.height - 150);
    ctx.lineTo(300, canvas.height - 40);
    ctx.fill();
    
    ctx.fillStyle = mountainColor2;
    ctx.beginPath();
    ctx.moveTo(200, canvas.height - 40);
    ctx.lineTo(400, canvas.height - 180);
    ctx.lineTo(600, canvas.height - 40);
    ctx.fill();
    
    ctx.fillStyle = mountainColor1;
    ctx.beginPath();
    ctx.moveTo(500, canvas.height - 40);
    ctx.lineTo(700, canvas.height - 130);
    ctx.lineTo(800, canvas.height - 40);
    ctx.fill();
    
    // Desenhar folhas caindo (depois das montanhas, antes das árvores)
    for (let leaf of fallingLeaves) {
        drawFallingLeaf(leaf);
    }

    // Árvores de fundo (menores) - mais escuras conforme anoitece
    drawTree(50, 120, 12, dayNightProgress);
    drawTree(180, 100, 10, dayNightProgress);
    drawTree(620, 110, 11, dayNightProgress);
    drawTree(750, 130, 13, dayNightProgress);

    // Desenhar pássaros de fundo
    for (let bird of backgroundBirds) {
        drawBackgroundBird(bird);
    }

    // Desenhar borboletas
    for (let butterfly of butterflies) {
        drawButterfly(butterfly);
    }

    // Desenhar vaga-lumes (fase 1-6)
    for (let firefly of fireflies) {
        drawFirefly(firefly);
    }

    // Árvores de frente (maiores, nas laterais) - mais escuras conforme anoitece
    drawTree(-20, 180, 18, dayNightProgress);
    drawTree(820, 170, 16, dayNightProgress);

    // Grama com variação (mais escura conforme anoitece)
    const grassTop = interpolateColor('#2ecc71', '#1a4a1a', dayNightProgress);
    const grassBottom = interpolateColor('#27ae60', '#0a3a0a', dayNightProgress);
    const grassGradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height);
    grassGradient.addColorStop(0, grassTop);
    grassGradient.addColorStop(1, grassBottom);
    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    
    // Detalhes na grama
    const grassDetail = interpolateColor('#27ae60', '#0a3a0a', dayNightProgress);
    ctx.fillStyle = grassDetail;
    for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, canvas.height - 40);
        ctx.lineTo(i + 5, canvas.height - 50);
        ctx.lineTo(i + 10, canvas.height - 40);
        ctx.fill();
    }
    
    // Desenhar chuva (apenas na subfase 1-3)
    if (currentArea === 1 && currentSubstage === 3) {
        drawRain();
    }
}

// Desenhar cacto
function drawCactus(x, y, size, heatProgress) {
    ctx.save();
    ctx.translate(x, y);
    
    // Cacto fica mais "murcho" com o calor extremo
    const heatEffect = heatProgress * 0.1;
    const cactusSize = size * (1 - heatEffect);
    
    // Cor do cacto (mais amarelado com calor)
    const cactusColor = interpolateColor('#228B22', '#8B6914', heatProgress * 0.3);
    
    // Corpo principal
    ctx.fillStyle = cactusColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, cactusSize * 0.3, cactusSize * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Braço esquerdo
    ctx.beginPath();
    ctx.ellipse(-cactusSize * 0.25, -cactusSize * 0.2, cactusSize * 0.15, cactusSize * 0.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Braço direito
    ctx.beginPath();
    ctx.ellipse(cactusSize * 0.25, -cactusSize * 0.15, cactusSize * 0.15, cactusSize * 0.35, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Espinhos (menos visíveis com calor)
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1 - heatProgress * 0.5;
    for (let i = -cactusSize * 0.6; i < cactusSize * 0.6; i += cactusSize * 0.15) {
        ctx.beginPath();
        ctx.moveTo(i, -cactusSize * 0.3);
        ctx.lineTo(i, -cactusSize * 0.35);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    
    ctx.restore();
}

// Desenhar miragem (ondas de calor distorcendo a imagem)
function drawMirage(mirage) {
    ctx.save();
    ctx.globalAlpha = mirage.alpha;
    
    // Desenhar "reflexo" distorcido (simulando miragem)
    const distortion = Math.sin(mirage.time / 50) * 5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    
    // Forma ondulada da miragem
    for (let i = 0; i < 3; i++) {
        const y = mirage.y + i * 20 + distortion;
        ctx.beginPath();
        ctx.moveTo(mirage.x - 40, y);
        ctx.quadraticCurveTo(mirage.x, y + distortion, mirage.x + 40, y);
        ctx.quadraticCurveTo(mirage.x + 20, y - distortion, mirage.x - 40, y);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

// Desenhar onda de calor
function drawHeatWave(wave) {
    ctx.save();
    ctx.globalAlpha = wave.alpha;
    
    // Gradiente para onda de calor
    const gradient = ctx.createLinearGradient(wave.x - wave.width / 2, wave.y, wave.x + wave.width / 2, wave.y);
    gradient.addColorStop(0, 'rgba(255, 200, 0, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(wave.x - wave.width / 2, wave.y);
    ctx.quadraticCurveTo(wave.x, wave.y - wave.height, wave.x + wave.width / 2, wave.y);
    ctx.lineTo(wave.x + wave.width / 2, canvas.height);
    ctx.lineTo(wave.x - wave.width / 2, canvas.height);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

// Desenhar pássaro do deserto
function drawDesertBird(bird) {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.scale(bird.size, bird.size);
    
    bird.wingFlap += 0.12;
    const wingOffset = Math.sin(bird.wingFlap) * 4;
    
    // Corpo
    ctx.fillStyle = bird.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Asas
    ctx.fillStyle = bird.wingColor || bird.color;
    ctx.beginPath();
    ctx.ellipse(-5, wingOffset, 8, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-5, -wingOffset, 8, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Cabeça
    ctx.beginPath();
    ctx.arc(3, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Bico
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(8, -1);
    ctx.lineTo(8, 1);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

// Desenhar cenário genérico (para outras áreas por enquanto)
function drawGenericBackground() {
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Nuvens
    for (let cloud of clouds) {
        cloud.x += cloud.speed;
        if (cloud.x > canvas.width + 100) {
            cloud.x = -100;
        }
        drawCloud(cloud.x, cloud.y, cloud.size);
    }

    // Grama
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
}

// Desenhar cenário noturno da floresta (para o boss Coruja)
function drawNightForestBackground() {
    // Céu noturno
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - 40);
    skyGradient.addColorStop(0, '#0a0a20');
    skyGradient.addColorStop(0.5, '#1a1a3a');
    skyGradient.addColorStop(1, '#2a2a4a');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Estrelas
    ctx.fillStyle = 'white';
    for (let i = 0; i < 50; i++) {
        const x = (i * 137) % canvas.width;
        const y = (i * 73) % (canvas.height - 100);
        const twinkle = 0.5 + Math.sin(Date.now() / 500 + i) * 0.5;
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Lua
    const moonX = 650;
    const moonY = 80;
    ctx.fillStyle = '#fffacd';
    ctx.shadowColor = '#fffacd';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Crateras da lua
    ctx.fillStyle = 'rgba(200, 195, 150, 0.3)';
    ctx.beginPath();
    ctx.arc(moonX - 10, moonY - 5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(moonX + 15, moonY + 10, 5, 0, Math.PI * 2);
    ctx.fill();

    // Montanhas escuras
    ctx.fillStyle = '#1a3a1a';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 40);
    ctx.lineTo(150, canvas.height - 150);
    ctx.lineTo(300, canvas.height - 40);
    ctx.fill();
    
    ctx.fillStyle = '#0a2a0a';
    ctx.beginPath();
    ctx.moveTo(200, canvas.height - 40);
    ctx.lineTo(400, canvas.height - 180);
    ctx.lineTo(600, canvas.height - 40);
    ctx.fill();
    
    ctx.fillStyle = '#1a3a1a';
    ctx.beginPath();
    ctx.moveTo(500, canvas.height - 40);
    ctx.lineTo(700, canvas.height - 130);
    ctx.lineTo(800, canvas.height - 40);
    ctx.fill();

    // Árvores silhueta (escuras)
    drawNightTree(50, 120, 12);
    drawNightTree(180, 100, 10);
    drawNightTree(620, 110, 11);
    drawNightTree(750, 130, 13);
    drawNightTree(-20, 180, 18);
    drawNightTree(820, 170, 16);

    // Grama noturna
    const grassGradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height);
    grassGradient.addColorStop(0, '#1a4a1a');
    grassGradient.addColorStop(1, '#0a3a0a');
    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    
    // Detalhes na grama
    ctx.fillStyle = '#0a3a0a';
    for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, canvas.height - 40);
        ctx.lineTo(i + 5, canvas.height - 50);
        ctx.lineTo(i + 10, canvas.height - 40);
        ctx.fill();
    }
    
    // Vaga-lumes flutuantes
    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < 8; i++) {
        const fx = 50 + (i * 100) + Math.sin(Date.now() / 800 + i * 2) * 30;
        const fy = 200 + Math.sin(Date.now() / 600 + i) * 50;
        const glow = 0.3 + Math.sin(Date.now() / 300 + i) * 0.7;
        ctx.globalAlpha = glow;
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

// Desenhar cenário do deserto com transição de calor
function drawDesertBackground() {
    const heatProgress = getHeatProgress();
    
    // Interpolar cores do céu entre fresco e quente
    const skyTopCool = '#87CEEB'; // Azul claro (fresco)
    const skyTopHot = '#FF8C00'; // Laranja (quente)
    const skyBottomCool = '#E0F6FF'; // Azul muito claro
    const skyBottomHot = '#FF6347'; // Vermelho-laranja
    
    const skyTop = interpolateColor(skyTopCool, skyTopHot, heatProgress);
    const skyBottom = interpolateColor(skyBottomCool, skyBottomHot, heatProgress);
    
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - 40);
    skyGradient.addColorStop(0, skyTop);
    skyGradient.addColorStop(1, skyBottom);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Sol (mais intenso com calor)
    const sunX = 700;
    const sunY = 100;
    const sunSize = 50 + heatProgress * 20;
    const sunGlow = 30 + heatProgress * 40;
    
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FF8C00';
    ctx.shadowBlur = sunGlow;
    ctx.globalAlpha = 0.8 + heatProgress * 0.2;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    
    // Ondas de calor (mais visíveis com calor)
    if (heatProgress > 0.3) {
        for (let wave of heatWaves) {
            wave.x += wave.speed;
            wave.time += 0.5;
            if (wave.x > canvas.width + 200) {
                wave.x = -200;
            }
            wave.alpha = (heatProgress - 0.3) * 0.5;
            drawHeatWave(wave);
        }
    }
    
    // Nuvens (menos visíveis com calor)
    for (let cloud of clouds) {
        cloud.x += cloud.speed;
        if (cloud.x > canvas.width + 100) {
            cloud.x = -100;
        }
        ctx.globalAlpha = 1 - heatProgress * 0.8; // Nuvens desaparecem com calor
        drawCloud(cloud.x, cloud.y, cloud.size);
        ctx.globalAlpha = 1;
    }
    
    // Atualizar elementos decorativos
    updateDesertDecorations();
    
    // Dunas de areia ao fundo (mais avermelhadas com calor)
    const duneColor1 = interpolateColor('#D2B48C', '#CD853F', heatProgress);
    const duneColor2 = interpolateColor('#DEB887', '#A0522D', heatProgress);
    
    ctx.fillStyle = duneColor1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 40);
    ctx.quadraticCurveTo(200, canvas.height - 120, 400, canvas.height - 40);
    ctx.lineTo(0, canvas.height - 40);
    ctx.fill();
    
    ctx.fillStyle = duneColor2;
    ctx.beginPath();
    ctx.moveTo(300, canvas.height - 40);
    ctx.quadraticCurveTo(500, canvas.height - 140, 700, canvas.height - 40);
    ctx.lineTo(300, canvas.height - 40);
    ctx.fill();
    
    ctx.fillStyle = duneColor1;
    ctx.beginPath();
    ctx.moveTo(600, canvas.height - 40);
    ctx.quadraticCurveTo(750, canvas.height - 110, 800, canvas.height - 40);
    ctx.lineTo(600, canvas.height - 40);
    ctx.fill();
    
    // Desenhar cactos
    for (let cactus of cacti) {
        drawCactus(cactus.x, cactus.y, cactus.size, heatProgress);
    }
    
    // Desenhar pássaros do deserto
    for (let bird of desertBirds) {
        drawDesertBird(bird);
    }
    
    // Desenhar miragens (apenas quando muito quente)
    if (heatProgress > 0.5) {
        for (let mirage of mirages) {
            mirage.time += 0.3;
            mirage.alpha = (heatProgress - 0.5) * 0.6;
            drawMirage(mirage);
        }
    }
    
    // Areia (mais avermelhada com calor)
    const sandTop = interpolateColor('#F4A460', '#CD853F', heatProgress);
    const sandBottom = interpolateColor('#DEB887', '#A0522D', heatProgress);
    const sandGradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height);
    sandGradient.addColorStop(0, sandTop);
    sandGradient.addColorStop(1, sandBottom);
    ctx.fillStyle = sandGradient;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    
    // Detalhes na areia (ondas de calor)
    ctx.fillStyle = interpolateColor('#E6D5B8', '#8B4513', heatProgress);
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, canvas.height - 40);
        ctx.quadraticCurveTo(i + 20, canvas.height - 45, i + 40, canvas.height - 40);
        ctx.stroke();
    }
}

// Desenhar cenário extremo do deserto (para o boss Falcão - 2-7)
function drawExtremeDesertBackground() {
    // Céu extremamente quente (vermelho-laranja intenso)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - 40);
    skyGradient.addColorStop(0, '#FF4500'); // Vermelho-laranja
    skyGradient.addColorStop(0.5, '#FF6347'); // Tomate
    skyGradient.addColorStop(1, '#CD5C5C'); // Vermelho indiano
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Sol extremamente intenso
    const sunX = 700;
    const sunY = 100;
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FF4500';
    ctx.shadowBlur = 80;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Múltiplas ondas de calor intensas
    for (let wave of heatWaves) {
        wave.x += wave.speed * 1.5;
        wave.time += 1;
        if (wave.x > canvas.width + 200) {
            wave.x = -200;
        }
        wave.alpha = 0.6;
        drawHeatWave(wave);
    }
    
    // Miragens intensas
    for (let mirage of mirages) {
        mirage.time += 0.5;
        mirage.alpha = 0.7;
        drawMirage(mirage);
    }
    
    // Dunas extremamente avermelhadas
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 40);
    ctx.quadraticCurveTo(200, canvas.height - 120, 400, canvas.height - 40);
    ctx.lineTo(0, canvas.height - 40);
    ctx.fill();
    
    ctx.fillStyle = '#A0522D';
    ctx.beginPath();
    ctx.moveTo(300, canvas.height - 40);
    ctx.quadraticCurveTo(500, canvas.height - 140, 700, canvas.height - 40);
    ctx.lineTo(300, canvas.height - 40);
    ctx.fill();
    
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(600, canvas.height - 40);
    ctx.quadraticCurveTo(750, canvas.height - 110, 800, canvas.height - 40);
    ctx.lineTo(600, canvas.height - 40);
    ctx.fill();
    
    // Cactos murchos
    for (let cactus of cacti) {
        drawCactus(cactus.x, cactus.y, cactus.size, 1.0);
    }
    
    // Pássaros do deserto
    for (let bird of desertBirds) {
        drawDesertBird(bird);
    }
    
    // Areia extremamente quente
    const sandGradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height);
    sandGradient.addColorStop(0, '#CD853F');
    sandGradient.addColorStop(1, '#8B4513');
    ctx.fillStyle = sandGradient;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    
    // Ondas de calor na areia
    ctx.strokeStyle = '#A0522D';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, canvas.height - 40);
        ctx.quadraticCurveTo(i + 15, canvas.height - 48, i + 30, canvas.height - 40);
        ctx.stroke();
    }
}

// Atualizar elementos decorativos do deserto
function updateDesertDecorations() {
    // Atualizar pássaros do deserto
    for (let bird of desertBirds) {
        bird.x += bird.speed;
        if (bird.x > canvas.width + 50) {
            bird.x = -50;
        }
    }
    
    // Atualizar miragens
    for (let mirage of mirages) {
        mirage.time += 0.2;
    }
}

// Árvore silhueta para cena noturna
function drawNightTree(x, height, trunkWidth) {
    // Tronco escuro
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - trunkWidth/2, canvas.height - 40 - height * 0.4, trunkWidth, height * 0.4 + 40);
    
    // Copa escura (silhueta)
    const leafSize = height * 0.35;
    
    ctx.fillStyle = '#0a1a0a';
    ctx.beginPath();
    ctx.moveTo(x - leafSize, canvas.height - 40 - height * 0.3);
    ctx.lineTo(x + leafSize, canvas.height - 40 - height * 0.3);
    ctx.lineTo(x, canvas.height - 40 - height * 0.6);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#0a2a0a';
    ctx.beginPath();
    ctx.moveTo(x - leafSize * 0.8, canvas.height - 40 - height * 0.5);
    ctx.lineTo(x + leafSize * 0.8, canvas.height - 40 - height * 0.5);
    ctx.lineTo(x, canvas.height - 40 - height * 0.75);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#0a1a0a';
    ctx.beginPath();
    ctx.moveTo(x - leafSize * 0.6, canvas.height - 40 - height * 0.65);
    ctx.lineTo(x + leafSize * 0.6, canvas.height - 40 - height * 0.65);
    ctx.lineTo(x, canvas.height - 40 - height * 0.9);
    ctx.closePath();
    ctx.fill();
}

function draw() {
    // Desenhar cenário baseado na área atual
    if (currentArea === 1) {
        // Fase do boss (Coruja) = noite
        if (currentSubstage === 7) {
            drawNightForestBackground();
        } else {
            drawForestBackground();
        }
    } else if (currentArea === 2) {
        // Fase do boss (Falcão) = deserto extremo
        if (currentSubstage === 7) {
            drawExtremeDesertBackground();
        } else {
            drawDesertBackground();
        }
    } else {
        drawGenericBackground();
    }

    if (isBonusStage) {
        // Fase bônus - desenhar buracos e minhocas
        drawWormHoles();
        
        // Efeitos de captura
        drawWormEatEffects();
        
        // Apenas o player
        drawBird(player, true);
    } else {
        // Fase normal
        // Comidas
        drawFood();

        // Gavião (fase 1-6 e 2-6)
        drawHawk();

        // Pássaros
        drawBird(player, true);
        drawBird(cpu, false);
    }
    
    // Desenhar UI no canvas
    drawGameUI();
}

// Desenhar UI do jogo no canvas
function drawGameUI() {
    const padding = 15;
    const fontSize = 22; // Aumentado de 18 para 22
    const topY = padding;
    const boxHeight = 45; // Aumentado de 35 para 45
    
    ctx.save();
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = 'top';
    
    if (isBonusStage) {
        // UI da fase bônus - Player esquerda, Tempo centro
        // Player (Minhocas) - Superior esquerdo
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        const playerText = `🪱 Minhocas: ${playerScore} / 25`;
        const playerWidth = ctx.measureText(playerText).width + 25;
        ctx.fillRect(padding, topY, playerWidth, boxHeight);
        
        ctx.fillStyle = '#f39c12';
        ctx.fillText(playerText, padding + 12, topY + 12);
        
        // Timer - Centro (apenas número, cor que se destaca do céu)
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        const timerText = `${timeLeft}s`;
        const timerWidth = ctx.measureText(timerText).width + 25;
        ctx.fillRect(canvas.width / 2 - timerWidth / 2, topY, timerWidth, boxHeight);
        
        // Cor amarela/laranja para se destacar do céu azul
        ctx.fillStyle = timeLeft <= 10 ? '#ff4444' : '#ffaa00';
        // Sombra para melhor visibilidade
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(timerText, canvas.width / 2, topY + 12);
        ctx.shadowBlur = 0;
    } else {
        // Fase normal
        // Player - Superior esquerdo
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        const playerText = `🐦 Você: ${playerScore}`;
        const playerWidth = ctx.measureText(playerText).width + 25;
        ctx.fillRect(padding, topY, playerWidth, boxHeight);
        
        ctx.fillStyle = '#2ecc71';
        ctx.fillText(playerText, padding + 12, topY + 12);
        
        // Timer - Centro (apenas número, cor que se destaca do céu)
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        const timerText = `${timeLeft}s`;
        const timerWidth = ctx.measureText(timerText).width + 25;
        ctx.fillRect(canvas.width / 2 - timerWidth / 2, topY, timerWidth, boxHeight);
        
        // Cor amarela/laranja para se destacar do céu azul
        ctx.fillStyle = timeLeft <= 10 ? '#ff4444' : '#ffaa00';
        // Sombra para melhor visibilidade
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(timerText, canvas.width / 2, topY + 12);
        ctx.shadowBlur = 0;
        
        // CPU - Superior direito
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        const cpuText = `🤖 CPU: ${cpuScore}`;
        const cpuWidth = ctx.measureText(cpuText).width + 25;
        ctx.fillRect(canvas.width - padding - cpuWidth, topY, cpuWidth, boxHeight);
        
        ctx.fillStyle = '#e74c3c';
        ctx.fillText(cpuText, canvas.width - padding - 12, topY + 12);
        
        // Barra de Stun - Canto inferior esquerdo (mais baixo possível)
        const stunBarWidth = 200; // Aumentado de 180 para 200
        const stunBarHeight = 22; // Aumentado de 18 para 22
        const stunBarX = padding + 10;
        const stunBarY = canvas.height - padding - stunBarHeight; // Mais baixo possível
        
        // Fundo mais transparente para stun (aumentado para acomodar texto maior)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(padding, stunBarY - 5, stunBarWidth + 140, stunBarHeight + 10);
        
        // Fundo da barra
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(stunBarX, stunBarY, stunBarWidth, stunBarHeight);
        
        // Preenchimento da barra
        const stunProgress = player.stunCharge / 20;
        ctx.fillStyle = player.stunCharge >= 20 ? '#f39c12' : '#9b59b6';
        ctx.fillRect(stunBarX, stunBarY, stunBarWidth * stunProgress, stunBarHeight);
        
        // Borda da barra
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(stunBarX, stunBarY, stunBarWidth, stunBarHeight);
        
        // Texto do stun (aumentado)
        ctx.textAlign = 'left';
        ctx.font = `bold ${fontSize - 1}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        if (player.stunCharge >= 20) {
            // Mostrar timer quando stun está pronto
            const secondsLeft = Math.ceil(player.stunChargeTimer / 60);
            ctx.fillText(`💥 ⚡${secondsLeft}s`, stunBarX + stunBarWidth + 10, stunBarY + 3);
            
            // Aviso quando tempo está acabando
            if (secondsLeft <= 2) {
                ctx.fillStyle = '#e74c3c';
                ctx.font = `bold ${fontSize + 1}px Arial`;
                ctx.fillText('⚠️', stunBarX + stunBarWidth + 10, stunBarY + 25);
                ctx.font = `bold ${fontSize - 1}px Arial`;
            } else {
                ctx.fillStyle = '#2ecc71';
                ctx.font = `bold ${fontSize + 1}px Arial`;
                ctx.fillText('⚡', stunBarX + stunBarWidth + 10, stunBarY + 25);
                ctx.font = `bold ${fontSize - 1}px Arial`;
            }
        } else {
            ctx.fillText(`💥 ${player.stunCharge}/20`, stunBarX + stunBarWidth + 10, stunBarY + 3);
        }
    }
    
    ctx.restore();
}

// Desenhar pássaro feliz (vencedor)
function drawHappyBird(ctxW, x, y, color, wingColor, scale) {
    ctxW.save();
    ctxW.translate(x, y);
    ctxW.scale(scale, scale);
    
    // Aura de vitória
    ctxW.shadowColor = color;
    ctxW.shadowBlur = 15;
    
    // Corpo
    ctxW.fillStyle = color;
    ctxW.beginPath();
    ctxW.arc(0, 0, 35, 0, Math.PI * 2);
    ctxW.fill();
    
    ctxW.shadowBlur = 0;
    
    // Olho feliz
    ctxW.fillStyle = 'white';
    ctxW.beginPath();
    ctxW.arc(10, -5, 10, 0, Math.PI * 2);
    ctxW.fill();
    
    // Pupila brilhante
    ctxW.fillStyle = 'black';
    ctxW.beginPath();
    ctxW.arc(12, -5, 5, 0, Math.PI * 2);
    ctxW.fill();
    
    // Brilho no olho
    ctxW.fillStyle = 'white';
    ctxW.beginPath();
    ctxW.arc(10, -7, 2, 0, Math.PI * 2);
    ctxW.fill();
    
    // Sobrancelha feliz (arqueada para cima)
    ctxW.strokeStyle = 'black';
    ctxW.lineWidth = 2;
    ctxW.beginPath();
    ctxW.arc(12, -15, 8, Math.PI * 0.2, Math.PI * 0.8);
    ctxW.stroke();
    
    // Bico sorrindo (aberto)
    ctxW.fillStyle = '#f39c12';
    ctxW.beginPath();
    ctxW.moveTo(30, -2);
    ctxW.lineTo(48, 3);
    ctxW.lineTo(30, 8);
    ctxW.closePath();
    ctxW.fill();
    
    // Bochecha rosada
    ctxW.fillStyle = 'rgba(255, 150, 150, 0.5)';
    ctxW.beginPath();
    ctxW.arc(20, 8, 8, 0, Math.PI * 2);
    ctxW.fill();
    
    // Asa parada (para cima, celebrando)
    ctxW.fillStyle = wingColor;
    ctxW.beginPath();
    ctxW.ellipse(-10, -5, 20, 14, -0.5, 0, Math.PI * 2);
    ctxW.fill();
    
    ctxW.restore();
}

// Desenhar pássaro triste (perdedor)
function drawSadBird(ctxW, x, y, color, wingColor, scale) {
    ctxW.save();
    ctxW.translate(x, y);
    ctxW.scale(scale, scale);
    
    // Sem aura (perdeu)
    
    // Corpo (mais escuro/apagado)
    ctxW.fillStyle = color;
    ctxW.globalAlpha = 0.7;
    ctxW.beginPath();
    ctxW.arc(0, 0, 35, 0, Math.PI * 2);
    ctxW.fill();
    ctxW.globalAlpha = 1;
    
    // Olho triste
    ctxW.fillStyle = 'white';
    ctxW.beginPath();
    ctxW.arc(10, -5, 10, 0, Math.PI * 2);
    ctxW.fill();
    
    // Pupila olhando para baixo
    ctxW.fillStyle = 'black';
    ctxW.beginPath();
    ctxW.arc(10, -2, 5, 0, Math.PI * 2);
    ctxW.fill();
    
    // Sobrancelha triste (inclinada para baixo)
    ctxW.strokeStyle = 'black';
    ctxW.lineWidth = 2;
    ctxW.beginPath();
    ctxW.moveTo(2, -12);
    ctxW.lineTo(20, -18);
    ctxW.stroke();
    
    // Bico fechado e triste
    ctxW.fillStyle = '#f39c12';
    ctxW.beginPath();
    ctxW.moveTo(30, 2);
    ctxW.lineTo(45, 8);
    ctxW.lineTo(30, 12);
    ctxW.closePath();
    ctxW.fill();
    
    // Lágrima
    ctxW.fillStyle = '#3498db';
    ctxW.beginPath();
    ctxW.ellipse(22, 8, 3, 5, 0, 0, Math.PI * 2);
    ctxW.fill();
    
    // Asa caída (triste)
    ctxW.fillStyle = wingColor;
    ctxW.globalAlpha = 0.7;
    ctxW.beginPath();
    ctxW.ellipse(-10, 15, 20, 10, 0.3, 0, Math.PI * 2);
    ctxW.fill();
    ctxW.globalAlpha = 1;
    
    ctxW.restore();
}

// Desenhar cena de vitória especial do boss
function drawBossVictoryScene() {
    const winnerCanvas = document.getElementById('winnerCanvas');
    const ctxW = winnerCanvas.getContext('2d');
    
    let animFrame;
    let time = 0;
    const particles = [];
    
    // Criar partículas de fogos de artifício (reduzido para melhor performance)
    for (let i = 0; i < 15; i++) { // Reduzido de 30 para 15
        particles.push({
            x: 200 + (Math.random() - 0.5) * 100,
            y: 50 + Math.random() * 50,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 1,
            decay: 0.015 + Math.random() * 0.02,
            color: ['#FFD700', '#FF6347', '#FF1493', '#00CED1', '#FF4500'][Math.floor(Math.random() * 5)],
            size: 2 + Math.random() * 3 // Reduzido tamanho
        });
    }
    
    function animate() {
        time += 0.03; // Reduzido para melhor performance
        ctxW.clearRect(0, 0, winnerCanvas.width, winnerCanvas.height);
        
        const scale = 1.5;
        const bounce = Math.sin(time * 2) * 5;
        
        // Fundo com gradiente dourado
        const gradient = ctxW.createLinearGradient(0, 0, 0, winnerCanvas.height);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 140, 0, 0.2)');
        ctxW.fillStyle = gradient;
        ctxW.fillRect(0, 0, winnerCanvas.width, winnerCanvas.height);
        
        // Coroa grande e brilhante
        ctxW.font = '50px Arial';
        ctxW.textAlign = 'center';
        ctxW.shadowColor = '#FFD700';
        ctxW.shadowBlur = 20;
        ctxW.fillStyle = '#FFD700';
        ctxW.fillText('👑', 200, 35 + bounce);
        ctxW.shadowBlur = 0;
        
        // Múltiplas coroas pequenas ao redor (reduzido para melhor performance)
        for (let i = 0; i < 6; i++) { // Reduzido de 8 para 6
            const angle = (i / 6) * Math.PI * 2 + time;
            const dist = 80;
            ctxW.font = '18px Arial'; // Reduzido tamanho da fonte
            ctxW.globalAlpha = 0.6;
            ctxW.fillText('👑', 200 + Math.cos(angle) * dist, 85 + Math.sin(angle) * dist * 0.5);
        }
        ctxW.globalAlpha = 1;
        
        // Partículas de fogos de artifício (otimizado)
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08; // Gravidade reduzida
            p.life -= p.decay;
            
            if (p.life > 0) {
                ctxW.globalAlpha = p.life;
                // Remover shadowBlur para melhor performance
                ctxW.fillStyle = p.color;
                ctxW.beginPath();
                ctxW.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctxW.fill();
                
                // Estrelas brilhantes (apenas se vida > 0.5 para reduzir desenho)
                if (p.life > 0.5) {
                    ctxW.font = '12px Arial'; // Fonte menor
                    ctxW.fillText('⭐', p.x, p.y);
                }
            } else {
                // Reposicionar partícula
                p.x = 200 + (Math.random() - 0.5) * 100;
                p.y = 50 + Math.random() * 50;
                p.vx = (Math.random() - 0.5) * 3;
                p.vy = (Math.random() - 0.5) * 3;
                p.life = 1;
            }
        }
        ctxW.globalAlpha = 1;
        
        // Pássaro do jogador grande e triunfante
        drawHappyBird(ctxW, 200, 85 + bounce, selectedPlayerColor, selectedPlayerWing, scale);
        
        // Aura dourada ao redor do pássaro (sem shadow para melhor performance)
        ctxW.strokeStyle = '#FFD700';
        ctxW.lineWidth = 2;
        ctxW.globalAlpha = 0.5 + Math.sin(time * 2) * 0.2; // Animação mais suave
        ctxW.beginPath();
        ctxW.arc(200, 85 + bounce, 60, 0, Math.PI * 2);
        ctxW.stroke();
        ctxW.globalAlpha = 1;
        
        // Texto "BOSS DERROTADO!"
        ctxW.font = 'bold 18px Arial';
        ctxW.fillStyle = '#FFD700';
        ctxW.textAlign = 'center';
        ctxW.shadowColor = '#000';
        ctxW.shadowBlur = 3;
        ctxW.fillText('⚔️ BOSS DERROTADO! ⚔️', 200, 140);
        ctxW.shadowBlur = 0;
        
        // Estrelas brilhantes ao redor (reduzido para melhor performance)
        for (let i = 0; i < 8; i++) { // Reduzido de 12 para 8
            const angle = (i / 8) * Math.PI * 2 + time * 1.5; // Rotação mais lenta
            const dist = 90;
            const starX = 200 + Math.cos(angle) * dist;
            const starY = 85 + Math.sin(angle) * dist * 0.6;
            ctxW.font = '16px Arial'; // Fonte menor
            ctxW.globalAlpha = 0.7 + Math.sin(time * 3 + i) * 0.2; // Animação mais suave
            ctxW.fillText('✨', starX, starY);
        }
        ctxW.globalAlpha = 1;
        
        animFrame = requestAnimationFrame(animate);
    }
    
    animate();
    winnerCanvas.animFrame = animFrame;
}

// Desenhar cena de resultado
function drawResultScene(playerWon, isDraw) {
    const winnerCanvas = document.getElementById('winnerCanvas');
    const ctxW = winnerCanvas.getContext('2d');
    
    let animFrame;
    let time = 0;
    
    function animate() {
        time += 0.05;
        ctxW.clearRect(0, 0, winnerCanvas.width, winnerCanvas.height);
        
        const scale = 1.3;
        const bounce = Math.sin(time * 2) * 3;
        
        if (isBonusStage) {
            // Fase bônus - apenas o jogador
            ctxW.font = '30px Arial';
            ctxW.textAlign = 'center';
            
            if (playerWon) {
                // Sucesso!
                ctxW.fillText('🪱', 200, 30 + bounce);
                
                // Minhocas ao redor
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + time;
                    const dist = 70;
                    ctxW.font = '20px Arial';
                    ctxW.fillText('🪱', 200 + Math.cos(angle) * dist, 85 + Math.sin(angle) * dist * 0.5);
                }
                
                drawHappyBird(ctxW, 200, 85 + bounce, selectedPlayerColor, selectedPlayerWing, scale);
            } else {
                // Falhou
                drawSadBird(ctxW, 200, 95, selectedPlayerColor, selectedPlayerWing, scale * 0.9);
                
                // Minhocas fugindo
                ctxW.font = '15px Arial';
                for (let i = 0; i < 4; i++) {
                    const wx = 50 + i * 100 + Math.sin(time * 3 + i) * 10;
                    ctxW.fillText('🪱', wx, 150);
                }
            }
        } else if (isDraw) {
            // Empate - ambos normais
            ctxW.font = '40px Arial';
            ctxW.textAlign = 'center';
            ctxW.fillText('🤝', 200, 30);
            
            drawHappyBird(ctxW, 100, 85, selectedPlayerColor, selectedPlayerWing, scale);
            ctxW.save();
            ctxW.translate(300, 85);
            ctxW.scale(-scale, scale);
            ctxW.translate(-300/scale, -85/scale);
            drawHappyBird(ctxW, 0, 0, cpu.color, cpu.wingColor, 1);
            ctxW.restore();
        } else if (playerWon) {
            // Jogador ganhou
            // Coroa no vencedor
            ctxW.font = '30px Arial';
            ctxW.textAlign = 'center';
            ctxW.fillText('👑', 100, 20 + bounce);
            
            // Partículas
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2 + time;
                const dist = 60;
                ctxW.font = '15px Arial';
                ctxW.fillText(['⭐', '✨', '🎉'][i % 3], 100 + Math.cos(angle) * dist, 85 + Math.sin(angle) * dist * 0.5);
            }
            
            drawHappyBird(ctxW, 100, 85 + bounce, selectedPlayerColor, selectedPlayerWing, scale);
            
            // CPU triste (espelhada)
            ctxW.save();
            ctxW.translate(300, 0);
            ctxW.scale(-1, 1);
            drawSadBird(ctxW, 0, 95, cpu.color, cpu.wingColor, scale * 0.9);
            ctxW.restore();
        } else {
            // CPU ganhou
            // Coroa no vencedor
            ctxW.font = '30px Arial';
            ctxW.textAlign = 'center';
            ctxW.fillText('👑', 300, 20 + bounce);
            
            // Partículas
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2 + time;
                const dist = 60;
                ctxW.font = '15px Arial';
                ctxW.fillText(['⭐', '✨', '🎉'][i % 3], 300 + Math.cos(angle) * dist, 85 + Math.sin(angle) * dist * 0.5);
            }
            
            // Jogador triste
            drawSadBird(ctxW, 100, 95, selectedPlayerColor, selectedPlayerWing, scale * 0.9);
            
            // CPU feliz (espelhada)
            ctxW.save();
            ctxW.translate(300, 0);
            ctxW.scale(-1, 1);
            drawHappyBird(ctxW, 0, 85 + bounce, cpu.color, cpu.wingColor, scale);
            ctxW.restore();
        }
        
        // VS no centro (só se não for bônus)
        if (!isBonusStage) {
            ctxW.font = 'bold 24px Arial';
            ctxW.fillStyle = '#f1c40f';
            ctxW.textAlign = 'center';
            ctxW.fillText('VS', 200, 90);
        }
        
        animFrame = requestAnimationFrame(animate);
    }
    
    animate();
    winnerCanvas.animFrame = animFrame;
}

// ========== FUNÇÕES DE DEBUG ==========

// Simular vitória do boss (para teste)
function simulateBossVictory() {
    if (!debugMode && !window.debugMode) {
        console.log('⚠️ Modo Debug não está ativo! Pressione Ctrl+Shift+D para ativar.');
        return;
    }
    console.log('🔧 DEBUG: Simulando vitória do boss...');
    
    // Garantir que estamos em uma fase de boss
    currentSubstage = 7;
    
    // Definir scores para vitória
    playerScore = 30;
    cpuScore = 10;
    
    // Chamar endGame normalmente
    endGame();
}

// Simular vitória normal (para teste)
function simulateVictory() {
    if (!debugMode && !window.debugMode) {
        console.log('⚠️ Modo Debug não está ativo! Pressione Ctrl+Shift+D para ativar.');
        return;
    }
    console.log('🔧 DEBUG: Simulando vitória normal...');
    
    // Definir scores para vitória
    playerScore = 20;
    cpuScore = 10;
    
    // Chamar endGame normalmente
    endGame();
}

// Simular derrota (para teste)
function simulateDefeat() {
    if (!debugMode && !window.debugMode) {
        console.log('⚠️ Modo Debug não está ativo! Pressione Ctrl+Shift+D para ativar.');
        return;
    }
    console.log('🔧 DEBUG: Simulando derrota...');
    
    // Definir scores para derrota
    playerScore = 5;
    cpuScore = 20;
    
    // Chamar endGame normalmente
    endGame();
}

// Fim do jogo
function endGame() {
    gameRunning = false;
    const gameOverDiv = document.getElementById('gameOver');
    const resultTitle = document.getElementById('resultTitle');
    const resultText = document.getElementById('resultText');
    const config = substageConfig[currentSubstage];
    
    // Verificar vitória (fase bônus: atingir meta, fase normal: mais pontos que CPU)
    const isVictory = isBonusStage ? (playerScore >= config.goalScore) : (playerScore > cpuScore);

    if (isVictory) {
        // Vitória especial do boss
        if (currentSubstage === 7) {
            resultTitle.textContent = '👑 BOSS DERROTADO! 👑';
            resultTitle.className = 'win';
            
            // 🔊 Som especial de vitória do boss (efeito sonoro com loop)
            // Parar música de introdução se estiver tocando
            if (sounds.introSound && !sounds.introSound.paused) {
                sounds.introSound.pause();
                sounds.introSound.currentTime = 0;
            }
            
            // 🔊 Tocar som de vitória do boss (efeito sonoro com loop)
            if (sounds.bossWin && !sfxMuted) {
                // Configurar como efeito sonoro especial com loop
                sounds.bossWin.loop = true;
                sounds.bossWin.volume = masterVolume;
                sounds.bossWin.currentTime = 0;
                
                // Tentar tocar diretamente (já que precisa de loop)
                sounds.bossWin.play().catch(e => {
                    console.log('Erro ao tocar boss-win:', e);
                    // Tentar após interação do usuário
                    const tryPlay = () => {
                        if (sounds.bossWin && !sfxMuted) {
                            sounds.bossWin.loop = true;
                            sounds.bossWin.currentTime = 0;
                            sounds.bossWin.play().catch(() => {});
                        }
                    };
                    document.addEventListener('click', tryPlay, { once: true });
                    document.addEventListener('keydown', tryPlay, { once: true });
                    document.addEventListener('touchstart', tryPlay, { once: true });
                });
            }
            
            // Tela de vitória especial do boss
            drawBossVictoryScene();
        } else {
            resultTitle.textContent = isBonusStage ? '🪱 BÔNUS COMPLETO! 🪱' : '🎉 VOCÊ VENCEU! 🎉';
            resultTitle.className = 'win';
            
            // 🔊 Som de vitória normal
            playSound('win');
            
            drawResultScene(true, false);
        }
        
        // Inicializar arrays se não existirem
        if (!gameProgress.completedStages[currentArea]) {
            gameProgress.completedStages[currentArea] = [];
        }
        if (!gameProgress.unlockedStages[currentArea]) {
            gameProgress.unlockedStages[currentArea] = [1];
        }
        
        // Marcar sub-fase como completada
        if (!gameProgress.completedStages[currentArea].includes(currentSubstage)) {
            gameProgress.completedStages[currentArea].push(currentSubstage);
        }
        
        // Desbloquear próxima sub-fase
        const nextSubstage = currentSubstage + 1;
        if (nextSubstage <= 7 && !gameProgress.unlockedStages[currentArea].includes(nextSubstage)) {
            gameProgress.unlockedStages[currentArea].push(nextSubstage);
        }
        
        // Se completou o chefe (sub-fase 7), desbloquear próxima área
        if (currentSubstage === 7) {
            const nextArea = currentArea + 1;
            if (nextArea <= 5 && !gameProgress.unlockedAreas.includes(nextArea)) {
                gameProgress.unlockedAreas.push(nextArea);
                if (!gameProgress.unlockedStages[nextArea]) {
                    gameProgress.unlockedStages[nextArea] = [1];
                }
            }
        }
        
        // Calcular estrelas
        let stars = 1;
        if (isBonusStage) {
            // Fase bônus - baseado em quantas minhocas além da meta
            const extra = playerScore - config.goalScore;
            if (extra >= 5) stars = 2;
            if (extra >= 10) stars = 3;
        } else {
            // Fase normal - baseado na diferença de pontos
            const diff = playerScore - cpuScore;
            if (diff >= 5) stars = 2;
            if (diff >= 10) stars = 3;
        }
        
        // Salvar melhor resultado de estrelas
        const stageKey = `${currentArea}-${currentSubstage}`;
        if (!gameProgress.stageStars[stageKey] || stars > gameProgress.stageStars[stageKey]) {
            gameProgress.stageStars[stageKey] = stars;
        }
        
        saveProgress();
        
    } else if (isBonusStage) {
        // Fase bônus - não atingiu a meta
        resultTitle.textContent = '🪱 NÃO CONSEGUIU!';
        resultTitle.className = 'lose';
        
        // 🔊 Som de derrota
        playSound('lose');
        
        drawResultScene(false, false);
    } else if (cpuScore > playerScore) {
        resultTitle.textContent = '😔 VOCÊ PERDEU!';
        resultTitle.className = 'lose';
        
        // 🔊 Som de derrota
        playSound('lose');
        
        drawResultScene(false, false);
    } else {
        resultTitle.textContent = '🤝 EMPATE!';
        resultTitle.className = '';
        drawResultScene(false, true);
    }

    if (isBonusStage) {
        resultText.textContent = `Minhocas: ${playerScore} / ${config.goalScore} 🪱`;
    } else {
        resultText.textContent = `Você: ${playerScore} 🍎 | CPU: ${cpuScore} 🍎`;
    }
    
    // Configurar botões baseado no resultado
    const resultButtons = document.getElementById('resultButtons');
    
    if (isVictory) {
        // Se derrotou o boss (subfase 7), mostrar apenas Roadmap
        if (currentSubstage === 7) {
            resultButtons.innerHTML = `
                <button class="result-btn menu" onclick="goToRoadmap()">🗺️ Roadmap</button>
            `;
        } else {
            // Vitória normal - Próxima fase ou Roadmap
            const hasNextStage = currentSubstage < 7 || (currentSubstage === 7 && currentArea < 5);
            
            if (hasNextStage) {
                resultButtons.innerHTML = `
                    <button class="result-btn next" onclick="goToNextStage()">➡️ Próxima Fase</button>
                    <button class="result-btn menu" onclick="goToRoadmap()">🗺️ Roadmap</button>
                `;
            } else {
                // Completou tudo!
                resultButtons.innerHTML = `
                    <button class="result-btn retry" onclick="restartGame()">🔄 Jogar Novamente</button>
                    <button class="result-btn menu" onclick="goToRoadmap()">🗺️ Roadmap</button>
                `;
            }
        }
    } else if (cpuScore > playerScore) {
        // Derrota - Tentar novamente ou Roadmap (incluindo boss)
        resultButtons.innerHTML = `
            <button class="result-btn retry" onclick="restartGame()">🔄 Tentar Novamente</button>
            <button class="result-btn menu" onclick="goToRoadmap()">🗺️ Roadmap</button>
        `;
    } else {
        // Empate - Jogar novamente ou Roadmap
        resultButtons.innerHTML = `
            <button class="result-btn retry" onclick="restartGame()">🔄 Jogar Novamente</button>
            <button class="result-btn menu" onclick="goToRoadmap()">🗺️ Roadmap</button>
        `;
    }
    
    gameOverDiv.style.display = 'block';
}

// Ir para próxima fase
function goToNextStage() {
    // Parar animação do canvas de resultado
    const winnerCanvas = document.getElementById('winnerCanvas');
    if (winnerCanvas && winnerCanvas.animFrame) {
        cancelAnimationFrame(winnerCanvas.animFrame);
    }
    
    document.getElementById('gameOver').style.display = 'none';
    
    // Determinar próxima fase
    let nextArea = currentArea;
    let nextSubstage = currentSubstage + 1;
    
    // Se completou o chefe, vai para próxima área
    if (currentSubstage === 7) {
        nextArea = currentArea + 1;
        nextSubstage = 1;
    }
    
    // Verificar se a próxima fase está desbloqueada
    if (nextArea <= 5 && gameProgress.unlockedStages[nextArea] && 
        gameProgress.unlockedStages[nextArea].includes(nextSubstage)) {
        selectSubstage(nextArea, nextSubstage);
    } else {
        goToMenu();
    }
}

// Ir para roadmap (mantém menu visível ao fundo)
function goToRoadmap() {
    // Parar animação do canvas de resultado
    const winnerCanvas = document.getElementById('winnerCanvas');
    if (winnerCanvas && winnerCanvas.animFrame) {
        cancelAnimationFrame(winnerCanvas.animFrame);
    }
    
    // Fechar tela de game over e jogo
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('gameContainer').classList.remove('active');
    
    // NÃO esconder o menu - ele deve ficar visível ao fundo
    const menuOverlay = document.getElementById('menuOverlay');
    if (menuOverlay) {
        // Remover estilo inline se houver, para que o CSS padrão funcione
        menuOverlay.style.removeProperty('display');
    }
    
    // Fechar sub-fases se estiver aberta
    const substagesOverlay = document.getElementById('substagesOverlay');
    if (substagesOverlay) {
        substagesOverlay.classList.remove('active');
    }
    
    // Esconder painel de debug
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        debugPanel.classList.remove('active');
    }
    
    // Abrir roadmap usando apenas a classe CSS (sem estilo inline)
    const roadmapOverlay = document.getElementById('roadmapOverlay');
    if (roadmapOverlay) {
        // Remover qualquer estilo inline que possa estar interferindo
        roadmapOverlay.style.removeProperty('display');
        roadmapOverlay.style.removeProperty('visibility');
        
        // Atualizar visual
        updateRoadmapVisual();
        
        // Adicionar classe active (CSS já define display: flex)
        roadmapOverlay.classList.add('active');
    }
}

// Reiniciar jogo
function restartGame() {
    playerScore = 0;
    cpuScore = 0;
    const baseConfig = substageConfig[currentSubstage] || substageConfig[1];
    const config = applyDifficultyToConfig(baseConfig);
    timeLeft = config.time;
    cpu.baseSpeed = config.cpuSpeed;
    cpu.speed = config.cpuSpeed;
    foods = [];
    specialFoods = [];
    speedItems = [];
    player.x = 100;
    player.y = canvas.height / 2;
    player.speed = player.baseSpeed;
    player.speedBoost = 0;
    cpu.x = canvas.width - 100;
    cpu.y = canvas.height / 2;
    cpu.speed = cpu.baseSpeed;
    cpu.speedBoost = 0;
    cpu.stunned = false;
    cpu.stunTime = 0;
    cpu.reactionDelay = 60;
    cpu.targetFood = null;
    cpu.stunCharge = 0;
    cpu.stunChargeTimer = 0;
    cpu.specialFoodDelay = 0;
    cpu.goingForSpecial = false;
    cpu.goingForSpeed = false;
    player.stunCharge = 0;
    player.stunChargeTimer = 0;
    player.stunned = false;
    
    // Reset gavião
    hawk.active = false;
    hawk.cooldown = 0;
    hawk.warningTime = 0;
    player.stunTime = 0;
    player.eatAnimation = 0;
    player.facingRight = true;
    cpu.eatAnimation = 0;
    cpu.facingRight = false;
    
    // Reset minhocas (fase bônus)
    if (isBonusStage) {
        initWormHoles();
        document.getElementById('wormCount').textContent = '0';
    }
    
    // Atualizar UI para o tipo de fase
    updateStageUI();

    // Placar, timer e stun agora são desenhados no canvas
    // Manter referências apenas para elementos que ainda existem
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = timeLeft;
    
    const cooldownText = document.getElementById('cooldownText');
    if (cooldownText) cooldownText.textContent = '0/20';
    
    const cooldownFill = document.getElementById('cooldownFill');
    if (cooldownFill) cooldownFill.style.width = '0%';
    
    document.getElementById('gameOver').style.display = 'none';
    
    // Parar animação do vencedor
    const winnerCanvas = document.getElementById('winnerCanvas');
    if (winnerCanvas.animFrame) {
        cancelAnimationFrame(winnerCanvas.animFrame);
    }

    // Mostrar contagem regressiva
    showCountdown();
}

// Timer
function startTimer() {
    const timerInterval = setInterval(() => {
        if (!gameRunning) {
            clearInterval(timerInterval);
            document.getElementById('timer').parentElement.classList.remove('urgent');
            return;
        }

        timeLeft--;
        // Timer agora é desenhado no canvas, mas manter sincronização com HTML se existir
        const timerEl = document.getElementById('timer');
        if (timerEl) timerEl.textContent = timeLeft;

        // Aviso quando faltam 10 segundos
        if (timeLeft === 10) {
            showTimeWarning();
            document.getElementById('timer').parentElement.classList.add('urgent');
        }

        // Aviso a cada segundo nos últimos 5 segundos
        if (timeLeft <= 5 && timeLeft > 0) {
            showTimeWarning();
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer').parentElement.classList.remove('urgent');
            endGame();
        }
    }, 1000);
}

// Mostrar aviso de tempo
function showTimeWarning() {
    const warning = document.createElement('div');
    warning.className = 'time-warning';
    warning.textContent = timeLeft;
    document.body.appendChild(warning);
    
    // Remove após a animação
    setTimeout(() => {
        warning.remove();
    }, 500);
}

// Spawn de comida periódico (1 a 5 de cada vez)
setInterval(() => {
    if (gameRunning && !isBonusStage) {
        const quantidade = 1 + Math.floor(Math.random() * 5); // 1 a 5
        for (let i = 0; i < quantidade; i++) {
            spawnFood();
        }
    }
}, 2000);

// Spawn de comida especial (a cada 8-15 segundos)
setInterval(() => {
    if (gameRunning && !isBonusStage) {
        spawnSpecialFood();
    }
}, 8000 + Math.random() * 7000);

// Spawn de item de velocidade (a cada 10-18 segundos)
setInterval(() => {
    if (gameRunning && !isBonusStage) {
        spawnSpeedItem();
    }
}, 10000 + Math.random() * 8000);

// Spawn de minhocas (fase bônus - a cada 0.3-0.8 segundos)
setInterval(() => {
    if (gameRunning && isBonusStage) {
        spawnWorm();
    }
}, 300 + Math.random() * 500);

// Loop principal do jogo
function gameLoop() {
    if (!gameRunning) return;

    updatePlayer();
    
    if (isBonusStage) {
        // Fase bônus - apenas minhocas
        updateWorms();
        checkWormCollisions();
        updateWormEatEffects();
    } else {
        // Fase normal - CPU e comidas
        updateCPU();
        updateFood();
        updateHawk();
        checkBirdCollision();
        checkCollisions();
        
        // Atualizar gotas de suor no deserto
        updateSweatDrops();
        
        // Atualizar chuva na floresta
        updateRain();
        
        // Verificar expiração do stun carregado (5 segundos)
        if (player.stunCharge >= player.stunChargeMax && !player.stunned) {
            const oldSeconds = Math.ceil(player.stunChargeTimer / 60);
            player.stunChargeTimer--;
            const newSeconds = Math.ceil(player.stunChargeTimer / 60);
            
            // Só atualiza UI quando muda o segundo (não a cada frame)
            if (oldSeconds !== newSeconds) {
                updateStunUI();
            }
            
            if (player.stunChargeTimer <= 0) {
                player.stunCharge = 0;
                player.stunChargeTimer = 0;
                updateStunUI();
            }
        }
        if (cpu.stunCharge >= cpu.stunChargeMax && !cpu.stunned) {
            cpu.stunChargeTimer--;
            if (cpu.stunChargeTimer <= 0) {
                cpu.stunCharge = 0;
                cpu.stunChargeTimer = 0;
            }
        }
    }
    
    draw();

    requestAnimationFrame(gameLoop);
}

// Progresso do jogador
let gameProgress = JSON.parse(localStorage.getItem('birdGameProgress')) || {};

// Garantir estrutura correta do progresso (migração de versão antiga)
if (!gameProgress.unlockedAreas) {
    gameProgress.unlockedAreas = [1];
}
if (!gameProgress.unlockedStages) {
    gameProgress.unlockedStages = { 1: [1] };
}
if (!gameProgress.completedStages) {
    gameProgress.completedStages = {};
}
if (!gameProgress.stageStars) {
    gameProgress.stageStars = {};
}
// Garantir que área 1 tenha sub-fase 1 desbloqueada
if (!gameProgress.unlockedStages[1]) {
    gameProgress.unlockedStages[1] = [1];
}

let currentArea = 1;
let currentSubstage = 1;
let currentLevel = 1; // Mantido para compatibilidade

// Salvar progresso
function saveProgress() {
    localStorage.setItem('birdGameProgress', JSON.stringify(gameProgress));
}

// Atualizar visual do roadmap de áreas
function updateRoadmapVisual() {
    for (let i = 1; i <= 5; i++) {
        const areaEl = document.getElementById('area' + i);
        const progressEl = document.getElementById('areaProgress' + i);
        
        if (gameProgress.unlockedAreas.includes(i)) {
            areaEl.classList.remove('locked');
            areaEl.classList.add('unlocked');
            areaEl.onclick = () => openArea(i);
            
            // Mostrar ícone
            const lockEl = areaEl.querySelector('.area-lock');
            if (lockEl) {
                lockEl.outerHTML = `<div class="area-icon">${areaConfig[i].icon}</div>`;
            }
            
            // Atualizar progresso
            const completed = gameProgress.completedStages[i] ? gameProgress.completedStages[i].length : 0;
            progressEl.textContent = `${completed}/7`;
            
            if (completed >= 7) {
                areaEl.classList.add('completed');
            }
        }
    }
}

// Abrir roadmap (seleção de áreas)
function openRoadmap() {
    // Garantir que a tela de sub-fases está fechada (apenas remover classe, CSS controla display)
    const substagesOverlay = document.getElementById('substagesOverlay');
    if (substagesOverlay) {
        substagesOverlay.classList.remove('active');
        substagesOverlay.style.removeProperty('display'); // Remove qualquer display inline
    }
    
    // Atualizar visual do roadmap
    updateRoadmapVisual();
    
    // Abrir roadmap (mostra seleção de áreas)
    const roadmapOverlay = document.getElementById('roadmapOverlay');
    if (!roadmapOverlay) {
        console.error('Roadmap overlay não encontrado!');
        return;
    }
    
    roadmapOverlay.classList.add('active');
    // Garantir que está visível (forçar display flex)
    roadmapOverlay.style.display = 'flex';
}

// Fechar roadmap (mantém menu visível ao fundo)
function closeRoadmap() {
    const roadmapOverlay = document.getElementById('roadmapOverlay');
    if (roadmapOverlay) {
        roadmapOverlay.classList.remove('active');
        // Remover estilo inline para que o CSS controle a exibição
        roadmapOverlay.style.removeProperty('display');
    }
    // Não chamar goToMenu() - o menu já está visível ao fundo
    // Apenas garantir que o menu está visível (caso tenha sido escondido)
    const menuOverlay = document.getElementById('menuOverlay');
    if (menuOverlay) {
        // Remover estilo inline se houver, para que o CSS padrão funcione
        menuOverlay.style.removeProperty('display');
    }
}

// Abrir área (mostrar sub-fases)
function openArea(area) {
    if (!gameProgress.unlockedAreas.includes(area)) return;
    
    currentArea = area;
    const config = areaConfig[area];
    
    document.getElementById('substagesTitle').textContent = `${config.icon} ${config.name}`;
    
    // Gerar grid de sub-fases
    const grid = document.getElementById('substagesGrid');
    grid.innerHTML = '';
    
    // Garantir que a área tem sub-fases desbloqueadas
    if (!gameProgress.unlockedStages[area]) {
        gameProgress.unlockedStages[area] = [1];
    }
    if (!gameProgress.completedStages[area]) {
        gameProgress.completedStages[area] = [];
    }
    
    for (let i = 1; i <= 7; i++) {
        const substage = substageConfig[i];
        const isUnlocked = gameProgress.unlockedStages[area].includes(i);
        const isCompleted = gameProgress.completedStages[area].includes(i);
        const stars = gameProgress.stageStars[`${area}-${i}`] || 0;
        
        const card = document.createElement('div');
        card.className = `substage-card ${substage.isBoss ? 'boss' : ''} ${substage.isBonus ? 'bonus' : ''} ${isUnlocked ? 'unlocked' : 'locked'} ${isCompleted ? 'completed' : ''}`;
        
        if (isUnlocked) {
            card.onclick = () => selectSubstage(area, i);
        }
        
        let displayName = `${area}-${i}`;
        if (substage.isBoss) displayName = '👑 CHEFE';
        else if (substage.isBonus) displayName = '🪱 BÔNUS';
        
        card.innerHTML = `
            <div class="substage-number">${displayName}</div>
            <div class="substage-stars">
                <span class="${stars >= 1 ? 'filled' : ''}">${stars >= 1 ? '★' : '☆'}</span>
                <span class="${stars >= 2 ? 'filled' : ''}">${stars >= 2 ? '★' : '☆'}</span>
                <span class="${stars >= 3 ? 'filled' : ''}">${stars >= 3 ? '★' : '☆'}</span>
            </div>
            <div class="substage-difficulty">${isUnlocked ? substage.difficulty : '🔒'}</div>
        `;
        
        grid.appendChild(card);
    }
    
    // Abrir overlay de sub-fases
    const substagesOverlay = document.getElementById('substagesOverlay');
    substagesOverlay.style.removeProperty('display'); // Remove qualquer display inline para permitir que CSS funcione
    substagesOverlay.classList.add('active'); // CSS define display: flex quando tem classe 'active'
}

// Fechar sub-fases (volta para o roadmap)
function closeSubstages() {
    const substagesOverlay = document.getElementById('substagesOverlay');
    substagesOverlay.classList.remove('active');
    // Não definir style.display = 'none' para permitir que CSS controle a exibição
    // O CSS já define display: none quando não tem a classe 'active'
}

// Configurar CPU para a sub-fase
function setCpuForSubstage(area, substage) {
    const baseConfig = substageConfig[substage];
    const config = applyDifficultyToConfig(baseConfig);
    const diffMod = difficultyModifiers[gameDifficulty];
    
    if (baseConfig.isBoss) {
        // Usar chefe da área
        const bossType = bossCpuTypes[area];
        cpu.color = bossType.color;
        cpu.wingColor = bossType.wingColor;
        cpu.type = bossType.type;
        cpu.eyeColor = bossType.eyeColor;
        cpu.beakColor = bossType.beakColor;
        cpu.size = 50; // Bosses são maiores!
    } else {
        // Usar pássaro genérico da área
        const areaCpus = areaCpuColors[area];
        const cpuData = areaCpus[substage - 1] || areaCpus[0];
        cpu.color = cpuData.color;
        cpu.wingColor = cpuData.wingColor;
        cpu.type = null; // Sem tipo especial
        cpu.eyeColor = null;
        cpu.beakColor = '#f39c12';
        cpu.size = 35; // Tamanho normal
    }
    
    // Configurar velocidade da CPU (com modificador de dificuldade)
    cpu.baseSpeed = config.cpuSpeed;
    cpu.speed = config.cpuSpeed;
    cpu.reactionDelay = diffMod.cpuReactionDelay;
}

// Atualizar UI baseado no tipo de fase
function updateStageUI() {
    const bonusUI = document.getElementById('bonusUI');
    const cooldownContainer = document.getElementById('cooldownContainer');
    
    if (isBonusStage) {
        // Fase bônus - esconder stun (placar já está no canvas)
        cooldownContainer.style.display = 'none';
        bonusUI.style.display = 'none'; // UI bônus também está no canvas agora
        
        // Atualizar meta de minhocas (para referência interna)
        const config = substageConfig[currentSubstage];
        document.getElementById('wormGoal').textContent = config.goalScore;
        document.getElementById('wormCount').textContent = '0';
    } else {
        // Fase normal - esconder elementos HTML (tudo está no canvas)
        cooldownContainer.style.display = 'none';
        bonusUI.style.display = 'none';
    }
}

// Selecionar sub-fase
function selectSubstage(area, substage) {
    if (!gameProgress.unlockedStages[area] || !gameProgress.unlockedStages[area].includes(substage)) return;
    
    currentArea = area;
    currentSubstage = substage;
    currentLevel = area; // Compatibilidade
    
    // Inicializar elementos decorativos do cenário
    initBackgroundDecorations();
    
    // Zerar placar ao iniciar nova fase
    playerScore = 0;
    cpuScore = 0;
    // Placar agora é desenhado no canvas, não precisa atualizar HTML
    
    // Zerar stun ao iniciar nova fase
    player.stunCharge = 0;
    player.stunChargeTimer = 0;
    player.stunned = false;
    player.stunTime = 0;
    cpu.stunCharge = 0;
    cpu.stunChargeTimer = 0;
    cpu.stunned = false;
    cpu.stunTime = 0;
    updateStunUI();
    
    // Configurar dificuldade (aplicar modificadores)
    const baseConfig = substageConfig[substage];
    const config = applyDifficultyToConfig(baseConfig);
    timeLeft = config.time;
    
    // Verificar se é fase bônus
    isBonusStage = baseConfig.isBonus || false;
    
    if (isBonusStage) {
        initWormHoles();
    }
    
    // Atualizar UI para o tipo de fase
    updateStageUI();
    
    // Timer agora é desenhado no canvas, mas manter sincronização com HTML se existir
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = timeLeft;
    
    if (!isBonusStage) {
        setCpuForSubstage(area, substage);
    }
    
    closeSubstages();
    closeRoadmap();
    
    // Parar música de introdução quando iniciar o jogo
    if (sounds.introSound) {
        sounds.introSound.pause();
        sounds.introSound.currentTime = 0;
    }
    
    document.getElementById('menuOverlay').style.display = 'none';
    document.getElementById('gameContainer').classList.add('active');
    
    if (menuAnimFrame) {
        cancelAnimationFrame(menuAnimFrame);
    }
    
    showCountdown();
}

// Manter compatibilidade com função antiga
function setCpuForLevel(level) {
    setCpuForSubstage(level, 7); // Assume chefe
}

// Selecionar fase (compatibilidade)
function selectLevel(level) {
    openArea(level);
}

// Iniciar o jogo pela primeira vez (do menu)
function startGame() {
    openRoadmap();
}

// Desenhar pássaro no canvas de countdown
function drawCountdownBird(ctxC, x, y, color, facingRight, time) {
    ctxC.save();
    
    const shake = Math.sin(time / 50) * 3;
    const scale = 1.8; // Maior para a cena
    
    ctxC.translate(x + shake, y);
    if (!facingRight) {
        ctxC.scale(-1, 1);
    }
    ctxC.scale(scale, scale);
    
    // Aura de tensão
    ctxC.shadowColor = color;
    ctxC.shadowBlur = 20 + Math.sin(time / 100) * 10;
    
    // Corpo
    ctxC.fillStyle = color;
    ctxC.beginPath();
    ctxC.arc(0, 0, 35, 0, Math.PI * 2);
    ctxC.fill();
    
    ctxC.shadowBlur = 0;
    
    // Olho
    ctxC.fillStyle = 'white';
    ctxC.beginPath();
    ctxC.arc(10, -5, 10, 0, Math.PI * 2);
    ctxC.fill();
    
    // Pupila vermelha (raiva)
    ctxC.fillStyle = '#c0392b';
    ctxC.beginPath();
    ctxC.arc(12, -5, 6, 0, Math.PI * 2);
    ctxC.fill();
    
    // Sobrancelha brava
    ctxC.strokeStyle = 'black';
    ctxC.lineWidth = 3;
    ctxC.beginPath();
    ctxC.moveTo(2, -18);
    ctxC.lineTo(20, -12);
    ctxC.stroke();
    
    // Bico aberto (gritando)
    ctxC.fillStyle = '#f39c12';
    ctxC.beginPath();
    ctxC.moveTo(30, -3);
    ctxC.lineTo(50, 0);
    ctxC.lineTo(30, 3);
    ctxC.closePath();
    ctxC.fill();
    
    ctxC.beginPath();
    ctxC.moveTo(30, 5);
    ctxC.lineTo(45, 8);
    ctxC.lineTo(30, 12);
    ctxC.closePath();
    ctxC.fill();
    
    // Asa batendo
    const wingFlap = Math.sin(time / 80) * 0.5;
    const wingY = 5 + Math.sin(time / 80) * 8;
    ctxC.fillStyle = facingRight ? selectedPlayerWing : (cpu.wingColor || '#c0392b');
    ctxC.beginPath();
    ctxC.ellipse(-10, wingY, 20, 12 + Math.cos(time / 80) * 6, -0.3 + wingFlap, 0, Math.PI * 2);
    ctxC.fill();
    
    // Símbolos de raiva
    ctxC.font = '16px Arial';
    ctxC.fillText('💢', -25, -30 + Math.sin(time / 150) * 3);
    
    ctxC.restore();
}

// Desenhar BOSS no canvas de countdown
function drawCountdownBoss(ctxC, x, y, color, wingColor, type, time) {
    ctxC.save();
    
    const shake = Math.sin(time / 40) * 4;
    const scale = 2.5; // Boss bem maior!
    
    ctxC.translate(x + shake, y);
    ctxC.scale(-1, 1); // Virado para esquerda
    ctxC.scale(scale, scale);
    
    // Aura maligna do boss
    ctxC.shadowColor = '#e74c3c';
    ctxC.shadowBlur = 25 + Math.sin(time / 80) * 15;
    
    // Corpo
    ctxC.fillStyle = color;
    ctxC.beginPath();
    ctxC.arc(0, 0, 35, 0, Math.PI * 2);
    ctxC.fill();
    
    ctxC.shadowBlur = 0;
    
    // Detalhes específicos do boss
    if (type === 'owl') {
        const owlSize = 35; // Tamanho base do corpo
        const topOfHead = -owlSize * 0.85;
        const earHeight = owlSize * 0.6;
        
        // Orelha esquerda
        ctxC.fillStyle = wingColor || color;
        ctxC.beginPath();
        ctxC.moveTo(-owlSize * 0.5, topOfHead + earHeight * 0.3);
        ctxC.lineTo(-owlSize * 0.35, topOfHead - earHeight * 0.5);
        ctxC.lineTo(-owlSize * 0.15, topOfHead + earHeight * 0.3);
        ctxC.closePath();
        ctxC.fill();
        
        // Orelha direita
        ctxC.beginPath();
        ctxC.moveTo(owlSize * 0.15, topOfHead + earHeight * 0.3);
        ctxC.lineTo(owlSize * 0.35, topOfHead - earHeight * 0.5);
        ctxC.lineTo(owlSize * 0.55, topOfHead + earHeight * 0.3);
        ctxC.closePath();
        ctxC.fill();
        
        // Interior das orelhas (mais claro)
        ctxC.fillStyle = color;
        ctxC.beginPath();
        ctxC.moveTo(-owlSize * 0.45, topOfHead + earHeight * 0.35);
        ctxC.lineTo(-owlSize * 0.35, topOfHead - earHeight * 0.3);
        ctxC.lineTo(-owlSize * 0.22, topOfHead + earHeight * 0.35);
        ctxC.closePath();
        ctxC.fill();
        
        ctxC.beginPath();
        ctxC.moveTo(owlSize * 0.22, topOfHead + earHeight * 0.35);
        ctxC.lineTo(owlSize * 0.35, topOfHead - earHeight * 0.3);
        ctxC.lineTo(owlSize * 0.48, topOfHead + earHeight * 0.35);
        ctxC.closePath();
        ctxC.fill();
        
        // Disco facial
        ctxC.strokeStyle = 'rgba(0,0,0,0.3)';
        ctxC.lineWidth = 2;
        ctxC.beginPath();
        ctxC.arc(5, -3, 16, 0, Math.PI * 2);
        ctxC.stroke();
        ctxC.beginPath();
        ctxC.arc(25, -3, 14, 0, Math.PI * 2);
        ctxC.stroke();
        
        // Olhos grandes da coruja
        ctxC.fillStyle = 'white';
        ctxC.beginPath();
        ctxC.arc(5, -3, 14, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.beginPath();
        ctxC.arc(25, -3, 12, 0, Math.PI * 2);
        ctxC.fill();
        
        // Pupilas amarelas
        ctxC.fillStyle = '#FFD700';
        ctxC.beginPath();
        ctxC.arc(7, -3, 9, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.beginPath();
        ctxC.arc(25, -3, 7, 0, Math.PI * 2);
        ctxC.fill();
        
        // Centro preto (olhar ameaçador)
        ctxC.fillStyle = 'black';
        ctxC.beginPath();
        ctxC.arc(7, -3, 4, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.beginPath();
        ctxC.arc(25, -3, 3, 0, Math.PI * 2);
        ctxC.fill();
        
        // Sobrancelhas bravas
        ctxC.strokeStyle = 'black';
        ctxC.lineWidth = 2;
        ctxC.beginPath();
        ctxC.moveTo(-5, -20);
        ctxC.lineTo(15, -15);
        ctxC.stroke();
        ctxC.beginPath();
        ctxC.moveTo(18, -18);
        ctxC.lineTo(35, -15);
        ctxC.stroke();
    } else {
        // Boss genérico
        ctxC.fillStyle = 'white';
        ctxC.beginPath();
        ctxC.arc(12, -5, 12, 0, Math.PI * 2);
        ctxC.fill();
        
        ctxC.fillStyle = '#c0392b';
        ctxC.beginPath();
        ctxC.arc(14, -5, 7, 0, Math.PI * 2);
        ctxC.fill();
        
        // Sobrancelha brava
        ctxC.strokeStyle = 'black';
        ctxC.lineWidth = 3;
        ctxC.beginPath();
        ctxC.moveTo(2, -20);
        ctxC.lineTo(22, -14);
        ctxC.stroke();
    }
    
    // Bico
    ctxC.fillStyle = '#f39c12';
    ctxC.beginPath();
    ctxC.moveTo(30, -3);
    ctxC.lineTo(50, 0);
    ctxC.lineTo(30, 3);
    ctxC.closePath();
    ctxC.fill();
    ctxC.beginPath();
    ctxC.moveTo(30, 5);
    ctxC.lineTo(45, 10);
    ctxC.lineTo(30, 14);
    ctxC.closePath();
    ctxC.fill();
    
    // Asa
    const wingFlap = Math.sin(time / 60) * 0.5;
    const wingY = 5 + Math.sin(time / 60) * 10;
    ctxC.fillStyle = wingColor || '#c0392b';
    ctxC.beginPath();
    ctxC.ellipse(-12, wingY, 25, 15 + Math.cos(time / 60) * 8, -0.3 + wingFlap, 0, Math.PI * 2);
    ctxC.fill();
    
    // Coroa do boss
    ctxC.font = '20px Arial';
    ctxC.fillText('👑', -5, -50 + Math.sin(time / 100) * 3);
    
    // Aura de fogo
    ctxC.font = '14px Arial';
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + time / 300;
        const fx = Math.cos(angle) * 45;
        const fy = Math.sin(angle) * 30;
        ctxC.fillText('🔥', fx - 5, fy);
    }
    
    ctxC.restore();
}

// Contagem regressiva
function showCountdown() {
    const overlay = document.getElementById('countdownOverlay');
    const numberEl = document.getElementById('countdownNumber');
    const effectsEl = document.getElementById('countdownEffects');
    const countdownCanvas = document.getElementById('countdownCanvas');
    const ctxC = countdownCanvas.getContext('2d');
    
    overlay.style.display = 'flex';
    effectsEl.innerHTML = '';
    
    // Tocar som especial do boss coruja se for a fase do boss coruja
    const config = substageConfig[currentSubstage];
    if (config && config.isBoss && currentArea === 1) {
        const bossType = bossCpuTypes[currentArea];
        if (bossType && bossType.type === 'owl' && sounds.owl && !sfxMuted) {
            sounds.owl.currentTime = 0;
            sounds.owl.volume = masterVolume;
            sounds.owl.play().catch(e => {
                console.log('Erro ao tocar som da coruja:', e);
            });
        }
    }
    
    let count = 3;
    numberEl.textContent = count;
    numberEl.className = 'countdown-number';
    
    // Animação dos pássaros se encarando
    let animFrame;
    function animateBirds() {
        const time = Date.now();
        
        // Limpar canvas
        ctxC.clearRect(0, 0, countdownCanvas.width, countdownCanvas.height);
        
        // Fundo com gradiente
        const gradient = ctxC.createLinearGradient(0, 0, countdownCanvas.width, 0);
        gradient.addColorStop(0, 'rgba(46, 204, 113, 0.2)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(231, 76, 60, 0.2)');
        ctxC.fillStyle = gradient;
        ctxC.fillRect(0, 0, countdownCanvas.width, countdownCanvas.height);
        
        // Raios de energia no centro
        ctxC.strokeStyle = `rgba(241, 196, 15, ${0.3 + Math.sin(time / 100) * 0.2})`;
        ctxC.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time / 500;
            ctxC.beginPath();
            ctxC.moveTo(300, 100);
            ctxC.lineTo(300 + Math.cos(angle) * 50, 100 + Math.sin(angle) * 50);
            ctxC.stroke();
        }
        
        // VS no centro
        ctxC.font = 'bold 30px Arial';
        ctxC.fillStyle = '#f1c40f';
        ctxC.textAlign = 'center';
        ctxC.textBaseline = 'middle';
        ctxC.shadowColor = '#f39c12';
        ctxC.shadowBlur = 10;
        if (isBonusStage) {
            // Fase bônus - layout especial
            ctxC.shadowBlur = 0;
            
            // Título no topo
            ctxC.font = 'bold 28px Arial';
            ctxC.fillStyle = '#9b59b6';
            ctxC.textAlign = 'center';
            ctxC.shadowColor = '#8e44ad';
            ctxC.shadowBlur = 10;
            ctxC.fillText('🪱 CAÇA ÀS MINHOCAS! 🪱', 300, 35);
            ctxC.shadowBlur = 0;
            
            // Pássaro no centro (mais abaixo)
            drawCountdownBird(ctxC, 300, 95, selectedPlayerColor, true, time);
            
            // Minhocas animadas na parte inferior
            ctxC.font = '30px Arial';
            for (let i = 0; i < 5; i++) {
                const wx = 80 + i * 110;
                const wy = 175 + Math.sin(time / 150 + i * 0.8) * 8;
                const wobble = Math.sin(time / 100 + i) * 5;
                ctxC.save();
                ctxC.translate(wx, wy);
                ctxC.rotate(wobble * 0.05);
                ctxC.fillText('🪱', 0, 0);
                ctxC.restore();
            }
            
            // Meta de minhocas
            const config = substageConfig[currentSubstage];
            ctxC.font = 'bold 18px Arial';
            ctxC.fillStyle = '#f1c40f';
            ctxC.fillText(`Meta: ${config.goalScore} minhocas em ${config.time}s!`, 300, 195);
        } else {
            const config = substageConfig[currentSubstage];
            
            if (config.isBoss) {
                // Fase do BOSS - layout especial
                ctxC.font = 'bold 22px Arial';
                ctxC.fillStyle = '#e74c3c';
                ctxC.shadowColor = '#c0392b';
                ctxC.shadowBlur = 15;
                ctxC.fillText('⚔️ BOSS FIGHT! ⚔️', 300, 25);
                ctxC.shadowBlur = 0;
                
                // VS no centro
                ctxC.font = 'bold 35px Arial';
                ctxC.fillStyle = '#f1c40f';
                ctxC.shadowColor = '#f39c12';
                ctxC.shadowBlur = 10;
                ctxC.fillText('VS', 300, 100);
                ctxC.shadowBlur = 0;
                
                // Desenhar pássaro do jogador (esquerda, menor)
                drawCountdownBird(ctxC, 100, 100, selectedPlayerColor, true, time);
                
                // Desenhar BOSS (direita, MAIOR)
                drawCountdownBoss(ctxC, 480, 95, cpu.color, cpu.wingColor, cpu.type, time);
                
                // Nome do boss
                const bossType = bossCpuTypes[currentArea];
                ctxC.font = 'bold 16px Arial';
                ctxC.fillStyle = '#e74c3c';
                ctxC.fillText(`👑 ${bossType.name}`, 480, 175);
            } else {
                ctxC.fillText('VS', 300, 100);
                ctxC.shadowBlur = 0;
                
                // Desenhar pássaro do jogador (esquerda, olhando para direita)
                drawCountdownBird(ctxC, 100, 100, selectedPlayerColor, true, time);
                
                // Desenhar pássaro da CPU (direita, olhando para esquerda)
                drawCountdownBird(ctxC, 500, 100, cpu.color, false, time);
            }
        }
        
        animFrame = requestAnimationFrame(animateBirds);
    }
    
    animateBirds();
    
    // Adicionar faíscas entre os pássaros
    function addSparks() {
        for (let i = 0; i < 5; i++) {
            const spark = document.createElement('div');
            spark.className = 'spark';
            spark.textContent = ['⚡', '✨', '💥', '🔥'][Math.floor(Math.random() * 4)];
            spark.style.setProperty('--x', (Math.random() - 0.5) * 200 + 'px');
            spark.style.setProperty('--y', (Math.random() - 0.5) * 150 + 'px');
            effectsEl.appendChild(spark);
            
            setTimeout(() => spark.remove(), 500);
        }
    }
    
    addSparks();
    
    // Desenhar o cenário parado durante a contagem
    draw();
    
    // 🔊 Tocar som do countdown apenas uma vez
    playSound('countdown');
    
    const countInterval = setInterval(() => {
        count--;
        addSparks();
        
        if (count > 0) {
            numberEl.textContent = count;
            // Reiniciar animação
            numberEl.style.animation = 'none';
            setTimeout(() => numberEl.style.animation = 'countPulse 0.5s ease-out', 10);
        } else if (count === 0) {
            numberEl.textContent = 'VAI!';
            numberEl.className = 'countdown-number countdown-go';
            numberEl.style.animation = 'none';
            setTimeout(() => numberEl.style.animation = 'countPulse 0.5s ease-out', 10);
            
            // Mais faíscas no VAI!
            for (let i = 0; i < 3; i++) {
                setTimeout(() => addSparks(), i * 100);
            }
        } else {
            clearInterval(countInterval);
            cancelAnimationFrame(animFrame);
            overlay.style.display = 'none';
            
            // Agora inicia o jogo de verdade
            gameStarted = true;
            gameRunning = true;
            
            // Mostrar painel e indicador de debug se estiver ativo
            if (debugMode || window.debugMode) {
                const debugPanel = document.getElementById('debugPanel');
                const debugIndicator = document.getElementById('debugIndicator');
                if (debugPanel) debugPanel.classList.add('active');
                if (debugIndicator) debugIndicator.classList.add('active');
            }
            
            spawnFood();
            spawnFood();
            spawnFood();
            gameLoop();
            startTimer();
        }
    }, 800);
}

// Voltar ao menu
function goToMenu() {

  
    // Remover estilo inline para que o CSS padrão (display: flex) funcione
    const menuOverlay = document.getElementById('menuOverlay');
    if (menuOverlay) {
        menuOverlay.style.removeProperty('display');  console.log('Voltando ao menu');
    }
    
    document.getElementById('gameContainer').classList.remove('active');
    document.getElementById('gameOver').style.display = 'none';
    
    // Fechar roadmap (remover classe e estilo inline)
    const roadmapOverlayEl = document.getElementById('roadmapOverlay');
    if (roadmapOverlayEl) {
        roadmapOverlayEl.classList.remove('active');
        roadmapOverlayEl.style.removeProperty('display');
    }
    
    // Fechar sub-fases (remover classe e estilo inline)
    const substagesOverlayEl = document.getElementById('substagesOverlay');
    if (substagesOverlayEl) {
        substagesOverlayEl.classList.remove('active');
        substagesOverlayEl.style.removeProperty('display');
    }
    
    // Parar animação do vencedor
    const winnerCanvas = document.getElementById('winnerCanvas');
    if (winnerCanvas && winnerCanvas.animFrame) {
        cancelAnimationFrame(winnerCanvas.animFrame);
    }
    
    // Parar som de vitória do boss se estiver tocando (efeito sonoro)
    if (sounds.bossWin && !sounds.bossWin.paused) {
        sounds.bossWin.pause();
        sounds.bossWin.currentTime = 0;
        sounds.bossWin.loop = false; // Desativar loop ao sair
    }
    
    // Tocar música de introdução em loop
    playIntroMusic();
    
    // Atualizar cor da CPU para ser diferente
    updateCpuColor();
    
    // Resetar tempo de espera e reiniciar animação do menu
    resetMenuWaitTime();
    animateMenu();
    
    // Reset completo
    gameRunning = false;
    gameStarted = false;
    playerScore = 0;
    cpuScore = 0;
    timeLeft = 60;
    foods = [];
    specialFoods = [];
    speedItems = [];
    player.x = 100;
    player.y = canvas.height / 2;
    player.stunCharge = 0;
    player.stunChargeTimer = 0;
    player.speed = player.baseSpeed;
    player.speedBoost = 0;
    cpu.x = canvas.width - 100;
    cpu.y = canvas.height / 2;
    cpu.stunned = false;
    cpu.stunTime = 0;
    cpu.reactionDelay = 60;
    cpu.targetFood = null;
    cpu.stunCharge = 0;
    cpu.stunChargeTimer = 0;
    cpu.specialFoodDelay = 0;
    cpu.goingForSpecial = false;
    cpu.goingForSpeed = false;
    player.stunned = false;
    player.stunTime = 0;
    
    // Placar agora é desenhado no canvas
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = '60';
}

// Desenhar pássaro do menu (amigável)
function drawMenuBird(ctxM, x, y, color, wingColor, facingRight, time, waitTime) {
    ctxM.save();
    
    // Ciclo de irritação/calma em loop (independente do tempo de espera)
    // Alterna entre 'angry' e 'calm' a cada ~4 segundos
    const cycleDuration = 8; // 8 segundos para um ciclo completo (4s irritado + 4s calmo)
    const cyclePosition = (time % cycleDuration) / cycleDuration; // 0 a 1
    
    let mood = 'normal';
    if (cyclePosition < 0.5) {
        // Primeira metade: ficando irritado gradualmente
        if (cyclePosition < 0.25) {
            mood = 'calm'; // Calmo no início
        } else {
            mood = 'impatient'; // Ficando impaciente
        }
    } else {
        // Segunda metade: irritado e depois acalmando
        if (cyclePosition < 0.75) {
            mood = 'angry'; // Irritado no pico
        } else {
            mood = 'calming'; // Acalmando gradualmente
        }
    }
    
    let hover = Math.sin(time * 2) * 5;
    let scale = 1.5;
    let shake = 0;
    
    // Ajustes por mood
    if (mood === 'calm') {
        // Calmo - movimento suave e tranquilo
        hover = Math.sin(time * 1.5) * 3;
        scale = 1.5;
    } else if (mood === 'impatient') {
        // Ficando impaciente - movimento mais rápido
        hover = Math.abs(Math.sin(time * 5)) * -10;
        shake = Math.sin(time * 3) * 2;
    } else if (mood === 'angry') {
        // Irritado - treme e se move rápido
        shake = (Math.random() - 0.5) * 5;
        hover = Math.sin(time * 8) * 4;
        scale = 1.6; // Ligeiramente maior quando irritado
    } else if (mood === 'calming') {
        // Acalmando - movimento gradualmente mais suave
        const calmProgress = (cyclePosition - 0.75) / 0.25; // 0 a 1
        hover = Math.sin(time * (3 - calmProgress * 1.5)) * (5 - calmProgress * 2);
        shake = Math.sin(time * (3 - calmProgress * 2)) * (3 - calmProgress * 3);
        scale = 1.6 - calmProgress * 0.1;
    } else if (mood === 'warmup') {
        // Aquecendo - pula mais
        hover = Math.sin(time * 4) * 10;
    } else if (mood === 'bored') {
        // Entediado - balança de lado a lado
        shake = Math.sin(time * 1.5) * 3;
    } else if (mood === 'sleepy') {
        // Sonolento - quase não se move
        hover = Math.sin(time * 0.5) * 2;
    }
    
    ctxM.translate(x + shake, y + hover);
    if (!facingRight) {
        ctxM.scale(-1, 1);
    }
    ctxM.scale(scale, scale);
    
    // Aura (muda cor com mood)
    if (mood === 'angry') {
        ctxM.shadowColor = '#e74c3c'; // Vermelho quando irritado
        ctxM.shadowBlur = 20 + Math.sin(time * 6) * 8;
    } else if (mood === 'impatient') {
        ctxM.shadowColor = '#f39c12'; // Laranja quando impaciente
        ctxM.shadowBlur = 18 + Math.sin(time * 4) * 6;
    } else if (mood === 'calming') {
        const calmProgress = (cyclePosition - 0.75) / 0.25;
        // Interpolar entre vermelho e cor normal
        const r1 = parseInt('#e74c3c'.substr(1, 2), 16);
        const g1 = parseInt('#e74c3c'.substr(3, 2), 16);
        const b1 = parseInt('#e74c3c'.substr(5, 2), 16);
        const r2 = parseInt(color.substr(1, 2), 16);
        const g2 = parseInt(color.substr(3, 2), 16);
        const b2 = parseInt(color.substr(5, 2), 16);
        const r = Math.round(r1 + (r2 - r1) * calmProgress);
        const g = Math.round(g1 + (g2 - g1) * calmProgress);
        const b = Math.round(b1 + (b2 - b1) * calmProgress);
        ctxM.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctxM.shadowBlur = 15 + Math.sin(time * 3) * (5 - calmProgress * 3);
    } else if (mood === 'calm') {
        ctxM.shadowColor = color; // Cor normal quando calmo
        ctxM.shadowBlur = 10 + Math.sin(time * 2) * 3;
    } else {
        ctxM.shadowColor = color;
        ctxM.shadowBlur = 15 + Math.sin(time * 3) * 5;
    }
    
    // Corpo
    ctxM.fillStyle = color;
    ctxM.beginPath();
    ctxM.arc(0, 0, 35, 0, Math.PI * 2);
    ctxM.fill();
    
    ctxM.shadowBlur = 0;
    
    // Olho (muda com mood)
    ctxM.fillStyle = 'white';
    ctxM.beginPath();
    
    if (mood === 'sleepy') {
        // Olho meio fechado
        ctxM.ellipse(10, -5, 10, 4 + Math.sin(time) * 2, 0, 0, Math.PI * 2);
    } else {
        ctxM.arc(10, -5, 10, 0, Math.PI * 2);
    }
    ctxM.fill();
    
    // Pupila
    let lookX = Math.sin(time) * 2;
    let pupilSize = 5;
    
    if (mood === 'angry') {
        lookX = 0;
        pupilSize = 3; // Pupila menor quando bravo
        ctxM.fillStyle = '#c0392b';
    } else if (mood === 'impatient') {
        lookX = Math.sin(time * 4) * 1;
        pupilSize = 4;
        ctxM.fillStyle = '#d35400';
    } else if (mood === 'calming') {
        const calmProgress = (cyclePosition - 0.75) / 0.25;
        lookX = Math.sin(time) * (2 - calmProgress * 1);
        pupilSize = 3 + calmProgress * 2;
        const r1 = parseInt('#c0392b'.substr(1, 2), 16);
        const g1 = parseInt('#c0392b'.substr(3, 2), 16);
        const b1 = parseInt('#c0392b'.substr(5, 2), 16);
        const r = Math.round(r1 + (0 - r1) * calmProgress);
        const g = Math.round(g1 + (0 - g1) * calmProgress);
        const b = Math.round(b1 + (0 - b1) * calmProgress);
        ctxM.fillStyle = `rgb(${r}, ${g}, ${b})`;
    } else if (mood === 'calm') {
        lookX = Math.sin(time * 0.8) * 2;
        pupilSize = 5;
        ctxM.fillStyle = 'black';
    } else if (mood === 'sleepy') {
        pupilSize = 3;
        ctxM.fillStyle = 'black';
    } else {
        ctxM.fillStyle = 'black';
    }
    ctxM.beginPath();
    ctxM.arc(12 + lookX, -5, pupilSize, 0, Math.PI * 2);
    ctxM.fill();
    
    // Brilho
    if (mood !== 'sleepy') {
        ctxM.fillStyle = 'white';
        ctxM.beginPath();
        ctxM.arc(10 + lookX, -7, 2, 0, Math.PI * 2);
        ctxM.fill();
    }
    
    // Sobrancelha (muda com mood)
    if (mood === 'angry') {
        // Sobrancelha muito franzida
        ctxM.strokeStyle = 'black';
        ctxM.lineWidth = 4;
        ctxM.beginPath();
        ctxM.moveTo(0, -20);
        ctxM.lineTo(22, -10);
        ctxM.stroke();
    } else if (mood === 'impatient') {
        // Sobrancelha começando a franzir
        ctxM.strokeStyle = 'black';
        ctxM.lineWidth = 3;
        ctxM.beginPath();
        ctxM.moveTo(2, -18);
        ctxM.lineTo(20, -12);
        ctxM.stroke();
    } else if (mood === 'calming') {
        // Sobrancelha relaxando gradualmente
        const calmProgress = (cyclePosition - 0.75) / 0.25;
        ctxM.strokeStyle = 'black';
        ctxM.lineWidth = 4 - calmProgress * 2;
        ctxM.beginPath();
        const startY = -20 + calmProgress * 2;
        const endY = -10 - calmProgress * 2;
        ctxM.moveTo(0 + calmProgress * 2, startY);
        ctxM.lineTo(22 - calmProgress * 2, endY);
        ctxM.stroke();
    } else if (mood === 'calm') {
        // Sem sobrancelha franzida quando calmo
    } else if (mood === 'sleepy') {
        // Sobrancelha caída
        ctxM.strokeStyle = 'black';
        ctxM.lineWidth = 2;
        ctxM.beginPath();
        ctxM.moveTo(2, -15);
        ctxM.lineTo(18, -16);
        ctxM.stroke();
    }
    
    // Bico
    ctxM.fillStyle = '#f39c12';
    ctxM.beginPath();
    
    if (mood === 'sleepy' && Math.sin(time * 0.5) > 0.8) {
        // Bocejando
        ctxM.moveTo(30, -5);
        ctxM.lineTo(45, 5);
        ctxM.lineTo(30, 15);
        ctxM.closePath();
        ctxM.fill();
        // Interior da boca
        ctxM.fillStyle = '#e74c3c';
        ctxM.beginPath();
        ctxM.arc(35, 5, 5, 0, Math.PI * 2);
        ctxM.fill();
    } else if (mood === 'angry') {
        // Bico aberto gritando
        ctxM.moveTo(30, -3);
        ctxM.lineTo(50, 0);
        ctxM.lineTo(30, 3);
        ctxM.closePath();
        ctxM.fill();
        ctxM.beginPath();
        ctxM.moveTo(30, 5);
        ctxM.lineTo(45, 8);
        ctxM.lineTo(30, 12);
        ctxM.closePath();
        ctxM.fill();
    } else {
        ctxM.moveTo(30, 0);
        ctxM.lineTo(48, 5);
        ctxM.lineTo(30, 10);
        ctxM.closePath();
        ctxM.fill();
    }
    
    // Asa batendo (velocidade muda com mood)
    let wingSpeed = 4;
    if (mood === 'calm') wingSpeed = 3; // Movimento suave quando calmo
    else if (mood === 'impatient') wingSpeed = 8; // Mais rápido quando impaciente
    else if (mood === 'angry') wingSpeed = 12; // Muito rápido quando irritado
    else if (mood === 'calming') {
        const calmProgress = (cyclePosition - 0.75) / 0.25;
        wingSpeed = 12 - calmProgress * 9; // Diminui gradualmente
    }
    else if (mood === 'warmup') wingSpeed = 8;
    else if (mood === 'sleepy') wingSpeed = 1;
    
    const wingFlap = Math.sin(time * wingSpeed) * 0.4;
    const wingY = 5 + Math.sin(time * wingSpeed) * 8;
    ctxM.fillStyle = wingColor;
    ctxM.beginPath();
    ctxM.ellipse(-10, wingY, 20, 12 + Math.cos(time * wingSpeed) * 5, -0.3 + wingFlap, 0, Math.PI * 2);
    ctxM.fill();
    
    ctxM.restore();
    
    // Símbolos extras (fora do save/restore para posição correta)
    ctxM.font = '20px Arial';
    ctxM.textAlign = 'center';
    
    if (mood === 'calm') {
        // Símbolo de calma/relaxamento (opcional, pode ficar sem símbolo)
        if (Math.sin(time * 0.5) > 0.7) {
            ctxM.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctxM.fillText('😌', x + 45, y - 35);
        }
    } else if (mood === 'impatient') {
        // Exclamação - ficando impaciente
        ctxM.fillText('❗', x + 40, y - 40 + Math.abs(Math.sin(time * 5)) * 5);
    } else if (mood === 'angry') {
        // Símbolos de raiva
        ctxM.fillText('💢', x + 45, y - 35 + Math.sin(time * 4) * 3);
        if (Math.sin(time * 2) > 0) {
            ctxM.fillText('🔥', x - 45, y - 30);
        }
    } else if (mood === 'calming') {
        // Símbolos diminuindo gradualmente
        const calmProgress = (cyclePosition - 0.75) / 0.25;
        if (calmProgress < 0.5) {
            ctxM.globalAlpha = 1 - calmProgress * 2;
            ctxM.fillText('💢', x + 45, y - 35 + Math.sin(time * 4) * 3);
            ctxM.globalAlpha = 1;
        }
    } else if (mood === 'sleepy') {
        // Zzz
        const zOffset = Math.sin(time * 2) * 5;
        ctxM.fillStyle = 'white';
        ctxM.fillText('💤', x + 50, y - 30 + zOffset);
    } else if (mood === 'bored') {
        // Nota musical ou ...
        if (Math.sin(time) > 0) {
            ctxM.fillText('🎵', x + 45, y - 35 + Math.sin(time * 3) * 5);
        }
    } else if (mood === 'warmup') {
        // Gotas de suor
        if (Math.sin(time * 3) > 0.5) {
            ctxM.fillText('💦', x + 40, y - 25);
        }
    }
}

// Animação do menu
let menuAnimFrame;
let menuStartTime = Date.now() / 1000;

function animateMenu() {
    const menuCanvas = document.getElementById('menuCanvas');
    if (!menuCanvas) return;
    
    const ctxM = menuCanvas.getContext('2d');
    const time = Date.now() / 1000;
    const waitTime = time - menuStartTime;
    
    ctxM.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
    
    // Desenhar apenas o pássaro do jogador centralizado (com reações de espera)
    drawMenuBird(ctxM, 100, 75, selectedPlayerColor, selectedPlayerWing, true, time, waitTime);
    
    menuAnimFrame = requestAnimationFrame(animateMenu);
}

// Resetar tempo de espera
function resetMenuWaitTime() {
    menuStartTime = Date.now() / 1000;
}

// Mostrar/esconder regras
function toggleRules() {
    const rulesOverlay = document.getElementById('rulesOverlay');
    rulesOverlay.classList.toggle('active');
}

// Mostrar/esconder créditos
async function showCredits() {
    const creditsOverlay = document.getElementById('creditsOverlay');
    const creditsContent = document.getElementById('creditsContent');
    
    // Sempre recarregar cr�ditos para pegar atualiza��es
    try {
        const response = await fetch('sounds/audios.txt');
        const text = await response.text();
        
        // Processar o texto mantendo os links HTML
        let lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
        let formattedText = '';
        const seenAuthors = new Set(); // Para evitar autores duplicados
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Cada linha que cont�m "Sound Effect" ou "Music:" � um cr�dito completo
            if (line.includes('Sound Effect') || line.includes('Music:')) {
                // Extrair o nome do autor da linha
                let authorName = '';
                
                // Para linhas com "Sound Effect", extrair o nome do link <a>
                if (line.includes('Sound Effect')) {
                    const match = line.match(/<a[^>]*>([^<]+)<\/a>/);
                    if (match && match[1]) {
                        authorName = match[1].trim();
                    }
                }
                
                // Para linhas com "Music:", extrair o nome ap�s "Author:"
                if (line.includes('Music:')) {
                    const match = line.match(/Author:\s*(.+)/i);
                    if (match && match[1]) {
                        authorName = match[1].trim();
                    }
                }
                
                // S� adicionar se o autor ainda n�o foi visto
                if (authorName && !seenAuthors.has(authorName)) {
                    seenAuthors.add(authorName);
                    formattedText += '<p style="margin-bottom: 15px; line-height: 1.6;">' + line + '</p>';
                } else if (!authorName) {
                    // Se n�o conseguir extrair o autor, adiciona mesmo assim (caso especial)
                    formattedText += '<p style="margin-bottom: 15px; line-height: 1.6;">' + line + '</p>';
                }
            }
        }
        
        creditsContent.innerHTML = formattedText;
    } catch (error) {
        creditsContent.innerHTML = '<p style="color: #e74c3c;">Erro ao carregar cr�ditos. Verifique se o arquivo sounds/audios.txt existe.</p>';
    }
    
    creditsOverlay.classList.add('active');
}

function toggleCredits() {
    const creditsOverlay = document.getElementById('creditsOverlay');
    creditsOverlay.classList.remove('active');
}

// Animação do preview de cor
let previewAnimFrame;

function animateColorPreview() {
    const previewCanvas = document.getElementById('colorPreviewCanvas');
    if (!previewCanvas) return;
    
    const ctxP = previewCanvas.getContext('2d');
    const time = Date.now() / 1000;
    
    ctxP.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Desenhar pássaro preview
    drawPreviewBird(ctxP, 75, 60, selectedPlayerColor, selectedPlayerWing, time);
    
    previewAnimFrame = requestAnimationFrame(animateColorPreview);
}

function drawPreviewBird(ctxP, x, y, color, wingColor, time) {
    ctxP.save();
    
    const hover = Math.sin(time * 3) * 3;
    const scale = 1.2;
    
    ctxP.translate(x, y + hover);
    ctxP.scale(scale, scale);
    
    // Aura
    ctxP.shadowColor = color;
    ctxP.shadowBlur = 15 + Math.sin(time * 3) * 5;
    
    // Corpo
    ctxP.fillStyle = color;
    ctxP.beginPath();
    ctxP.arc(0, 0, 30, 0, Math.PI * 2);
    ctxP.fill();
    
    ctxP.shadowBlur = 0;
    
    // Olho
    ctxP.fillStyle = 'white';
    ctxP.beginPath();
    ctxP.arc(8, -4, 8, 0, Math.PI * 2);
    ctxP.fill();
    
    // Pupila
    const lookX = Math.sin(time * 2) * 2;
    ctxP.fillStyle = 'black';
    ctxP.beginPath();
    ctxP.arc(10 + lookX, -4, 4, 0, Math.PI * 2);
    ctxP.fill();
    
    // Brilho
    ctxP.fillStyle = 'white';
    ctxP.beginPath();
    ctxP.arc(8 + lookX, -6, 1.5, 0, Math.PI * 2);
    ctxP.fill();
    
    // Bico
    ctxP.fillStyle = '#f39c12';
    ctxP.beginPath();
    ctxP.moveTo(25, 0);
    ctxP.lineTo(40, 4);
    ctxP.lineTo(25, 8);
    ctxP.closePath();
    ctxP.fill();
    
    // Asa
    const wingFlap = Math.sin(time * 5) * 0.4;
    const wingY = 4 + Math.sin(time * 5) * 6;
    ctxP.fillStyle = wingColor;
    ctxP.beginPath();
    ctxP.ellipse(-8, wingY, 16, 10 + Math.cos(time * 5) * 4, -0.3 + wingFlap, 0, Math.PI * 2);
    ctxP.fill();
    
    ctxP.restore();
}

// Mostrar/esconder opções
function toggleOptions() {
    const optionsOverlay = document.getElementById('optionsOverlay');
    const isActive = optionsOverlay.classList.contains('active');
    
    optionsOverlay.classList.toggle('active');
    
    if (!isActive) {
        // Abriu - iniciar animação
        animateColorPreview();
    } else {
        // Fechou - parar animação
        if (previewAnimFrame) {
            cancelAnimationFrame(previewAnimFrame);
        }
    }
}

// Cores disponíveis para CPU
const cpuColors = [
    { color: '#e74c3c', wing: '#c0392b' },
    { color: '#2ecc71', wing: '#27ae60' },
    { color: '#3498db', wing: '#2980b9' },
    { color: '#9b59b6', wing: '#8e44ad' },
    { color: '#f1c40f', wing: '#d4ac0d' },
    { color: '#e91e63', wing: '#c2185b' },
    { color: '#00bcd4', wing: '#0097a7' },
    { color: '#ff5722', wing: '#e64a19' },
    { color: '#795548', wing: '#5d4037' }
];

// Cor selecionada pelo jogador
let selectedPlayerColor = '#2ecc71';
let selectedPlayerWing = '#27ae60';

// Sistema de dificuldade
let gameDifficulty = localStorage.getItem('birdGameDifficulty') || 'normal';

const difficultyModifiers = {
    easy: {
        cpuSpeedMultiplier: 0.7,
        timeMultiplier: 1.3,
        cpuReactionDelay: 90,
        cpuErrorChance: 0.3,
        description: 'CPU mais lenta e com mais erros. Mais tempo para jogar!'
    },
    normal: {
        cpuSpeedMultiplier: 1.0,
        timeMultiplier: 1.0,
        cpuReactionDelay: 60,
        cpuErrorChance: 0.15,
        description: 'CPU com velocidade e inteligência normais.'
    },
    hard: {
        cpuSpeedMultiplier: 1.3,
        timeMultiplier: 0.8,
        cpuReactionDelay: 30,
        cpuErrorChance: 0.05,
        description: 'CPU mais rápida e inteligente. Menos tempo!'
    }
};

// Selecionar dificuldade
function selectDifficulty(difficulty) {
    gameDifficulty = difficulty;
    localStorage.setItem('birdGameDifficulty', difficulty);
    
    // Atualizar visual dos botões
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.difficulty === difficulty) {
            btn.classList.add('selected');
        }
    });
    
    // Atualizar descrição
    document.getElementById('difficultyDesc').textContent = difficultyModifiers[difficulty].description;
}

// Aplicar dificuldade à configuração de fase
function applyDifficultyToConfig(config) {
    const mod = difficultyModifiers[gameDifficulty];
    return {
        ...config,
        time: Math.floor(config.time * mod.timeMultiplier),
        cpuSpeed: config.cpuSpeed * mod.cpuSpeedMultiplier
    };
}

// Confirmar reset de progresso
function confirmResetProgress() {
    if (confirm('⚠️ Tem certeza que deseja ZERAR todo o seu progresso?\n\nIsso irá:\n- Resetar todas as fases desbloqueadas\n- Apagar todas as estrelas conquistadas\n- Voltar ao início do jogo\n\nEssa ação não pode ser desfeita!')) {
        resetProgress();
    }
}

// Resetar progresso do jogador
function resetProgress() {
    gameProgress = {
        unlockedAreas: [1],
        unlockedStages: { 1: [1] },
        completedStages: {},
        stageStars: {}
    };
    
    localStorage.setItem('birdGameProgress', JSON.stringify(gameProgress));
    
    alert('✅ Progresso resetado com sucesso!\n\nVocê voltou ao início do jogo.');
    
    // Fechar opções
    toggleOptions();
}

// Inicializar dificuldade na UI
function initDifficultyUI() {
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.difficulty === gameDifficulty) {
            btn.classList.add('selected');
        }
    });
    document.getElementById('difficultyDesc').textContent = difficultyModifiers[gameDifficulty].description;
}

// Atualizar cor da CPU para ser diferente do jogador
function updateCpuColor() {
    // Filtrar cores diferentes da do jogador
    const availableColors = cpuColors.filter(c => c.color !== selectedPlayerColor);
    
    // Escolher aleatoriamente
    const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    
    cpu.color = randomColor.color;
    cpu.wingColor = randomColor.wing;
}

// Inicializar cor da CPU
updateCpuColor();

// Selecionar cor
function selectColor(element) {
    // Remover seleção anterior
    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    
    // Adicionar seleção
    element.classList.add('selected');
    
    // Guardar cor
    selectedPlayerColor = element.dataset.color;
    selectedPlayerWing = element.dataset.wing;
    
    // Atualizar cor do jogador
    player.color = selectedPlayerColor;
    
    // Atualizar CPU para cor diferente
    updateCpuColor();
    
    // Atualizar canvas do menu
    animateMenu();
}

// Iniciar animação do menu
animateMenu();

// Inicializar botões de áudio
setTimeout(() => {
    updateAudioButtons();
}, 100);

// Tocar música de introdução quando a página carregar
// Usar setTimeout para garantir que o DOM esteja pronto
setTimeout(() => {
    playIntroMusic();
}, 100);

// Tentar tocar música quando houver interação do usuário (para contornar políticas de autoplay)
let introMusicAttempted = false;
function attemptPlayIntroOnInteraction() {
    if (sounds.introSound && sounds.introSound.paused) {
        const menuOverlay = document.getElementById('menuOverlay');
        if (menuOverlay && menuOverlay.style.display !== 'none') {
            playIntroMusic();
            introMusicAttempted = true;
        }
    }
}

// Adicionar listeners para interações do usuário
document.addEventListener('click', attemptPlayIntroOnInteraction, { once: true });
document.addEventListener('keydown', attemptPlayIntroOnInteraction, { once: true });
document.addEventListener('touchstart', attemptPlayIntroOnInteraction, { once: true });

// Verificar periodicamente se a música deve tocar (para casos de recarregar página)
setInterval(() => {
    const menuOverlay = document.getElementById('menuOverlay');
    if (menuOverlay && menuOverlay.style.display !== 'none') {
        if (sounds.introSound && sounds.introSound.paused) {
            playIntroMusic();
        }
    }
}, 2000); // Verificar a cada 2 segundos

// Inicializar UI de dificuldade
initDifficultyUI();

// ========== FUNÇÕES DE CHUVA NA FLORESTA ==========

// Criar gota de chuva
function createRainDrop() {
    rainDrops.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 50,
        speed: 3 + Math.random() * 4, // Velocidade variável
        length: 8 + Math.random() * 12, // Comprimento da linha de chuva
        opacity: 0.4 + Math.random() * 0.4 // Transparência variável
    });
}

// Atualizar chuva
function updateRain() {
    // Só ativar na subfase 1-3 da floresta
    if (currentArea !== 1 || currentSubstage !== 3) {
        rainDrops = [];
        return;
    }
    
    // Criar novas gotas periodicamente
    if (Math.random() < 0.3) {
        createRainDrop();
    }
    
    // Atualizar gotas existentes
    for (let i = rainDrops.length - 1; i >= 0; i--) {
        const drop = rainDrops[i];
        
        // Mover gota para baixo
        drop.y += drop.speed;
        
        // Remover se saiu da tela
        if (drop.y > canvas.height + 50) {
            rainDrops.splice(i, 1);
        }
    }
    
    // Limitar número máximo de gotas (performance)
    if (rainDrops.length > 150) {
        rainDrops.splice(0, rainDrops.length - 150);
    }
}

// Desenhar chuva
function drawRain() {
    ctx.save();
    ctx.strokeStyle = '#87CEEB'; // Cor azul claro da chuva
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    
    for (let drop of rainDrops) {
        ctx.globalAlpha = drop.opacity;
        
        // Desenhar linha de chuva (inclinada)
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 2, drop.y + drop.length);
        ctx.stroke();
        
        // Brilho na ponta da gota
        ctx.globalAlpha = drop.opacity * 0.5;
        ctx.fillStyle = '#B0E0E6';
        ctx.beginPath();
        ctx.arc(drop.x - 2, drop.y + drop.length, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    ctx.restore();
}

// ========== FUNÇÕES DE SUOR NO DESERTO ==========

// Criar gota de suor
function createSweatDrop(bird, isPlayer) {
    // Posição aleatória ao redor do pássaro (principalmente na parte superior)
    const angle = Math.random() * Math.PI * 0.6 - Math.PI * 0.3; // -30° a +30°
    const distance = bird.size * 0.7 + Math.random() * bird.size * 0.3;
    const startX = bird.x + Math.cos(angle) * distance;
    const startY = bird.y - bird.size * 0.5 + Math.sin(angle) * distance;
    
    sweatDrops.push({
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 0.4, // Velocidade horizontal leve (meio termo)
        vy: 0.7 + Math.random() * 0.35, // Velocidade vertical (caindo, meio termo)
        size: 2 + Math.random() * 1.5, // Tamanho intermediário
        life: 50 + Math.random() * 25, // Duração intermediária da gota
        maxLife: 50 + Math.random() * 25,
        birdId: isPlayer ? 'player' : 'cpu',
        alpha: 0.6 + Math.random() * 0.25 // Transparência intermediária
    });
}

// Atualizar gotas de suor
function updateSweatDrops() {
    if (currentArea !== 2) {
        sweatDrops = [];
        return;
    }
    
    // Limitar número máximo de gotas por pássaro
    const playerDrops = sweatDrops.filter(d => d.birdId === 'player').length;
    const cpuDrops = sweatDrops.filter(d => d.birdId === 'cpu').length;
    const maxDropsPerBird = 5; // Máximo de 5 gotas por pássaro (meio termo)
    
    // Criar novas gotas periodicamente para cada pássaro (probabilidade intermediária)
    if (!player.stunned && playerDrops < maxDropsPerBird && Math.random() < 0.08) {
        createSweatDrop(player, true);
    }
    if (!cpu.stunned && cpuDrops < maxDropsPerBird && Math.random() < 0.08) {
        createSweatDrop(cpu, false);
    }
    
    // Atualizar gotas existentes
    for (let i = sweatDrops.length - 1; i >= 0; i--) {
        const drop = sweatDrops[i];
        
        // Mover gota
        drop.x += drop.vx;
        drop.y += drop.vy;
        
        // Aceleração gravitacional
        drop.vy += 0.1;
        
        // Reduzir vida
        drop.life--;
        
        // Remover se saiu da tela ou acabou a vida
        if (drop.life <= 0 || drop.y > canvas.height + 20) {
            sweatDrops.splice(i, 1);
        }
    }
}

// Desenhar gotas de suor ao redor do pássaro
function drawSweatDrops(bird, isPlayer) {
    const birdId = isPlayer ? 'player' : 'cpu';
    
    // Desenhar apenas as gotas deste pássaro
    sweatDrops.forEach(drop => {
        if (drop.birdId === birdId) {
            const alpha = (drop.life / drop.maxLife) * drop.alpha;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            
            // Cor da gota (azul claro/transparente)
            ctx.fillStyle = '#87CEEB';
            ctx.strokeStyle = '#5F9EA0';
            ctx.lineWidth = 0.5;
            
            // Desenhar gota (formato de lágrima)
            ctx.beginPath();
            ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Brilho na gota
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(drop.x - drop.size * 0.3, drop.y - drop.size * 0.3, drop.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    });
}
