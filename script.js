const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Tamanho base do canvas (mantido fixo internamente)
const CANVAS_BASE_WIDTH = 800;
const CANVAS_BASE_HEIGHT = 500;

// Função para redimensionar canvas visualmente em mobile (mantém tamanho interno fixo)
function resizeCanvasForMobile() {
    const isMobile = window.innerWidth <= 750;
    const isLandscape = window.innerHeight < window.innerWidth && window.innerHeight <= 600;
    
    // Sempre manter tamanho interno fixo para não quebrar cálculos
    canvas.width = CANVAS_BASE_WIDTH;
    canvas.height = CANVAS_BASE_HEIGHT;
    
    if (isMobile) {
        const aspectRatio = CANVAS_BASE_HEIGHT / CANVAS_BASE_WIDTH;
        let newWidth, newHeight;
        
        if (isLandscape) {
            // Em landscape, considerar altura disponível (descontando controles touch e UI)
            // Espaço para UI superior (~60px) + controles touch inferiores (~140px)
            const uiSpace = 200;
            const availableHeight = Math.max(window.innerHeight - uiSpace, 200);
            const maxWidth = window.innerWidth - 10; // Margem mínima
            
            // Calcular baseado na altura disponível primeiro
            newHeight = Math.min(availableHeight, CANVAS_BASE_HEIGHT);
            newWidth = newHeight / aspectRatio;
            
            // Se a largura calculada for maior que a disponível, ajustar pela largura
            if (newWidth > maxWidth) {
                newWidth = maxWidth;
                newHeight = newWidth * aspectRatio;
            }
            
            // Garantir que não ultrapasse a altura disponível
            if (newHeight > availableHeight) {
                newHeight = availableHeight;
                newWidth = newHeight / aspectRatio;
            }
        } else {
            // Em portrait, usar largura disponível
            const maxWidth = window.innerWidth - 20;
            newWidth = Math.min(maxWidth, CANVAS_BASE_WIDTH);
            newHeight = newWidth * aspectRatio;
        }
        
        canvas.style.width = newWidth + 'px';
        canvas.style.height = newHeight + 'px';
    } else {
        // Desktop: tamanho fixo
        canvas.style.width = CANVAS_BASE_WIDTH + 'px';
        canvas.style.height = CANVAS_BASE_HEIGHT + 'px';
    }
}

// Redimensionar ao carregar e ao redimensionar janela
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', resizeCanvasForMobile);
} else {
    resizeCanvasForMobile();
}
window.addEventListener('resize', resizeCanvasForMobile);

// Estado do jogo
let gameRunning = false;
let gameStarted = false;
let timeLeft = 60;
let playerScore = 0;
let cpuScore = 0;
let lastPlayerScore = 0;
let lastCpuScore = 0;
let playerScoreAnimation = 0; // 0 = sem animação, > 0 = animando
let cpuScoreAnimation = 0; // 0 = sem animação, > 0 = animando
let lastStarCount = 0; // Rastrear última quantidade de estrelas para animação
let starAnimationFrame = 0; // Frame da animação de estrela
let starAnimationIndex = -1; // Índice da estrela sendo animada
let scoreTextEffects = []; // Partículas de texto para mostrar +1, +5, etc.

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
    bat: new Audio('sounds/bat.mp3'),
    hawk: new Audio('sounds/hawk.mp3'),
    powerup: new Audio('sounds/powerup.mp3'),
    introSound: new Audio('sounds/Intro-sound.mp3'),
    owl: new Audio('sounds/owl-sound.mp3'), // Som da coruja boss
    iceBreak: new Audio('sounds/ice-break.mp3'), // Som de vidro/gelo quebrando
    buzz: new Audio('sounds/buzz.mp3'), // Som de vespas zumbindo
    horn: new Audio('sounds/horn.mp3'), // Som de buzina do carro
    oldMan: new Audio('sounds/old_man.mp3'), // Som do senhor idoso jogando pão
};

// Volume geral (0 a 1)
let masterVolume = 0.5;

// Configurar volumes e preload
Object.values(sounds).forEach(sound => {
    if (sound) {
        sound.volume = masterVolume;
        sound.preload = 'auto'; // Pré-carregar todos os sons
    }
});

// Configurar música de introdução para loop e preload
if (sounds.introSound) {
    sounds.introSound.loop = true;
    sounds.introSound.volume = masterVolume * 0.6; // Música de fundo um pouco mais baixa
    sounds.introSound.preload = 'auto'; // Garantir pré-carregamento

    // Adicionar tratamento de erro para carregamento
    sounds.introSound.addEventListener('error', function (e) {
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

// Configurar som de gelo quebrando
if (sounds.iceBreak) {
    sounds.iceBreak.volume = masterVolume * 0.8; // Volume um pouco mais baixo
    sounds.iceBreak.preload = 'auto';

    // Adicionar listeners para debug
    sounds.iceBreak.addEventListener('loadeddata', () => {
        console.log('✅ ice-break.mp3 carregado com sucesso');
    });
    sounds.iceBreak.addEventListener('error', (e) => {
        console.log('⚠️ Arquivo ice-break.mp3 não encontrado - usando som alternativo');
    });
}

// Configurar som de vespas (buzz)
if (sounds.buzz) {
    sounds.buzz.loop = true; // Loop contínuo
    sounds.buzz.volume = masterVolume * 0.6; // Volume a 60%
    sounds.buzz.preload = 'auto';
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
    
    // Pausar ou retomar som de vespas se necessário
    if (sounds.buzz) {
        if (sfxMuted) {
            sounds.buzz.pause();
        } else {
            // Se não estiver mutado e houver vespas na tela, tocar
            if (isBonusStage && currentArea === 2) {
                const wasps = swampInsects ? swampInsects.filter(i => i.isDangerous) : [];
                if (wasps.length > 0) {
                    sounds.buzz.currentTime = 0;
                    sounds.buzz.play().catch(e => {
                        console.log('Erro ao tocar buzz:', e);
                    });
                }
            }
        }
    }
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
                const tryPlayAgain = function () {
                    if (sounds.introSound && sounds.introSound.paused) {
                        sounds.introSound.play().catch(() => { });
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
    speed: 7, // Velocidade base
    baseSpeed: 7,
    boostedSpeed: 10,
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
    2: { name: 'Pântano', icon: '🐸', color: '#2ecc71' },
    3: { name: 'Ilha Tropical', icon: '🏝️', color: '#16a085' },
    4: { name: 'Deserto', icon: '🏜️', color: '#f39c12' },
    5: { name: 'Metrópole', icon: '🏙️', color: '#34495e' },
    6: { name: 'Vulcão', icon: '🌋', color: '#e74c3c' },
    7: { name: 'Gelo', icon: '❄️', color: '#3498db' },
    8: { name: 'Céu', icon: '☁️', color: '#ecf0f1' },
    9: { name: 'Castelo', icon: '🏰', color: '#9b59b6' },
    10: { name: 'Montanha', icon: '⛰️', color: '#95a5a6' }
};

// Configurações de dificuldade por sub-fase
// Configuração das sub-fases com nomes temáticos por área
const substageNames = {
    1: { // Floresta
        1: 'Clareira Verde',
        2: 'Trilha dos Pássaros',
        3: 'Bosque Profundo',
        4: 'Caça às Minhocas',
        5: 'Caminho do Rio',
        6: 'Perigo Noturno',
        7: 'Ninho da Coruja'
    },
    2: { // Pântano
        1: 'Águas Paradas',
        2: 'Lótus Flutuantes',
        3: 'Névoa Matinal',
        4: 'Frutos do Lodo',
        5: 'Caminho dos Juncos',
        6: 'Névoa Sombria',
        7: 'Ninho da Garça'
    },
    3: { // Ilha Tropical
        1: 'Praia Dourada',
        2: 'Praia Cristalina',
        3: 'Praia Tropical',
        4: 'Caça aos Peixes',
        5: 'Praia dos Ventos',
        6: 'Praia dos Pelicanos',
        7: 'Ninho do Tucano'
    },
    4: { // Deserto
        1: 'Oásis Dourado',
        2: 'Dunas Quentes',
        3: 'Cactos Gigantes',
        4: 'Frutos do Deserto',
        5: 'Tempestade de Areia',
        6: 'Perigo no Céu',
        7: 'Ninho do Falcão'
    },
    5: { // Metrópole
        1: 'Parque Central',
        2: 'Avenida Principal',
        3: 'Distrito Comercial',
        4: 'Praça dos Pães',
        5: 'Skyline Urbano',
        6: 'Território dos Corvos',
        7: 'Ninho do Falcão Peregrino'
    },
    6: { // Vulcão
        1: 'Encosta Fumegante',
        2: 'Lava Escorrendo',
        3: 'Cratera Ativa',
        4: 'Frutas Ardentes',
        5: 'Caminho de Fogo',
        6: 'Abismo Vulcânico',
        7: 'Ninho da Fênix'
    },
    7: { // Gelo
        1: 'Lago Congelado',
        2: 'Vale dos Cristais',
        3: 'Montanha de Gelo',
        4: 'Frutas Congeladas',
        5: 'Vento Gélido',
        6: 'Caverna de Gelo',
        7: 'Reino do Pinguim'
    },
    8: { // Céu
        1: 'Camada de Nuvens',
        2: 'Ventos Altos',
        3: 'Tempestade Elétrica',
        4: 'Frutos Celestiais',
        5: 'Corrente de Ar',
        6: 'Reino dos Ventos',
        7: 'Templo dos Céus'
    },
    9: { // Castelo
        1: 'Torre Principal',
        2: 'Pátio Real',
        3: 'Salão dos Reis',
        4: 'Tesouro Escondido',
        5: 'Dungeon Sombria',
        6: 'Torre do Relógio',
        7: 'Trono da Águia'
    },
    10: { // Montanha (FINAL - Autoconhecimento)
        1: 'Base da Montanha',
        2: 'Trilha dos Ventos',
        3: 'Picos Nevados',
        4: 'Frutas das Alturas',
        5: 'Passagem Perigosa',
        6: 'Ninho das Águias',
        7: 'Encontro com a Ave Sábia'
    }
};

const substageConfig = {
    1: { difficulty: 'Fácil', time: 60, cpuSpeed: 2.0, goalScore: 10 },
    2: { difficulty: 'Normal', time: 55, cpuSpeed: 2.4, goalScore: 12 },
    3: { difficulty: 'Normal', time: 55, cpuSpeed: 2.4, goalScore: 12 },
    4: { difficulty: '🪱 BÔNUS', time: 45, cpuSpeed: 0, goalScore: 25, isBonus: true }, // Fase bônus - pegar minhocas/frutos!
    5: { difficulty: 'Normal', time: 55, cpuSpeed: 2.4, goalScore: 12 },
    6: { difficulty: 'Normal + 🦇', time: 55, cpuSpeed: 2.4, goalScore: 12 }, // Com morcego!
    7: { difficulty: '🏆 CHEFE', time: 60, cpuSpeed: 3.5, goalScore: 25, isBoss: true }
};

// CPUs das sub-fases (pássaros genéricos da área)
// Índices: 0=1-1, 1=1-2, 2=1-3, 3=1-4(bônus), 4=1-5, 5=1-6
const areaCpuColors = {
    1: [ // Floresta - pássaros diversos
        { color: '#FFD700', wingColor: '#000000', name: 'Pica-pau', type: 'woodpecker', beakColor: '#808080' },
        { color: '#4169E1', wingColor: '#191970', name: 'Sete Cores', type: 'sete-cores', beakColor: '#2F4F4F' },
        { color: '#F5F5F5', wingColor: '#2C2C2C', name: 'Araponga', type: 'araponga', beakColor: '#1A1A1A' },
        { color: '#DC143C', wingColor: '#1C1C1C', name: 'Tie-sangue', type: 'tie-sangue', beakColor: '#000000' },
        { color: '#8B7355', wingColor: '#5C4A3A', name: 'Bacurau', type: 'bacurau', beakColor: '#654321' }
    ],
    2: [ // Pântano - pássaros verdes/escuros
        { color: '#DC143C', wingColor: '#000000', name: 'Cavalaria', type: 'cavalaria', beakColor: '#FF8C00', eyeColor: '#8B0000' },
        { color: '#FFFFFF', wingColor: '#000000', name: 'Lavadeira', type: 'lavadeira', beakColor: '#2C2C2C' },
        { color: '#CD853F', wingColor: '#6B8E23', name: 'Saracura três potes', type: 'saracura', beakColor: '#FFD700', eyeColor: '#DC143C' },
        { color: '#708090', wingColor: '#556B2F', name: 'Martim', type: 'martim', beakColor: '#FF6B35' }, // Caminho dos Juncos (substage 5)
        { color: '#1a1a1a', wingColor: '#0d0d0d', name: 'Gavião Caramujeiro', type: 'gaviao-caramujeiro', beakColor: '#FF8C00', eyeColor: '#DC143C' }
    ],
    3: [ // Ilha Tropical - pássaros coloridos
        { color: '#FF69B4', wingColor: '#FF1493', name: 'Flamingo', type: 'flamingo', beakColor: '#000000', eyeColor: '#F5DEB3' },
        { color: '#FFD700', wingColor: '#0066FF', name: 'Arara', type: 'arara', beakColor: '#2C2C2C', eyeColor: '#F5DEB3' }, // Amarelo no peito, azul nas asas
        { color: '#DC143C', wingColor: '#B22222', name: 'Guará', type: 'guara', beakColor: '#FFE4B5', eyeColor: '#000000' }, // Vermelho escarlate, bico rosa-bege, olho escuro
        { color: '#ffffff', wingColor: '#000000', name: 'Gaivota', type: 'gull', beakColor: '#FFD700', eyeColor: '#FF4500' }, // Branco com asas pretas, bico amarelo, olho vermelho-laranja
        { color: '#ffffff', wingColor: '#f5f5f5', name: 'Pelicano', type: 'pelican', beakColor: '#FF8C00', eyeColor: '#000000' } // Branco, bico amarelo-laranja, olho escuro - Sub-fase 6
    ],
    4: [ // Deserto - pássaros amarelos/laranjas
        { color: '#808080', wingColor: '#696969', name: 'Pyrrhuloxia', type: 'pyrrhuloxia', beakColor: '#DC143C', eyeColor: '#DC143C' }, // Cinza médio, crista e máscara vermelhas, peito vermelho-rosado
        { color: '#000000', wingColor: '#1a1a1a', name: 'Acorn Woodpecker', type: 'acorn-woodpecker', beakColor: '#C0C0C0', eyeColor: '#8B4513' }, // Preto brilhante, capa vermelha, manchas brancas, bico prata-acinzentado
        { color: '#D3D3D3', wingColor: '#A9A9A9', name: "Virginia's Warbler", type: 'virginias-warbler', beakColor: '#2F2F2F', eyeColor: '#000000' }, // Cinza claro, mancha amarela na testa, peito branco, barriga amarela
        { color: '#F5DEB3', wingColor: '#708090', name: 'Abutre Barbudo', type: 'bearded-vulture', beakColor: '#4A4A4A', eyeColor: '#DC143C' }, // Cabeça branca, máscara preta, pescoço laranja-marrom, asas cinza ardósia, olho vermelho
        { color: '#000000', wingColor: '#1a1a1a', name: 'Phainopepla', type: 'phainopepla', beakColor: '#000000', eyeColor: '#DC143C' } // Preto brilhante, olhos vermelhos, manchas vermelhas nas bochechas, crista preta
    ],
    5: [ // Metrópole - pássaros cinzas/escuros
        { color: '#D2B48C', wingColor: '#CD853F', name: 'Rolinha', type: 'ground-dove', beakColor: '#F5DEB3', eyeColor: '#DC143C' }, // Cabeça cinza pálida, corpo rosa poeirento, olhos vermelhos, bico claro
        { color: '#8B7355', wingColor: '#654321', name: 'Sabiá do Campo', type: 'rufous-backed-thrush', beakColor: '#000000', eyeColor: '#FFD700' }, // Corpo marrom-acinzentado, asas com padrão, olhos amarelos, bico preto
        { color: '#8B4513', wingColor: '#654321', name: 'Sabiá Laranjeira', type: 'orange-thrush', beakColor: '#FF8C00', eyeColor: '#D2691E' }, // Dorso marrom-oliva escuro, barriga laranja-vermelho vibrante, bico amarelo-laranja, olho com anel laranja-amarelo
        { color: '#9CA3AF', wingColor: '#40E0D0', name: 'Sanhaço Cinzento', type: 'sayaca-tanager', beakColor: '#87CEEB', eyeColor: '#000000' }, // Corpo cinza-azulado suave, asas e cauda turquesa-azul vibrante, bico azul céu, olhos escuros
        { color: '#FFD700', wingColor: '#556B2F', name: 'Bem-te-vi', type: 'kiskadee', beakColor: '#000000', eyeColor: '#000000' } // Peito e barriga amarelo vibrante, costas marrom-oliva, asas marrom escuro, coroa branca, faixa ocular preta, bico preto
    ],
    6: [ // Vulcão - pássaros vermelhos/laranjas
        { color: '#FF6347', wingColor: '#DC143C', name: 'Cardeal' },
        { color: '#FF4500', wingColor: '#B22222', name: 'Flamingo' },
        { color: '#FF8C00', wingColor: '#FF4500', name: 'Papagaio' },
        { color: '#CD5C5C', wingColor: '#8B0000', name: 'Arara' }, // Bônus (não usado)
        { color: '#FA8072', wingColor: '#E9967A', name: 'Quetzal' },
        { color: '#E55039', wingColor: '#B33829', name: 'Colibri' }
    ],
    7: [ // Gelo - pássaros azuis/brancos
        { color: '#87CEEB', wingColor: '#4682B4', name: 'Gaivota' },
        { color: '#B0E0E6', wingColor: '#5F9EA0', name: 'Albatroz' },
        { color: '#ADD8E6', wingColor: '#4169E1', name: 'Petrel' },
        { color: '#E0FFFF', wingColor: '#00CED1', name: 'Cisne' }, // Bônus (não usado)
        { color: '#AFEEEE', wingColor: '#48D1CC', name: 'Harpia' },
        { color: '#6CACE4', wingColor: '#3A8BC2', name: 'Andorinha' }
    ],
    8: [ // Céu - pássaros brancos/claros
        { color: '#ecf0f1', wingColor: '#bdc3c7', name: 'Gaivota' },
        { color: '#d5dbdb', wingColor: '#aab7b8', name: 'Albatroz' },
        { color: '#f8f9f9', wingColor: '#e5e8e8', name: 'Andorinha' },
        { color: '#ffffff', wingColor: '#ecf0f1', name: 'Cisne' }, // Bônus (não usado)
        { color: '#cacfd2', wingColor: '#99a3a4', name: 'Petrel' },
        { color: '#abb2b9', wingColor: '#808b96', name: 'Águia' }
    ],
    9: [ // Castelo - pássaros roxos/cinzas
        { color: '#778899', wingColor: '#696969', name: 'Corvo' },
        { color: '#708090', wingColor: '#2F4F4F', name: 'Falcão' },
        { color: '#A9A9A9', wingColor: '#808080', name: 'Pombo' },
        { color: '#8A2BE2', wingColor: '#4B0082', name: 'Pavão' }, // Bônus (não usado)
        { color: '#9370DB', wingColor: '#663399', name: 'Gralha' },
        { color: '#5D5D5D', wingColor: '#3D3D3D', name: 'Abutre' }
    ],
    10: [ // Montanha - pássaros cinzas/brancos (sábios)
        { color: '#95a5a6', wingColor: '#7f8c8d', name: 'Águia' },
        { color: '#b2babb', wingColor: '#95a5a6', name: 'Condor' },
        { color: '#d5dbdb', wingColor: '#aab7b8', name: 'Falcão' },
        { color: '#ecf0f1', wingColor: '#bdc3c7', name: 'Coruja' }, // Bônus (não usado)
        { color: '#85929e', wingColor: '#5d6d7e', name: 'Harpia' },
        { color: '#566573', wingColor: '#34495e', name: 'Ave Sábia' }
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
    2: { // Pântano - Tuiuiu
        name: 'Tuiuiu',
        color: '#ffffff', // Corpo branco
        wingColor: '#f5f5f5', // Asas brancas levemente mais escuras
        type: 'tuiuiu',
        eyeColor: '#000000',
        beakColor: '#000000' // Bico preto
    },
    3: { // Ilha Tropical - Tucano
        name: 'Tucano',
        color: '#000000', // Corpo preto
        wingColor: '#1a1a1a', // Asas preto escuro
        type: 'toucan',
        eyeColor: '#4169E1', // Olho azul
        beakColor: '#FFD700' // Bico amarelo (base do gradiente)
    },
    4: { // Deserto - Falcão-das-pradarias
        name: 'Falcão-das-pradarias',
        color: '#ffffff', // Peito e barriga brancos
        wingColor: '#8B7355', // Costas e asas marrom acinzentado
        type: 'prairie-falcon',
        eyeColor: '#000000',
        beakColor: '#708090' // Bico azul-cinza
    },
    7: { // Gelo - Pinguim
        name: 'Pinguim',
        color: '#2c3e50',
        wingColor: '#1a252f',
        type: 'penguin',
        eyeColor: '#000000',
        beakColor: '#f39c12'
    },
    5: { // Metrópole - Coruja Suindara
        name: 'Coruja Suindara',
        color: '#FFFFFF', // Peito e barriga brancos
        wingColor: '#D2B48C', // Asas e costas dourado-marrom com padrão
        type: 'barn-owl',
        eyeColor: '#000000', // Olhos escuros (quase pretos)
        beakColor: '#D2691E' // Bico pequeno marrom
    },
    6: { // Castelo - Águia Real
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
    speed: 4.5, // Velocidade base
    baseSpeed: 4.5,
    boostedSpeed: 10,
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

// Morcego inimigo (aparece apenas na fase 1-6 - floresta)
let bat = {
    active: false,
    x: -100,
    y: 100,
    speed: 8,
    direction: 1, // 1 = direita, -1 = esquerda
    warningTime: 0, // Tempo de aviso antes de atacar
    cooldown: 0, // Tempo até próximo ataque
    targetY: 100, // Altura do ataque
    wingFlap: 0 // Animação das asas
};

// Gavião inimigo (aparece na fase 2-6 - pântano e 4-6 - deserto)
let hawk = {
    active: false,
    x: -100,
    y: 100,
    speed: 8,
    direction: 1, // 1 = direita, -1 = esquerda
    warningTime: 0, // Tempo de aviso antes de atacar
    cooldown: 0, // Tempo até próximo ataque
    targetY: 100, // Altura do ataque
    wingFlap: 0 // Animação das asas
};

// Iniciar ataque do morcego
function spawnBat() {
    // Só funciona na área 1 (floresta)
    if (currentArea !== 1 || currentSubstage !== 6) return;
    if (bat.active || bat.cooldown > 0) return;

    // Escolhe direção aleatória
    bat.direction = Math.random() > 0.5 ? 1 : -1;
    bat.x = bat.direction === 1 ? -80 : canvas.width + 80;

    // Mira na altura do player (com variação)
    bat.targetY = player.y + (Math.random() - 0.5) * 100;
    bat.targetY = Math.max(80, Math.min(canvas.height - 100, bat.targetY));
    bat.y = bat.targetY;

    bat.warningTime = 90; // 1.5 segundos de aviso
    bat.active = true;

    // 🔊 Som do morcego aparecendo
    playSound('bat');
}

// Atualizar morcego
function updateBat() {
    // Ativa apenas na fase 1-6 (floresta)
    if (currentArea !== 1 || currentSubstage !== 6) {
        bat.active = false;
        return;
    }

    // Cooldown entre ataques
    if (bat.cooldown > 0) {
        bat.cooldown--;
    }

    // Spawn aleatório (a cada ~5-8 segundos)
    if (!bat.active && bat.cooldown <= 0 && Math.random() < 0.003) {
        spawnBat();
    }

    if (!bat.active) return;

    // Animação das asas
    bat.wingFlap += 0.3;

    // Fase de aviso (pisca na borda)
    if (bat.warningTime > 0) {
        bat.warningTime--;
        return;
    }

    // Movimento do morcego (movimento em zigue-zague)
    bat.x += bat.speed * bat.direction;
    bat.y = bat.targetY + Math.sin(bat.wingFlap * 0.5) * 15; // Movimento ondulante

    // Verificar colisão com player
    if (!player.stunned) {
        const dist = Math.sqrt(
            Math.pow(bat.x - player.x, 2) +
            Math.pow(bat.y - player.y, 2)
        );

        if (dist < 50) {
            // Player foi atingido!
            player.stunned = true;
            player.stunTime = 90; // 1.5 segundos de stun

            // 🔊 Sons de ataque do morcego
            playSound('bat');
            playSound('stun');
        }
    }

    // Desativar quando sair da tela
    if ((bat.direction === 1 && bat.x > canvas.width + 100) ||
        (bat.direction === -1 && bat.x < -100)) {
        bat.active = false;
        bat.cooldown = 300; // 5 segundos até próximo ataque
    }
}

// Desenhar morcego
function drawBat() {
    // Ativa apenas na fase 1-6 (floresta)
    if (currentArea !== 1 || currentSubstage !== 6) return;
    if (!bat.active) return;

    ctx.save();

    // Fase de aviso - pisca na borda da tela
    if (bat.warningTime > 0) {
        const blink = Math.floor(bat.warningTime / 10) % 2 === 0;
        if (blink) {
            ctx.fillStyle = 'rgba(75, 0, 130, 0.8)';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';

            // Indicador de perigo na borda
            const warningX = bat.direction === 1 ? 50 : canvas.width - 50;
            ctx.fillText('⚠️ MORCEGO!', warningX, bat.targetY);

            // Seta indicando direção
            ctx.fillText(bat.direction === 1 ? '➡️' : '⬅️', warningX, bat.targetY + 30);
        }
        ctx.restore();
        return;
    }

    ctx.translate(bat.x, bat.y);

    // Espelhar se voando para esquerda
    if (bat.direction === -1) {
        ctx.scale(-1, 1);
    }

    // Sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 60, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Animação das asas (batimento)
    const wingAngle = Math.sin(bat.wingFlap) * 0.5;

    // Corpo do morcego (pequeno e escuro)
    ctx.fillStyle = '#2C2C2C';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(15, -3, 10, 0, Math.PI * 2);
    ctx.fill();

    // Orelhas do morcego
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.moveTo(20, -10);
    ctx.lineTo(25, -18);
    ctx.lineTo(22, -12);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(20, -8);
    ctx.lineTo(25, -16);
    ctx.lineTo(22, -10);
    ctx.closePath();
    ctx.fill();

    // Olhos brilhantes
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(18, -5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Asas do morcego (animadas)
    ctx.fillStyle = '#1A1A1A';
    ctx.globalAlpha = 0.8;

    // Asa esquerda
    ctx.beginPath();
    ctx.ellipse(-15, 0, 25, 8, wingAngle, 0, Math.PI * 2);
    ctx.fill();

    // Asa direita
    ctx.beginPath();
    ctx.ellipse(-15, 0, 25, 8, -wingAngle, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1.0;

    ctx.restore();
}

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
    // Ativa na fase 2-6 (pântano) ou 4-6 (deserto)
    if ((currentArea !== 2 && currentArea !== 4) || currentSubstage !== 6) {
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

    // Animação das asas
    hawk.wingFlap += 0.3;

    // Fase de aviso (pisca na borda)
    if (hawk.warningTime > 0) {
        hawk.warningTime--;
        return;
    }

    // Movimento do gavião (movimento reto e rápido)
    hawk.x += hawk.speed * hawk.direction;
    hawk.y = hawk.targetY + Math.sin(hawk.wingFlap * 0.3) * 5; // Movimento suave

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
    // Ativa na fase 2-6 (pântano) ou 4-6 (deserto)
    if ((currentArea !== 2 && currentArea !== 4) || currentSubstage !== 6) return;
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

    // Animação das asas (batimento)
    const wingAngle = Math.sin(hawk.wingFlap) * 0.4;

    // Corpo do gavião (marrom/amarelo do deserto)
    ctx.fillStyle = '#DAA520';
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça
    ctx.fillStyle = '#B8860B';
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
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, -15);
    ctx.lineTo(40, -12);
    ctx.stroke();

    // Asas do gavião (animadas)
    ctx.fillStyle = '#CD853F';
    ctx.globalAlpha = 0.9;

    // Asa superior
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.quadraticCurveTo(-30, -30 + Math.sin(hawk.wingFlap) * 15, -50, -10 + Math.sin(hawk.wingFlap) * 15);
    ctx.quadraticCurveTo(-30, 0, -10, 0);
    ctx.closePath();
    ctx.fill();

    // Asa inferior
    ctx.beginPath();
    ctx.moveTo(-10, 5);
    ctx.quadraticCurveTo(-30, 30 - Math.sin(hawk.wingFlap) * 15, -50, 10 - Math.sin(hawk.wingFlap) * 15);
    ctx.quadraticCurveTo(-30, 5, -10, 5);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1.0;

    // Cauda
    ctx.fillStyle = '#8B4513';
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

// ========== FASE BÔNUS DO GELO - FRUTAS CONGELADAS ==========
let frozenFruits = []; // Frutas congeladas que precisam ser bicadas
let iceShards = []; // Estilhaços de gelo quando quebra

// ========== FASE BÔNUS DO DESERTO - FRUTOS DE CACTOS ==========
let cactusFruits = []; // Frutas que aparecem nos cactos e secam rapidamente
let cactusFruitParticles = []; // Partículas quando a fruta seca ou é coletada

// ========== FASE BÔNUS DO PÂNTANO - INSETOS ==========
let swampInsects = []; // Insetos que aparecem na água ou voando
let insectParticles = []; // Partículas ao coletar inseto

// ========== FASE BÔNUS DA ILHA TROPICAL - PEIXES ==========
let tropicalFish = []; // Peixes que pulam da água
let fishParticles = []; // Partículas ao coletar peixe

// ========== FASE BÔNUS DA METRÓPOLE - PÃES ==========
let breads = []; // Pães jogados na praça
let breadParticles = []; // Partículas ao coletar pão
let breadThrower = null; // Pessoa que joga os pães (posição e animação)
let cars = []; // Carros que passam pela tela

// ========== SISTEMA DE SUOR NO DESERTO E ILHA TROPICAL ==========
let sweatDrops = []; // Gotas de suor dos pássaros no deserto e ilha tropical
let coldEffects = []; // Efeitos de frio dos pássaros no gelo
let waterDrops = []; // Gotas de água dos pássaros no pântano

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

                lastPlayerScore = playerScore;
                playerScore++;
                if (playerScore !== lastPlayerScore) {
                    playerScoreAnimation = 30; // Inicia animação do placar
                }

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

    // OTIMIZAÇÃO: Limitar número total de efeitos (evitar memory leak)
    if (wormEatEffects.length > 50) {
        wormEatEffects.splice(0, wormEatEffects.length - 50);
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

// ========== SISTEMA DE FRUTAS CONGELADAS (BÔNUS DO GELO) ==========

// Inicializar frutas congeladas
function initFrozenFruits() {
    frozenFruits = [];
    iceShards = [];

    // Spawnar apenas 1 fruta no início para melhor performance
    spawnFrozenFruit();
}

// Spawnar fruta congelada
function spawnFrozenFruit() {
    if (!isBonusStage || currentArea !== 3) return;

    // Limitar número de frutas na tela (máximo 2 para melhor performance)
    if (frozenFruits.length >= 2) return;

    const foodEmojis = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍉', '🍑', '🥝'];

    frozenFruits.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: Math.random() * (canvas.height - 200) + 100,
        emoji: foodEmojis[Math.floor(Math.random() * foodEmojis.length)],
        size: 30 + Math.random() * 15,
        iceLayer: 3, // Camadas de gelo (precisa bicar 3 vezes)
        maxIceLayer: 3,
        points: 1, // Vale 1 ponto quando coletada
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        floatOffset: Math.random() * Math.PI * 2,
        collected: false,
        lastHitTime: 0, // Timestamp da última vez que foi bicada
        wasInRange: false // Flag para detectar quando saiu da área
    });
}

// ========== SISTEMA DE FRUTOS DE CACTOS (BÔNUS DO DESERTO) ==========

// Inicializar frutos de cactos
function initCactusFruits() {
    cactusFruits = [];
    cactusFruitParticles = [];

    // Spawnar apenas 1 fruto no início para melhor performance
    spawnCactusFruit();
}

// Spawnar fruto de cacto
function spawnCactusFruit() {
    if (!isBonusStage || currentArea !== 4) return;

    // Limitar número de frutos na tela (máximo 2 para melhor gameplay)
    if (cactusFruits.length >= 2) return;

    const fruitEmojis = ['🌵', '🍇', '🍊', '🍑'];

    // Posição aleatória no topo de um cacto (simulado)
    cactusFruits.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: groundY - 80 - Math.random() * 40, // Acima do chão, variando altura
        emoji: fruitEmojis[Math.floor(Math.random() * fruitEmojis.length)],
        size: 25 + Math.random() * 10,
        maxSize: 25 + Math.random() * 10,
        freshness: 100, // 100 = fresco, 0 = seco
        maxFreshness: 100,
        points: 1, // Vale 1 ponto quando coletada
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        floatOffset: Math.random() * Math.PI * 2,
        collected: false,
        dried: false
    });
}

// Atualizar frutos de cactos
function updateCactusFruits() {
    if (!isBonusStage || currentArea !== 4) return;

    // Spawnar novos frutos periodicamente (probabilidade aumentada)
    if (Math.random() < 0.02 && cactusFruits.length < 2) {
        spawnCactusFruit();
    }

    // Atualizar frutos existentes
    for (let i = cactusFruits.length - 1; i >= 0; i--) {
        const fruit = cactusFruits[i];

        if (fruit.collected || fruit.dried) {
            cactusFruits.splice(i, 1);
            continue;
        }

        // Fruto seca progressivamente no calor do deserto (muito rápido devido ao calor intenso)
        fruit.freshness -= 0.8; // Seca muito rápido no calor extremo do deserto

        // Reduzir tamanho conforme seca
        const freshnessRatio = fruit.freshness / fruit.maxFreshness;
        fruit.size = fruit.maxSize * (0.5 + freshnessRatio * 0.5); // Reduz até 50% do tamanho

        // Rotação suave
        fruit.rotation += fruit.rotationSpeed;

        // Flutuação suave
        fruit.floatOffset += 0.05;

        // Se secou completamente, remover
        if (fruit.freshness <= 0) {
            fruit.dried = true;
            createDriedFruitEffect(fruit.x, fruit.y);
        }
    }

    // Atualizar partículas
    for (let i = cactusFruitParticles.length - 1; i >= 0; i--) {
        const particle = cactusFruitParticles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.15; // Gravidade
        particle.rotation += particle.rotationSpeed;
        particle.life--;
        particle.alpha = particle.life / particle.maxLife;

        if (particle.life <= 0 || particle.y > canvas.height + 20) {
            cactusFruitParticles.splice(i, 1);
        }
    }
}

// Verificar colisão com frutos de cactos
function checkCactusFruitCollisions() {
    if (!isBonusStage || currentArea !== 4) return;

    for (let i = cactusFruits.length - 1; i >= 0; i--) {
        const fruit = cactusFruits[i];
        if (fruit.collected || fruit.dried) continue;

        const dist = Math.hypot(player.x - fruit.x, player.y - fruit.y);
        const hitRadius = fruit.size / 2 + player.size;
        const isInRange = dist < hitRadius;

        // Detectar quando o jogador entrou/saiu da área de colisão
        const wasInRangeBefore = fruit.wasInRange || false;
        const justEntered = !wasInRangeBefore && isInRange;

        if (fruit.wasInRange && !isInRange) {
            fruit.wasInRange = false;
        }

        if (isInRange) {
            fruit.wasInRange = true;

            // Coletar fruto (mesmo se estiver secando)
            if (justEntered && !fruit.collected) {
                fruit.collected = true;

                lastPlayerScore = playerScore;
                playerScore += fruit.points;
                if (playerScore !== lastPlayerScore) {
                    playerScoreAnimation = 30;
                }

                // Atualizar contador
                const wormCountEl = document.getElementById('wormCount');
                if (wormCountEl) {
                    wormCountEl.textContent = playerScore;
                }
                // Atualizar texto do contador para mostrar "Insetos" no pântano
                if (currentArea === 2 && isBonusStage) {
                    const bonusCounter = document.querySelector('.bonus-counter');
                    if (bonusCounter) {
                        const config = substageConfig[currentSubstage];
                        bonusCounter.innerHTML = `🦟 Insetos: <span id="wormCount">${playerScore}</span> / <span id="wormGoal">${config.goalScore}</span>`;
                    }
                }

                // Som de coletar
                playSound('yummy');

                // Animação de comer
                player.eatAnimation = 20;
                player.lastEatenEmoji = fruit.emoji;

                // Criar efeito visual
                createCactusFruitCollectEffect(fruit.x, fruit.y, fruit.emoji, fruit.points);
            }
        }
    }
}

// Criar efeito visual quando fruto seca
function createDriedFruitEffect(x, y) {
    // Partículas marrons (poeira)
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        cactusFruitParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * (1 + Math.random() * 2),
            vy: Math.sin(angle) * (1 + Math.random() * 2),
            size: 2 + Math.random() * 3,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            life: 30 + Math.random() * 20,
            maxLife: 30 + Math.random() * 20,
            alpha: 1,
            color: '#8B4513' // Marrom (poeira)
        });
    }
}

// Criar efeito visual ao coletar fruto
function createCactusFruitCollectEffect(x, y, emoji, points) {
    // Partículas douradas
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 / 15) * i;
        wormEatEffects.push({
            type: 'particle',
            x: x,
            y: y,
            vx: Math.cos(angle) * (3 + Math.random() * 2),
            vy: Math.sin(angle) * (3 + Math.random() * 2),
            life: 40,
            maxLife: 40,
            color: '#f39c12' // Dourado/laranja do deserto
        });
    }

    // Texto com emoji da fruta
    wormEatEffects.push({
        type: 'text',
        x: x,
        y: y,
        vy: -2,
        life: 50,
        maxLife: 50,
        text: `${emoji} +${points}`
    });
}

// Desenhar frutos de cactos
function drawCactusFruits() {
    if (!isBonusStage || currentArea !== 4) return;

    cactusFruits.forEach(fruit => {
        if (fruit.collected || fruit.dried) return;

        ctx.save();
        ctx.translate(fruit.x, fruit.y + Math.sin(fruit.floatOffset) * 3);
        ctx.rotate(fruit.rotation);

        // Calcular frescor (0 = seco, 1 = fresco)
        const freshnessRatio = fruit.freshness / fruit.maxFreshness;

        // Cor muda conforme seca (verde -> marrom)
        const freshColor = '#2ecc71'; // Verde fresco
        const dryColor = '#8B4513'; // Marrom seco
        const currentColor = interpolateColor(freshColor, dryColor, 1 - freshnessRatio);

        // Opacidade reduz conforme seca
        ctx.globalAlpha = 0.6 + freshnessRatio * 0.4;

        // Desenhar fruto
        ctx.font = `${fruit.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fruit.emoji, 0, 0);

        // Mostrar frescor restante
        if (freshnessRatio < 0.5) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#f39c12';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(`🔥${Math.ceil(freshnessRatio * 100)}%`, 0, -fruit.size / 2 - 12);
        }

        ctx.restore();
    });

    // Desenhar partículas
    cactusFruitParticles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);

        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
}

// ========== SISTEMA DE INSETOS DO PÂNTANO (BÔNUS) ==========

// Inicializar insetos
function initSwampInsects() {
    swampInsects = [];
    insectParticles = [];

    // Garantir que estamos na fase bônus do pântano
    if (!isBonusStage || currentArea !== 2) {
        return;
    }

    // Spawnar 2 insetos imediatamente no início
    for (let i = 0; i < 2; i++) {
        spawnSwampInsect();
    }
}

// Spawnar inseto do pântano
function spawnSwampInsect() {
    if (!isBonusStage || currentArea !== 2) {
        return;
    }

    // Contar insetos normais e vespas separadamente
    const normalInsects = swampInsects.filter(i => !i.isDangerous);
    const wasps = swampInsects.filter(i => i.isDangerous);

    // Limitar vespas (máximo 3 vespões na tela)
    const maxWasps = 3;
    // Limitar insetos normais (máximo 2 insetos normais na tela)
    const maxNormalInsects = 2;

    // Chance de spawnar vespão perigoso (15% de chance, mas só se não exceder limite)
    const isWasp = Math.random() < 0.15 && wasps.length < maxWasps;
    
    // Se tentou spawnar vespão mas já tem o máximo, spawnar inseto normal
    if (isWasp && wasps.length >= maxWasps) {
        // Não spawnar nada agora, esperar próxima chance
        return;
    }
    
    // Se for inseto normal e já tem o máximo, não spawnar
    if (!isWasp && normalInsects.length >= maxNormalInsects) {
        return;
    }
    
    let insectType;
    if (isWasp) {
        // Vespão perigoso que stunna o jogador
        insectType = { emoji: '🐝', name: 'Vespão', color: '#f39c12', speed: 7.5, isDangerous: true };
    } else {
        // Apenas insetos voadores normais (moscas, mosquitos, gafanhotos) - velocidades aumentadas
        const normalInsectTypes = [
            { emoji: '🦟', name: 'Mosquito', color: '#2ecc71', speed: 6.0, isDangerous: false },
            { emoji: '🪰', name: 'Mosca', color: '#16a085', speed: 5.5, isDangerous: false },
            { emoji: '🦗', name: 'Gafanhoto', color: '#27ae60', speed: 7.0, isDangerous: false }
        ];
        insectType = normalInsectTypes[Math.floor(Math.random() * normalInsectTypes.length)];
    }
    
    // Escolher direção: esquerda para direita ou direita para esquerda
    const goingRight = Math.random() > 0.5; // 50% de chance para cada direção
    const baseSpeed = insectType.speed * (0.9 + Math.random() * 0.4); // Velocidade variável (90% a 130% da base)
    const speedX = goingRight ? baseSpeed : -baseSpeed; // Positivo = direita, Negativo = esquerda
    
    // Posição inicial: esquerda ou direita da tela
    const startX = goingRight ? -50 : canvas.width + 50;
    
    const newInsect = {
        x: startX,
        y: 100 + Math.random() * 200, // Sempre no ar, altura variável
        emoji: insectType.emoji,
        size: isWasp ? 35 + Math.random() * 10 : 25 + Math.random() * 10, // Vespão é maior
        points: isWasp ? 0 : 1, // Vespão não dá pontos
        rotation: goingRight ? 0 : Math.PI, // Olha na direção do movimento (fixo, sem girar)
        rotationSpeed: 0, // Sem rotação
        floatOffset: Math.random() * Math.PI * 2,
        collected: false,
        isFlying: true, // Sempre voando
        speedX: speedX, // Velocidade horizontal (positiva ou negativa)
        speedY: (Math.random() - 0.5) * baseSpeed * 0.3, // Movimento vertical leve no ar
        color: insectType.color,
        life: 600 + Math.random() * 400, // Tempo de vida maior (10-16 segundos a 60fps)
        maxLife: 600 + Math.random() * 400,
        goingRight: goingRight, // Guardar direção para referência
        isDangerous: insectType.isDangerous || false // Marca se é vespão perigoso
    };

    swampInsects.push(newInsect);
}

// Atualizar insetos do pântano
function updateSwampInsects() {
    if (!isBonusStage || currentArea !== 2) return;

    // Limites
    const maxWasps = 3;
    const maxNormalInsects = 2;

    // Contar insetos normais e vespas separadamente
    const normalInsects = swampInsects.filter(i => !i.isDangerous);
    const wasps = swampInsects.filter(i => i.isDangerous);

    // Controlar som de vespas (buzz)
    if (sounds.buzz) {
        if (wasps.length > 0) {
            // Há vespas na tela - tocar som
            if (sounds.buzz.paused || sounds.buzz.ended) {
                if (!sfxMuted) {
                    sounds.buzz.currentTime = 0; // Reiniciar do início
                    sounds.buzz.play().catch(e => {
                        console.log('Erro ao tocar buzz:', e);
                    });
                }
            }
        } else {
            // Não há vespas - parar som
            if (!sounds.buzz.paused) {
                sounds.buzz.pause();
                sounds.buzz.currentTime = 0; // Resetar para o início
            }
        }
    }

    // Garantir que sempre há pelo menos 1 inseto normal na tela (não vespão)
    if (normalInsects.length === 0) {
        // Forçar spawn de inseto normal (não vespão) - sempre priorizar insetos normais
        // Temporariamente reduzir chance de vespão para garantir inseto normal
        const tempWaspChance = wasps.length >= maxWasps ? 0 : 0.05; // Reduzir chance se já tem muitas vespas
        if (Math.random() >= tempWaspChance) {
            // Spawnar inseto normal garantido
            const normalInsectTypes = [
                { emoji: '🦟', name: 'Mosquito', color: '#2ecc71', speed: 6.0, isDangerous: false },
                { emoji: '🪰', name: 'Mosca', color: '#16a085', speed: 5.5, isDangerous: false },
                { emoji: '🦗', name: 'Gafanhoto', color: '#27ae60', speed: 7.0, isDangerous: false }
            ];
            const insectType = normalInsectTypes[Math.floor(Math.random() * normalInsectTypes.length)];
            const goingRight = Math.random() > 0.5;
            const baseSpeed = insectType.speed * (0.9 + Math.random() * 0.4);
            const speedX = goingRight ? baseSpeed : -baseSpeed;
            const startX = goingRight ? -50 : canvas.width + 50;
            
            swampInsects.push({
                x: startX,
                y: 100 + Math.random() * 200,
                emoji: insectType.emoji,
                size: 25 + Math.random() * 10,
                points: 1,
                rotation: goingRight ? 0 : Math.PI,
                rotationSpeed: 0,
                floatOffset: Math.random() * Math.PI * 2,
                collected: false,
                isFlying: true,
                speedX: speedX,
                speedY: (Math.random() - 0.5) * baseSpeed * 0.3,
                color: insectType.color,
                life: 600 + Math.random() * 400,
                maxLife: 600 + Math.random() * 400,
                goingRight: goingRight,
                isDangerous: false
            });
        }
    }

    // Spawnar novos insetos periodicamente
    // Insetos normais: sempre priorizar - probabilidade maior
    if (normalInsects.length < maxNormalInsects && Math.random() < 0.04) {
        // Forçar inseto normal se estiver abaixo do máximo
        const waspChance = wasps.length >= maxWasps ? 0 : 0.1; // Reduzir chance de vespão se já tem muitas
        if (Math.random() >= waspChance) {
            // Spawnar inseto normal
            const normalInsectTypes = [
                { emoji: '🦟', name: 'Mosquito', color: '#2ecc71', speed: 6.0, isDangerous: false },
                { emoji: '🪰', name: 'Mosca', color: '#16a085', speed: 5.5, isDangerous: false },
                { emoji: '🦗', name: 'Gafanhoto', color: '#27ae60', speed: 7.0, isDangerous: false }
            ];
            const insectType = normalInsectTypes[Math.floor(Math.random() * normalInsectTypes.length)];
            const goingRight = Math.random() > 0.5;
            const baseSpeed = insectType.speed * (0.9 + Math.random() * 0.4);
            const speedX = goingRight ? baseSpeed : -baseSpeed;
            const startX = goingRight ? -50 : canvas.width + 50;
            
            swampInsects.push({
                x: startX,
                y: 100 + Math.random() * 200,
                emoji: insectType.emoji,
                size: 25 + Math.random() * 10,
                points: 1,
                rotation: goingRight ? 0 : Math.PI,
                rotationSpeed: 0,
                floatOffset: Math.random() * Math.PI * 2,
                collected: false,
                isFlying: true,
                speedX: speedX,
                speedY: (Math.random() - 0.5) * baseSpeed * 0.3,
                color: insectType.color,
                life: 600 + Math.random() * 400,
                maxLife: 600 + Math.random() * 400,
                goingRight: goingRight,
                isDangerous: false
            });
        } else {
            spawnSwampInsect(); // Pode ser vespão
        }
    }
    // Vespas: probabilidade menor e só se não exceder limite
    if (wasps.length < maxWasps && Math.random() < 0.02) {
        spawnSwampInsect();
    }

    // Atualizar insetos existentes
    for (let i = swampInsects.length - 1; i >= 0; i--) {
        const insect = swampInsects[i];

        if (insect.collected) {
            swampInsects.splice(i, 1);
            continue;
        }

        // Movimento
        insect.x += insect.speedX;
        insect.y += insect.speedY;

        // Se voando, adicionar movimento ondulante leve
        if (insect.isFlying) {
            insect.y += Math.sin(insect.floatOffset) * 0.3;
            insect.floatOffset += 0.08;
        }

        // Sem rotação - mantém a direção fixa

        // Reduzir vida (mais devagar para dar mais tempo)
        insect.life -= 0.5; // Reduzir mais devagar

        // Se saiu da tela, remover o inseto (não fazer voltar)
        if (insect.goingRight && insect.x > canvas.width + 50) {
            // Inseto indo para direita saiu pela direita
            swampInsects.splice(i, 1);
            continue;
        }
        if (!insect.goingRight && insect.x < -50) {
            // Inseto indo para esquerda saiu pela esquerda
            swampInsects.splice(i, 1);
            continue;
        }
        if (insect.y < -50 || insect.y > canvas.height + 50) {
            // Inseto saiu pela parte superior ou inferior
            swampInsects.splice(i, 1);
            continue;
        }
        if (insect.y > canvas.height + 50) {
            insect.y = -50;
        }

        // Se acabou a vida, remover
        if (insect.life <= 0) {
            const wasDangerous = insect.isDangerous;
            swampInsects.splice(i, 1);
            // Se era vespão, não precisa spawnar nada (já tem lógica separada)
            // Se era inseto normal, tentar spawnar novo inseto normal
            if (!wasDangerous) {
                const remainingNormal = swampInsects.filter(i => !i.isDangerous);
                if (remainingNormal.length < 2) {
                    spawnSwampInsect();
                }
            }
            continue;
        }

        // Se voando, fazer voltar para dentro da tela (bordas mais flexíveis)
        if (insect.isFlying) {
            if (insect.x < 20) {
                insect.speedX = Math.abs(insect.speedX) || 0.5;
            }
            if (insect.x > canvas.width - 20) {
                insect.speedX = -Math.abs(insect.speedX) || -0.5;
            }
            if (insect.y < 60) {
                insect.speedY = Math.abs(insect.speedY) || 0.3;
            }
            if (insect.y > canvas.height - 120) {
                insect.speedY = -Math.abs(insect.speedY) || -0.3;
            }
        }
    }

    // Atualizar partículas
    for (let i = insectParticles.length - 1; i >= 0; i--) {
        const particle = insectParticles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.15; // Gravidade
        particle.rotation += particle.rotationSpeed;
        particle.life--;
        particle.alpha = particle.life / particle.maxLife;

        if (particle.life <= 0 || particle.y > canvas.height + 20) {
            insectParticles.splice(i, 1);
        }
    }
}

// Verificar colisão com insetos
function checkSwampInsectCollisions() {
    if (!isBonusStage || currentArea !== 2) return;

    for (let i = swampInsects.length - 1; i >= 0; i--) {
        const insect = swampInsects[i];
        if (insect.collected) continue;

        const dist = Math.hypot(player.x - insect.x, player.y - insect.y);
        const hitRadius = insect.size / 2 + player.size;

        if (dist < hitRadius) {
            if (insect.isDangerous) {
                // Vespão perigoso - stunnar o jogador!
                if (!player.stunned) {
                    player.stunned = true;
                    player.stunTime = 180; // 3 segundos de stun (180 frames a 60fps)

                    // 🔊 Som de stun
                    playSound('stun');

                    // Criar efeito visual de stun
                    createWaspStunEffect(insect.x, insect.y);
                }

                // Vespão desaparece após atacar
                swampInsects.splice(i, 1);
            } else {
                // Inseto normal - coletar e dar pontos
                insect.collected = true;

                lastPlayerScore = playerScore;
                playerScore += insect.points;
                if (playerScore !== lastPlayerScore) {
                    playerScoreAnimation = 30;
                }

                // Atualizar contador (atualizar texto também se for pântano)
                const wormCountEl = document.getElementById('wormCount');
                if (wormCountEl) {
                    wormCountEl.textContent = playerScore;
                }

                // Atualizar texto do contador para mostrar "Insetos" no pântano
                const bonusCounter = document.querySelector('.bonus-counter');
                if (bonusCounter && currentArea === 2) {
                    const config = substageConfig[currentSubstage];
                    bonusCounter.innerHTML = `🦟 Insetos: <span id="wormCount">${playerScore}</span> / <span id="wormGoal">${config.goalScore}</span>`;
                }

                // Som de coletar
                playSound('yummy');

                // Animação de comer
                player.eatAnimation = 20;
                player.lastEatenEmoji = insect.emoji;

                // Criar efeito visual
                createInsectCollectEffect(insect.x, insect.y, insect.emoji, insect.points);

                // Remover inseto
                swampInsects.splice(i, 1);
            }
        }
    }
}

// Criar efeito visual de stun do vespão
function createWaspStunEffect(x, y) {
    // Partículas amarelas/laranjas (perigo do vespão)
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
            color: '#f39c12' // Cor amarela/laranja do vespão
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
        text: '🐝 STUNNED!'
    });

    // Anel de expansão amarelo/laranja
    wormEatEffects.push({
        type: 'ring',
        x: x,
        y: y,
        radius: 15,
        maxRadius: 80,
        life: 30,
        maxLife: 30,
        text: 'STUNNED' // Marca para identificar cor amarela
    });
}

// Criar efeito visual ao coletar inseto
function createInsectCollectEffect(x, y, emoji, points) {
    // Partículas coloridas
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        insectParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * (2 + Math.random() * 2),
            vy: Math.sin(angle) * (2 + Math.random() * 2) - 1,
            size: 3 + Math.random() * 3,
            color: '#2ecc71',
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            life: 30,
            maxLife: 30,
            alpha: 1
        });
    }
}

// Desenhar insetos do pântano
function drawSwampInsects() {
    if (!isBonusStage || currentArea !== 2) {
        return;
    }

    swampInsects.forEach(insect => {
        if (insect.collected) return;

        ctx.save();
        ctx.translate(insect.x, insect.y);
        ctx.rotate(insect.rotation);

        // Opacidade baseada na vida restante
        const lifeRatio = insect.life / insect.maxLife;
        ctx.globalAlpha = 0.8 + lifeRatio * 0.2; // Mais visível

        // Desenhar inseto
        ctx.font = `${Math.floor(insect.size)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Destaque especial para vespão perigoso
        if (insect.isDangerous) {
            // Brilho pulsante amarelo/laranja para vespão
            const pulseTime = Date.now() / 200; // Pulsação baseada no tempo
            const pulseIntensity = 0.5 + Math.sin(pulseTime) * 0.3;
            ctx.shadowColor = '#f39c12';
            ctx.shadowBlur = 15 + pulseIntensity * 10; // Brilho pulsante mais intenso
            
            // Contorno amarelo/laranja pulsante
            ctx.strokeStyle = `rgba(243, 156, 18, ${0.6 + pulseIntensity * 0.4})`;
            ctx.lineWidth = 3;
            ctx.strokeText(insect.emoji, 0, 0);
        } else if (insect.isFlying) {
            // Brilho sutil para insetos voadores normais
            ctx.shadowColor = insect.color;
            ctx.shadowBlur = 8;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = '#000000'; // Cor preta para contraste
        ctx.fillText(insect.emoji, 0, 0);

        ctx.shadowBlur = 0;

        ctx.restore();
    });

    // Desenhar partículas
    insectParticles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);

        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
}

// ========== SISTEMA DE PEIXES DA ILHA TROPICAL ==========

// Inicializar peixes
function initTropicalFish() {
    tropicalFish = [];
    fishParticles = [];

    // Garantir que estamos na fase bônus da Ilha Tropical
    if (!isBonusStage || currentArea !== 3) {
        return;
    }

    // Spawnar 2 peixes imediatamente no início
    for (let i = 0; i < 2; i++) {
        spawnTropicalFish();
    }
}

// Spawnar peixe que pula da água
function spawnTropicalFish() {
    if (!isBonusStage || currentArea !== 3) {
        return;
    }

    // Limitar número de peixes na tela (máximo 2)
    if (tropicalFish.length >= 2) {
        return;
    }

    const fishTypes = [
        { emoji: '🐟', name: 'Peixe', color: '#3498db' },
        { emoji: '🐠', name: 'Peixe Tropical', color: '#e74c3c' },
        { emoji: '🐡', name: 'Baiacu', color: '#f1c40f' },
        { emoji: '🦈', name: 'Tubarão', color: '#95a5a6' }
    ];

    const fishType = fishTypes[Math.floor(Math.random() * fishTypes.length)];
    const startX = Math.random() * (canvas.width - 100) + 50;
    const jumpHeight = 150 + Math.random() * 100; // Altura do pulo variável
    const jumpSpeed = 8 + Math.random() * 4; // Velocidade inicial do pulo

    const newFish = {
        x: startX,
        y: groundY, // Começa na água (groundY)
        emoji: fishType.emoji,
        size: 30 + Math.random() * 15,
        points: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        collected: false,
        vy: -jumpSpeed, // Velocidade inicial para cima (negativa)
        vx: (Math.random() - 0.5) * 2, // Movimento horizontal leve
        color: fishType.color,
        maxHeight: groundY - jumpHeight, // Altura máxima do pulo
        reachedTop: false, // Se já chegou no topo
        splashTime: 0 // Tempo para criar efeito de splash ao voltar à água
    };

    tropicalFish.push(newFish);
}

// Atualizar peixes
function updateTropicalFish() {
    if (!isBonusStage || currentArea !== 3) return;

    // Garantir que sempre há pelo menos 1 peixe na tela
    if (tropicalFish.length === 0) {
        spawnTropicalFish();
    }

    // Spawnar novos peixes periodicamente
    if (Math.random() < 0.025 && tropicalFish.length < 2) {
        spawnTropicalFish();
    }

    // Atualizar peixes existentes
    for (let i = tropicalFish.length - 1; i >= 0; i--) {
        const fish = tropicalFish[i];

        if (fish.collected) {
            tropicalFish.splice(i, 1);
            continue;
        }

        // Movimento vertical (física de pulo)
        fish.y += fish.vy;
        fish.x += fish.vx;

        // Gravidade (sempre puxando para baixo)
        fish.vy += 0.3;

        // Se ainda não chegou no topo e está subindo
        if (!fish.reachedTop && fish.y <= fish.maxHeight) {
            fish.reachedTop = true;
            fish.vy = 0; // Para no topo momentaneamente
        }

        // Se já chegou no topo, começa a cair
        if (fish.reachedTop && fish.vy === 0) {
            fish.vy = 0.5; // Começa a cair devagar
        }

        // Rotação baseada na direção do movimento
        if (fish.vy < 0) {
            fish.rotation = Math.PI / 2; // Olhando para cima ao subir
        } else if (fish.vy > 0) {
            fish.rotation = -Math.PI / 2; // Olhando para baixo ao cair
        }

        // Se caiu de volta na água, desaparece
        if (fish.y >= groundY) {
            // Criar efeito de splash
            createFishSplash(fish.x, groundY);
            tropicalFish.splice(i, 1);
            continue;
        }

        // Limites horizontais (quicar nas paredes)
        if (fish.x < 30) {
            fish.x = 30;
            fish.vx = Math.abs(fish.vx);
        } else if (fish.x > canvas.width - 30) {
            fish.x = canvas.width - 30;
            fish.vx = -Math.abs(fish.vx);
        }
    }

    // Atualizar partículas
    for (let i = fishParticles.length - 1; i >= 0; i--) {
        const particle = fishParticles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2; // Gravidade
        particle.rotation += particle.rotationSpeed;
        particle.life--;
        particle.alpha = particle.life / particle.maxLife;

        if (particle.life <= 0 || particle.y > canvas.height + 20) {
            fishParticles.splice(i, 1);
        }
    }
}

// Verificar colisão com peixes
function checkTropicalFishCollisions() {
    if (!isBonusStage || currentArea !== 3) return;

    for (let i = tropicalFish.length - 1; i >= 0; i--) {
        const fish = tropicalFish[i];
        if (fish.collected) continue;

        // Só pode pegar peixes no ar (não quando estão na água)
        if (fish.y >= groundY) continue;

        const dist = Math.hypot(player.x - fish.x, player.y - fish.y);
        if (dist < player.size + fish.size / 2) {
            // Coletar peixe
            fish.collected = true;

            lastPlayerScore = playerScore;
            playerScore += fish.points;
            if (playerScore !== lastPlayerScore) {
                playerScoreAnimation = 30; // Inicia animação do placar
            }

            // 🔊 Som de coletar
            playSound('eat');

            // Animação de comer
            player.eatAnimation = 15;
            player.eatEmoji = fish.emoji;

            // Criar efeito visual
            createFishCollectEffect(fish.x, fish.y, fish.emoji, fish.points);

            // Atualizar contador
            const wormCountEl = document.getElementById('wormCount');
            if (wormCountEl) {
                wormCountEl.textContent = playerScore;
            }
            // Atualizar texto do contador para mostrar "Peixes" na Ilha Tropical
            if (currentArea === 3 && isBonusStage) {
                const bonusCounter = document.querySelector('.bonus-counter');
                if (bonusCounter) {
                    const config = substageConfig[currentSubstage];
                    bonusCounter.innerHTML = `🐟 Peixes: <span id="wormCount">${playerScore}</span> / <span id="wormGoal">${config.goalScore}</span>`;
                }
            }

            // Remover peixe
            tropicalFish.splice(i, 1);
        }
    }
}

// Criar efeito de coleta de peixe
function createFishCollectEffect(x, y, emoji, points) {
    for (let i = 0; i < 8; i++) {
        fishParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 2,
            size: 3 + Math.random() * 3,
            color: `hsl(${200 + Math.random() * 60}, 70%, 60%)`,
            life: 30 + Math.random() * 20,
            maxLife: 30 + Math.random() * 20,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            alpha: 1
        });
    }
}

// Criar efeito de splash quando peixe cai na água
function createFishSplash(x, y) {
    for (let i = 0; i < 6; i++) {
        fishParticles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.abs((Math.random() - 0.5) * 4) - 1,
            size: 2 + Math.random() * 2,
            color: `rgba(52, 152, 219, ${0.6 + Math.random() * 0.4})`,
            life: 20 + Math.random() * 15,
            maxLife: 20 + Math.random() * 15,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.15,
            alpha: 1
        });
    }
}

// Desenhar peixes
function drawTropicalFish() {
    if (!isBonusStage || currentArea !== 3) {
        return;
    }

    tropicalFish.forEach(fish => {
        if (fish.collected) return;

        ctx.save();
        ctx.translate(fish.x, fish.y);
        ctx.rotate(fish.rotation);

        // Opacidade baseada na altura (mais visível no ar)
        const heightRatio = Math.max(0, (groundY - fish.y) / (groundY - fish.maxHeight));
        ctx.globalAlpha = 0.7 + heightRatio * 0.3;

        // Desenhar peixe
        ctx.font = `${Math.floor(fish.size)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Brilho para peixes no ar
        ctx.shadowColor = fish.color;
        ctx.shadowBlur = 10;

        ctx.fillStyle = '#000000'; // Cor preta para contraste
        ctx.fillText(fish.emoji, 0, 0);

        ctx.shadowBlur = 0;

        ctx.restore();
    });

    // Desenhar partículas
    fishParticles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);

        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
}

// ========== SISTEMA DE PÃES DA METRÓPOLE ==========

// Inicializar sistema de pães
function initMetropolisBread() {
    breads = [];
    breadParticles = [];
    cars = [];
    
    // Resetar gordura do jogador quando inicia a fase
    if (!player.fatness) {
        player.fatness = 0; // Gordura inicial (0 = normal)
        player.baseFatness = 0;
    } else {
        // Resetar gordura ao iniciar nova fase bônus
        player.fatness = 0;
        player.baseFatness = 0;
    }
    
    // Criar pessoa que joga pães (no topo da tela, canto superior direito)
    breadThrower = {
        x: canvas.width - 60, // Canto superior direito
        y: 50,
        throwTimer: 0,
        throwCooldown: 60 + Math.random() * 60, // Joga pão a cada 1-2 segundos
        throwAnimation: 0
    };
}

// Spawnar carro
function spawnCar() {
    if (!isBonusStage || currentArea !== 5) return;
    
    // Limitar número de carros (máximo 2)
    if (cars.length >= 2) return;
    
    // Decidir direção (esquerda para direita ou direita para esquerda)
    const direction = Math.random() > 0.5 ? 1 : -1;
    const startX = direction > 0 ? -100 : canvas.width + 100;
    const speed = 4 + Math.random() * 3; // Velocidade variável (4-7)
    
    // Altura do carro (na rua, tocando o chão)
    // O centro do carro deve estar acima do groundY pela metade do tamanho
    const carSize = 80;
    const carY = groundY - carSize / 2 + 50; // Descer mais para tocar a rua
    
    cars.push({
        x: startX,
        y: carY,
        size: 200, // Tamanho maior para ficar proporcional ao pássaro
        speed: speed,
        direction: direction, // 1 = direita, -1 = esquerda
        color: ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6'][Math.floor(Math.random() * 5)]
    });
    
    // 🔊 Tocar som de buzina quando o carro aparece
    if (sounds.horn && !sfxMuted) {
        sounds.horn.currentTime = 0;
        sounds.horn.volume = masterVolume * 0.7; // Volume um pouco mais baixo que o normal
        sounds.horn.play().catch(e => {
            console.log('Erro ao tocar buzina:', e);
        });
    }
}

// Criar efeito visual ao ser atropelado
function createCarStunEffect(x, y) {
    // Criar partículas de impacto
    for (let i = 0; i < 12; i++) {
        breadParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 3,
            size: 4 + Math.random() * 4,
            color: ['#e74c3c', '#c0392b', '#ecf0f1'][Math.floor(Math.random() * 3)],
            life: 40 + Math.random() * 20,
            maxLife: 40 + Math.random() * 20,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            alpha: 1
        });
    }
}

// Jogar pão (chamado pela pessoa)
function throwBread() {
    if (!isBonusStage || currentArea !== 5) return;
    
    // Limitar número de pães na tela (máximo 3)
    if (breads.length >= 3) return;
    
    // 🔊 Tocar som do senhor idoso quando joga o pão
    playSound('oldMan', 0.7);
    
    // Lançamento aleatório - posição e direção variadas
    const throwX = breadThrower.x - 30 + (Math.random() - 0.5) * 60; // Variação maior na posição
    const throwY = breadThrower.y + 20 + Math.random() * 20; // Variação na altura inicial
    // Ângulo aleatório - pode lançar em qualquer direção (mas principalmente para baixo)
    const throwAngle = -Math.PI / 2 - Math.PI / 2 + (Math.random() * Math.PI); // De -90° a 90° (principalmente para baixo)
    const throwSpeed = 6 + Math.random() * 6; // Velocidade variável (6 a 12)
    
    breads.push({
        x: throwX,
        y: throwY,
        vx: Math.cos(throwAngle) * throwSpeed,
        vy: Math.sin(throwAngle) * throwSpeed,
        size: 20 + Math.random() * 10,
        points: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        collected: false,
        grounded: false,
        bounceCount: 0,
        maxBounces: 2
    });
}

// Atualizar pães
function updateMetropolisBread() {
    if (!isBonusStage || currentArea !== 5) return;
    
    // Atualizar pessoa que joga pães
    if (breadThrower) {
        breadThrower.throwTimer++;
        if (breadThrower.throwTimer >= breadThrower.throwCooldown) {
            throwBread();
            breadThrower.throwTimer = 0;
            breadThrower.throwCooldown = 60 + Math.random() * 60; // Próximo lançamento
            breadThrower.throwAnimation = 10; // Animação de lançamento
        }
        if (breadThrower.throwAnimation > 0) {
            breadThrower.throwAnimation--;
        }
    }
    
    // Spawnar carros ocasionalmente (a cada 3-5 segundos)
    if (Math.random() < 0.01 && cars.length < 2) {
        spawnCar();
    }
    
    // Atualizar carros
    for (let i = cars.length - 1; i >= 0; i--) {
        const car = cars[i];
        
        // Mover carro
        car.x += car.speed * car.direction;
        
        // Remover carro se saiu da tela
        if ((car.direction > 0 && car.x > canvas.width + 100) || 
            (car.direction < 0 && car.x < -100)) {
            cars.splice(i, 1);
            continue;
        }
        
        // Verificar colisão com jogador
        const dist = Math.hypot(player.x - car.x, player.y - car.y);
        if (dist < player.size + car.size / 2 && !player.stunned) {
            // Stunnar jogador
            player.stunned = true;
            player.stunTime = 180; // 3 segundos de stun
            
            // 🔊 Som de stun
            playSound('stun');
            
            // Criar efeito visual
            createCarStunEffect(car.x, car.y);
            
            // Remover carro após atropelar
            cars.splice(i, 1);
        }
    }
    
    // Atualizar pães
    for (let i = breads.length - 1; i >= 0; i--) {
        const bread = breads[i];
        
        if (bread.collected) {
            breads.splice(i, 1);
            continue;
        }
        
        if (!bread.grounded) {
            // Física de queda
            bread.vy += 0.3; // Gravidade
            bread.x += bread.vx;
            bread.y += bread.vy;
            bread.rotation += bread.rotationSpeed;
            
            // Quicar no chão
            if (bread.y >= groundY) {
                bread.y = groundY;
                bread.bounceCount++;
                
                if (bread.bounceCount >= bread.maxBounces) {
                    bread.grounded = true;
                    bread.vx = 0;
                    bread.vy = 0;
                } else {
                    // Quica
                    bread.vy = -(bread.vy * 0.5);
                    bread.vx *= 0.8; // Fricção
                }
            }
            
            // Limites laterais
            if (bread.x < 30) {
                bread.x = 30;
                bread.vx = Math.abs(bread.vx) * 0.7;
            } else if (bread.x > canvas.width - 30) {
                bread.x = canvas.width - 30;
                bread.vx = -Math.abs(bread.vx) * 0.7;
            }
        }
    }
    
    // Atualizar partículas
    for (let i = breadParticles.length - 1; i >= 0; i--) {
        const particle = breadParticles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2; // Gravidade
        particle.rotation += particle.rotationSpeed;
        particle.life--;
        particle.alpha = particle.life / particle.maxLife;
        
        if (particle.life <= 0 || particle.y > canvas.height + 20) {
            breadParticles.splice(i, 1);
        }
    }
}

// Verificar colisão com pães
function checkMetropolisBreadCollisions() {
    if (!isBonusStage || currentArea !== 5) return;
    
    for (let i = breads.length - 1; i >= 0; i--) {
        const bread = breads[i];
        if (bread.collected) continue;
        
        // Só pode pegar pães no chão
        if (!bread.grounded) continue;
        
        const dist = Math.hypot(player.x - bread.x, player.y - bread.y);
        if (dist < player.size + bread.size / 2) {
            // Coletar pão
            bread.collected = true;
            
            lastPlayerScore = playerScore;
            playerScore += bread.points;
            if (playerScore !== lastPlayerScore) {
                playerScoreAnimation = 30;
            }
            
            // Aumentar gordura do jogador (máximo de 15 pães = muito gordo)
            if (!player.fatness) {
                player.fatness = 0;
            }
            player.fatness += 1; // Cada pão aumenta a gordura
            const maxFatness = 15; // Máximo de gordura
            if (player.fatness > maxFatness) {
                player.fatness = maxFatness;
            }
            
            // Reduzir velocidade baseada na gordura (cada pão reduz 3% da velocidade)
            const speedReduction = 1 - (player.fatness * 0.03); // Máximo de 45% de redução
            player.speed = player.baseSpeed * Math.max(0.55, speedReduction); // Mínimo de 55% da velocidade
            player.boostedSpeed = 10 * Math.max(0.55, speedReduction);
            
            // 🔊 Som de coletar
            playSound('eat');
            
            // Animação de comer
            player.eatAnimation = 15;
            player.lastEatenEmoji = '🍞';
            
            // Criar efeito visual
            createBreadEatEffect(bread.x, bread.y);
            
            // Atualizar contador
            const wormCountEl = document.getElementById('wormCount');
            if (wormCountEl) {
                wormCountEl.textContent = playerScore;
            }
            // Atualizar texto do contador para mostrar "Pães" na metrópole
            if (currentArea === 5 && isBonusStage) {
                const bonusCounter = document.querySelector('.bonus-counter');
                if (bonusCounter) {
                    const config = substageConfig[currentSubstage];
                    bonusCounter.innerHTML = `🍞 Pães: <span id="wormCount">${playerScore}</span> / <span id="wormGoal">${config.goalScore}</span>`;
                }
            }
            
            // Remover pão
            breads.splice(i, 1);
        }
    }
}

// Criar efeito visual ao coletar pão
function createBreadEatEffect(x, y) {
    const colors = ['#f39c12', '#e67e22'];
    
    for (let i = 0; i < 8; i++) {
        breadParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 2,
            size: 3 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 30 + Math.random() * 20,
            maxLife: 30 + Math.random() * 20,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            alpha: 1
        });
    }
}

// Desenhar sistema de pães
function drawMetropolisBread() {
    if (!isBonusStage || currentArea !== 5) {
        return;
    }
    
    // Desenhar pessoa que joga pães
    if (breadThrower) {
        ctx.save();
        ctx.translate(breadThrower.x, breadThrower.y);
        
        // Animação de lançamento
        const throwOffset = breadThrower.throwAnimation > 0 ? Math.sin(breadThrower.throwAnimation * 0.5) * 5 : 0;
        
        ctx.font = '70px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.fillText('👴', throwOffset, 0); // Senhor idoso jogando pães
        
        ctx.restore();
    }
    
    // Desenhar pães
    breads.forEach(bread => {
        if (bread.collected) return;
        
        ctx.save();
        ctx.translate(bread.x, bread.y);
        ctx.rotate(bread.rotation);
        
        ctx.font = `${Math.floor(bread.size)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = '#000000';
        ctx.fillText('🍞', 0, 0);
        
        ctx.restore();
    });
    
    // Desenhar carros
    cars.forEach(car => {
        ctx.save();
        ctx.translate(car.x, car.y);
        
        // Desenhar carro
        ctx.font = `${Math.floor(car.size)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Carro - espelhar apenas quando vai da esquerda para a direita
        if (car.direction > 0) {
            // Indo da esquerda para a direita - espelhar
            ctx.scale(-1, 1);
        }
        // Quando vai da direita para a esquerda - usar emoji original
        ctx.fillStyle = '#000000';
        ctx.fillText('🚗', 0, 0);
        
        ctx.restore();
    });
    
    // Desenhar partículas
    breadParticles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
}

// Atualizar frutas congeladas
function updateFrozenFruits() {
    if (!isBonusStage || currentArea !== 3) return;

    // Spawnar novas frutas periodicamente (probabilidade muito reduzida)
    if (Math.random() < 0.008 && frozenFruits.length < 2) {
        spawnFrozenFruit();
    }

    // Atualizar frutas existentes
    for (let i = frozenFruits.length - 1; i >= 0; i--) {
        const fruit = frozenFruits[i];

        if (fruit.collected) {
            frozenFruits.splice(i, 1);
            continue;
        }

        // Rotação suave
        fruit.rotation += fruit.rotationSpeed;

        // Flutuação suave
        fruit.floatOffset += 0.05;
    }

    // Atualizar estilhaços de gelo
    for (let i = iceShards.length - 1; i >= 0; i--) {
        const shard = iceShards[i];
        shard.x += shard.vx;
        shard.y += shard.vy;
        shard.vy += 0.2; // Gravidade
        shard.rotation += shard.rotationSpeed;
        shard.life--;
        shard.alpha = shard.life / shard.maxLife;

        if (shard.life <= 0 || shard.y > canvas.height + 20) {
            iceShards.splice(i, 1);
        }
    }
}

// Verificar colisão com frutas congeladas
function checkFrozenFruitCollisions() {
    if (!isBonusStage || currentArea !== 3) return;

    for (let i = frozenFruits.length - 1; i >= 0; i--) {
        const fruit = frozenFruits[i];
        if (fruit.collected) continue;

        const dist = Math.hypot(player.x - fruit.x, player.y - fruit.y);
        const hitRadius = fruit.size / 2 + player.size;
        const isInRange = dist < hitRadius;

        // Detectar quando o jogador entrou/saiu da área de colisão
        const wasInRangeBefore = fruit.wasInRange;
        const justEntered = !wasInRangeBefore && isInRange;

        if (fruit.wasInRange && !isInRange) {
            // Jogador saiu - resetar flag
            fruit.wasInRange = false;
        }

        if (isInRange) {
            // Player está na área de colisão
            fruit.wasInRange = true;

            // Verificar se já passou tempo suficiente desde a última interação
            const timeSinceLastHit = Date.now() - fruit.lastHitTime;
            const minTimeBetweenHits = 300; // 300ms entre cada bicada

            if (fruit.iceLayer > 0) {
                // Ainda tem gelo - precisa bicar para quebrar
                if (timeSinceLastHit > minTimeBetweenHits) {
                    // Reduzir camada de gelo
                    fruit.iceLayer--;
                    fruit.lastHitTime = Date.now();

                    // Criar estilhaços de gelo
                    createIceShards(fruit.x, fruit.y);

                    // Som de vidro/gelo quebrando
                    if (sounds.iceBreak && !sfxMuted) {
                        try {
                            sounds.iceBreak.currentTime = 0;
                            sounds.iceBreak.volume = masterVolume * 0.8; // Volume um pouco mais baixo
                            sounds.iceBreak.play().catch(e => {
                                // Se falhar, usar som alternativo
                                console.log('Som de gelo não disponível, usando som alternativo');
                                playSound('eat');
                            });
                        } catch (e) {
                            // Fallback para som de comer se não tiver o som de gelo
                            playSound('eat');
                        }
                    } else if (!sfxMuted) {
                        // Fallback para som de comer se não tiver o som de gelo ou SFX estiver mutado
                        playSound('eat');
                    }

                    // Animação de impacto
                    player.eatAnimation = 10;

                    // NÃO coletar - ainda tem gelo
                }
            } else if (fruit.iceLayer === 0 && !fruit.collected) {
                // Não tem mais gelo - pode coletar, mas só se acabou de entrar na área
                // (justEntered = true significa que não estava em range antes)
                if (justEntered) {
                    // Jogador acabou de entrar na área (não estava em range antes)
                    fruit.collected = true;

                    lastPlayerScore = playerScore;
                    playerScore += fruit.points;
                    if (playerScore !== lastPlayerScore) {
                        playerScoreAnimation = 30;
                    }

                    // Atualizar contador
                    const wormCountEl = document.getElementById('wormCount');
                    if (wormCountEl) {
                        wormCountEl.textContent = playerScore;
                    }
                    // Atualizar texto do contador para mostrar "Insetos" no pântano
                    if (currentArea === 2 && isBonusStage) {
                        const bonusCounter = document.querySelector('.bonus-counter');
                        if (bonusCounter) {
                            const config = substageConfig[currentSubstage];
                            bonusCounter.innerHTML = `🦟 Insetos: <span id="wormCount">${playerScore}</span> / <span id="wormGoal">${config.goalScore}</span>`;
                        }
                    }

                    // Som de coletar
                    playSound('yummy');

                    // Animação de comer
                    player.eatAnimation = 20;
                    player.lastEatenEmoji = fruit.emoji;

                    // Criar efeito visual
                    createFruitCollectEffect(fruit.x, fruit.y, fruit.emoji, fruit.points);
                }
            }
        }
    }
}

// Criar estilhaços de gelo ao quebrar
function createIceShards(x, y) {
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.5;
        iceShards.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * (2 + Math.random() * 3),
            vy: Math.sin(angle) * (2 + Math.random() * 3),
            size: 3 + Math.random() * 4,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            life: 30 + Math.random() * 20,
            maxLife: 30 + Math.random() * 20,
            alpha: 1
        });
    }
}

// Criar efeito visual ao coletar fruta
function createFruitCollectEffect(x, y, emoji, points) {
    // Partículas douradas
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 / 15) * i;
        wormEatEffects.push({
            type: 'particle',
            x: x,
            y: y,
            vx: Math.cos(angle) * (3 + Math.random() * 2),
            vy: Math.sin(angle) * (3 + Math.random() * 2),
            life: 40,
            maxLife: 40,
            color: '#f39c12' // Dourado
        });
    }

    // Texto com emoji da fruta
    wormEatEffects.push({
        type: 'text',
        x: x,
        y: y,
        vy: -2,
        life: 50,
        maxLife: 50,
        text: `${emoji} +${points}`
    });
}

// Desenhar frutas congeladas
function drawFrozenFruits() {
    if (!isBonusStage || currentArea !== 3) return;

    frozenFruits.forEach(fruit => {
        if (fruit.collected) return;

        ctx.save();
        ctx.translate(fruit.x, fruit.y + Math.sin(fruit.floatOffset) * 3);
        ctx.rotate(fruit.rotation);

        // Camada de gelo externa (mais espessa quando tem mais camadas)
        const iceThickness = (fruit.iceLayer / fruit.maxIceLayer) * 8;
        const iceAlpha = 0.6 + (fruit.iceLayer / fruit.maxIceLayer) * 0.3;

        // Gelo brilhante ao redor da fruta
        const iceGradient = ctx.createRadialGradient(0, 0, fruit.size / 2, 0, 0, fruit.size / 2 + iceThickness);
        iceGradient.addColorStop(0, `rgba(200, 230, 255, ${iceAlpha})`);
        iceGradient.addColorStop(0.5, `rgba(150, 200, 255, ${iceAlpha * 0.8})`);
        iceGradient.addColorStop(1, `rgba(100, 180, 255, 0)`);

        ctx.fillStyle = iceGradient;
        ctx.beginPath();
        ctx.arc(0, 0, fruit.size / 2 + iceThickness, 0, Math.PI * 2);
        ctx.fill();

        // Borda de gelo
        ctx.strokeStyle = `rgba(255, 255, 255, ${iceAlpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fruta dentro do gelo (mais opaca quando tem gelo)
        ctx.globalAlpha = 0.4 + (1 - fruit.iceLayer / fruit.maxIceLayer) * 0.6;
        ctx.font = `${fruit.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fruit.emoji, 0, 0);

        // Mostrar camadas de gelo restantes
        if (fruit.iceLayer > 0) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`❄️${fruit.iceLayer}`, 0, -fruit.size / 2 - 15);
        }

        ctx.restore();
    });

    // Desenhar estilhaços de gelo
    iceShards.forEach(shard => {
        ctx.save();
        ctx.globalAlpha = shard.alpha;
        ctx.translate(shard.x, shard.y);
        ctx.rotate(shard.rotation);

        // Desenhar pequeno cristal de gelo
        ctx.strokeStyle = 'rgba(200, 220, 255, 0.8)';
        ctx.fillStyle = 'rgba(200, 220, 255, 0.4)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
            const angle = (Math.PI / 3) * j;
            const x = Math.cos(angle) * shard.size;
            const y = Math.sin(angle) * shard.size;
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
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

// Controles Touch (mobile)
let touchControls = {
    active: false,
    joystickActive: false,
    joystickX: 0,
    joystickY: 0,
    joystickBaseX: 0,
    joystickBaseY: 0,
    joystickRadius: 50
};

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

// Controles Touch (Mobile)
function initTouchControls() {
    const joystickBase = document.getElementById('joystickBase');
    const joystickStick = document.getElementById('joystickStick');
    
    if (!joystickBase || !joystickStick) return;

    // Obter posição do joystick base
    function getJoystickBasePosition() {
        const rect = joystickBase.getBoundingClientRect();
        touchControls.joystickBaseX = rect.left + rect.width / 2;
        touchControls.joystickBaseY = rect.top + rect.height / 2;
        touchControls.joystickRadius = rect.width / 2;
    }

    // Inicializar posição
    getJoystickBasePosition();
    window.addEventListener('resize', function() {
        getJoystickBasePosition();
        // Atualizar visibilidade dos controles quando redimensionar
        if (gameRunning) {
            setTimeout(showTouchControls, 50);
        }
    });
    
    // Atualizar posição quando orientação mudar
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            getJoystickBasePosition();
            if (gameRunning) {
                showTouchControls();
            }
        }, 200);
    });

    // Touch Start
    function handleTouchStart(e) {
        if (!gameRunning) return;
        
        const touch = e.touches[0];
        const touchX = touch.clientX;
        const touchY = touch.clientY;
        
        // Verificar se tocou no joystick
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt(
            Math.pow(touchX - centerX, 2) + Math.pow(touchY - centerY, 2)
        );
        
        if (distance <= touchControls.joystickRadius * 2) {
            touchControls.joystickActive = true;
            updateJoystick(touchX, touchY);
            e.preventDefault();
        }
    }

    // Touch Move
    function handleTouchMove(e) {
        if (!touchControls.joystickActive) return;
        
        const touch = e.touches[0];
        updateJoystick(touch.clientX, touch.clientY);
        e.preventDefault();
    }

    // Touch End
    function handleTouchEnd(e) {
        if (touchControls.joystickActive) {
            touchControls.joystickActive = false;
            touchControls.joystickX = 0;
            touchControls.joystickY = 0;
            joystickStick.style.transform = 'translate(0, 0)';
            e.preventDefault();
        }
    }

    // Atualizar posição do joystick
    function updateJoystick(touchX, touchY) {
        const baseX = touchControls.joystickBaseX;
        const baseY = touchControls.joystickBaseY;
        const radius = touchControls.joystickRadius;
        
        let deltaX = touchX - baseX;
        let deltaY = touchY - baseY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Limitar ao raio do joystick
        if (distance > radius) {
            deltaX = (deltaX / distance) * radius;
            deltaY = (deltaY / distance) * radius;
        }
        
        touchControls.joystickX = deltaX;
        touchControls.joystickY = deltaY;
        
        // Atualizar visual
        joystickStick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }

    // Event listeners para joystick
    joystickBase.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });

}

// Inicializar controles touch quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTouchControls);
} else {
    initTouchControls();
}

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
            food.vy += 0.3;

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

    switch (bird.type) {
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

        case 'barn-owl': // Coruja Suindara
            // Baseado na estrutura da coruja 'owl', mas adaptada para suindara
            const barnOwlSize = bird.size;
            const topOfHeadBarn = bird.y - barnOwlSize * 0.85;

            // Disco facial branco em formato de coração (característica da suindara)
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            // Parte superior arredondada do coração
            ctx.arc(bird.x + barnOwlSize * 0.15, bird.y - barnOwlSize * 0.1, barnOwlSize * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(bird.x + barnOwlSize * 0.5, bird.y - barnOwlSize * 0.1, barnOwlSize * 0.28, 0, Math.PI * 2);
            ctx.fill();
            // Parte inferior do coração (ponta)
            ctx.beginPath();
            ctx.moveTo(bird.x - barnOwlSize * 0.1, bird.y + barnOwlSize * 0.1);
            ctx.lineTo(bird.x + barnOwlSize * 0.7, bird.y + barnOwlSize * 0.1);
            ctx.lineTo(bird.x + barnOwlSize * 0.325, bird.y + barnOwlSize * 0.3);
            ctx.closePath();
            ctx.fill();

            // Borda dourada pálida ao redor do disco facial
            ctx.strokeStyle = '#D2B48C';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bird.x + barnOwlSize * 0.15, bird.y - barnOwlSize * 0.1, barnOwlSize * 0.35, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(bird.x + barnOwlSize * 0.5, bird.y - barnOwlSize * 0.1, barnOwlSize * 0.28, 0, Math.PI * 2);
            ctx.stroke();

            // Testa dourada pálida acima do disco facial
            ctx.fillStyle = '#F5DEB3';
            ctx.beginPath();
            ctx.ellipse(bird.x + barnOwlSize * 0.325, bird.y - barnOwlSize * 0.5, barnOwlSize * 0.3, barnOwlSize * 0.15, -0.1, 0, Math.PI * 2);
            ctx.fill();

            // Coroa com padrão cinza e branco manchado
            ctx.fillStyle = '#E0E0E0';
            ctx.beginPath();
            ctx.ellipse(bird.x + barnOwlSize * 0.325, topOfHeadBarn, barnOwlSize * 0.3, barnOwlSize * 0.15, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Manchas escuras na coroa
            ctx.fillStyle = '#808080';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(bird.x + barnOwlSize * 0.15 + i * barnOwlSize * 0.15, topOfHeadBarn, barnOwlSize * 0.04, 0, Math.PI * 2);
                ctx.fill();
            }

            // Padrão de penas manchadas no peito (branco com pequenas manchas escuras esparsas)
            ctx.fillStyle = 'rgba(128,128,128,0.3)'; // Manchas escuras mais suaves
            for (let row = 0; row < 2; row++) {
                for (let i = 0; i < 3; i++) {
                    // Manchas mais esparsas e menores
                    if (Math.random() > 0.3) { // Apenas algumas manchas, não todas
                        ctx.beginPath();
                        ctx.arc(
                            bird.x - barnOwlSize * 0.2 + i * barnOwlSize * 0.25,
                            bird.y + barnOwlSize * 0.2 + row * barnOwlSize * 0.2,
                            barnOwlSize * 0.04,
                            0, Math.PI * 2
                        );
                        ctx.fill();
                    }
                }
            }

            // Asas e costas com padrão dourado-marrom (sobreposto ao corpo base)
            ctx.fillStyle = '#D2B48C';
            ctx.beginPath();
            ctx.ellipse(bird.x - barnOwlSize * 0.3, bird.y - barnOwlSize * 0.1, barnOwlSize * 0.4, barnOwlSize * 0.2, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Manchas cinza nas asas
            ctx.fillStyle = '#E0E0E0';
            ctx.beginPath();
            ctx.ellipse(bird.x - barnOwlSize * 0.35, bird.y, barnOwlSize * 0.2, barnOwlSize * 0.15, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Manchas escuras nas asas
            ctx.fillStyle = 'rgba(101,67,33,0.4)';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(bird.x - barnOwlSize * 0.4 + i * barnOwlSize * 0.12, bird.y - barnOwlSize * 0.1, barnOwlSize * 0.03, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'hawk': // Falcão (genérico)
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

        case 'prairie-falcon': // Falcão-das-pradarias
            const falconSize = bird.size;
            
            // Capa marrom na cabeça
            ctx.fillStyle = '#8B4513'; // Marrom
            ctx.beginPath();
            ctx.ellipse(bird.x + falconSize * 0.15, bird.y - falconSize * 0.35, falconSize * 0.25, falconSize * 0.15, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Garganta branca
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(bird.x + falconSize * 0.2, bird.y - falconSize * 0.1, falconSize * 0.2, falconSize * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Listras malares pretas (bigodes) saindo dos olhos
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.moveTo(bird.x + falconSize * 0.3, bird.y - falconSize * 0.2);
            ctx.lineTo(bird.x + falconSize * 0.4, bird.y - falconSize * 0.05);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#000000';
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bird.x + falconSize * 0.32, bird.y - falconSize * 0.15);
            ctx.lineTo(bird.x + falconSize * 0.42, bird.y);
            ctx.stroke();
            
            // Área ao redor dos olhos e cere amarelo vibrante
            ctx.fillStyle = '#FFD700'; // Amarelo vibrante
            ctx.beginPath();
            ctx.ellipse(bird.x + falconSize * 0.3, bird.y - falconSize * 0.2, falconSize * 0.12, falconSize * 0.1, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Cere (parte superior do bico)
            ctx.beginPath();
            ctx.ellipse(bird.x + falconSize * 0.4, bird.y - falconSize * 0.05, falconSize * 0.08, falconSize * 0.06, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Peito e barriga brancos com manchas/escalas escuras
            ctx.fillStyle = '#2F2F2F'; // Marrom escuro para as manchas
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 3; j++) {
                    const spotX = bird.x + falconSize * 0.1 + i * falconSize * 0.12;
                    const spotY = bird.y + falconSize * 0.1 + j * falconSize * 0.1;
                    ctx.beginPath();
                    ctx.ellipse(spotX, spotY, falconSize * 0.05, falconSize * 0.04, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // Costas e asas com padrão escamado/barrado marrom, cinza e branco
            ctx.fillStyle = '#8B7355'; // Marrom acinzentado
            ctx.beginPath();
            ctx.ellipse(bird.x - falconSize * 0.2, bird.y - falconSize * 0.05, falconSize * 0.3, falconSize * 0.15, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Barras escuras nas asas
            ctx.fillStyle = '#5C4A3A';
            ctx.strokeStyle = '#5C4A3A';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(bird.x - falconSize * 0.4, bird.y - falconSize * 0.05 + i * falconSize * 0.08);
                ctx.lineTo(bird.x - falconSize * 0.1, bird.y - falconSize * 0.05 + i * falconSize * 0.08);
                ctx.stroke();
            }
            // Manchas brancas nas asas
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(bird.x - falconSize * 0.25, bird.y - falconSize * 0.05, falconSize * 0.08, falconSize * 0.06, -0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Olho escuro
            if (!bird.stunned) {
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + falconSize * 0.3, bird.y - falconSize * 0.2, falconSize * 0.08, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'ground-dove': // Rolinha
            const doveSize = bird.size;
            
            // Cabeça cinza pálida ou esbranquiçada
            ctx.fillStyle = '#E8E8E8'; // Cinza pálido
            ctx.beginPath();
            ctx.ellipse(bird.x + doveSize * 0.2, bird.y - doveSize * 0.3, doveSize * 0.2, doveSize * 0.15, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Corpo rosa poeirento ou marrom-avermelhado
            ctx.fillStyle = '#D2B48C'; // Rosa poeirento/bege rosado
            ctx.beginPath();
            ctx.ellipse(bird.x + doveSize * 0.1, bird.y + doveSize * 0.1, doveSize * 0.3, doveSize * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Manchas e estrias escuras nas asas e laterais
            ctx.fillStyle = '#8B4513'; // Marrom escuro
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 2; j++) {
                    const spotX = bird.x - doveSize * 0.2 + i * doveSize * 0.12;
                    const spotY = bird.y - doveSize * 0.05 + j * doveSize * 0.15;
                    ctx.beginPath();
                    ctx.ellipse(spotX, spotY, doveSize * 0.06, doveSize * 0.05, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            // Estrias nas asas
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(bird.x - doveSize * 0.3, bird.y - doveSize * 0.05 + i * doveSize * 0.08);
                ctx.lineTo(bird.x - doveSize * 0.1, bird.y + doveSize * 0.05 + i * doveSize * 0.08);
                ctx.stroke();
            }
            
            // Cauda em tom mais escuro de marrom-avermelhado
            ctx.fillStyle = '#CD853F'; // Marrom-avermelhado mais escuro
            ctx.beginPath();
            ctx.ellipse(bird.x - doveSize * 0.35, bird.y + doveSize * 0.15, doveSize * 0.15, doveSize * 0.12, 0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Olho vermelho brilhante
            if (!bird.stunned) {
                ctx.fillStyle = '#DC143C'; // Vermelho brilhante
                ctx.beginPath();
                ctx.arc(bird.x + doveSize * 0.25, bird.y - doveSize * 0.25, doveSize * 0.08, 0, Math.PI * 2);
                ctx.fill();
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + doveSize * 0.25, bird.y - doveSize * 0.25, doveSize * 0.05, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'rufous-backed-thrush': // Sabiá do Campo
            const thrushSize = bird.size;
            
            // Faixa branca/creme pálida acima do olho
            ctx.fillStyle = '#F5F5DC'; // Creme pálido
            ctx.beginPath();
            ctx.ellipse(bird.x + thrushSize * 0.2, bird.y - thrushSize * 0.35, thrushSize * 0.25, thrushSize * 0.1, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Faixa escura/preta através do olho
            ctx.fillStyle = '#000000'; // Preto
            ctx.beginPath();
            ctx.ellipse(bird.x + thrushSize * 0.2, bird.y - thrushSize * 0.25, thrushSize * 0.3, thrushSize * 0.08, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Área abaixo do olho e bochecha em cinza-marrom claro
            ctx.fillStyle = '#D2B48C'; // Cinza-marrom claro
            ctx.beginPath();
            ctx.ellipse(bird.x + thrushSize * 0.15, bird.y - thrushSize * 0.15, thrushSize * 0.2, thrushSize * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Corpo marrom-acinzentado
            ctx.fillStyle = '#8B7355'; // Marrom-acinzentado
            ctx.beginPath();
            ctx.ellipse(bird.x + thrushSize * 0.1, bird.y + thrushSize * 0.1, thrushSize * 0.3, thrushSize * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Asas com padrão: penas escuras com bordas claras (branco/creme)
            ctx.fillStyle = '#654321'; // Marrom escuro para as penas
            ctx.beginPath();
            ctx.ellipse(bird.x - thrushSize * 0.2, bird.y - thrushSize * 0.05, thrushSize * 0.3, thrushSize * 0.15, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Bordas claras nas penas das asas
            ctx.strokeStyle = '#F5F5DC'; // Creme pálido
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(bird.x - thrushSize * 0.2 + i * thrushSize * 0.08, bird.y - thrushSize * 0.05, thrushSize * 0.06, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Cauda longa e escura
            ctx.fillStyle = '#654321'; // Marrom escuro
            ctx.beginPath();
            ctx.ellipse(bird.x - thrushSize * 0.35, bird.y + thrushSize * 0.2, thrushSize * 0.2, thrushSize * 0.15, 0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Olho amarelo brilhante
            if (!bird.stunned) {
                ctx.fillStyle = '#FFD700'; // Amarelo brilhante
                ctx.beginPath();
                ctx.arc(bird.x + thrushSize * 0.25, bird.y - thrushSize * 0.25, thrushSize * 0.08, 0, Math.PI * 2);
                ctx.fill();
                // Pupila escura
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + thrushSize * 0.25, bird.y - thrushSize * 0.25, thrushSize * 0.05, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'orange-thrush': // Sabiá Laranjeira
            const orangeThrushSize = bird.size;
            
            // Dorso, asas e cauda superiores marrom-oliva escuro ou marrom-acinzentado
            ctx.fillStyle = '#556B2F'; // Marrom-oliva escuro
            ctx.beginPath();
            ctx.ellipse(bird.x - orangeThrushSize * 0.2, bird.y - orangeThrushSize * 0.05, orangeThrushSize * 0.3, orangeThrushSize * 0.15, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Cauda longa e esbelta
            ctx.beginPath();
            ctx.ellipse(bird.x - orangeThrushSize * 0.35, bird.y + orangeThrushSize * 0.2, orangeThrushSize * 0.2, orangeThrushSize * 0.12, 0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Cabeça marrom escuro
            ctx.fillStyle = '#654321'; // Marrom escuro
            ctx.beginPath();
            ctx.ellipse(bird.x + orangeThrushSize * 0.2, bird.y - orangeThrushSize * 0.3, orangeThrushSize * 0.2, orangeThrushSize * 0.15, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Garganta e peito superior cinza-esbranquiçado claro com estrias verticais escuras finas
            ctx.fillStyle = '#F5F5F5'; // Cinza-esbranquiçado claro
            ctx.beginPath();
            ctx.ellipse(bird.x + orangeThrushSize * 0.15, bird.y - orangeThrushSize * 0.05, orangeThrushSize * 0.25, orangeThrushSize * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Estrias verticais escuras finas
            ctx.strokeStyle = '#8B4513'; // Marrom escuro
            ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(bird.x + orangeThrushSize * 0.05 + i * orangeThrushSize * 0.05, bird.y - orangeThrushSize * 0.15);
                ctx.lineTo(bird.x + orangeThrushSize * 0.05 + i * orangeThrushSize * 0.05, bird.y + orangeThrushSize * 0.05);
                ctx.stroke();
            }
            
            // Barriga e coberteiras inferiores da cauda laranja-vermelho vibrante e rico
            ctx.fillStyle = '#FF4500'; // Laranja-vermelho vibrante
            ctx.beginPath();
            ctx.ellipse(bird.x + orangeThrushSize * 0.1, bird.y + orangeThrushSize * 0.2, orangeThrushSize * 0.3, orangeThrushSize * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Olho com anel laranja-amarelo claro e íris laranja-marrom claro
            if (!bird.stunned) {
                // Anel ocular laranja-amarelo claro
                ctx.fillStyle = '#FFD700'; // Laranja-amarelo claro
                ctx.beginPath();
                ctx.arc(bird.x + orangeThrushSize * 0.25, bird.y - orangeThrushSize * 0.25, orangeThrushSize * 0.1, 0, Math.PI * 2);
                ctx.fill();
                // Íris laranja-marrom claro
                ctx.fillStyle = '#D2691E'; // Laranja-marrom claro
                ctx.beginPath();
                ctx.arc(bird.x + orangeThrushSize * 0.25, bird.y - orangeThrushSize * 0.25, orangeThrushSize * 0.07, 0, Math.PI * 2);
                ctx.fill();
                // Pupila escura
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + orangeThrushSize * 0.25, bird.y - orangeThrushSize * 0.25, orangeThrushSize * 0.05, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'sayaca-tanager': // Sanhaço Cinzento
            const tanagerSize = bird.size;
            
            // Cabeça em tom mais claro de cinza-azulado
            ctx.fillStyle = '#B0C4DE'; // Cinza-azulado claro
            ctx.beginPath();
            ctx.ellipse(bird.x + tanagerSize * 0.2, bird.y - tanagerSize * 0.3, tanagerSize * 0.2, tanagerSize * 0.15, -0.1, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'kiskadee': // Bem-te-vi
            const kiskadeeSize = bird.size;
            
            // Coroa branca (da testa até a parte de trás da cabeça)
            ctx.fillStyle = '#FFFFFF'; // Branco
            ctx.beginPath();
            ctx.ellipse(bird.x + kiskadeeSize * 0.2, bird.y - kiskadeeSize * 0.35, kiskadeeSize * 0.25, kiskadeeSize * 0.12, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Faixa ocular preta (atravessa os olhos, do bico até a nuca)
            ctx.fillStyle = '#000000'; // Preto
            ctx.beginPath();
            ctx.ellipse(bird.x + kiskadeeSize * 0.25, bird.y - kiskadeeSize * 0.25, kiskadeeSize * 0.3, kiskadeeSize * 0.08, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Bochechas e garganta brancas
            ctx.fillStyle = '#FFFFFF'; // Branco
            ctx.beginPath();
            ctx.ellipse(bird.x + kiskadeeSize * 0.2, bird.y - kiskadeeSize * 0.1, kiskadeeSize * 0.2, kiskadeeSize * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Costas marrom-oliva (parte superior do corpo)
            ctx.fillStyle = '#556B2F'; // Marrom-oliva
            ctx.beginPath();
            ctx.ellipse(bird.x - kiskadeeSize * 0.15, bird.y - kiskadeeSize * 0.05, kiskadeeSize * 0.3, kiskadeeSize * 0.15, -0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Peito e barriga amarelo vibrante (sobrescreve a cor padrão do corpo)
            ctx.fillStyle = '#FFD700'; // Amarelo vibrante
            ctx.beginPath();
            ctx.ellipse(bird.x + kiskadeeSize * 0.1, bird.y + kiskadeeSize * 0.1, kiskadeeSize * 0.25, kiskadeeSize * 0.2, 0, 0, Math.PI * 2);
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

        case 'caracara': // Carcará
            const caracaraSize = bird.size;
            
            // Crista preta no topo da cabeça (penas escuras)
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(bird.x + caracaraSize * 0.2, bird.y - caracaraSize * 0.4, caracaraSize * 0.25, caracaraSize * 0.12, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Pele facial laranja-vermelho ao redor dos olhos e bico
            ctx.fillStyle = '#FF4500'; // Laranja-vermelho vibrante
            ctx.beginPath();
            ctx.ellipse(bird.x + caracaraSize * 0.25, bird.y - caracaraSize * 0.25, caracaraSize * 0.2, caracaraSize * 0.15, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Garganta e pescoço superior brancos
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(bird.x + caracaraSize * 0.15, bird.y - caracaraSize * 0.1, caracaraSize * 0.2, caracaraSize * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Peito branco com barrado escuro (listras/padrão)
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(bird.x + caracaraSize * 0.1, bird.y + caracaraSize * 0.05, caracaraSize * 0.25, caracaraSize * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Barrado escuro (listras horizontais)
            ctx.fillStyle = '#654321'; // Marrom escuro
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(bird.x - caracaraSize * 0.1, bird.y + caracaraSize * 0.1 + i * caracaraSize * 0.05);
                ctx.lineTo(bird.x + caracaraSize * 0.3, bird.y + caracaraSize * 0.1 + i * caracaraSize * 0.05);
                ctx.stroke();
            }
            break;

        case 'woodpecker': // Pica-pau
            const woodpeckerSize = bird.size;

            // Mancha vermelha na bochecha (abaixo e atrás do olho)
            ctx.fillStyle = '#DC143C'; // Vermelho vibrante
            ctx.beginPath();
            ctx.arc(bird.x + 8, bird.y + 2, woodpeckerSize * 0.25, 0, Math.PI * 2);
            ctx.fill();

            // Listras pretas e amarelas no pescoço/peito (padrão característico)
            // Listras horizontais alternadas
            for (let i = 0; i < 3; i++) {
                const stripeY = bird.y + woodpeckerSize * 0.3 + (i * woodpeckerSize * 0.15);

                // Listra preta
                ctx.fillStyle = '#000000';
                ctx.fillRect(
                    bird.x - woodpeckerSize * 0.4,
                    stripeY - woodpeckerSize * 0.05,
                    woodpeckerSize * 0.8,
                    woodpeckerSize * 0.08
                );
            }

            // Crista amarela no topo da cabeça (característica do pica-pau)
            ctx.fillStyle = '#FFD700'; // Amarelo brilhante
            ctx.beginPath();
            ctx.moveTo(bird.x - woodpeckerSize * 0.2, bird.y - woodpeckerSize * 0.7);
            ctx.lineTo(bird.x, bird.y - woodpeckerSize * 0.9);
            ctx.lineTo(bird.x + woodpeckerSize * 0.2, bird.y - woodpeckerSize * 0.7);
            ctx.closePath();
            ctx.fill();

            // Linha preta na parte de trás da cabeça (separando a crista)
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bird.x - woodpeckerSize * 0.35, bird.y - woodpeckerSize * 0.5);
            ctx.lineTo(bird.x + woodpeckerSize * 0.35, bird.y - woodpeckerSize * 0.5);
            ctx.stroke();
            break;

        case 'sete-cores': // Saíra-sete-cores (Tanager)
            const seteCoresSize = bird.size;

            // Cabeça turquesa/azul brilhante
            ctx.fillStyle = '#40E0D0'; // Turquesa brilhante
            ctx.beginPath();
            ctx.arc(bird.x, bird.y - seteCoresSize * 0.6, seteCoresSize * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Nuca/parte superior das costas - amarelo-verde brilhante
            ctx.fillStyle = '#ADFF2F'; // Amarelo-verde brilhante
            ctx.beginPath();
            ctx.ellipse(
                bird.x - seteCoresSize * 0.3,
                bird.y - seteCoresSize * 0.2,
                seteCoresSize * 0.5,
                seteCoresSize * 0.3,
                -0.3,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Costas e asas superiores - azul escuro/quase preto
            ctx.fillStyle = '#191970'; // Azul escuro
            ctx.beginPath();
            ctx.ellipse(
                bird.x - seteCoresSize * 0.4,
                bird.y,
                seteCoresSize * 0.6,
                seteCoresSize * 0.4,
                -0.2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Peito/barriga - laranja/ruivo vibrante (desenhar sobre a cor base azul)
            ctx.fillStyle = '#FF6347'; // Laranja/ruivo vibrante
            ctx.beginPath();
            ctx.ellipse(
                bird.x,
                bird.y + seteCoresSize * 0.2,
                seteCoresSize * 0.5,
                seteCoresSize * 0.4,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Manchas de azul brilhante nas asas inferiores
            ctx.fillStyle = '#4169E1'; // Azul brilhante
            ctx.beginPath();
            ctx.ellipse(
                bird.x - seteCoresSize * 0.5,
                bird.y + seteCoresSize * 0.2,
                seteCoresSize * 0.3,
                seteCoresSize * 0.25,
                -0.4,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Segunda mancha azul
            ctx.beginPath();
            ctx.ellipse(
                bird.x - seteCoresSize * 0.3,
                bird.y + seteCoresSize * 0.35,
                seteCoresSize * 0.25,
                seteCoresSize * 0.2,
                -0.2,
                0,
                Math.PI * 2
            );
            ctx.fill();
            break;

        case 'gaviao-caramujeiro': // Gavião Caramujeiro
            const gaviaoSize = bird.size;

            // Corpo já é muito escuro (quase preto) pela cor base
            // Padrão de penas escuras com textura sutil
            ctx.fillStyle = '#0d0d0d'; // Preto mais profundo para asas
            ctx.beginPath();
            ctx.ellipse(
                bird.x - gaviaoSize * 0.35,
                bird.y - gaviaoSize * 0.1,
                gaviaoSize * 0.5,
                gaviaoSize * 0.4,
                -0.2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Segunda camada de penas escuras
            ctx.beginPath();
            ctx.ellipse(
                bird.x - gaviaoSize * 0.28,
                bird.y + gaviaoSize * 0.1,
                gaviaoSize * 0.4,
                gaviaoSize * 0.3,
                -0.15,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Detalhes sutis de textura nas penas (manchas levemente mais claras)
            ctx.fillStyle = '#2c2c2c'; // Cinza muito escuro para textura
            const textureSpots = [
                { x: bird.x - gaviaoSize * 0.3, y: bird.y - gaviaoSize * 0.05, size: gaviaoSize * 0.08 },
                { x: bird.x - gaviaoSize * 0.2, y: bird.y + gaviaoSize * 0.15, size: gaviaoSize * 0.06 },
                { x: bird.x - gaviaoSize * 0.15, y: bird.y + gaviaoSize * 0.25, size: gaviaoSize * 0.07 }
            ];
            textureSpots.forEach(spot => {
                ctx.beginPath();
                ctx.arc(spot.x, spot.y, spot.size, 0, Math.PI * 2);
                ctx.fill();
            });
            break;

        case 'tie-sangue': // Tie-sangue (Red-necked Tanager)
            const tieSangueSize = bird.size;

            // Corpo vermelho brilhante (cor dominante do pássaro)
            // O corpo já é desenhado como vermelho pela cor base, mas garantimos que está correto

            // Asas/parte traseira muito escura (quase preta)
            ctx.fillStyle = '#1C1C1C'; // Preto/cinza carvão profundo
            ctx.beginPath();
            ctx.ellipse(
                bird.x - tieSangueSize * 0.4,
                bird.y,
                tieSangueSize * 0.5,
                tieSangueSize * 0.4,
                -0.2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Segunda parte escura na asa
            ctx.beginPath();
            ctx.ellipse(
                bird.x - tieSangueSize * 0.3,
                bird.y + tieSangueSize * 0.2,
                tieSangueSize * 0.35,
                tieSangueSize * 0.3,
                -0.15,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Mancha branca na base do bico (característica marcante)
            ctx.fillStyle = '#FFFFFF'; // Branco brilhante
            ctx.beginPath();
            ctx.ellipse(
                bird.x - tieSangueSize * 0.15,
                bird.y - tieSangueSize * 0.3,
                tieSangueSize * 0.12,
                tieSangueSize * 0.08,
                0.3,
                0,
                Math.PI * 2
            );
            ctx.fill();

            break;

        case 'cavalaria': // Cavalaria-do-brejo
            const cavalariaSize = bird.size;

            // Corpo vermelho brilhante (já desenhado pela cor base)
            // Asas e dorso pretos
            ctx.fillStyle = '#000000'; // Preto sólido
            ctx.beginPath();
            ctx.ellipse(
                bird.x - cavalariaSize * 0.4,
                bird.y - cavalariaSize * 0.2,
                cavalariaSize * 0.5,
                cavalariaSize * 0.4,
                -0.2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Segunda parte preta nas asas
            ctx.beginPath();
            ctx.ellipse(
                bird.x - cavalariaSize * 0.3,
                bird.y + cavalariaSize * 0.1,
                cavalariaSize * 0.4,
                cavalariaSize * 0.3,
                -0.15,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Cauda preta
            ctx.beginPath();
            ctx.ellipse(
                bird.x - cavalariaSize * 0.5,
                bird.y + cavalariaSize * 0.3,
                cavalariaSize * 0.3,
                cavalariaSize * 0.25,
                -0.3,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Faixa branca horizontal na parte superior do peito (característica marcante)
            ctx.fillStyle = '#FFFFFF'; // Branco nítido
            ctx.beginPath();
            ctx.ellipse(
                bird.x,
                bird.y - cavalariaSize * 0.15,
                cavalariaSize * 0.5,
                cavalariaSize * 0.08,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Anel vermelho ao redor do olho
            ctx.strokeStyle = '#8B0000'; // Vermelho escuro
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bird.x + 10, bird.y - 5, 12, 0, Math.PI * 2);
            ctx.stroke();
            break;

        case 'lavadeira': // Lavadeira-de-cauda (White-rumped Monjita)
            const lavadeiraSize = bird.size;

            // Corpo branco (já desenhado pela cor base)
            // Asas pretas/escuras
            ctx.fillStyle = '#000000'; // Preto
            ctx.beginPath();
            ctx.ellipse(
                bird.x - lavadeiraSize * 0.4,
                bird.y - lavadeiraSize * 0.1,
                lavadeiraSize * 0.5,
                lavadeiraSize * 0.35,
                -0.2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Segunda parte preta nas asas
            ctx.beginPath();
            ctx.ellipse(
                bird.x - lavadeiraSize * 0.3,
                bird.y + lavadeiraSize * 0.15,
                lavadeiraSize * 0.4,
                lavadeiraSize * 0.3,
                -0.15,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Marcas brancas sutis nas asas (listras/faixas)
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(
                bird.x - lavadeiraSize * 0.35,
                bird.y + lavadeiraSize * 0.05,
                lavadeiraSize * 0.15,
                lavadeiraSize * 0.08,
                -0.2,
                0,
                Math.PI * 2
            );
            ctx.fill();
            break;

        case 'saracura': // Saracura três potes
            const saracuraSize = bird.size;

            // Cabeça e pescoço cinza ardósia
            ctx.fillStyle = '#708090'; // Cinza ardósia
            ctx.beginPath();
            ctx.ellipse(
                bird.x,
                bird.y - saracuraSize * 0.5,
                saracuraSize * 0.4,
                saracuraSize * 0.3,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Pescoço cinza
            ctx.beginPath();
            ctx.ellipse(
                bird.x,
                bird.y - saracuraSize * 0.2,
                saracuraSize * 0.25,
                saracuraSize * 0.35,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Corpo superior (costas e asas) - marrom-oliva
            ctx.fillStyle = '#6B8E23'; // Marrom-oliva
            ctx.beginPath();
            ctx.ellipse(
                bird.x - saracuraSize * 0.3,
                bird.y - saracuraSize * 0.1,
                saracuraSize * 0.5,
                saracuraSize * 0.4,
                -0.2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Segunda parte marrom-oliva nas asas
            ctx.beginPath();
            ctx.ellipse(
                bird.x - saracuraSize * 0.25,
                bird.y + saracuraSize * 0.1,
                saracuraSize * 0.4,
                saracuraSize * 0.3,
                -0.15,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Cauda curta e escura
            ctx.fillStyle = '#2F4F2F'; // Verde escuro/marrom escuro
            ctx.beginPath();
            ctx.ellipse(
                bird.x - saracuraSize * 0.5,
                bird.y + saracuraSize * 0.25,
                saracuraSize * 0.25,
                saracuraSize * 0.2,
                -0.3,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Parte inferior (peito e barriga) - laranja ferrugem (já desenhado pela cor base)
            // A cor base já é laranja ferrugem, então está correto

            break;

        case 'martim': // Martim-pescador
            const martimSize = bird.size;

            // Peito/ventre branco ou creme claro
            ctx.fillStyle = '#F5F5DC'; // Bege claro
            ctx.beginPath();
            ctx.ellipse(
                bird.x,
                bird.y + martimSize * 0.2,
                martimSize * 0.4,
                martimSize * 0.5,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Faixa escura na cabeça (característica do martim-pescador)
            ctx.fillStyle = '#1a3d0e'; // Verde escuro
            ctx.beginPath();
            ctx.ellipse(
                bird.x,
                bird.y - martimSize * 0.6,
                martimSize * 0.35,
                martimSize * 0.15,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Padrão de penas nas asas (verde mais escuro)
            ctx.fillStyle = '#2ecc71'; // Verde médio
            ctx.beginPath();
            ctx.ellipse(
                bird.x - martimSize * 0.3,
                bird.y - martimSize * 0.1,
                martimSize * 0.45,
                martimSize * 0.35,
                -0.2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Detalhes nas asas - faixas mais escuras
            ctx.fillStyle = '#27ae60'; // Verde mais escuro
            ctx.beginPath();
            ctx.ellipse(
                bird.x - martimSize * 0.25,
                bird.y + martimSize * 0.1,
                martimSize * 0.35,
                martimSize * 0.28,
                -0.15,
                0,
                Math.PI * 2
            );
            ctx.fill();
            break;

        case 'araponga': // Araponga (Procnias nudicollis)
            const arapongaSize = bird.size;

            // Círculo azul turquesa
            ctx.fillStyle = '#40E0D0';
            ctx.beginPath();
            ctx.arc(bird.x + arapongaSize * 0.4, bird.y + arapongaSize * 0.2, arapongaSize * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Cabeça e parte superior com padrão escuro/preto
            ctx.fillStyle = '#2C2C2C';
            ctx.beginPath();
            ctx.ellipse(bird.x, bird.y - arapongaSize * 0.5, arapongaSize * 0.45, arapongaSize * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Área escura nas costas/parte superior das asas
            ctx.beginPath();
            ctx.ellipse(bird.x - arapongaSize * 0.3, bird.y - arapongaSize * 0.1, arapongaSize * 0.5, arapongaSize * 0.35, -0.2, 0, Math.PI * 2);
            ctx.fill();

            // Manchas escuras nas asas (padrão característico)
            ctx.fillStyle = '#1A1A1A';
            ctx.beginPath();
            ctx.ellipse(bird.x - arapongaSize * 0.4, bird.y + arapongaSize * 0.1, arapongaSize * 0.3, arapongaSize * 0.25, -0.3, 0, Math.PI * 2);
            ctx.fill();

            break;

        case 'bacurau': // Bacurau (Potoo)
            const bacurauSize = bird.size;

            // Cabeça achatada no topo (característica do Bacurau)
            ctx.fillStyle = '#6B5B4A'; // Marrom mais escuro
            ctx.beginPath();
            ctx.ellipse(
                bird.x,
                bird.y - bacurauSize * 0.6,
                bacurauSize * 0.4,
                bacurauSize * 0.25,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Olho do mesmo tamanho dos pássaros padrão, apenas com cor amarela
            // Círculo branco do olho (mesmo tamanho padrão)
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(bird.x + 10, bird.y - 5, 10, 0, Math.PI * 2);
            ctx.fill();
            // Pupila amarela (mesmo tamanho padrão, apenas cor diferente)
            ctx.fillStyle = '#FFD700'; // Amarelo brilhante
            ctx.beginPath();
            ctx.arc(bird.x + 12, bird.y - 5, 5, 0, Math.PI * 2);
            ctx.fill();

            // Padrão de penas manchado (marrom/cinza) - camuflagem
            // Manchas escuras (usando valores fixos baseados no índice para consistência)
            ctx.fillStyle = '#5C4A3A'; // Marrom escuro
            const darkSpots = [
                { angle: 0, dist: 0.35 },
                { angle: Math.PI / 3, dist: 0.4 },
                { angle: Math.PI * 2 / 3, dist: 0.3 },
                { angle: Math.PI, dist: 0.45 },
                { angle: Math.PI * 4 / 3, dist: 0.35 },
                { angle: Math.PI * 5 / 3, dist: 0.4 }
            ];
            darkSpots.forEach(spot => {
                const distance = bacurauSize * spot.dist;
                const spotX = bird.x + Math.cos(spot.angle) * distance;
                const spotY = bird.y + Math.sin(spot.angle) * distance;
                ctx.beginPath();
                ctx.arc(spotX, spotY, bacurauSize * 0.08, 0, Math.PI * 2);
                ctx.fill();
            });

            // Manchas claras (amareladas/brancas)
            ctx.fillStyle = '#D4C5A9'; // Bege claro
            const lightSpots = [
                { angle: Math.PI / 4, dist: 0.28 },
                { angle: Math.PI * 3 / 4, dist: 0.32 },
                { angle: Math.PI * 5 / 4, dist: 0.3 },
                { angle: Math.PI * 7 / 4, dist: 0.35 }
            ];
            lightSpots.forEach(spot => {
                const distance = bacurauSize * spot.dist;
                const spotX = bird.x + Math.cos(spot.angle) * distance;
                const spotY = bird.y + Math.sin(spot.angle) * distance;
                ctx.beginPath();
                ctx.arc(spotX, spotY, bacurauSize * 0.06, 0, Math.PI * 2);
                ctx.fill();
            });

            // Cerdas ao redor do bico (rictal bristles)
            ctx.strokeStyle = '#654321'; // Marrom escuro
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const angle = -0.5 + (i * 0.2);
                const startX = bird.x - bacurauSize * 0.2;
                const startY = bird.y - bacurauSize * 0.3;
                const endX = startX + Math.cos(angle) * bacurauSize * 0.15;
                const endY = startY + Math.sin(angle) * bacurauSize * 0.15;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }

            break;

        case 'tuiuiu': // Tuiuiu (Jabiru)
            const tuiuiuSize = bird.size;

            // Cabeça e pescoço superior pretos
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            // Cabeça (parte superior do círculo)
            ctx.arc(bird.x, bird.y - tuiuiuSize * 0.3, tuiuiuSize * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Pescoço superior preto (conectando cabeça ao corpo)
            ctx.beginPath();
            ctx.ellipse(bird.x, bird.y - tuiuiuSize * 0.1, tuiuiuSize * 0.25, tuiuiuSize * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();

            // Colar vermelho vibrante ao redor do pescoço (característica marcante do Tuiuiu)
            const collarY = bird.y + tuiuiuSize * 0.15;
            ctx.fillStyle = '#e74c3c'; // Vermelho vibrante
            ctx.beginPath();
            ctx.ellipse(bird.x, collarY, tuiuiuSize * 0.35, tuiuiuSize * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();

            // Detalhe do colar (textura/brilho)
            ctx.fillStyle = '#c0392b'; // Vermelho mais escuro para profundidade
            ctx.beginPath();
            ctx.ellipse(bird.x, collarY - tuiuiuSize * 0.02, tuiuiuSize * 0.32, tuiuiuSize * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();

            // Olho pequeno e escuro (na cabeça preta)
            if (!bird.stunned) {
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + tuiuiuSize * 0.25, bird.y - tuiuiuSize * 0.25, tuiuiuSize * 0.1, 0, Math.PI * 2);
                ctx.fill();
                // Brilho no olho
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(bird.x + tuiuiuSize * 0.27, bird.y - tuiuiuSize * 0.27, tuiuiuSize * 0.04, 0, Math.PI * 2);
                ctx.fill();
            }

            // Corpo branco (já desenhado como círculo base, mas garantir que está branco)
            // O corpo já é branco pela cor do bird.color
            break;

        case 'toucan': // Tucano
            const toucanSize = bird.size;

            // Mancha branca no peito (característica do tucano)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(bird.x, bird.y + toucanSize * 0.2, toucanSize * 0.4, toucanSize * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Linha separadora entre o peito branco e o corpo preto
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bird.x - toucanSize * 0.4, bird.y + toucanSize * 0.15);
            ctx.lineTo(bird.x + toucanSize * 0.4, bird.y + toucanSize * 0.15);
            ctx.stroke();

            // Detalhes nas asas (penas mais escuras - preto)
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.ellipse(bird.x - toucanSize * 0.3, bird.y, toucanSize * 0.25, toucanSize * 0.15, -0.3, 0, Math.PI * 2);
            ctx.fill();

            // Olho azul com anel laranja
            if (!bird.stunned) {
                // Anel laranja ao redor do olho
                ctx.fillStyle = '#FF8C00';
                ctx.beginPath();
                ctx.arc(bird.x + toucanSize * 0.3, bird.y - toucanSize * 0.2, toucanSize * 0.12, 0, Math.PI * 2);
                ctx.fill();
                
                // Olho azul
                ctx.fillStyle = '#4169E1';
                ctx.beginPath();
                ctx.arc(bird.x + toucanSize * 0.3, bird.y - toucanSize * 0.2, toucanSize * 0.08, 0, Math.PI * 2);
                ctx.fill();
                
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + toucanSize * 0.3, bird.y - toucanSize * 0.2, toucanSize * 0.05, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'gull': // Gaivota
            const gullSize = bird.size;

            // Corpo branco (já desenhado como base)
            // Asas pretas nas costas
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            // Asa esquerda (superior)
            ctx.ellipse(bird.x - gullSize * 0.3, bird.y - gullSize * 0.1, gullSize * 0.35, gullSize * 0.15, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Asa direita (inferior)
            ctx.beginPath();
            ctx.ellipse(bird.x - gullSize * 0.25, bird.y + gullSize * 0.1, gullSize * 0.3, gullSize * 0.12, 0.1, 0, Math.PI * 2);
            ctx.fill();

            // Cauda branca (já é branca pela cor base)
            // Detalhe: parte superior das costas preta
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(bird.x - gullSize * 0.15, bird.y - gullSize * 0.25, gullSize * 0.2, gullSize * 0.1, -0.1, 0, Math.PI * 2);
            ctx.fill();

            // Olho vermelho-laranja com anel amarelo claro
            if (!bird.stunned) {
                // Anel amarelo claro ao redor do olho
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(bird.x + gullSize * 0.3, bird.y - gullSize * 0.15, gullSize * 0.1, 0, Math.PI * 2);
                ctx.fill();
                
                // Olho vermelho-laranja
                ctx.fillStyle = '#FF4500';
                ctx.beginPath();
                ctx.arc(bird.x + gullSize * 0.3, bird.y - gullSize * 0.15, gullSize * 0.07, 0, Math.PI * 2);
                ctx.fill();
                
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + gullSize * 0.3, bird.y - gullSize * 0.15, gullSize * 0.04, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'guara': // Guará (Scarlet Ibis)
            const guaraSize = bird.size;

            // Corpo vermelho escarlate (já desenhado como base)
            // Pontas pretas nas penas primárias das asas
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            // Pontas pretas nas asas (penas primárias)
            ctx.ellipse(bird.x - guaraSize * 0.35, bird.y - guaraSize * 0.15, guaraSize * 0.15, guaraSize * 0.08, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(bird.x - guaraSize * 0.3, bird.y + guaraSize * 0.15, guaraSize * 0.12, guaraSize * 0.06, 0.1, 0, Math.PI * 2);
            ctx.fill();

            // Linhas brancas nas penas secundárias/cobertas (parte inferior das costas)
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(bird.x - guaraSize * 0.4, bird.y + guaraSize * 0.1 + i * guaraSize * 0.08);
                ctx.lineTo(bird.x - guaraSize * 0.2, bird.y + guaraSize * 0.15 + i * guaraSize * 0.08);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
            }

            // Olho pequeno e escuro com anel rosa-avermelhado
            if (!bird.stunned) {
                // Anel rosa-avermelhado ao redor do olho
                ctx.fillStyle = '#FF69B4';
                ctx.beginPath();
                ctx.arc(bird.x + guaraSize * 0.3, bird.y - guaraSize * 0.15, guaraSize * 0.1, 0, Math.PI * 2);
                ctx.fill();
                
                // Olho escuro
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + guaraSize * 0.3, bird.y - guaraSize * 0.15, guaraSize * 0.07, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'pelican': // Pelicano
            const pelicanSize = bird.size;

            // Corpo branco (já desenhado como base)
            // Penacho de penas brancas espetadas na parte de trás da cabeça
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 5; i++) {
                const angle = -Math.PI / 2 + (i - 2) * 0.3;
                const startX = bird.x - pelicanSize * 0.3;
                const startY = bird.y - pelicanSize * 0.4;
                const endX = startX + Math.cos(angle) * pelicanSize * 0.15;
                const endY = startY + Math.sin(angle) * pelicanSize * 0.15;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
            }

            // Pele rosa-avermelhada ao redor dos olhos e na parte superior da cabeça
            ctx.fillStyle = '#FFB6C1';
            ctx.beginPath();
            ctx.ellipse(bird.x - pelicanSize * 0.25, bird.y - pelicanSize * 0.3, pelicanSize * 0.2, pelicanSize * 0.15, -0.1, 0, Math.PI * 2);
            ctx.fill();

            // Olho pequeno e escuro com anel rosa-avermelhado
            if (!bird.stunned) {
                // Anel rosa-avermelhado ao redor do olho
                ctx.fillStyle = '#FF69B4';
                ctx.beginPath();
                ctx.arc(bird.x + pelicanSize * 0.3, bird.y - pelicanSize * 0.2, pelicanSize * 0.1, 0, Math.PI * 2);
                ctx.fill();
                
                // Olho escuro
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + pelicanSize * 0.3, bird.y - pelicanSize * 0.2, pelicanSize * 0.07, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'flamingo': // Flamingo
            const flamingoSize = bird.size;

            // Pescoço longo e curvado (rosa coral vibrante)
            ctx.fillStyle = '#FF69B4'; // Rosa coral vibrante
            ctx.beginPath();
            ctx.ellipse(
                bird.x - flamingoSize * 0.2,
                bird.y - flamingoSize * 0.6,
                flamingoSize * 0.15,
                flamingoSize * 0.5,
                -0.3,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Cabeça arredondada
            ctx.beginPath();
            ctx.arc(bird.x - flamingoSize * 0.3, bird.y - flamingoSize * 0.9, flamingoSize * 0.25, 0, Math.PI * 2);
            ctx.fill();

            // Asas com penas mais escuras (rosa mais profundo)
            ctx.fillStyle = '#FF1493'; // Rosa mais profundo
            ctx.beginPath();
            ctx.ellipse(
                bird.x - flamingoSize * 0.3,
                bird.y - flamingoSize * 0.1,
                flamingoSize * 0.45,
                flamingoSize * 0.35,
                -0.2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Segunda camada de asas
            ctx.beginPath();
            ctx.ellipse(
                bird.x - flamingoSize * 0.25,
                bird.y + flamingoSize * 0.1,
                flamingoSize * 0.35,
                flamingoSize * 0.28,
                -0.15,
                0,
                Math.PI * 2
            );
            ctx.fill();
            break;

        case 'arara': // Arara-azul-e-amarela (Ara ararauna)
            const araraSize = bird.size;

            // 1. PEITO/BARRIGA AMARELO DOURADO (parte inferior do corpo)
            // Amarelo mais rico e vibrante, com transição suave e textura
            ctx.fillStyle = '#FFD700'; // Amarelo dourado brilhante
            ctx.beginPath();
            ctx.ellipse(bird.x, bird.y + araraSize * 0.25, araraSize * 0.45, araraSize * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Camada adicional para dar profundidade ao amarelo
            ctx.fillStyle = '#FFA500'; // Laranja dourado (mais escuro)
            ctx.beginPath();
            ctx.ellipse(bird.x, bird.y + araraSize * 0.35, araraSize * 0.35, araraSize * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Textura de penas no peito (pequenas manchas sutis)
            ctx.fillStyle = 'rgba(255, 200, 0, 0.3)'; // Amarelo mais claro e transparente
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 3; j++) {
                    ctx.beginPath();
                    ctx.arc(
                        bird.x - araraSize * 0.2 + i * araraSize * 0.1,
                        bird.y + araraSize * 0.3 + j * araraSize * 0.15,
                        araraSize * 0.03,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
            }

            // 2. DORSO E ASAS AZUL VÍVIDO (parte superior)
            // Azul mais intenso e vibrante, com múltiplas camadas para textura
            ctx.fillStyle = '#0066FF'; // Azul vívido principal
            ctx.beginPath();
            ctx.ellipse(bird.x - araraSize * 0.3, bird.y - araraSize * 0.15, araraSize * 0.5, araraSize * 0.4, -0.2, 0, Math.PI * 2);
            ctx.fill();

            // Detalhes de penas nas asas (azul mais escuro para profundidade)
            ctx.fillStyle = '#0044CC'; // Azul mais escuro
            ctx.beginPath();
            ctx.ellipse(bird.x - araraSize * 0.35, bird.y - araraSize * 0.1, araraSize * 0.3, araraSize * 0.25, -0.25, 0, Math.PI * 2);
            ctx.fill();
            
            // Padrão de penas individuais nas asas (linhas sutis)
            ctx.strokeStyle = '#0033AA';
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(bird.x - araraSize * 0.5, bird.y - araraSize * 0.2 + i * araraSize * 0.08);
                ctx.lineTo(bird.x - araraSize * 0.25, bird.y - araraSize * 0.15 + i * araraSize * 0.08);
                ctx.stroke();
            }

            // Segunda camada de asas (sobreposição)
            ctx.fillStyle = '#0066FF';
            ctx.beginPath();
            ctx.ellipse(bird.x - araraSize * 0.25, bird.y + araraSize * 0.1, araraSize * 0.4, araraSize * 0.3, -0.15, 0, Math.PI * 2);
            ctx.fill();

            // Detalhes de penas na segunda camada
            ctx.fillStyle = '#0044CC';
            ctx.beginPath();
            ctx.ellipse(bird.x - araraSize * 0.3, bird.y + araraSize * 0.15, araraSize * 0.25, araraSize * 0.2, -0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Padrão de penas na segunda camada
            ctx.strokeStyle = '#0033AA';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(bird.x - araraSize * 0.45, bird.y + araraSize * 0.05 + i * araraSize * 0.08);
                ctx.lineTo(bird.x - araraSize * 0.2, bird.y + araraSize * 0.1 + i * araraSize * 0.08);
                ctx.stroke();
            }

            // 3. CABEÇA AZUL (mais arredondada e proporcional)
            ctx.fillStyle = '#0066FF'; // Azul na coroa e nuca
            ctx.beginPath();
            ctx.arc(bird.x + araraSize * 0.25, bird.y - araraSize * 0.65, araraSize * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Nuca/parte superior da cabeça (azul mais escuro)
            ctx.fillStyle = '#0044CC';
            ctx.beginPath();
            ctx.arc(bird.x + araraSize * 0.2, bird.y - araraSize * 0.75, araraSize * 0.25, 0, Math.PI * 2);
            ctx.fill();
            
            // Detalhes de penas na cabeça (pequenas linhas)
            ctx.strokeStyle = '#0033AA';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(bird.x - araraSize * 0.1, bird.y - araraSize * 0.7 + i * araraSize * 0.05);
                ctx.lineTo(bird.x + araraSize * 0.15, bird.y - araraSize * 0.65 + i * araraSize * 0.05);
                ctx.stroke();
            }

            // 4. FACE BRANCA (área sem penas ao redor dos olhos)
            // Face mais proeminente e bem posicionada, com bordas mais definidas
            ctx.fillStyle = '#FFFFFF'; // Branco
            ctx.beginPath();
            ctx.ellipse(bird.x + araraSize * 0.45, bird.y - araraSize * 0.1, araraSize * 0.5, araraSize * 0.5, -0.1, 0, Math.PI * 2);
            ctx.fill();

            // Detalhe: área mais clara no centro da face (brilho)
            ctx.fillStyle = '#F5F5F5'; // Branco levemente acinzentado
            ctx.beginPath();
            ctx.ellipse(bird.x + araraSize * 0.5, bird.y - araraSize * 0.05, araraSize * 0.3, araraSize * 0.3, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Borda sutil ao redor da face branca (separação das penas)
            ctx.strokeStyle = '#E0E0E0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(bird.x + araraSize * 0.45, bird.y - araraSize * 0.1, araraSize * 0.5, araraSize * 0.5, -0.1, 0, Math.PI * 2);
            ctx.stroke();

            // 5. PADRÃO DE PENAS PRETAS AO REDOR DOS OLHOS
            // Padrão mais elaborado e realista, formando linhas características em leque
            ctx.fillStyle = '#000000'; // Preto
            // Linha superior de penas (mais próxima dos olhos) - padrão em leque
            for (let i = 0; i < 5; i++) {
                const angle = (i - 2) * 0.15; // Leque mais amplo
                const x = bird.x + araraSize * 0.35 + i * araraSize * 0.05;
                const y = bird.y - araraSize * 0.15;
                ctx.beginPath();
                ctx.ellipse(x, y, araraSize * 0.04, araraSize * 0.03, angle, 0, Math.PI * 2);
                ctx.fill();
            }
            // Linha inferior de penas (abaixo dos olhos) - padrão em leque
            for (let i = 0; i < 4; i++) {
                const angle = (i - 1.5) * 0.12;
                const x = bird.x + araraSize * 0.4 + i * araraSize * 0.05;
                const y = bird.y + araraSize * 0.1;
                ctx.beginPath();
                ctx.ellipse(x, y, araraSize * 0.035, araraSize * 0.025, angle, 0, Math.PI * 2);
                ctx.fill();
            }
            // Pequenas penas laterais (formando padrão em leque mais elaborado)
            for (let i = 0; i < 3; i++) {
                const angle = (i - 1) * 0.1;
                const x = bird.x + araraSize * 0.25 + i * araraSize * 0.08;
                const y = bird.y - araraSize * 0.05;
                ctx.beginPath();
                ctx.ellipse(x, y, araraSize * 0.03, araraSize * 0.02, angle, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Linhas finas conectando as penas (padrão característico da arara)
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(bird.x + araraSize * 0.35 + i * araraSize * 0.05, bird.y - araraSize * 0.15);
                ctx.lineTo(bird.x + araraSize * 0.4 + i * araraSize * 0.05, bird.y + araraSize * 0.1);
                ctx.stroke();
            }

            // 6. TRANSIÇÃO ENTRE AZUL E AMARELO (linha de separação)
            // Linha sutil separando o azul do amarelo, com gradiente
            ctx.strokeStyle = '#FFA500'; // Laranja dourado
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bird.x - araraSize * 0.4, bird.y + araraSize * 0.15);
            ctx.quadraticCurveTo(bird.x, bird.y + araraSize * 0.2, bird.x + araraSize * 0.4, bird.y + araraSize * 0.15);
            ctx.stroke();
            
            // Linha adicional mais sutil para profundidade
            ctx.strokeStyle = '#FF8C00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bird.x - araraSize * 0.38, bird.y + araraSize * 0.18);
            ctx.quadraticCurveTo(bird.x, bird.y + araraSize * 0.22, bird.x + araraSize * 0.38, bird.y + araraSize * 0.18);
            ctx.stroke();

            // 7. CAUDA (se visível na lateral)
            // Cauda longa e colorida da arara (azul com detalhes e textura)
            ctx.fillStyle = '#0066FF';
            ctx.beginPath();
            ctx.ellipse(bird.x - araraSize * 0.5, bird.y + araraSize * 0.3, araraSize * 0.2, araraSize * 0.4, -0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Detalhes na cauda (camadas)
            ctx.fillStyle = '#0044CC';
            ctx.beginPath();
            ctx.ellipse(bird.x - araraSize * 0.55, bird.y + araraSize * 0.4, araraSize * 0.15, araraSize * 0.3, -0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Padrão de penas na cauda (linhas verticais)
            ctx.strokeStyle = '#0033AA';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(bird.x - araraSize * 0.6, bird.y + araraSize * 0.25 + i * araraSize * 0.1);
                ctx.lineTo(bird.x - araraSize * 0.45, bird.y + araraSize * 0.3 + i * araraSize * 0.1);
                ctx.stroke();
            }

            // Olho será desenhado na posição padrão (bird.x + 10, bird.y - 5)
            break;

        case 'pyrrhuloxia': // Pyrrhuloxia (Cardeal do Deserto)
            const pyrrhuloxiaSize = bird.size;
            
            // Corpo cinza médio (já desenhado como base)
            // Crista vermelha vibrante no topo da cabeça
            ctx.fillStyle = '#DC143C'; // Vermelho brilhante
            ctx.beginPath();
            // Crista espetada
            for (let i = 0; i < 5; i++) {
                const angle = -Math.PI / 2 + (i - 2) * 0.25;
                const startX = bird.x + pyrrhuloxiaSize * 0.25;
                const startY = bird.y - pyrrhuloxiaSize * 0.4;
                const endX = startX + Math.cos(angle) * pyrrhuloxiaSize * 0.2;
                const endY = startY + Math.sin(angle) * pyrrhuloxiaSize * 0.2;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#DC143C';
                ctx.stroke();
            }
            
            // Máscara vermelha ao redor dos olhos
            ctx.fillStyle = '#DC143C';
            ctx.beginPath();
            ctx.ellipse(bird.x + pyrrhuloxiaSize * 0.3, bird.y - pyrrhuloxiaSize * 0.15, pyrrhuloxiaSize * 0.15, pyrrhuloxiaSize * 0.12, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Peito e barriga vermelho-rosado
            ctx.fillStyle = '#FF69B4'; // Vermelho-rosado
            ctx.beginPath();
            ctx.ellipse(bird.x + pyrrhuloxiaSize * 0.2, bird.y + pyrrhuloxiaSize * 0.1, pyrrhuloxiaSize * 0.35, pyrrhuloxiaSize * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Olho vermelho brilhante
            if (!bird.stunned) {
                ctx.fillStyle = '#DC143C'; // Vermelho brilhante
                ctx.beginPath();
                ctx.arc(bird.x + pyrrhuloxiaSize * 0.3, bird.y - pyrrhuloxiaSize * 0.15, pyrrhuloxiaSize * 0.08, 0, Math.PI * 2);
                ctx.fill();
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + pyrrhuloxiaSize * 0.3, bird.y - pyrrhuloxiaSize * 0.15, pyrrhuloxiaSize * 0.04, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'acorn-woodpecker': // Acorn Woodpecker (Pica-pau das Bolotas)
            const acornWoodpeckerSize = bird.size;
            
            // Corpo preto brilhante (já desenhado como base)
            // Capa vermelha brilhante no topo da cabeça
            ctx.fillStyle = '#DC143C'; // Vermelho escarlate brilhante
            ctx.beginPath();
            ctx.ellipse(bird.x + acornWoodpeckerSize * 0.2, bird.y - acornWoodpeckerSize * 0.4, acornWoodpeckerSize * 0.3, acornWoodpeckerSize * 0.15, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Mancha branca acima do bico (base da testa)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(bird.x + acornWoodpeckerSize * 0.35, bird.y - acornWoodpeckerSize * 0.25, acornWoodpeckerSize * 0.1, acornWoodpeckerSize * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Faixa branca atrás do olho (bigode/bochecha)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(bird.x + acornWoodpeckerSize * 0.25, bird.y - acornWoodpeckerSize * 0.1, acornWoodpeckerSize * 0.2, acornWoodpeckerSize * 0.12, 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Mancha branca no ombro/asa superior
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(bird.x - acornWoodpeckerSize * 0.2, bird.y - acornWoodpeckerSize * 0.05, acornWoodpeckerSize * 0.15, acornWoodpeckerSize * 0.1, -0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Mancha branca maior no flanco inferior
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(bird.x - acornWoodpeckerSize * 0.15, bird.y + acornWoodpeckerSize * 0.2, acornWoodpeckerSize * 0.2, acornWoodpeckerSize * 0.15, 0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Olho escuro com íris vermelho-marrom
            if (!bird.stunned) {
                ctx.fillStyle = '#8B4513'; // Íris vermelho-marrom
                ctx.beginPath();
                ctx.arc(bird.x + acornWoodpeckerSize * 0.3, bird.y - acornWoodpeckerSize * 0.15, acornWoodpeckerSize * 0.08, 0, Math.PI * 2);
                ctx.fill();
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + acornWoodpeckerSize * 0.3, bird.y - acornWoodpeckerSize * 0.15, acornWoodpeckerSize * 0.05, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'virginias-warbler': // Virginia's Warbler
            const warblerSize = bird.size;
            
            // Corpo cinza claro (já desenhado como base)
            // Mancha amarela brilhante na testa, logo acima do olho
            ctx.fillStyle = '#FFD700'; // Amarelo brilhante
            ctx.beginPath();
            ctx.ellipse(bird.x + warblerSize * 0.3, bird.y - warblerSize * 0.3, warblerSize * 0.12, warblerSize * 0.08, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Garganta e peito superior branco
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(bird.x + warblerSize * 0.2, bird.y - warblerSize * 0.05, warblerSize * 0.25, warblerSize * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Parte inferior (peito inferior para baixo) amarelo vibrante
            ctx.fillStyle = '#FFD700'; // Amarelo vibrante
            ctx.beginPath();
            ctx.ellipse(bird.x + warblerSize * 0.15, bird.y + warblerSize * 0.15, warblerSize * 0.3, warblerSize * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Estrias cinza mais escuras nas asas (penas primárias e secundárias)
            ctx.fillStyle = '#808080'; // Cinza mais escuro
            ctx.beginPath();
            ctx.ellipse(bird.x - warblerSize * 0.25, bird.y - warblerSize * 0.1, warblerSize * 0.2, warblerSize * 0.08, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(bird.x - warblerSize * 0.2, bird.y + warblerSize * 0.1, warblerSize * 0.18, warblerSize * 0.07, 0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Olho pequeno, redondo e preto
            if (!bird.stunned) {
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + warblerSize * 0.3, bird.y - warblerSize * 0.2, warblerSize * 0.06, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'bearded-vulture': // Abutre Barbudo (Lammergeier)
            const vultureSize = bird.size;
            
            // Corpo base (bege creme no peito inferior, já desenhado)
            // Cabeça branca
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(bird.x + vultureSize * 0.25, bird.y - vultureSize * 0.35, vultureSize * 0.25, vultureSize * 0.2, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Máscara preta da base do bico, através do olho, e um pouco além
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(bird.x + vultureSize * 0.3, bird.y - vultureSize * 0.25, vultureSize * 0.15, vultureSize * 0.12, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // "Barba" ou tufo de cerdas pretas abaixo do olho
            ctx.fillStyle = '#000000';
            for (let i = 0; i < 5; i++) {
                const angle = Math.PI / 2 + (i - 2) * 0.2;
                const startX = bird.x + vultureSize * 0.3;
                const startY = bird.y - vultureSize * 0.15;
                const endX = startX + Math.cos(angle) * vultureSize * 0.1;
                const endY = startY + Math.sin(angle) * vultureSize * 0.1;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#000000';
                ctx.stroke();
            }
            
            // Pescoço e peito superior laranja-marrom rico
            ctx.fillStyle = '#CD853F'; // Laranja-marrom
            ctx.beginPath();
            ctx.ellipse(bird.x + vultureSize * 0.15, bird.y - vultureSize * 0.1, vultureSize * 0.25, vultureSize * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Peito inferior bege creme (já é a cor base)
            // Asas e costas cinza ardósia escuro com estrias
            ctx.fillStyle = '#708090'; // Cinza ardósia
            ctx.beginPath();
            ctx.ellipse(bird.x - vultureSize * 0.2, bird.y - vultureSize * 0.05, vultureSize * 0.3, vultureSize * 0.15, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(bird.x - vultureSize * 0.15, bird.y + vultureSize * 0.1, vultureSize * 0.25, vultureSize * 0.12, 0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Estrias paralelas nas asas (textura)
            ctx.strokeStyle = '#556B2F'; // Cinza mais escuro para as estrias
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(bird.x - vultureSize * 0.4, bird.y - vultureSize * 0.05 + i * vultureSize * 0.05);
                ctx.lineTo(bird.x - vultureSize * 0.1, bird.y - vultureSize * 0.05 + i * vultureSize * 0.05);
                ctx.stroke();
            }
            
            // Olho vermelho intenso com pupila preta
            if (!bird.stunned) {
                ctx.fillStyle = '#DC143C'; // Vermelho intenso
                ctx.beginPath();
                ctx.arc(bird.x + vultureSize * 0.3, bird.y - vultureSize * 0.25, vultureSize * 0.1, 0, Math.PI * 2);
                ctx.fill();
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + vultureSize * 0.3, bird.y - vultureSize * 0.25, vultureSize * 0.06, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'phainopepla': // Phainopepla
            const phainopeplaSize = bird.size;
            
            // Corpo preto brilhante (já desenhado como base)
            // Crista de penas pretas na cabeça (espetada/desgrenhada)
            ctx.fillStyle = '#000000';
            for (let i = 0; i < 6; i++) {
                const angle = -Math.PI / 2 + (i - 2.5) * 0.2;
                const startX = bird.x + phainopeplaSize * 0.25;
                const startY = bird.y - phainopeplaSize * 0.4;
                const endX = startX + Math.cos(angle) * phainopeplaSize * 0.15;
                const endY = startY + Math.sin(angle) * phainopeplaSize * 0.15;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#000000';
                ctx.stroke();
            }
            
            // Manchas vermelhas brilhantes abaixo de cada olho (nas bochechas)
            ctx.fillStyle = '#DC143C'; // Vermelho brilhante
            ctx.beginPath();
            ctx.arc(bird.x + phainopeplaSize * 0.3, bird.y - phainopeplaSize * 0.15, phainopeplaSize * 0.08, 0, Math.PI * 2);
            ctx.fill();
            
            // Olho vermelho intenso
            if (!bird.stunned) {
                ctx.fillStyle = '#DC143C'; // Vermelho intenso
                ctx.beginPath();
                ctx.arc(bird.x + phainopeplaSize * 0.3, bird.y - phainopeplaSize * 0.2, phainopeplaSize * 0.08, 0, Math.PI * 2);
                ctx.fill();
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(bird.x + phainopeplaSize * 0.3, bird.y - phainopeplaSize * 0.2, phainopeplaSize * 0.05, 0, Math.PI * 2);
                ctx.fill();
            }
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

    // Controles: Teclado OU Touch
    let moveX = 0;
    let moveY = 0;

    // Teclado (WASD e Setas)
    if (keys['w'] || keys['arrowup'] || keys['ArrowUp']) moveY = -player.speed;
    else if (keys['s'] || keys['arrowdown'] || keys['ArrowDown']) moveY = player.speed;

    if (keys['a'] || keys['arrowleft'] || keys['ArrowLeft']) {
        moveX = -player.speed;
        player.facingRight = false;
    } else if (keys['d'] || keys['arrowright'] || keys['ArrowRight']) {
        moveX = player.speed;
        player.facingRight = true;
    }

    // Touch (Joystick)
    if (touchControls.joystickActive) {
        const joystickX = touchControls.joystickX;
        const joystickY = touchControls.joystickY;
        const distance = Math.sqrt(joystickX * joystickX + joystickY * joystickY);
        
        if (distance > 5) { // Dead zone
            const normalizedX = joystickX / distance;
            const normalizedY = joystickY / distance;
            moveX = normalizedX * player.speed;
            moveY = normalizedY * player.speed;
            
            // Atualizar direção
            if (normalizedX > 0) player.facingRight = true;
            else if (normalizedX < 0) player.facingRight = false;
        }
    }

    player.dx = moveX;
    player.dy = moveY;

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
            lastPlayerScore = playerScore;
            const pointsGained = food.points;
            playerScore += pointsGained;

            // Criar efeito de texto flutuante (+1 ou +5)
            scoreTextEffects.push({
                x: player.x,
                y: player.y - player.size - 20,
                text: `+${pointsGained}`,
                life: 60, // Duração da animação
                maxLife: 60,
                vy: -2, // Velocidade vertical (sobe)
                alpha: 1,
                scale: 1.2
            });

            if (!isBonusStage) updateStarsHUD(); // Atualizar estrelas em fases normais
            if (playerScore !== lastPlayerScore) {
                playerScoreAnimation = 30; // Inicia animação do placar
            }
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
            lastCpuScore = cpuScore;
            cpuScore += food.points;
            if (cpuScore !== lastCpuScore) {
                cpuScoreAnimation = 30; // Inicia animação do placar
                if (!isBonusStage) updateStarsHUD(); // Atualizar estrelas quando CPU marca
            }
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
            lastPlayerScore = playerScore;
            const pointsGained = food.points;
            playerScore += pointsGained;

            // Criar efeito de texto flutuante (+5 para comida especial)
            scoreTextEffects.push({
                x: player.x,
                y: player.y - player.size - 20,
                text: `+${pointsGained}`,
                life: 60,
                maxLife: 60,
                vy: -2.5, // Sobe mais rápido
                alpha: 1,
                scale: 1.5 // Maior para comida especial
            });

            if (!isBonusStage) updateStarsHUD(); // Atualizar estrelas em fases normais
            if (playerScore !== lastPlayerScore) {
                playerScoreAnimation = 40; // Animação maior para comida especial
            }
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
            lastCpuScore = cpuScore;
            cpuScore += food.points;
            if (cpuScore !== lastCpuScore) {
                cpuScoreAnimation = 40; // Animação maior para comida especial
            }
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

    // Efeito de frio no gelo (tremor leve e mudança de cor)
    let coldShake = 0;
    let coldColorModifier = 1;
    if (currentArea === 7 && !bird.stunned) {
        const coldProgress = getColdProgress();
        // Tremor leve devido ao frio (mais intenso com mais frio)
        coldShake = Math.sin(Date.now() / 80) * (1 + coldProgress * 2);
        ctx.translate(coldShake, coldShake * 0.3);

        // Modificador de cor (fica mais azulado/pálido com frio)
        coldColorModifier = 1 - coldProgress * 0.3; // Reduz saturação
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

    // Efeito de gordura na metrópole (pássaro fica mais gordo conforme come pães)
    let fatScale = 1;
    if (isPlayer && isBonusStage && currentArea === 5 && bird.fatness) {
        // Cada pão aumenta o tamanho em 2% (máximo de 30% maior com 15 pães)
        fatScale = 1 + (bird.fatness * 0.02);
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
    ctx.scale(eatScale * stunScale * fatScale, eatScale * stunScale * fatScale);
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
    // Usar cor selecionada para o jogador, cor do objeto para CPU
    let bodyColor = isPlayer ? (selectedPlayerColor || bird.color) : bird.color;
    if (bird.stunned) {
        bodyColor = '#9b59b6'; // Roxo quando stunnado
    } else if (hasStunReady) {
        // Cor mais escura/intensa quando pronto para atacar (exceto Tuiuiu que mantém branco)
        if (bird.type !== 'tuiuiu') {
            bodyColor = darkenColor(bird.color);
        }
    } else if (currentArea === 7 && !bird.stunned) {
        // Ficar mais azulado/pálido com frio
        const coldProgress = getColdProgress();
        bodyColor = interpolateColor(bird.color, '#B0C4DE', coldProgress * 0.4); // Azul acinzentado
    } else if (currentArea === 2 && !bird.stunned) {
        // Ficar mais escuro/saturado quando molhado pela chuva do pântano
        // Escurecer e adicionar tom azulado/verde-escuro típico de molhado
        bodyColor = interpolateColor(bodyColor, '#2c3e50', 0.25); // 25% mais escuro/azulado
    }
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.size, 0, Math.PI * 2);
    ctx.fill();

    // Brilho/reflexo de água quando molhado no pântano
    if (currentArea === 2 && !bird.stunned) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        const wetGradient = ctx.createRadialGradient(
            bird.x - bird.size * 0.3, bird.y - bird.size * 0.3, 0,
            bird.x - bird.size * 0.3, bird.y - bird.size * 0.3, bird.size * 0.8
        );
        wetGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        wetGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = wetGradient;
        ctx.beginPath();
        ctx.arc(bird.x, bird.y, bird.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

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

    // Gotas de suor no deserto e ilha tropical (áreas 3 e 4)
    if ((currentArea === 3 || currentArea === 4) && !bird.stunned) {
        drawSweatDrops(bird, isPlayer);
    }

    // Gotas de água no pântano (área 2)
    if (currentArea === 2 && !bird.stunned) {
        drawWaterDrops(bird, isPlayer);
    }

    // Efeitos de frio no gelo (área 7)
    if (currentArea === 7 && !bird.stunned) {
        drawColdEffects(bird, isPlayer);

        // Cristais de gelo se formando ao redor do corpo (com muito frio)
        const coldProgress = getColdProgress();
        if (coldProgress > 0.6) {
            const crystalCount = Math.floor(coldProgress * 8); // 0 a 8 cristais
            ctx.strokeStyle = 'rgba(200, 220, 255, 0.6)';
            ctx.fillStyle = 'rgba(200, 220, 255, 0.3)';
            ctx.lineWidth = 1;

            for (let i = 0; i < crystalCount; i++) {
                const angle = (Math.PI * 2 / crystalCount) * i + Date.now() / 2000;
                const distance = bird.size * 0.8 + Math.sin(Date.now() / 500 + i) * 3;
                const crystalX = bird.x + Math.cos(angle) * distance;
                const crystalY = bird.y + Math.sin(angle) * distance;
                const crystalSize = 3 + Math.sin(Date.now() / 300 + i) * 1;

                // Desenhar pequeno cristal hexagonal
                ctx.save();
                ctx.translate(crystalX, crystalY);
                ctx.rotate(angle);
                ctx.beginPath();
                for (let j = 0; j < 6; j++) {
                    const a = (Math.PI / 3) * j;
                    const x = Math.cos(a) * crystalSize;
                    const y = Math.sin(a) * crystalSize;
                    if (j === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    ctx.shadowBlur = 0; // Reset shadow

    // Olho - diferente para cada tipo de CPU
    const isCpuWithSpecialEyes = !isPlayer && bird.type && ['owl', 'phoenix', 'bacurau', 'toucan', 'gull', 'guara', 'pelican', 'pyrrhuloxia', 'acorn-woodpecker', 'virginias-warbler', 'bearded-vulture', 'phainopepla', 'tuiuiu', 'prairie-falcon', 'ground-dove', 'rufous-backed-thrush', 'orange-thrush', 'sayaca-tanager', 'kiskadee', 'barn-owl'].includes(bird.type);

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
    } else if (isCpuWithSpecialEyes && ['bacurau', 'toucan', 'gull', 'guara', 'pelican', 'pyrrhuloxia', 'acorn-woodpecker', 'virginias-warbler', 'bearded-vulture', 'phainopepla', 'tuiuiu', 'prairie-falcon', 'ground-dove', 'rufous-backed-thrush', 'orange-thrush', 'sayaca-tanager', 'kiskadee', 'barn-owl'].includes(bird.type)) {
        // Estes tipos têm olhos desenhados em drawCpuTypeDetails, não desenhar olho padrão aqui
    } else {
        // Olho padrão
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(bird.x + 10, bird.y - 5, 10, 0, Math.PI * 2);
        ctx.fill();
        // Borda preta para Arara
        if (!isPlayer && bird.type === 'arara') {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bird.x + 10, bird.y - 5, 10, 0, Math.PI * 2);
            ctx.stroke();
        }

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
            // Arara sempre usa pupila preta
            if (!isPlayer && bird.type === 'arara') {
                ctx.fillStyle = 'black';
            } else {
                ctx.fillStyle = (!isPlayer && bird.eyeColor) ? bird.eyeColor : 'black';
            }
            ctx.beginPath();
            ctx.arc(bird.x + 12, bird.y - 5, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Bico - animação de comer ou agressivo
    ctx.fillStyle = (!isPlayer && bird.beakColor) ? bird.beakColor : '#f39c12';

    // Tuiuiu tem bico maior, mais grosso e preto
    const isTuiuiu = !isPlayer && bird.type === 'tuiuiu';
    const isToucan = !isPlayer && bird.type === 'toucan';
    const isGull = !isPlayer && bird.type === 'gull';
    const isGuara = !isPlayer && bird.type === 'guara';
    const isPelican = !isPlayer && bird.type === 'pelican';
    const isPyrrhuloxia = !isPlayer && bird.type === 'pyrrhuloxia';
    const isAcornWoodpecker = !isPlayer && bird.type === 'acorn-woodpecker';
    const isVirginiasWarbler = !isPlayer && bird.type === 'virginias-warbler';
    const isBeardedVulture = !isPlayer && bird.type === 'bearded-vulture';
    const isPhainopepla = !isPlayer && bird.type === 'phainopepla';
    const isPrairieFalcon = !isPlayer && bird.type === 'prairie-falcon';
    const isGroundDove = !isPlayer && bird.type === 'ground-dove';
    const isRufousBackedThrush = !isPlayer && bird.type === 'rufous-backed-thrush';
    const isOrangeThrush = !isPlayer && bird.type === 'orange-thrush';
    const isSayacaTanager = !isPlayer && bird.type === 'sayaca-tanager';
    const isKiskadee = !isPlayer && bird.type === 'kiskadee';
    const isCaracara = !isPlayer && bird.type === 'caracara';
    // Bico mais longo para Tuiuiu, Tucano, Gaivota, Guará, Pelicano, Acorn Woodpecker, Abutre Barbudo, Phainopepla, Falcão-das-pradarias, Rolinha, Sabiá do Campo e Sabiá Laranjeira
    let beakLength = 15;
    if (isTuiuiu) beakLength = 25;
    else if (isToucan) beakLength = 45;
    else if (isGull) beakLength = 18;
    else if (isGuara) beakLength = 35;
    else if (isPelican) beakLength = 40;
    else if (isPyrrhuloxia) beakLength = 12;
    else if (isAcornWoodpecker) beakLength = 20;
    else if (isVirginiasWarbler) beakLength = 10;
    else if (isBeardedVulture) beakLength = 22;
    else if (isPhainopepla) beakLength = 12;
    else if (isPrairieFalcon) beakLength = 18;
    else if (isGroundDove) beakLength = 12;
    else if (isRufousBackedThrush) beakLength = 20;
    else if (isOrangeThrush) beakLength = 14;
    else if (isSayacaTanager) beakLength = 16; // Bico curto e cônico para Sanhaço Cinzento
    else if (isKiskadee) beakLength = 18; // Bico robusto de comprimento médio para Bem-te-vi
    else if (isCaracara) beakLength = 20; // Bico médio para Carcará
    // Bico mais largo para Pelicano, Abutre Barbudo, Phainopepla, Falcão-das-pradarias, Rolinha, Sabiá do Campo e Sabiá Laranjeira
    let beakWidth = 5;
    if (isTuiuiu) beakWidth = 8;
    else if (isToucan) beakWidth = 10;
    else if (isGull) beakWidth = 6;
    else if (isGuara) beakWidth = 4;
    else if (isPelican) beakWidth = 12;
    else if (isPyrrhuloxia) beakWidth = 5;
    else if (isAcornWoodpecker) beakWidth = 4;
    else if (isVirginiasWarbler) beakWidth = 3;
    else if (isBeardedVulture) beakWidth = 6;
    else if (isPhainopepla) beakWidth = 4;
    else if (isPrairieFalcon) beakWidth = 5;
    else if (isGroundDove) beakWidth = 3;
    else if (isRufousBackedThrush) beakWidth = 3;
    else if (isOrangeThrush) beakWidth = 3;
    else if (isSayacaTanager) beakWidth = 4; // Bico cônico para Sanhaço Cinzento
    else if (isKiskadee) beakWidth = 5; // Bico robusto para Bem-te-vi
    else if (isCaracara) beakWidth = 5; // Bico médio para Carcará
    const beakStartX = bird.x + bird.size - 5;

    // Função auxiliar para desenhar bico do tucano com gradiente
    const drawToucanBeak = (startX, startY, length, width, offsetY = 0) => {
        if (isToucan) {
            // Criar gradiente para o bico do tucano
            const gradient = ctx.createLinearGradient(startX, startY, startX + length, startY);
            gradient.addColorStop(0, '#FFD700'); // Amarelo na base
            gradient.addColorStop(0.5, '#FF8C00'); // Laranja no meio
            gradient.addColorStop(0.8, '#FF4500'); // Vermelho-laranja
            gradient.addColorStop(1, '#000000'); // Preto na ponta
            
            ctx.fillStyle = gradient;
        } else if (isGull) {
            // Bico amarelo para gaivota
            ctx.fillStyle = '#FFD700';
        } else if (isGuara) {
            // Bico rosa-bege para Guará
            ctx.fillStyle = '#FFE4B5';
        } else if (isPelican) {
            // Bico amarelo-laranja para pelicano (será desenhado separadamente com crista)
            ctx.fillStyle = '#FF8C00';
        } else if (isPyrrhuloxia) {
            // Bico vermelho brilhante para Pyrrhuloxia
            ctx.fillStyle = '#DC143C';
        } else if (isAcornWoodpecker) {
            // Bico prata-acinzentado metálico para Acorn Woodpecker
            ctx.fillStyle = '#C0C0C0';
        } else if (isVirginiasWarbler) {
            // Bico curto, pontiagudo, cinza escuro para Virginia's Warbler
            ctx.fillStyle = '#2F2F2F';
        } else if (isBeardedVulture) {
            // Bico forte, curvado, cinza escuro para Abutre Barbudo
            ctx.fillStyle = '#4A4A4A';
        } else if (isPhainopepla) {
            // Bico curto, grosso e pontiagudo, preto para Phainopepla
            ctx.fillStyle = '#000000';
        } else if (isPrairieFalcon) {
            // Bico azul-cinza com ponta mais escura para Falcão-das-pradarias
            ctx.fillStyle = '#708090'; // Azul-cinza
        } else if (isGroundDove) {
            // Bico fino e claro (amarelo pálido) com ponta mais escura para Rolinha
            ctx.fillStyle = '#F5DEB3'; // Amarelo pálido/bege claro
        } else if (isRufousBackedThrush) {
            // Bico preto, longo e fino para Sabiá do Campo
            ctx.fillStyle = '#000000'; // Preto
        } else if (isOrangeThrush) {
            // Bico amarelo-laranja brilhante, relativamente curto e pontiagudo para Sabiá Laranjeira
            ctx.fillStyle = '#FF8C00'; // Amarelo-laranja brilhante
        } else if (isSayacaTanager) {
            // Bico azul céu para Sanhaço Cinzento
            ctx.fillStyle = '#87CEEB'; // Azul céu
        } else if (isKiskadee) {
            // Bico preto para Bem-te-vi
            ctx.fillStyle = '#000000'; // Preto
        } else if (isCaracara) {
            // Bico amarelo com ponta preta para Carcará
            ctx.fillStyle = '#FFD700'; // Amarelo (ponta preta será desenhada separadamente)
        } else {
            ctx.fillStyle = (!isPlayer && bird.beakColor) ? bird.beakColor : '#f39c12';
        }
    };

    if (bird.eatAnimation > 10 && !bird.stunned) {
        // Bico mastigando (abre e fecha)
        const chew = Math.sin(bird.eatAnimation * 0.8) * 4;

        // Bico superior
        drawToucanBeak(beakStartX, bird.y - beakWidth / 2, beakLength, beakWidth, -chew);
        ctx.beginPath();
        ctx.moveTo(beakStartX, bird.y - beakWidth / 2);
        ctx.lineTo(beakStartX + beakLength, bird.y - chew);
        ctx.lineTo(beakStartX, bird.y + beakWidth / 2);
        ctx.closePath();
        ctx.fill();

        // Bico inferior
        drawToucanBeak(beakStartX, bird.y + beakWidth / 2, beakLength * 0.8, beakWidth, chew);
        ctx.beginPath();
        ctx.moveTo(beakStartX, bird.y + beakWidth / 2);
        ctx.lineTo(beakStartX + beakLength * 0.8, bird.y + 8 + chew);
        ctx.lineTo(beakStartX, bird.y + beakWidth);
        ctx.closePath();
        ctx.fill();

        // Mancha vermelho-laranja no bico da gaivota (mandíbula inferior)
        if (isGull) {
            ctx.fillStyle = '#FF4500';
            ctx.beginPath();
            ctx.arc(beakStartX + beakLength * 0.6, bird.y + 8 + chew, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        // Ponta preta no bico do carcará
        if (isCaracara) {
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(beakStartX + beakLength * 0.9, bird.y - chew, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (hasStunReady && !bird.stunned) {
        // Bico aberto (gritando/ameaçando)
        drawToucanBeak(beakStartX, bird.y - beakWidth / 2, beakLength + 3, beakWidth);
        ctx.beginPath();
        ctx.moveTo(beakStartX, bird.y - beakWidth / 2);
        ctx.lineTo(beakStartX + beakLength + 3, bird.y);
        ctx.lineTo(beakStartX, bird.y + beakWidth / 2);
        ctx.closePath();
        ctx.fill();

        drawToucanBeak(beakStartX, bird.y + beakWidth / 2, beakLength, beakWidth);
        ctx.beginPath();
        ctx.moveTo(beakStartX, bird.y + beakWidth / 2);
        ctx.lineTo(beakStartX + beakLength, bird.y + 8);
        ctx.lineTo(beakStartX, bird.y + beakWidth);
        ctx.closePath();
        ctx.fill();

        // Mancha vermelho-laranja no bico da gaivota (mandíbula inferior)
        if (isGull) {
            ctx.fillStyle = '#FF4500';
            ctx.beginPath();
            ctx.arc(beakStartX + beakLength * 0.7, bird.y + 8, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Bico normal
        if (isGuara) {
            // Bico curvado para baixo (decurved) do Guará
            drawToucanBeak(beakStartX, bird.y - beakWidth / 4, beakLength, beakWidth);
            ctx.beginPath();
            // Bico superior curvado
            ctx.moveTo(beakStartX, bird.y - beakWidth / 4);
            ctx.quadraticCurveTo(beakStartX + beakLength * 0.5, bird.y + beakWidth, beakStartX + beakLength, bird.y + beakWidth * 1.5);
            ctx.lineTo(beakStartX, bird.y + beakWidth);
            ctx.closePath();
            ctx.fill();
            // Bico inferior curvado
            drawToucanBeak(beakStartX, bird.y + beakWidth / 2, beakLength * 0.8, beakWidth);
            ctx.beginPath();
            ctx.moveTo(beakStartX, bird.y + beakWidth / 2);
            ctx.quadraticCurveTo(beakStartX + beakLength * 0.4, bird.y + beakWidth * 1.2, beakStartX + beakLength * 0.8, bird.y + beakWidth * 1.8);
            ctx.lineTo(beakStartX, bird.y + beakWidth);
            ctx.closePath();
            ctx.fill();
            // Ponta do bico um pouco mais escura
            ctx.fillStyle = '#D2B48C';
            ctx.beginPath();
            ctx.arc(beakStartX + beakLength * 0.9, bird.y + beakWidth * 1.6, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (isPelican) {
            // Bico do pelicano - mandíbula superior com crista vermelho-laranja, mandíbula inferior amarelo-laranja
            // Mandíbula superior com crista vermelho-laranja
            ctx.fillStyle = '#FF4500';
            ctx.beginPath();
            ctx.moveTo(beakStartX, bird.y - beakWidth / 3);
            ctx.lineTo(beakStartX + beakLength, bird.y + beakWidth / 3);
            ctx.lineTo(beakStartX, bird.y + beakWidth / 2);
            ctx.closePath();
            ctx.fill();
            
            // Linha escura abaixo da crista (purplish-grey)
            ctx.strokeStyle = '#6B5B6B';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(beakStartX, bird.y + beakWidth / 4);
            ctx.lineTo(beakStartX + beakLength * 0.9, bird.y + beakWidth / 3);
            ctx.stroke();
            
            // Mandíbula inferior e bolsa gular amarelo-laranja vibrante
            ctx.fillStyle = '#FF8C00';
            ctx.beginPath();
            ctx.moveTo(beakStartX, bird.y + beakWidth / 2);
            ctx.lineTo(beakStartX + beakLength * 0.9, bird.y + beakWidth * 1.2);
            ctx.lineTo(beakStartX, bird.y + beakWidth * 1.5);
            ctx.closePath();
            ctx.fill();
            
            // Bolsa gular expandida (parte inferior mais larga)
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.ellipse(beakStartX + beakLength * 0.6, bird.y + beakWidth * 1.3, beakLength * 0.25, beakWidth * 0.4, 0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Ponta do bico com toque vermelho-laranja
            ctx.fillStyle = '#FF4500';
            ctx.beginPath();
            ctx.arc(beakStartX + beakLength * 0.95, bird.y + beakWidth * 0.8, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            drawToucanBeak(beakStartX, bird.y - beakWidth / 4, beakLength, beakWidth);
            ctx.beginPath();
            ctx.moveTo(beakStartX, bird.y - beakWidth / 4);
            ctx.lineTo(beakStartX + beakLength, bird.y + beakWidth / 2);
            ctx.lineTo(beakStartX, bird.y + beakWidth);
            ctx.closePath();
            ctx.fill();

            // Mancha vermelho-laranja no bico da gaivota (mandíbula inferior)
            if (isGull) {
                ctx.fillStyle = '#FF4500';
                ctx.beginPath();
                ctx.arc(beakStartX + beakLength * 0.7, bird.y + beakWidth / 2, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Respiração visível no gelo (vapor saindo do bico)
    if (currentArea === 7 && !bird.stunned) {
        const coldProgress = getColdProgress();
        if (coldProgress > 0.3) {
            const breathTime = Date.now() / 800;
            const breathPhase = Math.sin(breathTime) * 0.5 + 0.5; // 0 a 1

            if (breathPhase > 0.3) { // Só aparece quando está expirando
                const breathX = bird.x + bird.size + 8;
                const breathY = bird.y + 2;
                const breathSize = (breathPhase - 0.3) * 15 * coldProgress;

                // Vapor da respiração
                const breathGradient = ctx.createRadialGradient(
                    breathX, breathY, 0,
                    breathX, breathY, breathSize
                );
                breathGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
                breathGradient.addColorStop(0.5, 'rgba(200, 220, 255, 0.4)');
                breathGradient.addColorStop(1, 'rgba(150, 180, 255, 0)');

                ctx.fillStyle = breathGradient;
                ctx.beginPath();
                ctx.ellipse(breathX, breathY, breathSize * 0.6, breathSize, -0.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
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
    } else if (currentArea === 7 && !bird.stunned) {
        // Asa mais azulada com frio
        const coldProgress = getColdProgress();
        wingColor = interpolateColor(wingColor, '#B0C4DE', coldProgress * 0.3);
    } else if (currentArea === 2 && !bird.stunned) {
        // Asa mais escura quando molhada pela chuva do pântano
        // Escurecer e adicionar tom azulado/verde-escuro típico de molhado
        wingColor = interpolateColor(wingColor, '#2c3e50', 0.25); // 25% mais escuro/azulado
    }
    ctx.fillStyle = wingColor;

    // Modificar animação de asas no gelo (asas mais fechadas tentando se aquecer)
    let wingAnimationMultiplier = 1;
    let wingClosedness = 0; // 0 = normal, 1 = muito fechado
    if (currentArea === 7 && !bird.stunned) {
        const coldProgress = getColdProgress();
        wingClosedness = coldProgress * 0.4; // Asas ficam mais fechadas com frio
        wingAnimationMultiplier = 1 - coldProgress * 0.3; // Animação mais lenta
    }

    if (isMoving && !bird.stunned) {
        // Incrementar tempo da asa (mais lento no gelo)
        bird.wingTime += 0.4 * wingAnimationMultiplier;

        // Animação de bater asas (reduzida no gelo)
        const wingFlap = Math.sin(bird.wingTime) * (0.5 - wingClosedness * 0.3);
        const wingY = bird.y + 5 + Math.sin(bird.wingTime) * (8 - wingClosedness * 4);
        const wingHeight = (12 + Math.cos(bird.wingTime) * 6) * (1 - wingClosedness * 0.3);

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

    // Indicador de peso/velocidade (apenas para jogador na metrópole)
    if (isPlayer && isBonusStage && currentArea === 5 && bird.fatness && bird.fatness > 0) {
        ctx.save();
        const fatnessPercent = (bird.fatness / 15) * 100; // Máximo 15 pães
        const speedReduction = (bird.fatness * 0.03) * 100; // Redução de velocidade em %
        
        // Posição do indicador (acima do pássaro, discreto)
        const indicatorY = bird.y - bird.size - 25;
        const indicatorX = bird.x;
        
        // Fundo semi-transparente para legibilidade
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(indicatorX - 35, indicatorY - 20, 70, 18);
        
        // Barra de gordura pequena e discreta
        const barWidth = 60;
        const barHeight = 4;
        const barX = indicatorX - barWidth / 2;
        const barY = indicatorY - 8;
        
        // Fundo da barra
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Barra de gordura (vermelha quando pesado)
        const barFill = (fatnessPercent / 100) * barWidth;
        const barColor = fatnessPercent < 50 ? '#f39c12' : fatnessPercent < 80 ? '#e67e22' : '#e74c3c';
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, barFill, barHeight);
        
        // Texto pequeno e discreto
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 2;
        ctx.fillText(`⚖️${bird.fatness} 🐌-${Math.round(speedReduction)}%`, indicatorX, indicatorY - 2);
        ctx.shadowBlur = 0;
        
        ctx.restore();
    }

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

        // Garantir que a fruta sempre seja opaca (não transparente)
        ctx.globalAlpha = 1.0;

        if (!food.grounded) {
            // Comida quicando - rotaciona baseado na velocidade
            ctx.font = '28px Arial';

            // Rotação baseada no movimento
            ctx.translate(food.x, food.y);
            ctx.rotate(food.vx * 0.1);
            ctx.translate(-food.x, -food.y);

            // Sombra no chão (com opacidade reduzida apenas para a sombra)
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
            const shadowSize = Math.max(5, 20 - (groundY - food.y) / 25);
            ctx.beginPath();
            ctx.ellipse(food.x, groundY + 10, shadowSize, shadowSize / 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Restaurar opacidade total para a fruta
            ctx.globalAlpha = 1.0;
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

// Elementos decorativos do gelo
let snowflakes = []; // Flocos de neve
let iceCrystals = []; // Cristais de gelo
let icebergs = []; // Icebergs ao fundo
let iceBirds = []; // Pássaros do gelo

// Elementos decorativos da metrópole
let buildings = []; // Prédios
let decorativeCars = []; // Carros decorativos na rua (cenário)
let metropolisBirds = []; // Pássaros da metrópole (pombos, corvos)
let cityLights = []; // Luzes das janelas dos prédios
let streetLights = []; // Postes de luz
let citySmoke = []; // Fumaça/poluição

// Elementos decorativos do pântano
let swampBirds = []; // Pássaros do pântano
let lotusFlowers = []; // Flores de lótus
let reeds = []; // Juncos
let swampMist = []; // Névoa do pântano
let waterRipples = []; // Ondulações na água

// Elementos decorativos da ilha tropical
let tropicalBirds = []; // Pássaros tropicais voando
let palmTrees = []; // Palmeiras
let tropicalWaves = []; // Ondas do mar
let waterfallParticles = []; // Partículas da cachoeira
let tropicalFlowers = []; // Flores tropicais
let coconuts = []; // Coconuts nas palmeiras
let tropicalShells = []; // Conchas na praia
let tropicalStarfish = []; // Estrelas do mar
let tropicalCrabs = []; // Caranguejos na praia
let bossPalmHeights = []; // Alturas das palmeiras do boss (fixas por fase)

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
    ctx.fillRect(x - trunkWidth / 2, canvas.height - 40 - height * 0.4, trunkWidth, height * 0.4 + 40);

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
    // Limpar elementos do deserto
    cacti = [];
    mirages = [];
    heatWaves = [];
    desertBirds = [];
    // Limpar elementos do gelo
    snowflakes = [];
    iceCrystals = [];
    icebergs = [];
    iceBirds = [];
    cacti = [];
    mirages = [];
    heatWaves = [];
    desertBirds = [];
    // Limpar elementos do pântano
    swampBirds = [];
    tropicalBirds = [];
    tropicalFlowers = [];
    tropicalShells = [];
    tropicalStarfish = [];
    tropicalCrabs = [];
    lotusFlowers = [];
    reeds = [];
    swampMist = [];
    waterRipples = [];
    // Limpar elementos da metrópole
    buildings = [];
    cars = [];
    metropolisBirds = [];
    cityLights = [];

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
    } else if (currentArea === 4 && currentSubstage >= 1 && currentSubstage <= 7) {
        // Área 4: Deserto
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
    } else if (currentArea === 7 && currentSubstage >= 1 && currentSubstage <= 7) {
        // Área 7: Gelo
        // Limpar arrays do gelo
        snowflakes = [];
        iceCrystals = [];
        icebergs = [];
        iceBirds = [];

        if (currentSubstage === 1) {
            // 3-1: Gelo ameno - Alguns flocos e icebergs
            for (let i = 0; i < 15; i++) {
                snowflakes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 3 + Math.random() * 2,
                    speed: 0.5 + Math.random() * 0.5,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.01 + Math.random() * 0.02,
                    alpha: 0.3
                });
            }
            for (let i = 0; i < 2; i++) {
                icebergs.push({
                    x: 200 + i * 400,
                    y: canvas.height - 40,
                    width: 80 + Math.random() * 40,
                    height: 100 + Math.random() * 50,
                    coldProgress: 0
                });
            }
            for (let i = 0; i < 2; i++) {
                iceBirds.push({
                    x: Math.random() * canvas.width,
                    y: 100 + Math.random() * 80,
                    speed: 0.3 + Math.random() * 0.2,
                    size: 0.6 + Math.random() * 0.3,
                    wingFlap: Math.random() * Math.PI * 2,
                    color: '#87CEEB',
                    wingColor: '#B0E0E6'
                });
            }
        } else if (currentSubstage === 2) {
            // 3-2: Começando a esfriar - Mais flocos
            for (let i = 0; i < 25; i++) {
                snowflakes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 3 + Math.random() * 3,
                    speed: 0.6 + Math.random() * 0.6,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.015 + Math.random() * 0.025,
                    alpha: 0.4
                });
            }
            for (let i = 0; i < 3; i++) {
                icebergs.push({
                    x: 150 + i * 250,
                    y: canvas.height - 40,
                    width: 90 + Math.random() * 50,
                    height: 120 + Math.random() * 60,
                    coldProgress: 0.2
                });
            }
        } else if (currentSubstage === 3) {
            // 3-3: Esfriando - Flocos e primeiros cristais
            for (let i = 0; i < 35; i++) {
                snowflakes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 4 + Math.random() * 3,
                    speed: 0.7 + Math.random() * 0.7,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.02 + Math.random() * 0.03,
                    alpha: 0.5
                });
            }
            for (let i = 0; i < 5; i++) {
                iceCrystals.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 8 + Math.random() * 6,
                    speed: 0.3 + Math.random() * 0.3,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.01 + Math.random() * 0.02,
                    alpha: 0.2
                });
            }
            for (let i = 0; i < 3; i++) {
                icebergs.push({
                    x: 100 + i * 250,
                    y: canvas.height - 40,
                    width: 100 + Math.random() * 60,
                    height: 140 + Math.random() * 70,
                    coldProgress: 0.4
                });
            }
        } else if (currentSubstage === 4) {
            // 3-4: Gelado - Mais cristais e flocos
            for (let i = 0; i < 45; i++) {
                snowflakes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 4 + Math.random() * 4,
                    speed: 0.8 + Math.random() * 0.8,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.025 + Math.random() * 0.035,
                    alpha: 0.6
                });
            }
            for (let i = 0; i < 8; i++) {
                iceCrystals.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 10 + Math.random() * 8,
                    speed: 0.4 + Math.random() * 0.4,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.015 + Math.random() * 0.025,
                    alpha: 0.3
                });
            }
            for (let i = 0; i < 4; i++) {
                icebergs.push({
                    x: 80 + i * 220,
                    y: canvas.height - 40,
                    width: 110 + Math.random() * 70,
                    height: 160 + Math.random() * 80,
                    coldProgress: 0.6
                });
            }
        } else if (currentSubstage === 5) {
            // 3-5: Muito gelado - Tempestade de neve
            for (let i = 0; i < 55; i++) {
                snowflakes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 5 + Math.random() * 4,
                    speed: 1 + Math.random() * 1,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.03 + Math.random() * 0.04,
                    alpha: 0.7
                });
            }
            for (let i = 0; i < 12; i++) {
                iceCrystals.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 12 + Math.random() * 10,
                    speed: 0.5 + Math.random() * 0.5,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.02 + Math.random() * 0.03,
                    alpha: 0.4
                });
            }
            for (let i = 0; i < 4; i++) {
                icebergs.push({
                    x: 70 + i * 210,
                    y: canvas.height - 40,
                    width: 120 + Math.random() * 80,
                    height: 180 + Math.random() * 90,
                    coldProgress: 0.8
                });
            }
        } else if (currentSubstage === 6) {
            // 3-6: Extremamente gelado - Tempestade intensa
            for (let i = 0; i < 65; i++) {
                snowflakes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 5 + Math.random() * 5,
                    speed: 1.2 + Math.random() * 1.2,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.035 + Math.random() * 0.045,
                    alpha: 0.8
                });
            }
            for (let i = 0; i < 15; i++) {
                iceCrystals.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 14 + Math.random() * 12,
                    speed: 0.6 + Math.random() * 0.6,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.025 + Math.random() * 0.035,
                    alpha: 0.5
                });
            }
            for (let i = 0; i < 5; i++) {
                icebergs.push({
                    x: 60 + i * 180,
                    y: canvas.height - 40,
                    width: 130 + Math.random() * 90,
                    height: 200 + Math.random() * 100,
                    coldProgress: 1.0
                });
            }
        } else if (currentSubstage === 7) {
            // 3-7: Boss - Gelo extremo
            for (let i = 0; i < 80; i++) {
                snowflakes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 6 + Math.random() * 6,
                    speed: 1.5 + Math.random() * 1.5,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.04 + Math.random() * 0.05,
                    alpha: 0.9
                });
            }
            for (let i = 0; i < 20; i++) {
                iceCrystals.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 16 + Math.random() * 14,
                    speed: 0.8 + Math.random() * 0.8,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.03 + Math.random() * 0.04,
                    alpha: 0.8
                });
            }
            for (let i = 0; i < 6; i++) {
                icebergs.push({
                    x: 50 + i * 150,
                    y: canvas.height - 40,
                    width: 140 + Math.random() * 100,
                    height: 220 + Math.random() * 110,
                    coldProgress: 1.0
                });
            }
        }
    } else if (currentArea === 2 && currentSubstage >= 1 && currentSubstage <= 7) {
        // Área 2: Pântano
        // Limpar arrays do pântano
        swampBirds = [];
        lotusFlowers = [];
        reeds = [];
        swampMist = [];
        waterRipples = [];

        if (currentSubstage === 1) {
            // 2-1: Águas Paradas - Água calma com reflexos
            for (let i = 0; i < 8; i++) {
                waterRipples.push({
                    x: 50 + i * 100,
                    y: canvas.height - 20,
                    radius: 20 + Math.random() * 30,
                    speed: 0.1 + Math.random() * 0.1,
                    alpha: 0.3 + Math.random() * 0.2,
                    time: Math.random() * 100
                });
            }
            for (let i = 0; i < 2; i++) {
                swampBirds.push({
                    x: Math.random() * canvas.width,
                    y: 100 + Math.random() * 80,
                    speed: 0.3 + Math.random() * 0.2,
                    size: 0.6 + Math.random() * 0.3,
                    wingFlap: Math.random() * Math.PI * 2,
                    color: '#2ecc71',
                    wingColor: '#27ae60'
                });
            }
        } else if (currentSubstage === 2) {
            // 2-2: Lótus Flutuantes - Plantas aquáticas
            for (let i = 0; i < 6; i++) {
                lotusFlowers.push({
                    x: 80 + i * 120,
                    y: canvas.height - 40 - Math.random() * 10, // Ajustado para nova altura da areia
                    size: 15 + Math.random() * 10,
                    petalCount: 8,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.01 + Math.random() * 0.02,
                    color: ['#FF69B4', '#FFB6C1', '#FF1493'][Math.floor(Math.random() * 3)]
                });
            }
            for (let i = 0; i < 3; i++) {
                waterRipples.push({
                    x: 100 + i * 200,
                    y: canvas.height - 20,
                    radius: 15 + Math.random() * 20,
                    speed: 0.08 + Math.random() * 0.08,
                    alpha: 0.2 + Math.random() * 0.2,
                    time: Math.random() * 100
                });
            }
        } else if (currentSubstage === 3) {
            // 2-3: Névoa Matinal - Névoa densa
            for (let i = 0; i < 12; i++) {
                swampMist.push({
                    x: Math.random() * canvas.width,
                    y: 150 + Math.random() * 200,
                    width: 80 + Math.random() * 120,
                    height: 40 + Math.random() * 60,
                    speedX: (Math.random() - 0.5) * 0.3,
                    speedY: -0.1 - Math.random() * 0.1,
                    alpha: 0.4 + Math.random() * 0.3,
                    time: Math.random() * 100
                });
            }
            for (let i = 0; i < 4; i++) {
                lotusFlowers.push({
                    x: 100 + i * 180,
                    y: canvas.height - 30,
                    size: 12 + Math.random() * 8,
                    petalCount: 8,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.01,
                    color: '#FFB6C1'
                });
            }
        } else if (currentSubstage === 4) {
            // 2-4: Frutos do Lodo - Fase bônus (sem decorações especiais)
            for (let i = 0; i < 5; i++) {
                waterRipples.push({
                    x: 100 + i * 150,
                    y: canvas.height - 20,
                    radius: 20 + Math.random() * 25,
                    speed: 0.1 + Math.random() * 0.1,
                    alpha: 0.3,
                    time: Math.random() * 100
                });
            }
        } else if (currentSubstage === 5) {
            // 2-5: Caminho dos Juncos - Juncos altos
            for (let i = 0; i < 10; i++) {
                reeds.push({
                    x: 60 + i * 80,
                    y: canvas.height - 40,
                    height: 80 + Math.random() * 60,
                    width: 3 + Math.random() * 2,
                    sway: Math.random() * Math.PI * 2,
                    swaySpeed: 0.02 + Math.random() * 0.03,
                    color: '#2ecc71'
                });
            }
            for (let i = 0; i < 4; i++) {
                lotusFlowers.push({
                    x: 120 + i * 180,
                    y: canvas.height - 30,
                    size: 14 + Math.random() * 10,
                    petalCount: 8,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.01,
                    color: '#FF69B4'
                });
            }
        } else if (currentSubstage === 6) {
            // 2-6: Névoa Sombria - Pântano noturno com névoa
            for (let i = 0; i < 15; i++) {
                swampMist.push({
                    x: Math.random() * canvas.width,
                    y: 100 + Math.random() * 250,
                    width: 100 + Math.random() * 140,
                    height: 50 + Math.random() * 70,
                    speedX: (Math.random() - 0.5) * 0.4,
                    speedY: -0.15 - Math.random() * 0.15,
                    alpha: 0.5 + Math.random() * 0.3,
                    time: Math.random() * 100
                });
            }
            for (let i = 0; i < 8; i++) {
                reeds.push({
                    x: 50 + i * 100,
                    y: canvas.height - 40,
                    height: 90 + Math.random() * 70,
                    width: 3 + Math.random() * 2,
                    sway: Math.random() * Math.PI * 2,
                    swaySpeed: 0.03 + Math.random() * 0.04,
                    color: '#1e8449'
                });
            }
        } else if (currentSubstage === 7) {
            // 2-7: Boss - Ninho da Garça - Pântano extremo
            for (let i = 0; i < 20; i++) {
                swampMist.push({
                    x: Math.random() * canvas.width,
                    y: 80 + Math.random() * 280,
                    width: 120 + Math.random() * 160,
                    height: 60 + Math.random() * 80,
                    speedX: (Math.random() - 0.5) * 0.5,
                    speedY: -0.2 - Math.random() * 0.2,
                    alpha: 0.6 + Math.random() * 0.3,
                    time: Math.random() * 100
                });
            }
            for (let i = 0; i < 12; i++) {
                reeds.push({
                    x: 40 + i * 70,
                    y: canvas.height - 40,
                    height: 100 + Math.random() * 80,
                    width: 4 + Math.random() * 2,
                    sway: Math.random() * Math.PI * 2,
                    swaySpeed: 0.04 + Math.random() * 0.05,
                    color: '#0e6655'
                });
            }
            for (let i = 0; i < 3; i++) {
                swampBirds.push({
                    x: Math.random() * canvas.width,
                    y: 90 + Math.random() * 70,
                    speed: 0.4 + Math.random() * 0.3,
                    size: 0.7 + Math.random() * 0.4,
                    wingFlap: Math.random() * Math.PI * 2,
                    color: '#16a085',
                    wingColor: '#138d75'
                });
            }
        }
    } else if (currentArea === 5 && currentSubstage >= 1 && currentSubstage <= 7) {
        // Área 5: Metrópole
        // Limpar arrays da metrópole
        buildings = [];
        cars = [];
        metropolisBirds = [];
        cityLights = [];

        // Criar prédios na inicialização (não durante o draw)
        // Usar progresso baseado na subfase atual (não chamar getMetropolisProgress que pode não estar pronto)
        if (currentSubstage === 7) {
            // Boss: muitos prédios altos
            for (let i = 0; i < 10; i++) {
                const x = (i * 80) % (canvas.width + 100);
                const height = 150 + Math.random() * 150;
                const width = 35 + Math.random() * 25;
                const y = canvas.height - 40 - height;

                // Determinar todas as janelas (fixo)
                const windowCount = Math.floor(height / 12);
                const windowsPerRow = Math.floor(width / 7);
                const allWindows = [];
                const litWindows = [];

                for (let row = 0; row < windowCount; row++) {
                    for (let col = 0; col < windowsPerRow; col++) {
                        allWindows.push({ row, col });
                        // Determinar quais janelas estão acesas (80% das janelas)
                        if (Math.random() > 0.2) {
                            litWindows.push({ row, col });
                        }
                    }
                }

                buildings.push({
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    color: '#2a2a2a',
                    allWindows: allWindows,
                    litWindows: litWindows
                });
            }
        } else {
            // Subfases normais - calcular progresso manualmente (não usar função que pode não estar pronta)
            const progress = (currentSubstage - 1) / 6; // 5-1 = 0.0, 5-2 = 0.2, etc.
            const buildingCount = 3 + Math.floor(progress * 5); // 3 a 8 prédios

            for (let i = 0; i < buildingCount; i++) {
                const x = (i * 120) % (canvas.width + 100);
                const height = 80 + Math.random() * 120 + progress * 80;
                const width = 40 + Math.random() * 30;
                const y = canvas.height - 40 - height;

                // Cor do prédio (fixa)
                const buildingColors = ['#5a5a5a', '#6a6a6a', '#7a7a7a', '#4a4a4a'];
                const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];

                // Determinar todas as janelas (fixo)
                const windowCount = Math.floor(height / 15);
                const windowsPerRow = Math.floor(width / 8);
                const allWindows = [];
                const litWindows = [];

                for (let row = 0; row < windowCount; row++) {
                    for (let col = 0; col < windowsPerRow; col++) {
                        allWindows.push({ row, col });
                        // Determinar quais janelas estão acesas (70% das janelas)
                        if (Math.random() > 0.3) {
                            litWindows.push({ row, col });
                        }
                    }
                }

                buildings.push({
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    color: color,
                    allWindows: allWindows,
                    litWindows: litWindows
                });
            }
        }
    } else if (currentArea === 3 && currentSubstage >= 1 && currentSubstage <= 7) {
        // Área 3: Ilha Tropical
        // Limpar arrays da ilha tropical
        tropicalBirds = [];
        tropicalFlowers = [];
        tropicalShells = [];
        tropicalStarfish = [];
        tropicalCrabs = [];
        bossPalmHeights = []; // Limpar alturas das palmeiras do boss para gerar novas

        // Inicializar pássaros tropicais para todas as sub-fases
        for (let i = 0; i < 3; i++) {
            tropicalBirds.push({
                x: -50 - i * 200,
                y: 60 + Math.random() * 80,
                speed: 0.8 + Math.random() * 0.4,
                direction: 1,
                wingFlap: Math.random() * Math.PI * 2,
                color: ['#f1c40f', '#e67e22', '#e74c3c', '#f39c12'][Math.floor(Math.random() * 4)],
                wingColor: ['#f39c12', '#d35400', '#c0392b', '#e67e22'][Math.floor(Math.random() * 4)]
            });
        }

        // Inicializar flores tropicais apenas na sub-fase 3 (Praia Tropical)
        if (currentSubstage === 3) {
            for (let i = 0; i < 5; i++) {
                tropicalFlowers.push({
                    x: 100 + i * 150,
                    y: canvas.height - 40 - Math.random() * 10, // Ajustado para nova altura da areia
                    size: 8 + Math.random() * 5,
                    rotation: Math.random() * Math.PI * 2,
                    color: ['#FF69B4', '#FF1493', '#FF6347', '#FF8C00'][Math.floor(Math.random() * 4)]
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

// Calcular progresso do calor no deserto e ilha tropical (0 = fresco, 1 = muito quente)
function getHeatProgress() {
    if ((currentArea !== 3 && currentArea !== 4) || currentSubstage >= 7) return 0;
    // 3-1/4-1 = 0.0 (fresco), 3-2/4-2 = 0.2, 3-3/4-3 = 0.4, 3-4/4-4 = 0.6, 3-5/4-5 = 0.8, 3-6/4-6 = 1.0 (muito quente)
    const progress = (currentSubstage - 1) / 6;
    return Math.max(0, Math.min(1.0, progress));
}

// Calcular progresso do frio no gelo (0 = ameno, 1 = extremamente gelado)
function getColdProgress() {
    if (currentArea !== 7 || currentSubstage >= 7) return 0; // 7-7 usa drawExtremeIceBackground
    // 7-1 = 0.0 (ameno), 7-2 = 0.2, 7-3 = 0.4, 7-4 = 0.6, 7-5 = 0.8, 7-6 = 1.0 (extremamente gelado)
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

    // Detalhes da floresta: cogumelos, pedras, flores (posições fixas)
    drawForestDetails(dayNightProgress);
}

// Desenhar detalhes da floresta (cogumelos, pedras, flores) - otimizado
function drawForestDetails(dayNightProgress) {
    // Cogumelos (posições fixas)
    const mushroomPositions = [
        { x: 100, y: canvas.height - 35, size: 6 },
        { x: 350, y: canvas.height - 38, size: 5 },
        { x: 650, y: canvas.height - 32, size: 7 }
    ];

    for (let mushroom of mushroomPositions) {
        // Caule
        ctx.fillStyle = '#F5DEB3';
        ctx.fillRect(mushroom.x - 1, mushroom.y - mushroom.size, 2, mushroom.size);

        // Chapéu
        ctx.fillStyle = dayNightProgress > 0.5 ? '#8B4513' : '#FF6347';
        ctx.beginPath();
        ctx.arc(mushroom.x, mushroom.y - mushroom.size, mushroom.size * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Pontos no chapéu
        ctx.fillStyle = dayNightProgress > 0.5 ? '#654321' : '#FFD700';
        ctx.beginPath();
        ctx.arc(mushroom.x - 2, mushroom.y - mushroom.size - 1, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mushroom.x + 2, mushroom.y - mushroom.size + 1, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Pedras (posições fixas)
    const rockPositions = [
        { x: 250, y: canvas.height - 30, size: 5 },
        { x: 550, y: canvas.height - 28, size: 4 },
        { x: 800, y: canvas.height - 33, size: 6 }
    ];

    for (let rock of rockPositions) {
        ctx.fillStyle = dayNightProgress > 0.5 ? '#4a4a4a' : '#696969';
        ctx.beginPath();
        ctx.arc(rock.x, rock.y, rock.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Flores pequenas (apenas durante o dia)
    if (dayNightProgress < 0.5) {
        const flowerPositions = [
            { x: 200, y: canvas.height - 25, color: '#FF69B4' },
            { x: 450, y: canvas.height - 27, color: '#FFD700' },
            { x: 700, y: canvas.height - 24, color: '#FF6347' }
        ];

        for (let flower of flowerPositions) {
            ctx.fillStyle = flower.color;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(flower.x, flower.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
}

// Desenhar cacto
function drawCactus(x, y, size, heatProgress) {
    ctx.save();
    ctx.translate(x, y);

    // Função para gerar valores pseudo-aleatórios determinísticos baseados na posição
    function hash(seed) {
        const str = seed.toString();
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash) / 2147483647; // Normalize to 0-1
    }

    // Cacto fica mais "murcho" com o calor extremo
    const heatEffect = heatProgress * 0.1;
    const cactusSize = size * (1 - heatEffect);

    // Cor do cacto (mais amarelado com calor)
    const cactusColor = interpolateColor('#2d5016', '#6b8e23', heatProgress * 0.3);
    const cactusDark = interpolateColor('#1a3d0e', '#556b2f', heatProgress * 0.3);
    const cactusLight = interpolateColor('#3d6b1f', '#8b9a4f', heatProgress * 0.3);

    // Sombra do cacto
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, cactusSize * 0.9, cactusSize * 0.4, cactusSize * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo principal com gradiente
    const bodyGradient = ctx.createLinearGradient(0, -cactusSize * 0.8, 0, cactusSize * 0.8);
    bodyGradient.addColorStop(0, cactusLight);
    bodyGradient.addColorStop(0.5, cactusColor);
    bodyGradient.addColorStop(1, cactusDark);

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, cactusSize * 0.32, cactusSize * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Destaque de luz no corpo principal
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.ellipse(-cactusSize * 0.1, -cactusSize * 0.3, cactusSize * 0.15, cactusSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Braço esquerdo
    const leftArmGradient = ctx.createLinearGradient(-cactusSize * 0.25, -cactusSize * 0.4, -cactusSize * 0.25, cactusSize * 0.2);
    leftArmGradient.addColorStop(0, cactusLight);
    leftArmGradient.addColorStop(0.5, cactusColor);
    leftArmGradient.addColorStop(1, cactusDark);

    ctx.fillStyle = leftArmGradient;
    ctx.beginPath();
    ctx.ellipse(-cactusSize * 0.25, -cactusSize * 0.2, cactusSize * 0.16, cactusSize * 0.45, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Destaque no braço esquerdo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.ellipse(-cactusSize * 0.3, -cactusSize * 0.3, cactusSize * 0.08, cactusSize * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Braço direito
    const rightArmGradient = ctx.createLinearGradient(cactusSize * 0.25, -cactusSize * 0.35, cactusSize * 0.25, cactusSize * 0.2);
    rightArmGradient.addColorStop(0, cactusLight);
    rightArmGradient.addColorStop(0.5, cactusColor);
    rightArmGradient.addColorStop(1, cactusDark);

    ctx.fillStyle = rightArmGradient;
    ctx.beginPath();
    ctx.ellipse(cactusSize * 0.25, -cactusSize * 0.15, cactusSize * 0.16, cactusSize * 0.4, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Destaque no braço direito
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.ellipse(cactusSize * 0.3, -cactusSize * 0.25, cactusSize * 0.08, cactusSize * 0.2, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Espinhos mais detalhados e realistas
    ctx.strokeStyle = '#4a4a2a';
    ctx.fillStyle = '#4a4a2a';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 1 - heatProgress * 0.4;

    // Espinhos no corpo principal (em padrão mais natural)
    const spineRows = 8;
    for (let row = 0; row < spineRows; row++) {
        const yPos = -cactusSize * 0.7 + (row / (spineRows - 1)) * cactusSize * 1.2;
        const numSpines = row % 2 === 0 ? 3 : 2; // Alterna entre 3 e 2 espinhos por linha
        const startX = row % 2 === 0 ? -cactusSize * 0.25 : -cactusSize * 0.15;

        for (let i = 0; i < numSpines; i++) {
            const xPos = startX + (i * cactusSize * 0.2);
            // Usar hash determinístico baseado na posição do cacto e linha/coluna do espinho
            const spineSeed = x + y + row * 100 + i * 10;
            const spineLength = cactusSize * 0.08 + hash(spineSeed) * cactusSize * 0.04;
            const angle = (hash(spineSeed + 1) - 0.5) * 0.5;

            ctx.save();
            ctx.translate(xPos, yPos);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -spineLength);
            ctx.stroke();
            // Ponta do espinho
            ctx.beginPath();
            ctx.arc(0, -spineLength, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Espinhos nos braços
    for (let row = 0; row < 4; row++) {
        const yPos = -cactusSize * 0.4 + row * cactusSize * 0.15;
        // Braço esquerdo
        ctx.save();
        ctx.translate(-cactusSize * 0.25, yPos);
        ctx.rotate(-0.3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -cactusSize * 0.06);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -cactusSize * 0.06, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Braço direito
        ctx.save();
        ctx.translate(cactusSize * 0.25, yPos);
        ctx.rotate(0.3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -cactusSize * 0.06);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -cactusSize * 0.06, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.globalAlpha = 1;

    // Pequenas flores/frutos no topo (opcional, raro) - baseado em hash determinístico
    const flowerSeed = x + y + 999;
    if (hash(flowerSeed) < 0.15) {
        ctx.fillStyle = '#ff6b9d';
        ctx.beginPath();
        ctx.arc(0, -cactusSize * 0.85, cactusSize * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffb3d9';
        ctx.beginPath();
        ctx.arc(0, -cactusSize * 0.85, cactusSize * 0.03, 0, Math.PI * 2);
        ctx.fill();
    }

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

// ========== FUNÇÕES DO GELO ==========

// Desenhar floco de neve
function drawSnowflake(snowflake) {
    ctx.save();
    ctx.translate(snowflake.x, snowflake.y);
    ctx.rotate(snowflake.rotation);

    ctx.strokeStyle = `rgba(255, 255, 255, ${snowflake.alpha})`;
    ctx.lineWidth = 1;

    // Desenhar floco de neve de 6 pontas
    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((Math.PI / 3) * i);

        // Braço principal
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, snowflake.size);
        ctx.stroke();

        // Braços laterais
        ctx.beginPath();
        ctx.moveTo(0, snowflake.size * 0.3);
        ctx.lineTo(-snowflake.size * 0.3, snowflake.size * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, snowflake.size * 0.3);
        ctx.lineTo(snowflake.size * 0.3, snowflake.size * 0.5);
        ctx.stroke();

        ctx.restore();
    }

    // Centro do floco
    ctx.fillStyle = `rgba(255, 255, 255, ${snowflake.alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, snowflake.size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Desenhar cristal de gelo
function drawIceCrystal(crystal) {
    ctx.save();
    ctx.translate(crystal.x, crystal.y);
    ctx.rotate(crystal.rotation);

    const gradient = ctx.createLinearGradient(-crystal.size, -crystal.size, crystal.size, crystal.size);
    gradient.addColorStop(0, `rgba(200, 230, 255, ${crystal.alpha})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${crystal.alpha})`);
    gradient.addColorStop(1, `rgba(200, 230, 255, ${crystal.alpha})`);

    ctx.fillStyle = gradient;
    ctx.strokeStyle = `rgba(255, 255, 255, ${crystal.alpha * 0.8})`;
    ctx.lineWidth = 1;

    // Forma de cristal hexagonal
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = Math.cos(angle) * crystal.size;
        const y = Math.sin(angle) * crystal.size;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Brilho interno
    ctx.fillStyle = `rgba(255, 255, 255, ${crystal.alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(0, 0, crystal.size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Desenhar iceberg
function drawIceberg(iceberg) {
    ctx.save();
    ctx.translate(iceberg.x, iceberg.y);

    // Cor do iceberg (mais azulado com frio extremo)
    const iceColor = interpolateColor('#E0F6FF', '#B0E0E6', iceberg.coldProgress);
    const iceDark = interpolateColor('#B0D4E6', '#87CEEB', iceberg.coldProgress);

    // Corpo principal do iceberg (parte visível)
    const gradient = ctx.createLinearGradient(0, -iceberg.height, 0, 0);
    gradient.addColorStop(0, iceColor);
    gradient.addColorStop(1, iceDark);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-iceberg.width / 2, 0);
    ctx.lineTo(-iceberg.width * 0.3, -iceberg.height * 0.7);
    ctx.lineTo(0, -iceberg.height);
    ctx.lineTo(iceberg.width * 0.3, -iceberg.height * 0.7);
    ctx.lineTo(iceberg.width / 2, 0);
    ctx.closePath();
    ctx.fill();

    // Destaques de luz
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(-iceberg.width * 0.2, -iceberg.height * 0.5);
    ctx.lineTo(-iceberg.width * 0.1, -iceberg.height * 0.8);
    ctx.lineTo(0, -iceberg.height * 0.6);
    ctx.closePath();
    ctx.fill();

    // Linhas de gelo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const y = -iceberg.height * (0.3 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(-iceberg.width * 0.4, y);
        ctx.lineTo(iceberg.width * 0.4, y);
        ctx.stroke();
    }

    ctx.restore();
}

// Desenhar pássaro do gelo
function drawIceBird(bird) {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.scale(bird.size, bird.size);

    bird.wingFlap += 0.1;
    const wingOffset = Math.sin(bird.wingFlap) * 3;

    // Corpo (azul/branco)
    ctx.fillStyle = bird.color;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Asa
    ctx.fillStyle = bird.wingColor;
    ctx.beginPath();
    ctx.ellipse(-5, wingOffset, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Bico
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(12, -2);
    ctx.lineTo(8, 2);
    ctx.closePath();
    ctx.fill();

    // Olho
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(3, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ========== FUNÇÕES DO GELO ==========

// Desenhar floco de neve
function drawSnowflake(snowflake) {
    ctx.save();
    ctx.translate(snowflake.x, snowflake.y);
    ctx.rotate(snowflake.rotation);

    ctx.strokeStyle = `rgba(255, 255, 255, ${snowflake.alpha})`;
    ctx.lineWidth = 1;

    // Desenhar floco de neve de 6 pontas
    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((Math.PI / 3) * i);

        // Braço principal
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, snowflake.size);
        ctx.stroke();

        // Braços laterais
        ctx.beginPath();
        ctx.moveTo(0, snowflake.size * 0.3);
        ctx.lineTo(-snowflake.size * 0.3, snowflake.size * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, snowflake.size * 0.3);
        ctx.lineTo(snowflake.size * 0.3, snowflake.size * 0.5);
        ctx.stroke();

        ctx.restore();
    }

    // Centro do floco
    ctx.fillStyle = `rgba(255, 255, 255, ${snowflake.alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, snowflake.size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Desenhar cristal de gelo
function drawIceCrystal(crystal) {
    ctx.save();
    ctx.translate(crystal.x, crystal.y);
    ctx.rotate(crystal.rotation);

    const gradient = ctx.createLinearGradient(-crystal.size, -crystal.size, crystal.size, crystal.size);
    gradient.addColorStop(0, `rgba(200, 230, 255, ${crystal.alpha})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${crystal.alpha})`);
    gradient.addColorStop(1, `rgba(200, 230, 255, ${crystal.alpha})`);

    ctx.fillStyle = gradient;
    ctx.strokeStyle = `rgba(255, 255, 255, ${crystal.alpha * 0.8})`;
    ctx.lineWidth = 1;

    // Forma de cristal hexagonal
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = Math.cos(angle) * crystal.size;
        const y = Math.sin(angle) * crystal.size;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Brilho interno
    ctx.fillStyle = `rgba(255, 255, 255, ${crystal.alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(0, 0, crystal.size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Desenhar iceberg
function drawIceberg(iceberg) {
    ctx.save();
    ctx.translate(iceberg.x, iceberg.y);

    // Cor do iceberg (mais azulado com frio extremo)
    const iceColor = interpolateColor('#E0F6FF', '#B0E0E6', iceberg.coldProgress);
    const iceDark = interpolateColor('#B0D4E6', '#87CEEB', iceberg.coldProgress);

    // Corpo principal do iceberg (parte visível)
    const gradient = ctx.createLinearGradient(0, -iceberg.height, 0, 0);
    gradient.addColorStop(0, iceColor);
    gradient.addColorStop(1, iceDark);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-iceberg.width / 2, 0);
    ctx.lineTo(-iceberg.width * 0.3, -iceberg.height * 0.7);
    ctx.lineTo(0, -iceberg.height);
    ctx.lineTo(iceberg.width * 0.3, -iceberg.height * 0.7);
    ctx.lineTo(iceberg.width / 2, 0);
    ctx.closePath();
    ctx.fill();

    // Destaques de luz
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(-iceberg.width * 0.2, -iceberg.height * 0.5);
    ctx.lineTo(-iceberg.width * 0.1, -iceberg.height * 0.8);
    ctx.lineTo(0, -iceberg.height * 0.6);
    ctx.closePath();
    ctx.fill();

    // Linhas de gelo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const y = -iceberg.height * (0.3 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(-iceberg.width * 0.4, y);
        ctx.lineTo(iceberg.width * 0.4, y);
        ctx.stroke();
    }

    ctx.restore();
}

// Desenhar pássaro do gelo
function drawIceBird(bird) {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.scale(bird.size, bird.size);

    bird.wingFlap += 0.1;
    const wingOffset = Math.sin(bird.wingFlap) * 3;

    // Corpo (azul/branco)
    ctx.fillStyle = bird.color;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Asa
    ctx.fillStyle = bird.wingColor;
    ctx.beginPath();
    ctx.ellipse(-5, wingOffset, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Bico
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(12, -2);
    ctx.lineTo(8, 2);
    ctx.closePath();
    ctx.fill();

    // Olho
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(3, -2, 1.5, 0, Math.PI * 2);
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

// Desenhar cenário do gelo com progressão de frio
function drawIceBackground() {
    const coldProgress = getColdProgress();

    // Interpolar cores do céu entre ameno e gelado
    const skyTopMild = '#B0E0E6'; // Azul claro (ameno)
    const skyTopCold = '#4682B4'; // Azul acinzentado (gelado)
    const skyBottomMild = '#E0F6FF'; // Azul muito claro
    const skyBottomCold = '#708090'; // Cinza azulado

    const skyTop = interpolateColor(skyTopMild, skyTopCold, coldProgress);
    const skyBottom = interpolateColor(skyBottomMild, skyBottomCold, coldProgress);

    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - 40);
    skyGradient.addColorStop(0, skyTop);
    skyGradient.addColorStop(1, skyBottom);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Nuvens geladas (mais visíveis com frio)
    for (let cloud of clouds) {
        cloud.x += cloud.speed * 0.5;
        if (cloud.x > canvas.width + 100) {
            cloud.x = -100;
        }
        ctx.globalAlpha = 0.6 + coldProgress * 0.4;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        drawCloud(cloud.x, cloud.y, cloud.size);
        ctx.globalAlpha = 1;
    }

    // Flocos de neve (mais intensos com frio)
    if (coldProgress > 0.2) {
        for (let flake of snowflakes) {
            flake.y += flake.speed;
            flake.x += Math.sin(flake.y / 50) * 0.5;
            flake.rotation += flake.rotationSpeed;
            flake.alpha = (coldProgress - 0.2) * 0.8;

            if (flake.y > canvas.height) {
                flake.y = -10;
                flake.x = Math.random() * canvas.width;
            }
            drawSnowflake(flake);
        }
    }

    // Cristais de gelo (aparecem com mais frio)
    if (coldProgress > 0.4) {
        for (let crystal of iceCrystals) {
            crystal.y += crystal.speed;
            crystal.rotation += crystal.rotationSpeed;
            crystal.alpha = (coldProgress - 0.4) * 0.6;

            if (crystal.y > canvas.height) {
                crystal.y = -20;
                crystal.x = Math.random() * canvas.width;
            }
            drawIceCrystal(crystal);
        }
    }

    // Atualizar elementos decorativos
    updateIceDecorations();

    // Neve no chão (mais espessa com frio)
    const snowColor = interpolateColor('#F0F8FF', '#E6E6FA', coldProgress);
    ctx.fillStyle = snowColor;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    // Camadas de neve (mais profundas com frio)
    const snowDepth = coldProgress * 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 3; i++) {
        const y = canvas.height - 40 + i * 5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < canvas.width; x += 20) {
            const offset = Math.sin(x / 30 + Date.now() / 1000) * 3;
            ctx.lineTo(x, y + offset);
        }
        ctx.lineTo(canvas.width, y);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
    }

    // Desenhar icebergs ao fundo
    for (let iceberg of icebergs) {
        iceberg.coldProgress = coldProgress;
        drawIceberg(iceberg);
    }

    // Desenhar pássaros do gelo
    for (let bird of iceBirds) {
        drawIceBird(bird);
    }

    // Detalhes do gelo: cristais, pedras cobertas de neve, estalactites
    drawIceDetails(coldProgress);
}

// Desenhar detalhes do gelo (cristais, pedras, estalactites) - otimizado
function drawIceDetails(coldProgress) {
    // Cristais de gelo no chão (posições fixas)
    const crystalPositions = [
        { x: 120, y: canvas.height - 35, size: 4 },
        { x: 380, y: canvas.height - 32, size: 5 },
        { x: 650, y: canvas.height - 38, size: 3 }
    ];

    for (let crystal of crystalPositions) {
        ctx.strokeStyle = '#B0E0E6';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;

        // Desenhar cristal (estrela simples)
        ctx.beginPath();
        ctx.moveTo(crystal.x, crystal.y - crystal.size);
        ctx.lineTo(crystal.x - crystal.size * 0.5, crystal.y);
        ctx.lineTo(crystal.x, crystal.y + crystal.size * 0.5);
        ctx.lineTo(crystal.x + crystal.size * 0.5, crystal.y);
        ctx.closePath();
        ctx.stroke();

        ctx.globalAlpha = 1;
    }

    // Pedras cobertas de neve (posições fixas)
    const rockPositions = [
        { x: 250, y: canvas.height - 30, size: 6 },
        { x: 550, y: canvas.height - 28, size: 5 },
        { x: 800, y: canvas.height - 33, size: 7 }
    ];

    for (let rock of rockPositions) {
        // Pedra
        ctx.fillStyle = '#708090';
        ctx.beginPath();
        ctx.arc(rock.x, rock.y, rock.size, 0, Math.PI * 2);
        ctx.fill();

        // Neve no topo
        ctx.fillStyle = '#F0F8FF';
        ctx.beginPath();
        ctx.arc(rock.x, rock.y - rock.size * 0.5, rock.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Estalactites pequenas (apenas com muito frio)
    if (coldProgress > 0.6) {
        const iciclePositions = [180, 450, 720];
        ctx.fillStyle = '#E0F6FF';
        ctx.globalAlpha = 0.9;
        for (let x of iciclePositions) {
            ctx.beginPath();
            ctx.moveTo(x, canvas.height - 40);
            ctx.lineTo(x - 3, canvas.height - 50);
            ctx.lineTo(x + 3, canvas.height - 50);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

// Desenhar cenário extremo do gelo (boss)
function drawExtremeIceBackground() {
    // Céu extremamente gelado
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - 40);
    skyGradient.addColorStop(0, '#2F4F4F');
    skyGradient.addColorStop(0.5, '#4682B4');
    skyGradient.addColorStop(1, '#708090');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Tempestade de neve intensa
    for (let flake of snowflakes) {
        flake.y += flake.speed * 2;
        flake.x += Math.sin(flake.y / 30) * 1.5;
        flake.rotation += flake.rotationSpeed * 2;
        flake.alpha = 0.9;

        if (flake.y > canvas.height) {
            flake.y = -10;
            flake.x = Math.random() * canvas.width;
        }
        drawSnowflake(flake);
    }

    // Cristais de gelo intensos
    for (let crystal of iceCrystals) {
        crystal.y += crystal.speed * 1.5;
        crystal.rotation += crystal.rotationSpeed * 1.5;
        crystal.alpha = 0.8;

        if (crystal.y > canvas.height) {
            crystal.y = -20;
            crystal.x = Math.random() * canvas.width;
        }
        drawIceCrystal(crystal);
    }

    // Neve no chão muito espessa
    ctx.fillStyle = '#E6E6FA';
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

    // Camadas de neve profundas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (let i = 0; i < 5; i++) {
        const y = canvas.height - 60 + i * 8;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < canvas.width; x += 15) {
            const offset = Math.sin(x / 25 + Date.now() / 800) * 5;
            ctx.lineTo(x, y + offset);
        }
        ctx.lineTo(canvas.width, y);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
    }

    // Icebergs grandes
    for (let iceberg of icebergs) {
        iceberg.coldProgress = 1.0;
        drawIceberg(iceberg);
    }

    // Pássaros do gelo
    for (let bird of iceBirds) {
        drawIceBird(bird);
    }

    // Detalhes do gelo extremo
    drawIceDetails(1.0);
}

// Atualizar elementos decorativos do gelo
function updateIceDecorations() {
    // Atualizar pássaros do gelo
    for (let bird of iceBirds) {
        bird.x += bird.speed;
        if (bird.x > canvas.width + 50) {
            bird.x = -50;
            bird.y = 80 + Math.random() * 100;
        }
    }
}

// ========== CENÁRIOS DO PÂNTANO ==========

// Desenhar cenário do pântano
function drawSwampBackground() {
    const mistProgress = getMistProgress(); // Progresso da névoa baseado na sub-fase

    // Céu do pântano (sempre nublado - verde-azulado)
    const skyTop = interpolateColor('#2C5F5F', '#1E4A4A', mistProgress); // Verde-azulado escuro
    const skyBottom = interpolateColor('#3D7A7A', '#2E5F5F', mistProgress); // Verde-azulado médio

    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - 40);
    skyGradient.addColorStop(0, skyTop);
    skyGradient.addColorStop(1, skyBottom);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Muitas nuvens escuras (céu sempre nublado)
    for (let cloud of clouds) {
        cloud.x += cloud.speed * 0.3;
        if (cloud.x > canvas.width + 100) {
            cloud.x = -100;
        }
        // Nuvens mais escuras e opacas (sempre visíveis)
        ctx.globalAlpha = 0.85 - mistProgress * 0.15; // Sempre bem visíveis
        ctx.fillStyle = 'rgba(40, 80, 90, 0.9)'; // Verde-azulado escuro
        drawCloud(cloud.x, cloud.y, cloud.size);
        ctx.globalAlpha = 1;
    }

    // Nuvens extras para céu mais nublado
    for (let i = 0; i < 3; i++) {
        const extraCloudX = (i * 300 + Date.now() / 50) % (canvas.width + 200) - 100;
        const extraCloudY = 40 + i * 30;
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = 'rgba(35, 70, 80, 0.85)';
        drawCloud(extraCloudX, extraCloudY, 0.9 + i * 0.1);
        ctx.globalAlpha = 1;
    }

    // Atualizar elementos decorativos
    updateSwampDecorations();

    // Desenhar névoa no background (apenas nas bordas, não na área central onde frutas estarão)
    for (let mist of swampMist) {
        // Verificar se a névoa está completamente FORA da área central (onde frutas estarão)
        const fruitAreaTop = 100;
        const fruitAreaBottom = canvas.height - 100;
        const mistTop = mist.y - mist.height / 2;
        const mistBottom = mist.y + mist.height / 2;

        // Só desenhar névoa se ela estiver completamente acima ou completamente abaixo da área das frutas
        const mistIsAboveFruitArea = mistBottom < fruitAreaTop;
        const mistIsBelowFruitArea = mistTop > fruitAreaBottom;

        if (mistIsAboveFruitArea || mistIsBelowFruitArea) {
            drawSwampMist(mist);
        }
    }

    // Mata fechada - muitas árvores em camadas (uma à frente da outra)
    // Camada 1: Árvores mais ao fundo (maiores, mais escuras, mais transparentes)
    ctx.globalAlpha = 0.4 - mistProgress * 0.2;
    drawSwampTree(-30, 140, 12, mistProgress);
    drawSwampTree(80, 130, 11, mistProgress);
    drawSwampTree(200, 150, 13, mistProgress);
    drawSwampTree(320, 135, 12, mistProgress);
    drawSwampTree(450, 145, 11, mistProgress);
    drawSwampTree(580, 140, 13, mistProgress);
    drawSwampTree(700, 135, 12, mistProgress);
    drawSwampTree(830, 150, 11, mistProgress);

    // Camada 2: Árvores do meio (tamanho médio-grande)
    ctx.globalAlpha = 0.6 - mistProgress * 0.2;
    drawSwampTree(20, 180, 15, mistProgress);
    drawSwampTree(150, 170, 16, mistProgress);
    drawSwampTree(280, 185, 14, mistProgress);
    drawSwampTree(410, 175, 17, mistProgress);
    drawSwampTree(540, 180, 15, mistProgress);
    drawSwampTree(670, 170, 16, mistProgress);
    drawSwampTree(800, 185, 14, mistProgress);

    // Camada 3: Árvores da frente (muito maiores, mais visíveis)
    ctx.globalAlpha = 0.8 - mistProgress * 0.3;
    drawSwampTree(-10, 220, 20, mistProgress);
    drawSwampTree(120, 215, 19, mistProgress);
    drawSwampTree(250, 230, 21, mistProgress);
    drawSwampTree(380, 220, 20, mistProgress);
    drawSwampTree(510, 225, 19, mistProgress);
    drawSwampTree(640, 215, 21, mistProgress);
    drawSwampTree(770, 230, 20, mistProgress);

    ctx.globalAlpha = 1;

    // Desenhar juncos (antes da água)
    for (let reed of reeds) {
        drawReed(reed);
    }

    // Desenhar flores de lótus
    for (let lotus of lotusFlowers) {
        drawLotusFlower(lotus);
    }

    // Desenhar pássaros do pântano
    for (let bird of swampBirds) {
        drawSwampBird(bird);
    }

    // Água do pântano - RESTAURADA com garantia de que não afeta as frutas
    ctx.save(); // Salvar estado do canvas antes de desenhar água

    // Base da água (verde muito mais saturado e brilhante)
    const waterTop = '#2ecc71'; // Verde muito mais claro e vibrante
    const waterMiddle = '#27ae60'; // Verde médio brilhante
    const waterBottom = '#1e8449'; // Verde escuro mas ainda visível
    const waterGradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height);
    waterGradient.addColorStop(0, waterTop);
    waterGradient.addColorStop(0.3, waterMiddle);
    waterGradient.addColorStop(0.7, '#229954');
    waterGradient.addColorStop(1, waterBottom);
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    // Brilho intenso na superfície da água (efeito de luz)
    const glowGradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height - 20);
    glowGradient.addColorStop(0, 'rgba(46, 204, 113, 0.4)');
    glowGradient.addColorStop(1, 'rgba(46, 204, 113, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 20);

    // Linha de borda superior da água (destaque BRILHANTE)
    ctx.strokeStyle = '#58d68d'; // Verde muito claro e brilhante
    ctx.lineWidth = 3;
    ctx.shadowColor = '#2ecc71';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 40);
    ctx.lineTo(canvas.width, canvas.height - 40);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Segunda linha de brilho (mais sutil)
    ctx.strokeStyle = '#7dcea0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 39);
    ctx.lineTo(canvas.width, canvas.height - 39);
    ctx.stroke();

    // Reflexos de luz INTENSOS na superfície da água (mais visíveis)
    const time = Date.now() / 1000;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; // Mais opaco
    ctx.shadowColor = 'rgba(46, 204, 113, 0.6)';
    ctx.shadowBlur = 10;
    for (let i = 0; i < 6; i++) {
        const x = (i * 180 + time * 30) % (canvas.width + 100) - 50;
        const y = canvas.height - 38;
        const width = 100 + Math.sin(time + i) * 30;
        const height = 10;
        ctx.beginPath();
        ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Ondulações animadas na superfície (mais visíveis e brilhantes)
    ctx.strokeStyle = 'rgba(88, 214, 141, 0.7)'; // Verde mais claro e brilhante
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(46, 204, 113, 0.4)';
    ctx.shadowBlur = 5;
    for (let i = 0; i < canvas.width; i += 25) {
        const waveOffset = Math.sin(time * 2 + i / 25) * 4;
        ctx.beginPath();
        ctx.moveTo(i, canvas.height - 37 + waveOffset);
        ctx.quadraticCurveTo(
            i + 12.5,
            canvas.height - 40 + waveOffset + Math.sin(time * 3 + i / 18) * 3,
            i + 25,
            canvas.height - 37 + waveOffset
        );
        ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Desenhar ondulações na água (ripples)
    for (let ripple of waterRipples) {
        drawWaterRipple(ripple);
    }

    // Partículas flutuantes na água (bolhas/reflexos mais visíveis)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // Mais opaco
    ctx.shadowColor = 'rgba(46, 204, 113, 0.5)';
    ctx.shadowBlur = 6;
    for (let i = 0; i < 10; i++) {
        const bubbleX = (i * 100 + time * 20) % canvas.width;
        const bubbleY = canvas.height - 28 + Math.sin(time * 1.5 + i) * 4;
        const bubbleSize = 3 + Math.sin(time * 2 + i) * 1.5;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Sombra/reflexo das árvores na água (mais visível)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let i = 0; i < 6; i++) {
        const treeX = 40 + i * 150;
        const reflectionY = canvas.height - 18;
        ctx.beginPath();
        ctx.ellipse(treeX, reflectionY, 35, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Efeito de "brilho" pulsante na água (destaque extra)
    const pulse = 0.5 + Math.sin(time * 1.5) * 0.3;
    ctx.fillStyle = `rgba(46, 204, 113, ${0.1 * pulse})`;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 15);

    // RESTAURAR estado do canvas e garantir opacidade total para não afetar as frutas
    ctx.restore();
    ctx.globalAlpha = 1.0; // Garantir opacidade total após desenhar água

    // Detalhes do pântano: plantas aquáticas, troncos, pedras molhadas
    drawSwampDetails(mistProgress);
}

// Desenhar detalhes do pântano (plantas, troncos, pedras) - otimizado
function drawSwampDetails(mistProgress) {
    // Troncos de árvores caídas (posições fixas)
    const logPositions = [
        { x: 150, y: canvas.height - 30, length: 40, angle: -0.2 },
        { x: 500, y: canvas.height - 28, length: 35, angle: 0.15 },
        { x: 750, y: canvas.height - 32, length: 45, angle: -0.1 }
    ];

    for (let log of logPositions) {
        ctx.save();
        ctx.translate(log.x, log.y);
        ctx.rotate(log.angle);

        // Tronco
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(-log.length / 2, -3, log.length, 6);

        // Textura do tronco (linhas)
        ctx.strokeStyle = '#4E342E';
        ctx.lineWidth = 1;
        for (let i = -log.length / 2; i < log.length / 2; i += 5) {
            ctx.beginPath();
            ctx.moveTo(i, -3);
            ctx.lineTo(i, 3);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Plantas aquáticas (posições fixas)
    const plantPositions = [
        { x: 300, y: canvas.height - 25, height: 12 },
        { x: 600, y: canvas.height - 27, height: 10 },
        { x: 850, y: canvas.height - 24, height: 14 }
    ];

    for (let plant of plantPositions) {
        // Caule
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plant.x, canvas.height - 40);
        ctx.lineTo(plant.x, plant.y);
        ctx.stroke();

        // Folhas
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.ellipse(plant.x - 3, plant.y - 2, 4, 2, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(plant.x + 3, plant.y - 3, 4, 2, 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Pedras molhadas (posições fixas)
    const rockPositions = [
        { x: 200, y: canvas.height - 33, size: 5 },
        { x: 450, y: canvas.height - 31, size: 4 },
        { x: 700, y: canvas.height - 35, size: 6 }
    ];

    for (let rock of rockPositions) {
        // Pedra
        ctx.fillStyle = '#616161';
        ctx.beginPath();
        ctx.arc(rock.x, rock.y, rock.size, 0, Math.PI * 2);
        ctx.fill();

        // Brilho molhado
        ctx.fillStyle = 'rgba(176, 196, 222, 0.4)';
        ctx.beginPath();
        ctx.arc(rock.x - 1, rock.y - 1, rock.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Desenhar cenário extremo do pântano (boss)
function drawExtremeSwampBackground() {
    // Céu extremamente nublado e escuro (verde-azulado)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - 40);
    skyGradient.addColorStop(0, '#1E4A4A');
    skyGradient.addColorStop(0.5, '#2C5F5F');
    skyGradient.addColorStop(1, '#153535');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Muitas nuvens escuras (céu muito nublado)
    for (let cloud of clouds) {
        cloud.x += cloud.speed * 0.25;
        if (cloud.x > canvas.width + 100) {
            cloud.x = -100;
        }
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(30, 60, 70, 0.95)';
        drawCloud(cloud.x, cloud.y, cloud.size);
        ctx.globalAlpha = 1;
    }

    // Nuvens extras muito escuras
    for (let i = 0; i < 4; i++) {
        const extraCloudX = (i * 250 + Date.now() / 40) % (canvas.width + 200) - 100;
        const extraCloudY = 30 + i * 25;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'rgba(25, 55, 65, 0.9)';
        drawCloud(extraCloudX, extraCloudY, 1.0 + i * 0.15);
        ctx.globalAlpha = 1;
    }

    // Atualizar elementos decorativos
    updateSwampDecorations();

    // Desenhar névoa no background (apenas nas bordas, não na área central onde frutas estarão)
    for (let mist of swampMist) {
        // Verificar se a névoa está completamente FORA da área central (onde frutas estarão)
        const fruitAreaTop = 100;
        const fruitAreaBottom = canvas.height - 100;
        const mistTop = mist.y - mist.height / 2;
        const mistBottom = mist.y + mist.height / 2;

        // Só desenhar névoa se ela estiver completamente acima ou completamente abaixo da área das frutas
        const mistIsAboveFruitArea = mistBottom < fruitAreaTop;
        const mistIsBelowFruitArea = mistTop > fruitAreaBottom;

        if (mistIsAboveFruitArea || mistIsBelowFruitArea) {
            drawSwampMist(mist);
        }
    }

    // Mata extremamente fechada e escura - muitas árvores em camadas
    // Camada 1: Árvores mais ao fundo (muito escuras, maiores)
    ctx.globalAlpha = 0.3;
    drawSwampTree(-30, 140, 12, 1.0);
    drawSwampTree(80, 130, 11, 1.0);
    drawSwampTree(200, 150, 13, 1.0);
    drawSwampTree(320, 135, 12, 1.0);
    drawSwampTree(450, 145, 11, 1.0);
    drawSwampTree(580, 140, 13, 1.0);
    drawSwampTree(700, 135, 12, 1.0);
    drawSwampTree(830, 150, 11, 1.0);

    // Camada 2: Árvores do meio (escuras, maiores)
    ctx.globalAlpha = 0.5;
    drawSwampTree(20, 180, 15, 1.0);
    drawSwampTree(150, 170, 16, 1.0);
    drawSwampTree(280, 185, 14, 1.0);
    drawSwampTree(410, 175, 17, 1.0);
    drawSwampTree(540, 180, 15, 1.0);
    drawSwampTree(670, 170, 16, 1.0);
    drawSwampTree(800, 185, 14, 1.0);

    // Camada 3: Árvores da frente (mais visíveis mas ainda escuras, muito maiores)
    ctx.globalAlpha = 0.7;
    drawSwampTree(-10, 220, 20, 1.0);
    drawSwampTree(120, 215, 19, 1.0);
    drawSwampTree(250, 230, 21, 1.0);
    drawSwampTree(380, 220, 20, 1.0);
    drawSwampTree(510, 225, 19, 1.0);
    drawSwampTree(640, 215, 21, 1.0);
    drawSwampTree(770, 230, 20, 1.0);

    // Camada 4: Árvores muito próximas (silhuetas escuras, gigantes)
    ctx.globalAlpha = 0.9;
    drawSwampTree(50, 240, 24, 1.0);
    drawSwampTree(300, 245, 25, 1.0);
    drawSwampTree(550, 240, 24, 1.0);
    drawSwampTree(750, 245, 25, 1.0);

    ctx.globalAlpha = 1;

    // Juncos altos e escuros
    for (let reed of reeds) {
        reed.color = '#0e6655';
        drawReed(reed);
    }

    // Pássaros do pântano
    for (let bird of swampBirds) {
        drawSwampBird(bird);
    }

    // Água escura mas AINDA DESTACADA (boss) - RESTAURADA com garantia de que não afeta as frutas
    ctx.save(); // Salvar estado do canvas antes de desenhar água

    const waterGradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height);
    waterGradient.addColorStop(0, '#27ae60'); // Mais claro no topo
    waterGradient.addColorStop(0.3, '#1e8449');
    waterGradient.addColorStop(0.6, '#0e6655');
    waterGradient.addColorStop(1, '#0b5345');
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    // Brilho na superfície (boss)
    const glowGradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height - 20);
    glowGradient.addColorStop(0, 'rgba(39, 174, 96, 0.3)');
    glowGradient.addColorStop(1, 'rgba(39, 174, 96, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 20);

    // Linha de borda superior da água (destaque BRILHANTE no boss)
    ctx.strokeStyle = '#58d68d';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#27ae60';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 40);
    ctx.lineTo(canvas.width, canvas.height - 40);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Segunda linha de brilho
    ctx.strokeStyle = '#7dcea0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 39);
    ctx.lineTo(canvas.width, canvas.height - 39);
    ctx.stroke();

    // Reflexos de luz (mais visíveis no boss)
    const time = Date.now() / 1000;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.shadowColor = 'rgba(39, 174, 96, 0.5)';
    ctx.shadowBlur = 12;
    for (let i = 0; i < 5; i++) {
        const x = (i * 220 + time * 25) % (canvas.width + 100) - 50;
        const y = canvas.height - 38;
        const width = 120 + Math.sin(time + i) * 40;
        const height = 12;
        ctx.beginPath();
        ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Ondulações mais intensas e brilhantes (boss)
    ctx.strokeStyle = 'rgba(88, 214, 141, 0.8)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(39, 174, 96, 0.5)';
    ctx.shadowBlur = 6;
    for (let i = 0; i < canvas.width; i += 22) {
        const waveOffset = Math.sin(time * 2.5 + i / 22) * 5;
        ctx.beginPath();
        ctx.moveTo(i, canvas.height - 36 + waveOffset);
        ctx.quadraticCurveTo(
            i + 11,
            canvas.height - 40 + waveOffset + Math.sin(time * 3.5 + i / 14) * 4,
            i + 22,
            canvas.height - 36 + waveOffset
        );
        ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Ondulações (ripples) mais intensas
    for (let ripple of waterRipples) {
        ripple.alpha = 0.6;
        drawWaterRipple(ripple);
    }

    // Partículas flutuantes (mais visíveis no boss)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowColor = 'rgba(39, 174, 96, 0.6)';
    ctx.shadowBlur = 8;
    for (let i = 0; i < 12; i++) {
        const bubbleX = (i * 90 + time * 25) % canvas.width;
        const bubbleY = canvas.height - 26 + Math.sin(time * 2 + i) * 5;
        const bubbleSize = 3.5 + Math.sin(time * 2.5 + i) * 2;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Efeito de brilho pulsante (boss)
    const pulse = 0.4 + Math.sin(time * 1.8) * 0.3;
    ctx.fillStyle = `rgba(39, 174, 96, ${0.12 * pulse})`;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 18);

    // RESTAURAR estado do canvas e garantir opacidade total para não afetar as frutas
    ctx.restore();
    ctx.globalAlpha = 1.0; // Garantir opacidade total após desenhar água

    // Detalhes do pântano extremo
    drawSwampDetails(1.0);
}

// Atualizar elementos decorativos do pântano
function updateSwampDecorations() {
    // Atualizar pássaros do pântano
    for (let bird of swampBirds) {
        bird.x += bird.speed;
        bird.wingFlap += 0.1;
        if (bird.x > canvas.width + 50) {
            bird.x = -50;
            bird.y = 80 + Math.random() * 100;
        }
    }

    // Atualizar flores de lótus
    for (let lotus of lotusFlowers) {
        lotus.rotation += lotus.rotationSpeed;
        lotus.y += Math.sin(lotus.rotation) * 0.1;
    }

    // Atualizar juncos (balanço)
    for (let reed of reeds) {
        reed.sway += reed.swaySpeed;
    }

    // Atualizar névoa
    for (let mist of swampMist) {
        mist.x += mist.speedX;
        mist.y += mist.speedY;
        mist.time += 0.5;
        if (mist.x < -200) mist.x = canvas.width + 200;
        if (mist.x > canvas.width + 200) mist.x = -200;
        if (mist.y < -100) mist.y = canvas.height + 100;
        if (mist.y > canvas.height + 100) mist.y = -100;
    }

    // Atualizar ondulações
    for (let ripple of waterRipples) {
        ripple.radius += ripple.speed;
        ripple.time += 0.5;
        if (ripple.radius > 100) {
            ripple.radius = 10;
            ripple.x = 50 + Math.random() * (canvas.width - 100);
        }
    }
}

// ========== FUNÇÕES DA ILHA TROPICAL ==========

// Desenhar palmeira
function drawPalmTree(x, height, trunkWidth, sway = 0) {
    ctx.save();
    ctx.translate(x, canvas.height - 40);

    // Tronco (curvado com balanço)
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = trunkWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // Tronco levemente curvado
    const curveX = Math.sin(sway) * 5;
    const curveY = -height * 0.3;
    ctx.quadraticCurveTo(curveX, curveY * 0.5, curveX, curveY);
    ctx.stroke();

    // Folhas (palmeira)
    const leafCount = 8;
    for (let i = 0; i < leafCount; i++) {
        const angle = (Math.PI * 2 / leafCount) * i + sway * 0.3;
        const leafLength = height * 0.4;
        const leafWidth = 8;

        ctx.save();
        ctx.translate(curveX, curveY);
        ctx.rotate(angle);

        // Folha
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(leafLength, -leafWidth);
        ctx.lineTo(leafLength * 0.9, 0);
        ctx.lineTo(leafLength, leafWidth);
        ctx.closePath();
        ctx.fill();

        // Linha central da folha
        ctx.strokeStyle = '#1a5a1a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(leafLength * 0.95, 0);
        ctx.stroke();

        ctx.restore();
    }

    // Coco (se houver)
    if (Math.random() > 0.5) {
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(curveX, curveY - 5, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Desenhar palmeira do boss (sem movimento, tronco mais alto e grosso, folhas em formato de leque)
function drawBossPalmTree(x, height, trunkWidth) {
    ctx.save();
    ctx.translate(x, canvas.height - 40);

    // Tronco completamente reto e vertical
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = trunkWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // Tronco reto vertical (sem curva, sem inclinação)
    const topY = -height * 0.3;
    ctx.lineTo(0, topY);
    ctx.stroke();

    // Posição do topo do tronco (onde as folhas saem)
    const leafStartX = 0;
    const leafStartY = topY;

    // Folhas em formato de leque - padrão específico:
    // 1 folha central para cima, 3 para esquerda, 3 para direita
    const leafLength = height * 0.4;
    const leafWidth = 6;

    // Folha central (para cima)
    ctx.save();
    ctx.translate(leafStartX, leafStartY);
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-leafWidth, -leafLength);
    ctx.lineTo(0, -leafLength * 1.1);
    ctx.lineTo(leafWidth, -leafLength);
    ctx.closePath();
    ctx.fill();
    // Linha central
    ctx.strokeStyle = '#1a5a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -leafLength * 1.05);
    ctx.stroke();
    ctx.restore();

    // 3 folhas para a esquerda (uma ligeiramente para cima, uma horizontal, uma ligeiramente para cima)
    const leftAngles = [-Math.PI / 6, -Math.PI / 2, -Math.PI / 3];
    for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(leafStartX, leafStartY);
        ctx.rotate(leftAngles[i]);
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-leafWidth, -leafLength);
        ctx.lineTo(0, -leafLength * 1.05);
        ctx.lineTo(leafWidth, -leafLength);
        ctx.closePath();
        ctx.fill();
        // Linha central
        ctx.strokeStyle = '#1a5a1a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -leafLength * 1.0);
        ctx.stroke();
        ctx.restore();
    }

    // 3 folhas para a direita (uma ligeiramente para cima, uma horizontal, uma ligeiramente para cima)
    const rightAngles = [Math.PI / 6, Math.PI / 2, Math.PI / 3];
    for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(leafStartX, leafStartY);
        ctx.rotate(rightAngles[i]);
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-leafWidth, -leafLength);
        ctx.lineTo(0, -leafLength * 1.05);
        ctx.lineTo(leafWidth, -leafLength);
        ctx.closePath();
        ctx.fill();
        // Linha central
        ctx.strokeStyle = '#1a5a1a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -leafLength * 1.0);
        ctx.stroke();
        ctx.restore();
    }

    // Coco sempre visível (sem piscar) - no topo do tronco
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(0, topY - 5, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Desenhar onda do mar
function drawTropicalWave(wave, time) {
    ctx.save();
    ctx.globalAlpha = wave.alpha || 0.6;

    // Usar altura da areia (60) em vez de 40 fixo
    const sandHeight = 60;
    const waveY = canvas.height - sandHeight + wave.offset;
    const waveHeight = wave.height || 8;

    ctx.strokeStyle = wave.color || '#4A90E2';
    ctx.lineWidth = 3; // Linha mais grossa para melhor visibilidade
    ctx.fillStyle = wave.fillColor || 'rgba(74, 144, 226, 0.3)';

    ctx.beginPath();
    ctx.moveTo(0, waveY);

    // Usar fase se fornecida, senão usar 0 (para ondas assíncronas)
    // A fase está em radianos, então precisa ser convertida para o cálculo
    const phase = (wave.phase || 0) * (180 / Math.PI); // Converter radianos para graus
    for (let x = 0; x <= canvas.width; x += 5) {
        const y = waveY + Math.sin((x / wave.wavelength + time * wave.speed + phase) * Math.PI / 180) * waveHeight;
        ctx.lineTo(x, y);
    }

    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

// Desenhar cachoeira
function drawWaterfall(x, width, height, time) {
    ctx.save();

    // Água da cachoeira
    const gradient = ctx.createLinearGradient(x - width / 2, 0, x + width / 2, height);
    gradient.addColorStop(0, 'rgba(135, 206, 250, 0.9)');
    gradient.addColorStop(0.5, 'rgba(173, 216, 230, 0.8)');
    gradient.addColorStop(1, 'rgba(176, 224, 230, 0.7)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x - width / 2, 0, width, height);

    // Partículas de água caindo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 20; i++) {
        const particleX = x - width / 2 + (i / 20) * width;
        const particleY = (time * 50 + i * 10) % height;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Espuma na base
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.ellipse(x, height, width * 0.6, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Desenhar pássaro tropical
function drawTropicalBird(bird) {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    if (bird.direction === -1) {
        ctx.scale(-1, 1);
    }

    bird.wingFlap += 0.15;
    const wingOffset = Math.sin(bird.wingFlap) * 4;

    // Corpo
    ctx.fillStyle = bird.color || '#f1c40f';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Asa
    ctx.fillStyle = bird.wingColor || '#f39c12';
    ctx.beginPath();
    ctx.ellipse(-6, wingOffset, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Bico
    ctx.fillStyle = '#FF6347';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(16, -2);
    ctx.lineTo(10, 2);
    ctx.closePath();
    ctx.fill();

    // Olho
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(3, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Desenhar concha na praia
function drawTropicalShell(shell) {
    ctx.save();
    ctx.translate(shell.x, shell.y);
    ctx.rotate(shell.rotation || 0);

    // Corpo da concha
    ctx.fillStyle = shell.color || '#FFE4B5';
    ctx.beginPath();
    ctx.ellipse(0, 0, shell.size, shell.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Linhas da concha
    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, shell.size * (0.3 + i * 0.2), 0, Math.PI);
        ctx.stroke();
    }

    ctx.restore();
}

// Desenhar estrela do mar
function drawTropicalStarfish(starfish) {
    ctx.save();
    ctx.translate(starfish.x, starfish.y);
    ctx.rotate(starfish.rotation || 0);

    ctx.fillStyle = starfish.color || '#FF6347';
    ctx.beginPath();
    const points = 5;
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points;
        const radius = i % 2 === 0 ? starfish.size : starfish.size * 0.4;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Detalhes
    ctx.fillStyle = '#FF8C69';
    ctx.beginPath();
    ctx.arc(0, 0, starfish.size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Desenhar caranguejo na praia
function drawTropicalCrab(crab) {
    ctx.save();
    ctx.translate(crab.x, crab.y);
    if (crab.direction === -1) {
        ctx.scale(-1, 1);
    }

    // Corpo do caranguejo
    ctx.fillStyle = crab.color || '#DC143C';
    ctx.beginPath();
    ctx.ellipse(0, 0, crab.size * 0.8, crab.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Olhos
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(-crab.size * 0.3, -crab.size * 0.3, 2, 0, Math.PI * 2);
    ctx.arc(crab.size * 0.3, -crab.size * 0.3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Garras
    ctx.fillStyle = crab.color || '#DC143C';
    // Garra esquerda
    ctx.beginPath();
    ctx.arc(-crab.size * 0.9, crab.size * 0.2, crab.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-crab.size * 1.1, crab.size * 0.4, crab.size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    // Garra direita
    ctx.beginPath();
    ctx.arc(crab.size * 0.9, crab.size * 0.2, crab.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(crab.size * 1.1, crab.size * 0.4, crab.size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Pernas (4 de cada lado)
    ctx.strokeStyle = crab.color || '#DC143C';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        const angle = -Math.PI / 3 + (i * Math.PI / 6);
        const startX = -crab.size * 0.6 + (i * crab.size * 0.3);
        const startY = crab.size * 0.3;
        const endX = startX + Math.cos(angle) * crab.size * 0.4;
        const endY = startY + Math.sin(angle) * crab.size * 0.4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    ctx.restore();
}

// Desenhar flor tropical
function drawTropicalFlower(flower) {
    ctx.save();
    ctx.translate(flower.x, flower.y);
    ctx.rotate(flower.rotation || 0);

    // Pétalas
    ctx.fillStyle = flower.color || '#FF69B4';
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i;
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, -flower.size, flower.size * 0.8, flower.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Centro
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, flower.size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Função para obter progresso baseado na sub-fase (para variação gradual)
function getTropicalProgress() {
    if (currentArea !== 3) return 0;
    // Progresso de 0 a 1 baseado na sub-fase (1-6)
    return (currentSubstage - 1) / 5;
}

// Background da Ilha Tropical (sub-fases 1-6)
function drawTropicalBackground() {
    const time = Date.now() / 1000;
    const sandHeight = 60; // Altura da faixa de areia (mais alta)

    // Progressão do dia: amanhecer (fase 1) até fim de tarde (fase 6)
    let skyTop, skyBottom, sunX, sunY, sunSize, sunColor, sunShadowColor, sunShadowBlur;

    if (currentSubstage === 1) {
        // Amanhecer - céu rosa/laranja claro
        skyTop = '#FFB6C1';
        skyBottom = '#FFE4E1';
        sunX = canvas.width * 0.2;
        sunY = canvas.height - 100;
        sunSize = 35;
        sunColor = '#FF8C00';
        sunShadowColor = '#FF6347';
        sunShadowBlur = 25;
    } else if (currentSubstage === 2) {
        // Manhã - céu azul claro com tons de rosa
        skyTop = '#87CEEB';
        skyBottom = '#FFE4E1';
        sunX = canvas.width * 0.3;
        sunY = canvas.height - 150;
        sunSize = 38;
        sunColor = '#FFD700';
        sunShadowColor = '#FFA500';
        sunShadowBlur = 28;
    } else if (currentSubstage === 3) {
        // Meio-dia - céu azul claro
        skyTop = '#87CEEB';
        skyBottom = '#E0F6FF';
        sunX = canvas.width * 0.5;
        sunY = 80;
        sunSize = 40;
        sunColor = '#FFD700';
        sunShadowColor = '#FFA500';
        sunShadowBlur = 30;
    } else if (currentSubstage === 4) {
        // Tarde - céu azul com tons de laranja
        skyTop = '#87CEEB';
        skyBottom = '#FFE4B5';
        sunX = canvas.width * 0.7;
        sunY = 70;
        sunSize = 42;
        sunColor = '#FFA500';
        sunShadowColor = '#FF6347';
        sunShadowBlur = 35;
    } else if (currentSubstage === 5) {
        // Fim de tarde - céu laranja/rosa
        skyTop = '#FF8C00';
        skyBottom = '#FFB6C1';
        sunX = canvas.width * 0.8;
        sunY = 60;
        sunSize = 45;
        sunColor = '#FF6347';
        sunShadowColor = '#FF4500';
        sunShadowBlur = 40;
    } else if (currentSubstage === 6) {
        // Final da tarde - céu laranja/vermelho intenso
        skyTop = '#FF6347';
        skyBottom = '#FF8C00';
        sunX = canvas.width * 0.85;
        sunY = 55;
        sunSize = 50;
        sunColor = '#FF4500';
        sunShadowColor = '#FF6347';
        sunShadowBlur = 45;
    } else {
        // Fallback
        skyTop = '#87CEEB';
        skyBottom = '#E0F6FF';
        sunX = canvas.width * 0.85;
        sunY = 60;
        sunSize = 40;
        sunColor = '#FFD700';
        sunShadowColor = '#FFA500';
        sunShadowBlur = 30;
    }

    // Céu com gradiente
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - sandHeight);
    skyGradient.addColorStop(0, skyTop);
    skyGradient.addColorStop(1, skyBottom);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sol
    ctx.fillStyle = sunColor;
    ctx.shadowColor = sunShadowColor;
    ctx.shadowBlur = sunShadowBlur;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Mar ao fundo (parte superior) - cor evolui com o dia
    const seaY = canvas.height - 120; // Posição do mar
    let seaTop, seaBottom, waveColor, waveFillColor;

    if (currentSubstage === 1) {
        // Amanhecer - mar com reflexos rosa
        seaTop = '#5B9BD5';
        seaBottom = '#4A90E2';
        waveColor = '#4A90E2';
        waveFillColor = 'rgba(74, 144, 226, 0.4)';
    } else if (currentSubstage === 2) {
        // Manhã - mar azul claro
        seaTop = '#4A90E2';
        seaBottom = '#2E86AB';
        waveColor = '#2E86AB';
        waveFillColor = 'rgba(46, 134, 171, 0.4)';
    } else if (currentSubstage === 3) {
        // Meio-dia - mar azul vibrante
        seaTop = '#4A90E2';
        seaBottom = '#2E86AB';
        waveColor = '#2E86AB';
        waveFillColor = 'rgba(46, 134, 171, 0.4)';
    } else if (currentSubstage === 4) {
        // Tarde - mar com tons dourados
        seaTop = '#5B9BD5';
        seaBottom = '#4682B4';
        waveColor = '#4682B4';
        waveFillColor = 'rgba(70, 130, 180, 0.4)';
    } else if (currentSubstage === 5) {
        // Fim de tarde - mar laranja/rosa
        seaTop = '#FF8C69';
        seaBottom = '#4682B4';
        waveColor = '#4682B4';
        waveFillColor = 'rgba(70, 130, 180, 0.4)';
    } else if (currentSubstage === 6) {
        // Final da tarde - mar com reflexos vermelhos
        seaTop = '#FF6347';
        seaBottom = '#4682B4';
        waveColor = '#4682B4';
        waveFillColor = 'rgba(70, 130, 180, 0.4)';
    } else {
        // Fallback
        seaTop = '#4A90E2';
        seaBottom = '#2E86AB';
        waveColor = '#2E86AB';
        waveFillColor = 'rgba(46, 134, 171, 0.4)';
    }

    const seaGradient = ctx.createLinearGradient(0, seaY, 0, canvas.height - sandHeight);
    seaGradient.addColorStop(0, seaTop);
    seaGradient.addColorStop(1, seaBottom);
    ctx.fillStyle = seaGradient;
    ctx.fillRect(0, seaY, canvas.width, canvas.height - sandHeight - seaY);

    // Nuvens (apenas em algumas fases)
    if (currentSubstage >= 3 && currentSubstage <= 5) {
        for (let i = 0; i < 3; i++) {
            const cloudX = (i * 250 + time * 20) % (canvas.width + 200) - 100;
            const cloudY = 40 + i * 25;
            ctx.globalAlpha = 0.6 - (currentSubstage - 3) * 0.1;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            drawCloud(cloudX, cloudY, 0.8 + i * 0.1);
            ctx.globalAlpha = 1;
        }
    }

    // Ondas do mar (múltiplas camadas em alturas diferentes, assíncronas)
    // Primeira camada de ondas (mais próxima da areia)
    for (let i = 0; i < 3; i++) {
        const wave = {
            offset: seaY - (canvas.height - sandHeight) + i * 3, // Offset relativo ao chão
            height: 8 + i * 3, // Ondas mais altas
            wavelength: 80 + i * 20,
            speed: 4.0 + i * 1.0, // Velocidade muito maior
            alpha: 0.7 + i * 0.1, // Mais opacas
            color: waveColor,
            fillColor: waveFillColor,
            phase: 0 // Fase inicial
        };
        drawTropicalWave(wave, time);
    }

    // Segunda camada de ondas (meio do mar, com fase diferente)
    for (let i = 0; i < 2; i++) {
        const wave = {
            offset: seaY - (canvas.height - sandHeight) + 15 + i * 4, // Mais acima
            height: 6 + i * 2, // Ondas menores
            wavelength: 100 + i * 25,
            speed: 3.0 + i * 0.8, // Velocidade maior
            alpha: 0.5 + i * 0.1, // Mais transparentes
            color: waveColor,
            fillColor: waveFillColor,
            phase: Math.PI * 0.5 // Fase deslocada (90 graus)
        };
        drawTropicalWave(wave, time);
    }

    // Terceira camada de ondas (topo do mar, com fase diferente)
    for (let i = 0; i < 2; i++) {
        const wave = {
            offset: seaY - (canvas.height - sandHeight) + 30 + i * 3, // Ainda mais acima
            height: 4 + i * 1.5, // Ondas bem menores
            wavelength: 120 + i * 30,
            speed: 2.5 + i * 0.6, // Velocidade maior
            alpha: 0.4 + i * 0.1, // Bem transparentes
            color: waveColor,
            fillColor: waveFillColor,
            phase: Math.PI // Fase deslocada (180 graus)
        };
        drawTropicalWave(wave, time);
    }

    // Atualizar elementos decorativos
    updateTropicalDecorations();

    // Chão de areia (mais alto)
    const sandGradient = ctx.createLinearGradient(0, canvas.height - sandHeight, 0, canvas.height);
    sandGradient.addColorStop(0, '#F4D03F');
    sandGradient.addColorStop(1, '#D4AC0D');
    ctx.fillStyle = sandGradient;
    ctx.fillRect(0, canvas.height - sandHeight, canvas.width, sandHeight);

    // Detalhes da praia: conchas, estrelas do mar, pedras (posições fixas)
    drawTropicalDetails();

    // Desenhar elementos específicos de cada sub fase
    if (currentSubstage === 1) {
        // Sub fase 1: Apenas conchas
        for (let shell of tropicalShells) {
            drawTropicalShell(shell);
        }
    } else if (currentSubstage === 2) {
        // Sub fase 2: Apenas estrelas do mar
        for (let starfish of tropicalStarfish) {
            drawTropicalStarfish(starfish);
        }
    } else if (currentSubstage === 3) {
        // Sub fase 3: Apenas caranguejos
        for (let crab of tropicalCrabs) {
            drawTropicalCrab(crab);
        }
    } else if (currentSubstage === 4) {
        // Sub fase 4: Conchas e estrelas do mar
        for (let shell of tropicalShells) {
            drawTropicalShell(shell);
        }
        for (let starfish of tropicalStarfish) {
            drawTropicalStarfish(starfish);
        }
    } else if (currentSubstage === 5) {
        // Sub fase 5: Caranguejos e conchas
        for (let crab of tropicalCrabs) {
            drawTropicalCrab(crab);
        }
        for (let shell of tropicalShells) {
            drawTropicalShell(shell);
        }
    } else if (currentSubstage === 6) {
        // Sub fase 6: Todos os elementos (estrelas, conchas e caranguejos)
        for (let starfish of tropicalStarfish) {
            drawTropicalStarfish(starfish);
        }
        for (let shell of tropicalShells) {
            drawTropicalShell(shell);
        }
        for (let crab of tropicalCrabs) {
            drawTropicalCrab(crab);
        }
    }

    // Pássaros tropicais voando (todas as sub fases)
    for (let bird of tropicalBirds) {
        drawTropicalBird(bird);
    }
}

// Background extremo da Ilha Tropical (sub-fase 7 - Boss)
function drawExtremeTropicalBackground() {
    const time = Date.now() / 1000;
    const sandHeight = 60; // Altura da faixa de areia (mais alta)

    // Céu dramático (pôr do sol intenso)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - sandHeight);
    skyGradient.addColorStop(0, '#FF6347');
    skyGradient.addColorStop(0.3, '#FF8C00');
    skyGradient.addColorStop(0.6, '#FFD700');
    skyGradient.addColorStop(1, '#FFA500');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sol grande e brilhante
    const sunX = canvas.width * 0.8;
    const sunY = 50;
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FF6347';
    ctx.shadowBlur = 50;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Nuvens dramáticas
    for (let i = 0; i < 5; i++) {
        const cloudX = (i * 200 + time * 15) % (canvas.width + 200) - 100;
        const cloudY = 30 + i * 20;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = 'rgba(255, 140, 0, 0.9)';
        drawCloud(cloudX, cloudY, 1.0 + i * 0.15);
        ctx.globalAlpha = 1;
    }

    // Mar ao fundo (parte superior) - igual das outras fases
    const seaY = canvas.height - 120; // Posição do mar
    const seaGradient = ctx.createLinearGradient(0, seaY, 0, canvas.height - sandHeight);
    seaGradient.addColorStop(0, '#4A90E2');
    seaGradient.addColorStop(1, '#2E86AB');
    ctx.fillStyle = seaGradient;
    ctx.fillRect(0, seaY, canvas.width, canvas.height - sandHeight - seaY);

    // Ondas do mar (múltiplas camadas em alturas diferentes, assíncronas)
    // Primeira camada de ondas (mais próxima da areia)
    for (let i = 0; i < 3; i++) {
        const wave = {
            offset: seaY - (canvas.height - sandHeight) + i * 3, // Offset relativo ao chão
            height: 8 + i * 3, // Ondas mais altas
            wavelength: 80 + i * 20,
            speed: 2.0 + i * 0.5, // Velocidade muito maior
            alpha: 0.7 + i * 0.1, // Mais opacas
            color: '#2E86AB', // Cor mais escura para contraste
            fillColor: 'rgba(46, 134, 171, 0.4)', // Mais visível
            phase: 0 // Fase inicial
        };
        drawTropicalWave(wave, time);
    }

    // Segunda camada de ondas (meio do mar, com fase diferente)
    for (let i = 0; i < 2; i++) {
        const wave = {
            offset: seaY - (canvas.height - sandHeight) + 15 + i * 4, // Mais acima
            height: 6 + i * 2, // Ondas menores
            wavelength: 100 + i * 25,
            speed: 1.5 + i * 0.4, // Velocidade diferente
            alpha: 0.5 + i * 0.1, // Mais transparentes
            color: '#2E86AB',
            fillColor: 'rgba(46, 134, 171, 0.3)',
            phase: Math.PI * 0.5 // Fase deslocada (90 graus)
        };
        drawTropicalWave(wave, time);
    }

    // Terceira camada de ondas (topo do mar, com fase diferente)
    for (let i = 0; i < 2; i++) {
        const wave = {
            offset: seaY - (canvas.height - sandHeight) + 30 + i * 3, // Ainda mais acima
            height: 4 + i * 1.5, // Ondas bem menores
            wavelength: 120 + i * 30,
            speed: 1.2 + i * 0.3, // Velocidade mais lenta
            alpha: 0.4 + i * 0.1, // Bem transparentes
            color: '#2E86AB',
            fillColor: 'rgba(46, 134, 171, 0.25)',
            phase: Math.PI // Fase deslocada (180 graus)
        };
        drawTropicalWave(wave, time);
    }

    // Atualizar elementos decorativos
    updateTropicalDecorations();


    // Chão de areia simples (mais alto, igual das outras fases)
    const sandGradient = ctx.createLinearGradient(0, canvas.height - sandHeight, 0, canvas.height);
    sandGradient.addColorStop(0, '#F4D03F');
    sandGradient.addColorStop(1, '#D4AC0D');
    ctx.fillStyle = sandGradient;
    ctx.fillRect(0, canvas.height - sandHeight, canvas.width, sandHeight);

    // Detalhes da praia
    drawTropicalDetails();

    // Desenhar elementos decorativos (estrelas, conchas e caranguejos)
    for (let starfish of tropicalStarfish) {
        drawTropicalStarfish(starfish);
    }
    for (let shell of tropicalShells) {
        drawTropicalShell(shell);
    }
    for (let crab of tropicalCrabs) {
        drawTropicalCrab(crab);
    }

    // Pássaros tropicais voando
    for (let bird of tropicalBirds) {
        drawTropicalBird(bird);
    }
}

// Desenhar detalhes da praia tropical (conchas, estrelas do mar, pedras) - otimizado
function drawTropicalDetails() {
    // Salvar estado do canvas para garantir que globalAlpha seja restaurado
    ctx.save();

    // Conchas pequenas (posições fixas)
    const shellPositions = [
        { x: 180, y: canvas.height - 45, size: 4 },
        { x: 420, y: canvas.height - 48, size: 5 },
        { x: 680, y: canvas.height - 46, size: 3 }
    ];

    for (let shell of shellPositions) {
        // Concha (formato simples)
        ctx.fillStyle = '#FFE4B5';
        ctx.beginPath();
        ctx.ellipse(shell.x, shell.y, shell.size, shell.size * 0.6, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Detalhes da concha
        ctx.strokeStyle = '#DEB887';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(shell.x - shell.size, shell.y);
        ctx.lineTo(shell.x + shell.size, shell.y);
        ctx.stroke();
    }

    // Estrelas do mar pequenas (posições fixas)
    const starfishPositions = [
        { x: 250, y: canvas.height - 50, size: 3 },
        { x: 550, y: canvas.height - 52, size: 4 },
        { x: 800, y: canvas.height - 49, size: 3 }
    ];

    for (let star of starfishPositions) {
        ctx.fillStyle = '#FF6347';
        ctx.globalAlpha = 0.9;

        // Estrela do mar (5 pontas simples)
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
            const x = star.x + Math.cos(angle) * star.size;
            const y = star.y + Math.sin(angle) * star.size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    // Restaurar alpha após estrelas
    ctx.globalAlpha = 1.0;

    // Pedras na praia (posições fixas)
    const rockPositions = [
        { x: 320, y: canvas.height - 47, size: 4 },
        { x: 620, y: canvas.height - 49, size: 5 },
        { x: 850, y: canvas.height - 45, size: 3 }
    ];

    for (let rock of rockPositions) {
        ctx.fillStyle = '#A9A9A9';
        ctx.beginPath();
        ctx.arc(rock.x, rock.y, rock.size, 0, Math.PI * 2);
        ctx.fill();

        // Brilho do sol na pedra
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(rock.x - 1, rock.y - 1, rock.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Garantir que globalAlpha está em 1.0 antes de restaurar
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // Garantir novamente que globalAlpha está em 1.0 após restaurar
    ctx.globalAlpha = 1.0;
}

// Atualizar elementos decorativos da ilha tropical
function updateTropicalDecorations() {
    // Inicializar pássaros tropicais se necessário
    if (tropicalBirds.length === 0 && currentArea === 3) {
        for (let i = 0; i < 3; i++) {
            tropicalBirds.push({
                x: -50 - i * 200,
                y: 60 + Math.random() * 80,
                speed: 0.8 + Math.random() * 0.4,
                direction: 1,
                wingFlap: Math.random() * Math.PI * 2,
                color: ['#f1c40f', '#e67e22', '#e74c3c', '#f39c12'][Math.floor(Math.random() * 4)],
                wingColor: ['#f39c12', '#d35400', '#c0392b', '#e67e22'][Math.floor(Math.random() * 4)]
            });
        }
    }

    // Atualizar pássaros tropicais
    for (let bird of tropicalBirds) {
        bird.x += bird.speed;
        if (bird.x > canvas.width + 50) {
            bird.x = -50;
            bird.y = 60 + Math.random() * 80;
        }
    }

    // Inicializar elementos decorativos baseado na sub fase
    if (currentArea === 3 && currentSubstage >= 1 && currentSubstage <= 7) {
        // Sub fase 1: Apenas conchas pequenas
        if (currentSubstage === 1 && tropicalShells.length === 0) {
            for (let i = 0; i < 6; i++) {
                tropicalShells.push({
                    x: 80 + i * 120 + Math.random() * 40,
                    y: canvas.height - 35 - Math.random() * 10, // Ajustado para nova altura da areia
                    size: 8 + Math.random() * 5,
                    rotation: Math.random() * Math.PI * 2,
                    color: ['#FFE4B5', '#FFF8DC', '#F5DEB3'][Math.floor(Math.random() * 3)]
                });
            }
        }

        // Sub fase 2: Apenas estrelas do mar
        if (currentSubstage === 2 && tropicalStarfish.length === 0) {
            for (let i = 0; i < 5; i++) {
                tropicalStarfish.push({
                    x: 100 + i * 140 + Math.random() * 50,
                    y: canvas.height - 40 - Math.random() * 10, // Ajustado para nova altura da areia
                    size: 12 + Math.random() * 8,
                    rotation: Math.random() * Math.PI * 2,
                    color: ['#FF6347', '#FF7F50', '#FF8C69'][Math.floor(Math.random() * 3)]
                });
            }
        }

        // Sub fase 3: Apenas caranguejos
        if (currentSubstage === 3 && tropicalCrabs.length === 0) {
            for (let i = 0; i < 4; i++) {
                tropicalCrabs.push({
                    x: 120 + i * 180 + Math.random() * 60,
                    y: canvas.height - 38 - Math.random() * 8, // Ajustado para nova altura da areia
                    size: 12 + Math.random() * 6,
                    direction: Math.random() > 0.5 ? 1 : -1,
                    color: ['#DC143C', '#C71585', '#FF1493'][Math.floor(Math.random() * 3)]
                });
            }
        }

        // Sub fase 4: Conchas e estrelas do mar
        if (currentSubstage === 4) {
            if (tropicalShells.length === 0) {
                for (let i = 0; i < 4; i++) {
                    tropicalShells.push({
                        x: 100 + i * 180 + Math.random() * 50,
                        y: canvas.height - 36 - Math.random() * 10, // Ajustado para nova altura da areia
                        size: 10 + Math.random() * 6,
                        rotation: Math.random() * Math.PI * 2,
                        color: ['#FFE4B5', '#FFF8DC', '#F5DEB3'][Math.floor(Math.random() * 3)]
                    });
                }
            }
            if (tropicalStarfish.length === 0) {
                for (let i = 0; i < 3; i++) {
                    tropicalStarfish.push({
                        x: 200 + i * 200 + Math.random() * 60,
                        y: canvas.height - 40 - Math.random() * 10, // Ajustado para nova altura da areia
                        size: 12 + Math.random() * 6,
                        rotation: Math.random() * Math.PI * 2,
                        color: ['#FF6347', '#FF7F50'][Math.floor(Math.random() * 2)]
                    });
                }
            }
        }

        // Sub fase 5: Caranguejos e conchas
        if (currentSubstage === 5) {
            if (tropicalCrabs.length === 0) {
                for (let i = 0; i < 3; i++) {
                    tropicalCrabs.push({
                        x: 120 + i * 220 + Math.random() * 70,
                        y: canvas.height - 38 - Math.random() * 8, // Ajustado para nova altura da areia
                        size: 14 + Math.random() * 6,
                        direction: Math.random() > 0.5 ? 1 : -1,
                        color: ['#DC143C', '#C71585'][Math.floor(Math.random() * 2)]
                    });
                }
            }
            if (tropicalShells.length === 0) {
                for (let i = 0; i < 4; i++) {
                    tropicalShells.push({
                        x: 150 + i * 160 + Math.random() * 50,
                        y: canvas.height - 36 - Math.random() * 8, // Ajustado para nova altura da areia
                        size: 10 + Math.random() * 6,
                        rotation: Math.random() * Math.PI * 2,
                        color: ['#FFE4B5', '#FFF8DC'][Math.floor(Math.random() * 2)]
                    });
                }
            }
        }

        // Sub fase 6: Todos os elementos (estrelas, conchas e caranguejos)
        if (currentSubstage === 6) {
            if (tropicalStarfish.length === 0) {
                for (let i = 0; i < 2; i++) {
                    tropicalStarfish.push({
                        x: 150 + i * 300 + Math.random() * 80,
                        y: canvas.height - 40 - Math.random() * 10, // Ajustado para nova altura da areia
                        size: 14 + Math.random() * 6,
                        rotation: Math.random() * Math.PI * 2,
                        color: '#FF6347'
                    });
                }
            }
            if (tropicalShells.length === 0) {
                for (let i = 0; i < 3; i++) {
                    tropicalShells.push({
                        x: 200 + i * 200 + Math.random() * 60,
                        y: canvas.height - 36 - Math.random() * 8, // Ajustado para nova altura da areia
                        size: 10 + Math.random() * 6,
                        rotation: Math.random() * Math.PI * 2,
                        color: ['#FFE4B5', '#FFF8DC'][Math.floor(Math.random() * 2)]
                    });
                }
            }
            if (tropicalCrabs.length === 0) {
                for (let i = 0; i < 2; i++) {
                    tropicalCrabs.push({
                        x: 250 + i * 250 + Math.random() * 70,
                        y: canvas.height - 38 - Math.random() * 8, // Ajustado para nova altura da areia
                        size: 12 + Math.random() * 6,
                        direction: Math.random() > 0.5 ? 1 : -1,
                        color: '#DC143C'
                    });
                }
            }
        }

        // Sub fase 7 (Boss): Todos os elementos (mais quantidade)
        if (currentSubstage === 7) {
            if (tropicalStarfish.length === 0) {
                for (let i = 0; i < 4; i++) {
                    tropicalStarfish.push({
                        x: 100 + i * 180 + Math.random() * 60,
                        y: canvas.height - 40 - Math.random() * 10, // Ajustado para nova altura da areia
                        size: 14 + Math.random() * 8,
                        rotation: Math.random() * Math.PI * 2,
                        color: ['#FF6347', '#FF7F50', '#FF8C69'][Math.floor(Math.random() * 3)]
                    });
                }
            }
            if (tropicalShells.length === 0) {
                for (let i = 0; i < 5; i++) {
                    tropicalShells.push({
                        x: 80 + i * 150 + Math.random() * 50,
                        y: canvas.height - 36 - Math.random() * 10, // Ajustado para nova altura da areia
                        size: 12 + Math.random() * 8,
                        rotation: Math.random() * Math.PI * 2,
                        color: ['#FFE4B5', '#FFF8DC', '#F5DEB3', '#DEB887'][Math.floor(Math.random() * 4)]
                    });
                }
            }
            if (tropicalCrabs.length === 0) {
                for (let i = 0; i < 3; i++) {
                    tropicalCrabs.push({
                        x: 150 + i * 200 + Math.random() * 80,
                        y: canvas.height - 38 - Math.random() * 8, // Ajustado para nova altura da areia
                        size: 14 + Math.random() * 8,
                        direction: Math.random() > 0.5 ? 1 : -1,
                        color: ['#DC143C', '#C71585', '#FF1493'][Math.floor(Math.random() * 3)]
                    });
                }
            }
        }
    }

    // Atualizar rotação das estrelas do mar
    for (let starfish of tropicalStarfish) {
        starfish.rotation += 0.01;
    }

    // Inicializar flores tropicais se necessário (não usado mais, mas mantido para compatibilidade)
    if (tropicalFlowers.length === 0 && currentArea === 3 && currentSubstage === 3) {
        for (let i = 0; i < 5; i++) {
            tropicalFlowers.push({
                x: 100 + i * 150,
                y: canvas.height - 30 - Math.random() * 10,
                size: 8 + Math.random() * 5,
                rotation: Math.random() * Math.PI * 2,
                color: ['#FF69B4', '#FF1493', '#FF6347', '#FF8C00'][Math.floor(Math.random() * 4)]
            });
        }
    }

    // Atualizar flores tropicais
    for (let flower of tropicalFlowers) {
        flower.rotation += 0.01;
    }
}

// Desenhar flor de lótus
function drawLotusFlower(lotus) {
    ctx.save();
    ctx.translate(lotus.x, lotus.y);
    ctx.rotate(lotus.rotation);

    // Folha flutuante (verde)
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.ellipse(0, 5, lotus.size * 1.2, lotus.size * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pétalas da flor
    ctx.fillStyle = lotus.color;
    for (let i = 0; i < lotus.petalCount; i++) {
        const angle = (Math.PI * 2 / lotus.petalCount) * i;
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, -lotus.size * 0.5, lotus.size * 0.6, lotus.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Centro da flor
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, lotus.size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Desenhar junco
function drawReed(reed) {
    ctx.save();
    ctx.translate(reed.x, reed.y);

    const swayAmount = Math.sin(reed.sway) * 5;
    ctx.rotate(swayAmount * 0.01);

    // Corpo do junco
    ctx.fillStyle = reed.color;
    ctx.fillRect(-reed.width / 2, -reed.height, reed.width, reed.height);

    // Detalhes (linhas)
    if (reed.color && reed.color.startsWith('#')) {
        ctx.strokeStyle = darkenColor(reed.color);
    } else {
        ctx.strokeStyle = '#1e8449';
    }
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -reed.height);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Topo do junco (curvado)
    ctx.strokeStyle = reed.color;
    ctx.lineWidth = reed.width;
    ctx.beginPath();
    ctx.moveTo(0, -reed.height);
    ctx.quadraticCurveTo(swayAmount, -reed.height - 10, swayAmount * 1.5, -reed.height - 15);
    ctx.stroke();

    ctx.restore();
}

// Desenhar névoa do pântano
function drawSwampMist(mist) {
    ctx.save();
    ctx.globalAlpha = mist.alpha * (0.7 + Math.sin(mist.time / 20) * 0.3);

    const gradient = ctx.createRadialGradient(mist.x, mist.y, 0, mist.x, mist.y, mist.width / 2);
    gradient.addColorStop(0, 'rgba(200, 220, 220, 0.6)');
    gradient.addColorStop(0.5, 'rgba(180, 200, 200, 0.4)');
    gradient.addColorStop(1, 'rgba(160, 180, 180, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(mist.x, mist.y, mist.width / 2, mist.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Desenhar ondulação na água
function drawWaterRipple(ripple) {
    ctx.save();
    ctx.globalAlpha = ripple.alpha * (0.5 + Math.sin(ripple.time / 10) * 0.5);
    ctx.strokeStyle = 'rgba(46, 204, 113, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

// Desenhar pássaro do pântano
function drawSwampBird(bird) {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.scale(bird.size, bird.size);

    const wingOffset = Math.sin(bird.wingFlap) * 8;

    // Corpo
    ctx.fillStyle = bird.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Asa
    ctx.fillStyle = bird.wingColor;
    ctx.beginPath();
    ctx.ellipse(-5, wingOffset, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bico
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(18, -3);
    ctx.lineTo(18, 3);
    ctx.closePath();
    ctx.fill();

    // Olho
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(8, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(8, -3, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Desenhar árvore do pântano (adaptada para mata fechada)
function drawSwampTree(x, height, trunkWidth, mistProgress = 0) {
    // Função hash determinística baseada na posição x
    function hash(seed) {
        const str = seed.toString();
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) / 2147483647;
    }

    const treeHash = hash(x);
    const hasRoots = treeHash > 0.5; // 50% das árvores têm raízes
    const hasMoss = treeHash > 0.7; // 30% das árvores têm musgo

    // Tronco (marrom escuro, pode ter raízes expostas)
    const trunkColor = interpolateColor('#5D4037', '#3E2723', mistProgress);
    ctx.fillStyle = trunkColor;
    ctx.fillRect(x - trunkWidth / 2, canvas.height - 40 - height * 0.4, trunkWidth, height * 0.4 + 40);

    // Raízes expostas (característica de pântano)
    if (hasRoots) {
        ctx.fillStyle = darkenColor(trunkColor);
        ctx.beginPath();
        ctx.moveTo(x - trunkWidth / 2, canvas.height - 40);
        ctx.lineTo(x - trunkWidth / 2 - 5, canvas.height - 35);
        ctx.lineTo(x - trunkWidth / 2, canvas.height - 30);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + trunkWidth / 2, canvas.height - 40);
        ctx.lineTo(x + trunkWidth / 2 + 5, canvas.height - 35);
        ctx.lineTo(x + trunkWidth / 2, canvas.height - 30);
        ctx.closePath();
        ctx.fill();
    }

    // Copa (verde escuro, mais densa) - mais escura com névoa
    const leafColor1 = interpolateColor('#1B5E20', '#0a1a0a', mistProgress);
    const leafColor2 = interpolateColor('#2E7D32', '#0a2a0a', mistProgress);
    const leafColor3 = interpolateColor('#388E3C', '#0a2a0a', mistProgress);
    const leafSize = height * 0.35;

    // Camada inferior (mais larga)
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

    // Detalhes: musgo ou cipós (algumas árvores)
    if (hasMoss) {
        ctx.fillStyle = interpolateColor('#4A5D23', '#2E3D14', mistProgress);
        ctx.beginPath();
        ctx.ellipse(x, canvas.height - 40 - height * 0.2, trunkWidth * 0.8, trunkWidth * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Função auxiliar para obter progresso da névoa baseado na sub-fase
function getMistProgress() {
    if (currentArea !== 2) return 0;
    if (currentSubstage === 1) return 0.1;
    if (currentSubstage === 2) return 0.2;
    if (currentSubstage === 3) return 0.6;
    if (currentSubstage === 4) return 0.3;
    if (currentSubstage === 5) return 0.4;
    if (currentSubstage === 6) return 0.8;
    if (currentSubstage === 7) return 1.0;
    return 0.5;
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

// Desenhar detalhes do deserto (pedras) - otimizado
function drawDesertDetails(heatProgress) {
    // Pedras (posições fixas)
    const rockPositions = [
        { x: 120, y: canvas.height - 35, size: 8 },
        { x: 380, y: canvas.height - 38, size: 6 },
        { x: 620, y: canvas.height - 32, size: 10 },
        { x: 850, y: canvas.height - 36, size: 7 }
    ];

    ctx.fillStyle = interpolateColor('#A0A0A0', '#696969', heatProgress);
    for (let rock of rockPositions) {
        ctx.beginPath();
        ctx.arc(rock.x, rock.y, rock.size, 0, Math.PI * 2);
        ctx.fill();
        // Sombra da pedra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(rock.x, rock.y + rock.size, rock.size * 0.8, rock.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = interpolateColor('#A0A0A0', '#696969', heatProgress);
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

// ========== FUNÇÕES DA METRÓPOLE ==========

// Calcular progresso da metrópole (0 = parque calmo, 1 = cidade intensa)
function getMetropolisProgress() {
    if (currentArea !== 5 || currentSubstage >= 7) return 0;
    // 5-1 = 0.0 (parque), 5-2 = 0.2, 5-3 = 0.4, 5-4 = 0.6, 5-5 = 0.8, 5-6 = 1.0 (cidade intensa)
    const progress = (currentSubstage - 1) / 6;
    return Math.max(0, Math.min(1.0, progress));
}

// Desenhar cenário da metrópole com progressão visual
function drawMetropolisBackground() {
    const progress = getMetropolisProgress();
    const isNight = currentSubstage >= 6;

    // Céu - transição de dia para noite
    let skyTop, skyBottom;
    if (isNight) {
        // Noite
        skyTop = '#0a0a1a';
        skyBottom = '#1a1a2a';
    } else {
        // Dia - mais poluído conforme progresso
        const skyTopDay = '#87CEEB';
        const skyTopPolluted = '#708090';
        const skyBottomDay = '#E0F6FF';
        const skyBottomPolluted = '#778899';
        skyTop = interpolateColor(skyTopDay, skyTopPolluted, progress);
        skyBottom = interpolateColor(skyBottomDay, skyBottomPolluted, progress);
    }

    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - 40);
    skyGradient.addColorStop(0, skyTop);
    skyGradient.addColorStop(1, skyBottom);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Estrelas (apenas à noite)
    if (isNight) {
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 30; i++) {
            const x = (i * 27) % canvas.width;
            const y = (i * 13) % (canvas.height / 2);
            const size = 1 + Math.sin(Date.now() / 1000 + i) * 0.5;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Lua (apenas à noite)
    if (isNight) {
        const moonX = canvas.width - 150;
        const moonY = 80;
        ctx.fillStyle = '#F5F5DC';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 25, 0, Math.PI * 2);
        ctx.fill();
        // Sombra da lua
        ctx.fillStyle = skyTop;
        ctx.beginPath();
        ctx.arc(moonX - 5, moonY - 5, 20, 0, Math.PI * 2);
        ctx.fill();
    }

    // Prédios ao fundo
    drawBuildings(progress, isNight);

    // Carros na rua (mais conforme progresso)
    if (progress > 0.1) {
        drawCars(progress);
    }

    // Pássaros da metrópole
    for (let bird of metropolisBirds) {
        drawMetropolisBird(bird, isNight);
    }

    // Rua/calçada com mais detalhes
    const streetColor = isNight ? '#2a2a2a' : '#4a4a4a';
    ctx.fillStyle = streetColor;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    // Faixas amarelas no meio da rua (conforme progresso)
    if (progress > 0.2) {
        ctx.fillStyle = isNight ? '#FFD700' : '#FFA500';
        ctx.globalAlpha = 0.8;
        const lineSpacing = 40 + progress * 20; // Mais próximas com progresso
        for (let i = 0; i < canvas.width; i += lineSpacing) {
            ctx.fillRect(i, canvas.height - 20, 20, 2);
        }
        ctx.globalAlpha = 1;
    }

    // Faixas de pedestre (apenas nas primeiras subfases)
    if (currentSubstage <= 2) {
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.7;
        for (let i = 50; i < canvas.width; i += 100) {
            ctx.fillRect(i, canvas.height - 40, 30, 5);
        }
        ctx.globalAlpha = 1;
    }

    // Marcas na rua (buracos, manchas) - apenas com progresso (posições fixas para performance)
    if (progress > 0.4) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.globalAlpha = 0.4;
        const markPositions = [120, 280, 440, 600, 760]; // Posições fixas
        for (let i = 0; i < markPositions.length; i++) {
            const markX = markPositions[i] % canvas.width;
            const markY = canvas.height - 35 + (i % 3) * 2;
            ctx.beginPath();
            ctx.arc(markX, markY, 3 + (i % 2), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Postes de luz (apenas com progresso e à noite)
    if (progress > 0.3 && isNight) {
        drawStreetLights(progress);
    }

    // Fumaça/poluição (apenas com progresso)
    if (progress > 0.5) {
        drawCitySmoke(progress, isNight);
    }

    // Árvores/parque (apenas nas primeiras subfases)
    if (currentSubstage === 1) {
        drawParkTrees();
    }

    // Atualizar elementos decorativos
    updateMetropolisDecorations();
}

// Desenhar prédios
function drawBuildings(progress, isNight) {
    // Prédios já foram criados na inicialização, apenas desenhar
    // Desenhar prédios existentes
    for (let building of buildings) {
        ctx.fillStyle = isNight ? '#3a3a3a' : building.color;
        ctx.fillRect(building.x, building.y, building.width, building.height);

        // Desenhar todas as janelas (verificando limites do prédio)
        if (building.allWindows) {
            for (let window of building.allWindows) {
                const windowX = building.x + 5 + window.col * 8;
                const windowY = building.y + 5 + window.row * 15;
                const windowWidth = 6;
                const windowHeight = 8;

                // Verificar se a janela está dentro dos limites do prédio
                if (windowX + windowWidth <= building.x + building.width - 5 &&
                    windowY + windowHeight <= building.y + building.height - 5 &&
                    windowX >= building.x + 5 &&
                    windowY >= building.y + 5) {

                    const isLit = building.litWindows.some(w => w.row === window.row && w.col === window.col);

                    if (isNight) {
                        // Noite: janelas acesas são amarelas, outras são escuras
                        if (isLit) {
                            ctx.fillStyle = '#FFD700';
                            ctx.globalAlpha = 0.8;
                        } else {
                            ctx.fillStyle = '#1a1a1a';
                            ctx.globalAlpha = 0.6;
                        }
                    } else {
                        // Dia: todas as janelas são escuras/reflexivas
                        ctx.fillStyle = '#2a2a3a';
                        ctx.globalAlpha = 0.7;
                    }

                    ctx.fillRect(windowX, windowY, windowWidth, windowHeight);

                    // Brilho/reflexo nas janelas durante o dia
                    if (!isNight) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                        ctx.fillRect(windowX + 1, windowY + 1, 2, 2);
                    }
                }
            }
            ctx.globalAlpha = 1;
        }

        // Detalhes arquitetônicos nos prédios (leves em performance)
        drawBuildingDetails(building, isNight);

        // Sombra do prédio
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.moveTo(building.x + building.width, building.y + building.height);
        ctx.lineTo(building.x + building.width + 10, building.y + building.height);
        ctx.lineTo(building.x + building.width + 10, canvas.height - 40);
        ctx.lineTo(building.x + building.width, canvas.height - 40);
        ctx.closePath();
        ctx.fill();
    }
}

// Desenhar detalhes arquitetônicos nos prédios (otimizado)
function drawBuildingDetails(building, isNight) {
    // Antenas no topo (apenas prédios altos)
    if (building.height > 120) {
        const antennaCount = Math.floor(building.width / 15);
        ctx.fillStyle = isNight ? '#1a1a1a' : '#3a3a3a';
        for (let i = 0; i < antennaCount; i++) {
            const antennaX = building.x + 10 + (i * building.width / (antennaCount + 1));
            const antennaHeight = 8 + ((building.x + i) % 4); // Altura consistente baseada em hash
            ctx.fillRect(antennaX, building.y - antennaHeight, 1, antennaHeight);
        }
    }

    // Placas/letreiros (apenas alguns prédios) - usar hash do prédio para consistência
    const buildingHash = (building.x + building.y) % 100;
    if (building.height > 100 && buildingHash > 40) {
        const signY = building.y + building.height * 0.3;
        const signWidth = building.width * 0.6;
        const signHeight = 8;

        // Placa
        ctx.fillStyle = isNight ? '#FFD700' : '#FF6347';
        ctx.globalAlpha = 0.8;
        ctx.fillRect(building.x + building.width * 0.2, signY, signWidth, signHeight);
        ctx.globalAlpha = 1;

        // Texto simples (linhas)
        ctx.fillStyle = isNight ? '#000' : '#fff';
        ctx.fillRect(building.x + building.width * 0.25, signY + 2, signWidth * 0.5, 1);
        ctx.fillRect(building.x + building.width * 0.25, signY + 5, signWidth * 0.7, 1);
    }

    // Detalhes de borda (linhas horizontais)
    ctx.strokeStyle = isNight ? '#2a2a2a' : '#4a4a4a';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    for (let i = 1; i < 3; i++) {
        const lineY = building.y + (building.height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(building.x, lineY);
        ctx.lineTo(building.x + building.width, lineY);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

// Desenhar postes de luz (otimizado)
function drawStreetLights(progress) {
    const lightCount = Math.floor(3 + progress * 2); // Mais postes com progresso
    const spacing = canvas.width / (lightCount + 1);

    for (let i = 0; i < lightCount; i++) {
        const x = spacing * (i + 1);
        const poleHeight = 25;
        const poleY = canvas.height - 40 - poleHeight;

        // Poste
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x - 1, poleY, 2, poleHeight);

        // Lâmpada
        ctx.fillStyle = '#FFD700';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(x, poleY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Brilho da lâmpada
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(x, poleY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Luz no chão
        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(x, canvas.height - 40, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Desenhar fumaça/poluição (otimizado)
function drawCitySmoke(progress, isNight) {
    const smokeCount = Math.floor(2 + progress * 2);
    const time = Date.now() / 1000;

    for (let i = 0; i < smokeCount; i++) {
        const baseX = (i * 200) % canvas.width;
        const baseY = canvas.height - 100 - (i * 30);
        const offsetX = Math.sin(time + i) * 10;
        const offsetY = -time * 20 - (i * 50);

        // Fumaça (círculos sobrepostos para efeito suave)
        ctx.fillStyle = isNight ? 'rgba(100, 100, 100, 0.3)' : 'rgba(150, 150, 150, 0.4)';
        ctx.globalAlpha = 0.4;

        // Múltiplos círculos para efeito de fumaça
        for (let j = 0; j < 3; j++) {
            const smokeX = baseX + offsetX + (j * 5);
            const smokeY = baseY + offsetY - (j * 10);
            const smokeSize = 8 + j * 3;

            ctx.beginPath();
            ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

// Desenhar carros
function drawCars(progress) {
    // Usar carros decorativos
    for (let car of decorativeCars) {
        car.x += car.speed;
        if (car.x > canvas.width + 50) {
            car.x = -50;
        }

        // Cor do carro
        ctx.fillStyle = car.color;
        ctx.fillRect(car.x, car.y, car.width, car.height);

        // Janelas do carro
        ctx.fillStyle = '#87CEEB';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(car.x + 5, car.y + 2, car.width - 10, 8);
        ctx.globalAlpha = 1;

        // Rodas
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(car.x + 8, car.y + car.height, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(car.x + car.width - 8, car.y + car.height, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Desenhar árvores do parque (subfase 1)
function drawParkTrees() {
    for (let i = 0; i < 5; i++) {
        const x = 100 + i * 150;
        const y = canvas.height - 40;

        // Tronco
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x - 5, y - 40, 10, 40);

        // Folhas
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.arc(x, y - 40, 25, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Desenhar pássaro da metrópole
function drawMetropolisBird(bird, isNight) {
    ctx.save();
    ctx.translate(bird.x, bird.y);

    // Cor do pássaro (mais escuro à noite)
    const birdColor = isNight ? '#2a2a2a' : bird.color;
    ctx.fillStyle = birdColor;

    // Corpo
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Asa
    ctx.fillStyle = isNight ? '#1a1a1a' : '#4a4a4a';
    ctx.beginPath();
    ctx.ellipse(-3, 2, 5, 3, bird.wingFlap, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Atualizar elementos decorativos da metrópole
function updateMetropolisDecorations() {
    // Atualizar carros decorativos
    if (decorativeCars.length === 0 && currentArea === 5) {
        const carCount = 2 + Math.floor(getMetropolisProgress() * 4);
        for (let i = 0; i < carCount; i++) {
            decorativeCars.push({
                x: -50 - i * 200,
                y: canvas.height - 35,
                width: 30 + Math.random() * 20,
                height: 15,
                speed: 1 + Math.random() * 2,
                color: ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c'][Math.floor(Math.random() * 5)]
            });
        }
    }

    // Atualizar pássaros da metrópole
    if (metropolisBirds.length === 0 && currentArea === 5) {
        for (let i = 0; i < 3; i++) {
            metropolisBirds.push({
                x: -50 - i * 150,
                y: 60 + Math.random() * 100,
                speed: 0.5 + Math.random() * 0.5,
                wingFlap: Math.random() * Math.PI * 2,
                color: '#5a5a5a'
            });
        }
    }

    // Atualizar movimento dos pássaros
    for (let bird of metropolisBirds) {
        bird.x += bird.speed;
        bird.wingFlap += 0.2;
        if (bird.x > canvas.width + 50) {
            bird.x = -50;
            bird.y = 60 + Math.random() * 100;
        }
    }

    // Limpar carros se sair da área
    if (currentArea !== 5) {
        cars = [];
        metropolisBirds = [];
    }
}

// Desenhar cenário extremo da metrópole (boss)
function drawExtremeMetropolisBackground() {
    // Céu noturno extremo
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - 40);
    skyGradient.addColorStop(0, '#050510');
    skyGradient.addColorStop(0.5, '#0a0a1a');
    skyGradient.addColorStop(1, '#1a1a2a');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Estrelas intensas
    ctx.fillStyle = 'white';
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 50; i++) {
        const x = (i * 17) % canvas.width;
        const y = (i * 11) % (canvas.height / 2);
        const size = 1.5 + Math.sin(Date.now() / 800 + i) * 0.8;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Lua grande
    const moonX = canvas.width - 120;
    const moonY = 60;
    ctx.fillStyle = '#F5F5DC';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#050510';
    ctx.beginPath();
    ctx.arc(moonX - 8, moonY - 8, 28, 0, Math.PI * 2);
    ctx.fill();

    // Prédios já foram criados na inicialização, apenas desenhar
    // Desenhar prédios
    for (let building of buildings) {
        ctx.fillStyle = building.color;
        ctx.fillRect(building.x, building.y, building.width, building.height);

        // Desenhar todas as janelas (noite - todas visíveis, verificando limites)
        if (building.allWindows) {
            for (let window of building.allWindows) {
                const windowX = building.x + 4 + window.col * 7;
                const windowY = building.y + 4 + window.row * 12;
                const windowWidth = 5;
                const windowHeight = 7;

                // Verificar se a janela está dentro dos limites do prédio
                if (windowX + windowWidth <= building.x + building.width - 4 &&
                    windowY + windowHeight <= building.y + building.height - 4 &&
                    windowX >= building.x + 4 &&
                    windowY >= building.y + 4) {

                    const isLit = building.litWindows.some(w => w.row === window.row && w.col === window.col);

                    // Noite: janelas acesas são amarelas, outras são escuras
                    if (isLit) {
                        ctx.fillStyle = '#FFD700';
                        ctx.globalAlpha = 0.9;
                    } else {
                        ctx.fillStyle = '#1a1a1a';
                        ctx.globalAlpha = 0.6;
                    }

                    ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
                }
            }
            ctx.globalAlpha = 1;
        }
    }

    // Carros decorativos rápidos (atualizar velocidade apenas uma vez)
    if (decorativeCars.length > 0 && decorativeCars[0].speed < 3) {
        for (let car of decorativeCars) {
            car.speed = 3 + Math.random() * 2; // Mais rápido
        }
    }
    drawCars(1.0);

    // Pássaros da metrópole
    for (let bird of metropolisBirds) {
        drawMetropolisBird(bird, true);
    }

    // Rua escura
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    // Faixas amarelas (mais visíveis)
    ctx.fillStyle = '#FFD700';
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < canvas.width; i += 60) {
        ctx.fillRect(i, canvas.height - 20, 40, 3);
    }
    ctx.globalAlpha = 1;
}

// Árvore silhueta para cena noturna
function drawNightTree(x, height, trunkWidth) {
    // Tronco escuro
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - trunkWidth / 2, canvas.height - 40 - height * 0.4, trunkWidth, height * 0.4 + 40);

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
    // Limpar canvas antes de desenhar (OTIMIZAÇÃO: evita artefatos visuais)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar cenário baseado na área atual
    if (currentArea === 1) {
        // Fase do boss (Coruja) = noite
        if (currentSubstage === 7) {
            drawNightForestBackground();
        } else {
            drawForestBackground();
        }
    } else if (currentArea === 2) {
        // Área 2: Pântano - Fase do boss (Tuiuiu) = pântano extremo
        if (currentSubstage === 7) {
            drawExtremeSwampBackground();
        } else {
            drawSwampBackground();
        }
    } else if (currentArea === 3) {
        // Área 3: Ilha Tropical - Fase do boss (Tucano) = ilha extrema
        if (currentSubstage === 7) {
            drawExtremeTropicalBackground();
        } else {
            drawTropicalBackground();
        }
    } else if (currentArea === 4) {
        // Área 4: Deserto - Fase do boss (Falcão) = deserto extremo
        if (currentSubstage === 7) {
            drawExtremeDesertBackground();
        } else {
            drawDesertBackground();
        }
    } else if (currentArea === 5) {
        // Área 5: Metrópole - Fase do boss (Carcará) = metrópole extrema
        if (currentSubstage === 7) {
            drawExtremeMetropolisBackground();
        } else {
            drawMetropolisBackground();
        }
    } else if (currentArea === 7) {
        // Área 7: Gelo - Fase do boss (Pinguim) = gelo extremo
        if (currentSubstage === 7) {
            drawExtremeIceBackground();
        } else {
            drawIceBackground();
        }
    } else {
        // Áreas ainda não implementadas: usar background genérico
        drawGenericBackground();
    }

    if (isBonusStage) {
        if (currentArea === 7) {
            // Fase bônus do gelo - desenhar frutas congeladas
            drawFrozenFruits();
            drawWormEatEffects(); // Reutilizar efeitos visuais
        } else if (currentArea === 4) {
            // Fase bônus do deserto - desenhar frutos de cactos
            drawCactusFruits();
            drawWormEatEffects(); // Reutilizar efeitos visuais
        } else if (currentArea === 5) {
            // Fase bônus da Metrópole - desenhar pães
            drawMetropolisBread();
            drawWormEatEffects(); // Reutilizar efeitos visuais
        } else if (currentArea === 3) {
            // Fase bônus da Ilha Tropical - desenhar peixes
            drawTropicalFish();
            drawWormEatEffects(); // Reutilizar efeitos visuais
        } else if (currentArea === 2) {
            // Fase bônus do pântano - desenhar insetos
            drawSwampInsects();
            drawWormEatEffects(); // Reutilizar efeitos visuais
        } else {
            // Fase bônus genérica - desenhar buracos e minhocas
            drawWormHoles();
            drawWormEatEffects();
        }

        // Apenas o player
        drawBird(player, true);
    } else {
        // Fase normal
        // Garantir que globalAlpha está em 1.0 antes de desenhar frutas
        ctx.save();
        ctx.globalAlpha = 1.0;

        // Comidas
        drawFood();

        ctx.restore();

        // Desenhar névoa e chuva do pântano DEPOIS das frutas (mas não na área das frutas)
        if (currentArea === 2) {
            // NÃO desenhar névoa na área central da tela onde as frutas estão
            // Área proibida: y entre 50 e canvas.height - 50 (área muito grande para garantir que nenhuma névoa cubra as frutas)
            const forbiddenAreaTop = 50;
            const forbiddenAreaBottom = canvas.height - 50;

            for (let mist of swampMist) {
                // Verificar se a névoa está completamente FORA da área proibida
                const mistTop = mist.y - mist.height / 2;
                const mistBottom = mist.y + mist.height / 2;

                // Só desenhar névoa se ela estiver completamente acima ou completamente abaixo da área proibida
                const mistIsAboveForbiddenArea = mistBottom < forbiddenAreaTop;
                const mistIsBelowForbiddenArea = mistTop > forbiddenAreaBottom;

                if (mistIsAboveForbiddenArea || mistIsBelowForbiddenArea) {
                    // Garantir que globalAlpha está correto antes de desenhar névoa
                    ctx.save();
                    drawSwampMist(mist);
                    ctx.restore();
                }
            }

            // Desenhar chuva apenas nas bordas (não na área central onde frutas estão)
            ctx.save();
            for (let drop of rainDrops) {
                // Não desenhar chuva na área central onde as frutas estão (y entre 80 e canvas.height - 80)
                const dropInFruitArea = drop.y > 80 && drop.y < canvas.height - 80;
                if (!dropInFruitArea) {
                    ctx.globalAlpha = drop.opacity;

                    // Cor da chuva para pântano
                    ctx.strokeStyle = '#5F9EA0';
                    ctx.lineWidth = 1.5;
                    ctx.lineCap = 'round';

                    // Desenhar linha de chuva (inclinada)
                    ctx.beginPath();
                    ctx.moveTo(drop.x, drop.y);
                    ctx.lineTo(drop.x - 2, drop.y + drop.length);
                    ctx.stroke();

                    // Brilho na ponta da gota
                    ctx.globalAlpha = drop.opacity * 0.5;
                    ctx.fillStyle = '#7FB3B3';
                    ctx.beginPath();
                    ctx.arc(drop.x - 2, drop.y + drop.length, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();

            // Garantir que globalAlpha está em 1.0 após desenhar névoa e chuva
            ctx.globalAlpha = 1.0;
        }

        // Morcego (fase 1-6 - floresta)
        drawBat();

        // Gavião (fase 2-6 - pântano e fase 4-6 - deserto)
        drawHawk();

        // Pássaros
        drawBird(player, true);
        drawBird(cpu, false);
    }

    // Desenhar UI no canvas
    drawGameUI();

    // Desenhar partículas de texto (+1, +5)
    drawScoreTextEffects();
}

// Desenhar ave pequena no placar
// Função auxiliar para desenhar detalhes específicos do tipo no placar
function drawScoreBirdTypeDetails(ctx, type, size, wingColor, baseColor, beakColor, eyeColor) {
    if (!type) return;

    switch (type) {
        case 'woodpecker': // Pica-pau
            ctx.fillStyle = '#DC143C';
            ctx.beginPath();
            ctx.arc(size * 0.23, size * 0.06, size * 0.31, 0, Math.PI * 2);
            ctx.fill();
            for (let i = 0; i < 3; i++) {
                const stripeY = size * 0.38 + (i * size * 0.19);
                ctx.fillStyle = '#000000';
                ctx.fillRect(-size * 0.5, stripeY - size * 0.06, size, size * 0.1);
            }
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(-size * 0.25, -size * 0.88);
            ctx.lineTo(0, -size * 1.13);
            ctx.lineTo(size * 0.25, -size * 0.88);
            ctx.closePath();
            ctx.fill();
            break;

        case 'sete-cores': // Saíra-sete-cores
            ctx.fillStyle = '#40E0D0';
            ctx.beginPath();
            ctx.arc(0, -size * 0.75, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ADFF2F';
            ctx.beginPath();
            ctx.ellipse(-size * 0.38, -size * 0.25, size * 0.63, size * 0.38, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#191970';
            ctx.beginPath();
            ctx.ellipse(-size * 0.5, 0, size * 0.75, size * 0.5, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FF6347';
            ctx.beginPath();
            ctx.ellipse(0, size * 0.25, size * 0.63, size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'araponga': // Araponga
            ctx.fillStyle = '#40E0D0';
            ctx.beginPath();
            ctx.arc(size * 0.5, size * 0.25, size * 0.63, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2C2C2C';
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.63, size * 0.56, size * 0.38, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-size * 0.38, -size * 0.13, size * 0.63, size * 0.44, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1A1A1A';
            ctx.beginPath();
            ctx.ellipse(-size * 0.5, size * 0.13, size * 0.38, size * 0.31, -0.3, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'tie-sangue': // Tie-sangue
            ctx.fillStyle = '#1C1C1C';
            ctx.beginPath();
            ctx.ellipse(-size * 0.5, 0, size * 0.63, size * 0.5, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-size * 0.38, size * 0.25, size * 0.44, size * 0.38, -0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(-size * 0.19, -size * 0.38, size * 0.15, size * 0.1, 0.3, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'bacurau': // Bacurau
            ctx.fillStyle = '#6B5B4A';
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.75, size * 0.5, size * 0.31, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#5C4A3A';
            const darkSpots = [
                { angle: 0, dist: 0.35 },
                { angle: Math.PI / 3, dist: 0.4 },
                { angle: Math.PI * 2 / 3, dist: 0.3 },
                { angle: Math.PI, dist: 0.45 },
                { angle: Math.PI * 4 / 3, dist: 0.35 },
                { angle: Math.PI * 5 / 3, dist: 0.4 }
            ];
            darkSpots.forEach(spot => {
                const distance = size * spot.dist;
                const spotX = Math.cos(spot.angle) * distance;
                const spotY = Math.sin(spot.angle) * distance;
                ctx.beginPath();
                ctx.arc(spotX, spotY, size * 0.1, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.fillStyle = '#D4C5A9';
            const lightSpots = [
                { angle: Math.PI / 4, dist: 0.28 },
                { angle: Math.PI * 3 / 4, dist: 0.32 },
                { angle: Math.PI * 5 / 4, dist: 0.3 },
                { angle: Math.PI * 7 / 4, dist: 0.35 }
            ];
            lightSpots.forEach(spot => {
                const distance = size * spot.dist;
                const spotX = Math.cos(spot.angle) * distance;
                const spotY = Math.sin(spot.angle) * distance;
                ctx.beginPath();
                ctx.arc(spotX, spotY, size * 0.08, 0, Math.PI * 2);
                ctx.fill();
            });
            // Olho único do Bacurau (mesmo tamanho padrão, apenas cor diferente)
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(size * 1.25, -size * 0.63, size * 1.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = eyeColor || '#FFD700';
            ctx.beginPath();
            ctx.arc(size * 1.5, -size * 0.63, size * 0.63, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'martim': // Martim-pescador
            // Peito/ventre branco ou creme claro
            ctx.fillStyle = '#F5F5DC'; // Bege claro
            ctx.beginPath();
            ctx.ellipse(0, size * 0.25, size * 0.5, size * 0.63, 0, 0, Math.PI * 2);
            ctx.fill();
            // Faixa escura na cabeça
            ctx.fillStyle = '#1a3d0e'; // Verde escuro
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.75, size * 0.44, size * 0.19, 0, 0, Math.PI * 2);
            ctx.fill();
            // Padrão de penas nas asas (verde mais escuro)
            ctx.fillStyle = '#2ecc71'; // Verde médio
            ctx.beginPath();
            ctx.ellipse(-size * 0.38, -size * 0.13, size * 0.56, size * 0.44, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Detalhes nas asas - faixas mais escuras
            ctx.fillStyle = '#27ae60'; // Verde mais escuro
            ctx.beginPath();
            ctx.ellipse(-size * 0.31, size * 0.13, size * 0.44, size * 0.35, -0.15, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'arara': // Arara-azul-e-amarela (Ara ararauna)
            // 1. Peito/barriga amarelo dourado (com camada adicional e textura)
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(0, size * 0.25, size * 0.45, size * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.ellipse(0, size * 0.35, size * 0.35, size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            // Textura de penas no peito
            ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 3; j++) {
                    ctx.beginPath();
                    ctx.arc(-size * 0.2 + i * size * 0.1, size * 0.3 + j * size * 0.15, size * 0.03, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            // 2. Dorso e asas azul vívido (com detalhes e padrão de penas)
            ctx.fillStyle = '#0066FF';
            ctx.beginPath();
            ctx.ellipse(-size * 0.3, -size * 0.15, size * 0.5, size * 0.4, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0044CC';
            ctx.beginPath();
            ctx.ellipse(-size * 0.35, -size * 0.1, size * 0.3, size * 0.25, -0.25, 0, Math.PI * 2);
            ctx.fill();
            // Padrão de penas nas asas
            ctx.strokeStyle = '#0033AA';
            ctx.lineWidth = 0.25;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(-size * 0.5, -size * 0.2 + i * size * 0.08);
                ctx.lineTo(-size * 0.25, -size * 0.15 + i * size * 0.08);
                ctx.stroke();
            }
            ctx.fillStyle = '#0066FF';
            ctx.beginPath();
            ctx.ellipse(-size * 0.25, size * 0.1, size * 0.4, size * 0.3, -0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0044CC';
            ctx.beginPath();
            ctx.ellipse(-size * 0.3, size * 0.15, size * 0.25, size * 0.2, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Padrão de penas na segunda camada
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(-size * 0.45, size * 0.05 + i * size * 0.08);
                ctx.lineTo(-size * 0.2, size * 0.1 + i * size * 0.08);
                ctx.stroke();
            }
            // 3. Cabeça azul (com detalhes)
            ctx.fillStyle = '#0066FF';
            ctx.beginPath();
            ctx.arc(size * 0.25, -size * 0.65, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0044CC';
            ctx.beginPath();
            ctx.arc(size * 0.2, -size * 0.75, size * 0.25, 0, Math.PI * 2);
            ctx.fill();
            // Detalhes de penas na cabeça
            ctx.strokeStyle = '#0033AA';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(-size * 0.1, -size * 0.7 + i * size * 0.05);
                ctx.lineTo(size * 0.15, -size * 0.65 + i * size * 0.05);
                ctx.stroke();
            }
            // 4. Face branca (com borda)
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(size * 0.45, -size * 0.1, size * 0.5, size * 0.5, -0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#F5F5F5';
            ctx.beginPath();
            ctx.ellipse(size * 0.5, -size * 0.05, size * 0.3, size * 0.3, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Borda sutil
            ctx.strokeStyle = '#E0E0E0';
            ctx.lineWidth = 0.25;
            ctx.beginPath();
            ctx.ellipse(size * 0.45, -size * 0.1, size * 0.5, size * 0.5, -0.1, 0, Math.PI * 2);
            ctx.stroke();
            // 5. Padrão de penas pretas ao redor dos olhos (em leque)
            ctx.fillStyle = '#000000';
            for (let i = 0; i < 5; i++) {
                const angle = (i - 2) * 0.15;
                const x = size * 0.35 + i * size * 0.05;
                const y = -size * 0.15;
                ctx.beginPath();
                ctx.ellipse(x, y, size * 0.04, size * 0.03, angle, 0, Math.PI * 2);
                ctx.fill();
            }
            for (let i = 0; i < 4; i++) {
                const angle = (i - 1.5) * 0.12;
                const x = size * 0.4 + i * size * 0.05;
                const y = size * 0.1;
                ctx.beginPath();
                ctx.ellipse(x, y, size * 0.035, size * 0.025, angle, 0, Math.PI * 2);
                ctx.fill();
            }
            for (let i = 0; i < 3; i++) {
                const angle = (i - 1) * 0.1;
                const x = size * 0.25 + i * size * 0.08;
                const y = -size * 0.05;
                ctx.beginPath();
                ctx.ellipse(x, y, size * 0.03, size * 0.02, angle, 0, Math.PI * 2);
                ctx.fill();
            }
            // Linhas conectando as penas
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.1;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(size * 0.35 + i * size * 0.05, -size * 0.15);
                ctx.lineTo(size * 0.4 + i * size * 0.05, size * 0.1);
                ctx.stroke();
            }
            // 6. Transição entre azul e amarelo
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 0.25;
            ctx.beginPath();
            ctx.moveTo(-size * 0.4, size * 0.15);
            ctx.quadraticCurveTo(0, size * 0.2, size * 0.4, size * 0.15);
            ctx.stroke();
            ctx.strokeStyle = '#FF8C00';
            ctx.lineWidth = 0.15;
            ctx.beginPath();
            ctx.moveTo(-size * 0.38, size * 0.18);
            ctx.quadraticCurveTo(0, size * 0.22, size * 0.38, size * 0.18);
            ctx.stroke();
            // 7. Cauda (com padrão de penas)
            ctx.fillStyle = '#0066FF';
            ctx.beginPath();
            ctx.ellipse(-size * 0.5, size * 0.3, size * 0.2, size * 0.4, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0044CC';
            ctx.beginPath();
            ctx.ellipse(-size * 0.55, size * 0.4, size * 0.15, size * 0.3, -0.3, 0, Math.PI * 2);
            ctx.fill();
            // Padrão de penas na cauda
            ctx.strokeStyle = '#0033AA';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(-size * 0.6, size * 0.25 + i * size * 0.1);
                ctx.lineTo(-size * 0.45, size * 0.3 + i * size * 0.1);
                ctx.stroke();
            }
            break;

        case 'flamingo': // Flamingo
            // Pescoço longo e curvado
            ctx.fillStyle = '#FF69B4'; // Rosa coral vibrante
            ctx.beginPath();
            ctx.ellipse(-size * 0.25, -size * 0.75, size * 0.19, size * 0.63, -0.3, 0, Math.PI * 2);
            ctx.fill();
            // Cabeça arredondada
            ctx.beginPath();
            ctx.arc(-size * 0.38, -size * 1.13, size * 0.31, 0, Math.PI * 2);
            ctx.fill();
            // Asas com penas mais escuras
            ctx.fillStyle = '#FF1493'; // Rosa mais profundo
            ctx.beginPath();
            ctx.ellipse(-size * 0.38, -size * 0.13, size * 0.56, size * 0.44, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Segunda camada de asas
            ctx.beginPath();
            ctx.ellipse(-size * 0.31, size * 0.13, size * 0.44, size * 0.35, -0.15, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'gaviao-caramujeiro': // Gavião Caramujeiro
            // Padrão de penas escuras com textura sutil
            ctx.fillStyle = '#0d0d0d'; // Preto mais profundo para asas
            ctx.beginPath();
            ctx.ellipse(-size * 0.44, -size * 0.13, size * 0.63, size * 0.5, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Segunda camada de penas escuras
            ctx.beginPath();
            ctx.ellipse(-size * 0.35, size * 0.13, size * 0.5, size * 0.38, -0.15, 0, Math.PI * 2);
            ctx.fill();
            // Detalhes sutis de textura nas penas
            ctx.fillStyle = '#2c2c2c'; // Cinza muito escuro para textura
            const textureSpots = [
                { x: -size * 0.38, y: -size * 0.06, size: size * 0.1 },
                { x: -size * 0.25, y: size * 0.19, size: size * 0.08 },
                { x: -size * 0.19, y: size * 0.31, size: size * 0.09 }
            ];
            textureSpots.forEach(spot => {
                ctx.beginPath();
                ctx.arc(spot.x, spot.y, spot.size, 0, Math.PI * 2);
                ctx.fill();
            });
            break;

        case 'cavalaria': // Cavalaria-do-brejo
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(-size * 0.5, -size * 0.25, size * 0.63, size * 0.5, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-size * 0.38, size * 0.13, size * 0.5, size * 0.38, -0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-size * 0.63, size * 0.38, size * 0.38, size * 0.31, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.19, size * 0.63, size * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 0.25;
            ctx.beginPath();
            ctx.arc(size * 1.25, -size * 0.63, size * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            break;

        case 'lavadeira': // Lavadeira-de-cauda
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(-size * 0.5, -size * 0.13, size * 0.63, size * 0.44, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-size * 0.38, size * 0.19, size * 0.5, size * 0.38, -0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(-size * 0.44, size * 0.06, size * 0.19, size * 0.1, -0.2, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'saracura': // Saracura três potes
            ctx.fillStyle = '#708090';
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.63, size * 0.5, size * 0.38, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.25, size * 0.31, size * 0.44, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#6B8E23';
            ctx.beginPath();
            ctx.ellipse(-size * 0.38, -size * 0.13, size * 0.63, size * 0.5, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-size * 0.31, size * 0.13, size * 0.5, size * 0.38, -0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2F4F2F';
            ctx.beginPath();
            ctx.ellipse(-size * 0.63, size * 0.31, size * 0.31, size * 0.25, -0.3, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'owl': // Coruja
            const owlSize = size;
            const earHeight = owlSize * 0.75;
            const topOfHead = -owlSize * 1.06;
            ctx.fillStyle = wingColor || '#2C2C2C';
            ctx.beginPath();
            ctx.moveTo(-owlSize * 0.63, topOfHead + earHeight * 0.38);
            ctx.lineTo(-owlSize * 0.44, topOfHead - earHeight * 0.63);
            ctx.lineTo(-owlSize * 0.19, topOfHead + earHeight * 0.38);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(owlSize * 0.19, topOfHead + earHeight * 0.38);
            ctx.lineTo(owlSize * 0.44, topOfHead - earHeight * 0.63);
            ctx.lineTo(owlSize * 0.69, topOfHead + earHeight * 0.38);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.moveTo(-owlSize * 0.56, topOfHead + earHeight * 0.44);
            ctx.lineTo(-owlSize * 0.44, topOfHead - earHeight * 0.38);
            ctx.lineTo(-owlSize * 0.28, topOfHead + earHeight * 0.44);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(owlSize * 0.28, topOfHead + earHeight * 0.44);
            ctx.lineTo(owlSize * 0.44, topOfHead - earHeight * 0.38);
            ctx.lineTo(owlSize * 0.6, topOfHead + earHeight * 0.44);
            ctx.closePath();
            ctx.fill();
            break;

        case 'toucan': // Tucano
            const toucanSize = size;
            // Mancha branca no peito
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(0, toucanSize * 0.25, toucanSize * 0.5, toucanSize * 0.38, 0, 0, Math.PI * 2);
            ctx.fill();
            // Linha separadora entre o peito branco e o corpo preto
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.25;
            ctx.beginPath();
            ctx.moveTo(-toucanSize * 0.5, toucanSize * 0.19);
            ctx.lineTo(toucanSize * 0.5, toucanSize * 0.19);
            ctx.stroke();
            // Detalhes nas asas (penas mais escuras - preto)
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.ellipse(-toucanSize * 0.38, 0, toucanSize * 0.31, toucanSize * 0.19, -0.3, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'gull': // Gaivota
            const gullSize = size;
            // Corpo branco (já desenhado como base)
            // Asas pretas nas costas
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            // Asa esquerda (superior)
            ctx.ellipse(-gullSize * 0.38, -gullSize * 0.13, gullSize * 0.44, gullSize * 0.19, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Asa direita (inferior)
            ctx.beginPath();
            ctx.ellipse(-gullSize * 0.31, gullSize * 0.13, gullSize * 0.38, gullSize * 0.15, 0.1, 0, Math.PI * 2);
            ctx.fill();
            // Parte superior das costas preta
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(-gullSize * 0.19, -gullSize * 0.31, gullSize * 0.25, gullSize * 0.13, -0.1, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'guara': // Guará (Scarlet Ibis)
            const guaraSize = size;
            // Corpo vermelho escarlate (já desenhado como base)
            // Pontas pretas nas penas primárias das asas
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            // Pontas pretas nas asas (penas primárias)
            ctx.ellipse(-guaraSize * 0.44, -guaraSize * 0.19, guaraSize * 0.19, guaraSize * 0.1, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-guaraSize * 0.38, guaraSize * 0.19, guaraSize * 0.15, guaraSize * 0.08, 0.1, 0, Math.PI * 2);
            ctx.fill();
            // Linhas brancas nas penas secundárias/cobertas (parte inferior das costas)
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.25;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(-guaraSize * 0.5, guaraSize * 0.13 + i * guaraSize * 0.1);
                ctx.lineTo(-guaraSize * 0.25, guaraSize * 0.19 + i * guaraSize * 0.1);
                ctx.stroke();
            }
            break;

        case 'pelican': // Pelicano
            const pelicanSize = size;
            // Corpo branco (já desenhado como base)
            // Penacho de penas brancas espetadas na parte de trás da cabeça
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 5; i++) {
                const angle = -Math.PI / 2 + (i - 2) * 0.3;
                const startX = -pelicanSize * 0.38;
                const startY = -pelicanSize * 0.5;
                const endX = startX + Math.cos(angle) * pelicanSize * 0.19;
                const endY = startY + Math.sin(angle) * pelicanSize * 0.19;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.lineWidth = 0.25;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
            }
            // Pele rosa-avermelhada ao redor dos olhos e na parte superior da cabeça
            ctx.fillStyle = '#FFB6C1';
            ctx.beginPath();
            ctx.ellipse(-pelicanSize * 0.31, -pelicanSize * 0.38, pelicanSize * 0.25, pelicanSize * 0.19, -0.1, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'pyrrhuloxia': // Pyrrhuloxia (Cardeal do Deserto)
            const pyrrhuloxiaSize = size;
            // Corpo cinza médio (já desenhado como base)
            // Crista vermelha vibrante no topo da cabeça
            ctx.strokeStyle = '#DC143C';
            ctx.lineWidth = 0.3;
            for (let i = 0; i < 5; i++) {
                const angle = -Math.PI / 2 + (i - 2) * 0.25;
                const startX = pyrrhuloxiaSize * 0.31;
                const startY = -pyrrhuloxiaSize * 0.5;
                const endX = startX + Math.cos(angle) * pyrrhuloxiaSize * 0.25;
                const endY = startY + Math.sin(angle) * pyrrhuloxiaSize * 0.25;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
            // Máscara vermelha ao redor dos olhos
            ctx.fillStyle = '#DC143C';
            ctx.beginPath();
            ctx.ellipse(pyrrhuloxiaSize * 0.38, -pyrrhuloxiaSize * 0.19, pyrrhuloxiaSize * 0.19, pyrrhuloxiaSize * 0.15, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Peito e barriga vermelho-rosado
            ctx.fillStyle = '#FF69B4';
            ctx.beginPath();
            ctx.ellipse(pyrrhuloxiaSize * 0.25, pyrrhuloxiaSize * 0.13, pyrrhuloxiaSize * 0.44, pyrrhuloxiaSize * 0.31, 0, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'acorn-woodpecker': // Acorn Woodpecker (Pica-pau das Bolotas)
            const acornWoodpeckerSizeScore = size;
            // Corpo preto brilhante (já desenhado como base)
            // Capa vermelha brilhante no topo da cabeça
            ctx.fillStyle = '#DC143C';
            ctx.beginPath();
            ctx.ellipse(acornWoodpeckerSizeScore * 0.25, -acornWoodpeckerSizeScore * 0.5, acornWoodpeckerSizeScore * 0.38, acornWoodpeckerSizeScore * 0.19, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Mancha branca acima do bico
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(acornWoodpeckerSizeScore * 0.44, -acornWoodpeckerSizeScore * 0.31, acornWoodpeckerSizeScore * 0.13, acornWoodpeckerSizeScore * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            // Faixa branca atrás do olho (bigode/bochecha)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(acornWoodpeckerSizeScore * 0.31, -acornWoodpeckerSizeScore * 0.13, acornWoodpeckerSizeScore * 0.25, acornWoodpeckerSizeScore * 0.15, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Mancha branca no ombro/asa superior
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(-acornWoodpeckerSizeScore * 0.25, -acornWoodpeckerSizeScore * 0.06, acornWoodpeckerSizeScore * 0.19, acornWoodpeckerSizeScore * 0.13, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Mancha branca maior no flanco inferior
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(-acornWoodpeckerSizeScore * 0.19, acornWoodpeckerSizeScore * 0.25, acornWoodpeckerSizeScore * 0.25, acornWoodpeckerSizeScore * 0.19, 0.1, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'virginias-warbler': // Virginia's Warbler
            const warblerSize = size;
            // Corpo cinza claro (já desenhado como base)
            // Mancha amarela brilhante na testa
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(warblerSize * 0.38, -warblerSize * 0.38, warblerSize * 0.15, warblerSize * 0.1, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Garganta e peito superior branco
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(warblerSize * 0.25, -warblerSize * 0.06, warblerSize * 0.31, warblerSize * 0.19, 0, 0, Math.PI * 2);
            ctx.fill();
            // Parte inferior amarelo vibrante
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(warblerSize * 0.19, warblerSize * 0.19, warblerSize * 0.38, warblerSize * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            // Estrias cinza mais escuras nas asas
            ctx.fillStyle = '#808080';
            ctx.beginPath();
            ctx.ellipse(-warblerSize * 0.31, -warblerSize * 0.13, warblerSize * 0.25, warblerSize * 0.1, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-warblerSize * 0.25, warblerSize * 0.13, warblerSize * 0.23, warblerSize * 0.09, 0.1, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'bearded-vulture': // Abutre Barbudo (Lammergeier)
            const vultureSize = size;
            // Corpo base (bege creme no peito inferior, já desenhado)
            // Cabeça branca
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(vultureSize * 0.31, -vultureSize * 0.44, vultureSize * 0.31, vultureSize * 0.25, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Máscara preta
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(vultureSize * 0.38, -vultureSize * 0.31, vultureSize * 0.19, vultureSize * 0.15, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // "Barba" ou tufo de cerdas pretas
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.3;
            for (let i = 0; i < 5; i++) {
                const angle = Math.PI / 2 + (i - 2) * 0.2;
                const startX = vultureSize * 0.38;
                const startY = -vultureSize * 0.19;
                const endX = startX + Math.cos(angle) * vultureSize * 0.13;
                const endY = startY + Math.sin(angle) * vultureSize * 0.13;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
            // Pescoço e peito superior laranja-marrom
            ctx.fillStyle = '#CD853F';
            ctx.beginPath();
            ctx.ellipse(vultureSize * 0.19, -vultureSize * 0.13, vultureSize * 0.31, vultureSize * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            // Asas cinza ardósia
            ctx.fillStyle = '#708090';
            ctx.beginPath();
            ctx.ellipse(-vultureSize * 0.25, -vultureSize * 0.06, vultureSize * 0.38, vultureSize * 0.19, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-vultureSize * 0.19, vultureSize * 0.13, vultureSize * 0.31, vultureSize * 0.15, 0.1, 0, Math.PI * 2);
            ctx.fill();
            // Estrias paralelas nas asas
            ctx.strokeStyle = '#556B2F';
            ctx.lineWidth = 0.25;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(-vultureSize * 0.5, -vultureSize * 0.06 + i * vultureSize * 0.06);
                ctx.lineTo(-vultureSize * 0.13, -vultureSize * 0.06 + i * vultureSize * 0.06);
                ctx.stroke();
            }
            break;

        case 'phainopepla': // Phainopepla
            const phainopeplaSizeScore = size;
            // Corpo preto brilhante (já desenhado como base)
            // Crista de penas pretas na cabeça
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.3;
            for (let i = 0; i < 6; i++) {
                const angle = -Math.PI / 2 + (i - 2.5) * 0.2;
                const startX = phainopeplaSizeScore * 0.31;
                const startY = -phainopeplaSizeScore * 0.5;
                const endX = startX + Math.cos(angle) * phainopeplaSizeScore * 0.19;
                const endY = startY + Math.sin(angle) * phainopeplaSizeScore * 0.19;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
            // Manchas vermelhas brilhantes abaixo de cada olho (nas bochechas)
            ctx.fillStyle = '#DC143C';
            ctx.beginPath();
            ctx.arc(phainopeplaSizeScore * 0.38, -phainopeplaSizeScore * 0.19, phainopeplaSizeScore * 0.1, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'tuiuiu': // Tuiuiu (Jabiru)
            const tuiuiuSizeScore = size;
            // Cabeça e pescoço superior pretos
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(tuiuiuSizeScore * 0.31, -tuiuiuSizeScore * 0.38, tuiuiuSizeScore * 0.5, 0, Math.PI * 2);
            ctx.fill();
            // Pescoço superior preto
            ctx.beginPath();
            ctx.ellipse(tuiuiuSizeScore * 0.31, -tuiuiuSizeScore * 0.13, tuiuiuSizeScore * 0.31, tuiuiuSizeScore * 0.44, 0, 0, Math.PI * 2);
            ctx.fill();
            // Colar vermelho vibrante ao redor do pescoço
            const collarYScore = tuiuiuSizeScore * 0.19;
            ctx.fillStyle = '#e74c3c'; // Vermelho vibrante
            ctx.beginPath();
            ctx.ellipse(tuiuiuSizeScore * 0.31, collarYScore, tuiuiuSizeScore * 0.44, tuiuiuSizeScore * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            // Detalhe do colar (textura/brilho)
            ctx.fillStyle = '#c0392b'; // Vermelho mais escuro para profundidade
            ctx.beginPath();
            ctx.ellipse(tuiuiuSizeScore * 0.31, collarYScore - tuiuiuSizeScore * 0.03, tuiuiuSizeScore * 0.4, tuiuiuSizeScore * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            // Olho pequeno e escuro (na cabeça preta)
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(tuiuiuSizeScore * 0.56, -tuiuiuSizeScore * 0.31, tuiuiuSizeScore * 0.13, 0, Math.PI * 2);
            ctx.fill();
            // Brilho no olho
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(tuiuiuSizeScore * 0.59, -tuiuiuSizeScore * 0.34, tuiuiuSizeScore * 0.05, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'prairie-falcon': // Falcão-das-pradarias
            const falconSizeScore = size;
            // Capa marrom na cabeça
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.ellipse(falconSizeScore * 0.19, -falconSizeScore * 0.44, falconSizeScore * 0.31, falconSizeScore * 0.19, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Garganta branca
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(falconSizeScore * 0.25, -falconSizeScore * 0.13, falconSizeScore * 0.25, falconSizeScore * 0.19, 0, 0, Math.PI * 2);
            ctx.fill();
            // Listras malares pretas (bigodes)
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(falconSizeScore * 0.38, -falconSizeScore * 0.25);
            ctx.lineTo(falconSizeScore * 0.5, -falconSizeScore * 0.06);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(falconSizeScore * 0.4, -falconSizeScore * 0.19);
            ctx.lineTo(falconSizeScore * 0.52, 0);
            ctx.stroke();
            // Área ao redor dos olhos e cere amarelo vibrante
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(falconSizeScore * 0.38, -falconSizeScore * 0.25, falconSizeScore * 0.15, falconSizeScore * 0.13, -0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(falconSizeScore * 0.5, -falconSizeScore * 0.06, falconSizeScore * 0.1, falconSizeScore * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();
            // Peito e barriga brancos com manchas/escalas escuras
            ctx.fillStyle = '#2F2F2F';
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 2; j++) {
                    const spotX = falconSizeScore * 0.13 + i * falconSizeScore * 0.15;
                    const spotY = falconSizeScore * 0.13 + j * falconSizeScore * 0.13;
                    ctx.beginPath();
                    ctx.ellipse(spotX, spotY, falconSizeScore * 0.06, falconSizeScore * 0.05, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            // Costas e asas com padrão escamado/barrado
            ctx.fillStyle = '#8B7355';
            ctx.beginPath();
            ctx.ellipse(-falconSizeScore * 0.25, -falconSizeScore * 0.06, falconSizeScore * 0.38, falconSizeScore * 0.19, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Barras escuras nas asas
            ctx.strokeStyle = '#5C4A3A';
            ctx.lineWidth = 0.3;
            for (let i = 0; i < 2; i++) {
                ctx.beginPath();
                ctx.moveTo(-falconSizeScore * 0.5, -falconSizeScore * 0.06 + i * falconSizeScore * 0.1);
                ctx.lineTo(-falconSizeScore * 0.13, -falconSizeScore * 0.06 + i * falconSizeScore * 0.1);
                ctx.stroke();
            }
            // Manchas brancas nas asas
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(-falconSizeScore * 0.31, -falconSizeScore * 0.06, falconSizeScore * 0.1, falconSizeScore * 0.08, -0.2, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'ground-dove': // Rolinha
            const doveSizeScore = size;
            // Cabeça cinza pálida
            ctx.fillStyle = '#E8E8E8';
            ctx.beginPath();
            ctx.ellipse(doveSizeScore * 0.25, -doveSizeScore * 0.38, doveSizeScore * 0.25, doveSizeScore * 0.19, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Corpo rosa poeirento
            ctx.fillStyle = '#D2B48C';
            ctx.beginPath();
            ctx.ellipse(doveSizeScore * 0.13, doveSizeScore * 0.13, doveSizeScore * 0.38, doveSizeScore * 0.31, 0, 0, Math.PI * 2);
            ctx.fill();
            // Manchas escuras nas asas
            ctx.fillStyle = '#8B4513';
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 2; j++) {
                    const spotX = -doveSizeScore * 0.25 + i * doveSizeScore * 0.15;
                    const spotY = -doveSizeScore * 0.06 + j * doveSizeScore * 0.19;
                    ctx.beginPath();
                    ctx.ellipse(spotX, spotY, doveSizeScore * 0.08, doveSizeScore * 0.06, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            // Estrias nas asas
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 0.2;
            for (let i = 0; i < 2; i++) {
                ctx.beginPath();
                ctx.moveTo(-doveSizeScore * 0.38, -doveSizeScore * 0.06 + i * doveSizeScore * 0.1);
                ctx.lineTo(-doveSizeScore * 0.13, doveSizeScore * 0.06 + i * doveSizeScore * 0.1);
                ctx.stroke();
            }
            // Cauda mais escura
            ctx.fillStyle = '#CD853F';
            ctx.beginPath();
            ctx.ellipse(-doveSizeScore * 0.44, doveSizeScore * 0.19, doveSizeScore * 0.19, doveSizeScore * 0.15, 0.1, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'rufous-backed-thrush': // Sabiá do Campo
            const thrushSizeScore = size;
            // Faixa branca/creme pálida acima do olho
            ctx.fillStyle = '#F5F5DC';
            ctx.beginPath();
            ctx.ellipse(thrushSizeScore * 0.25, -thrushSizeScore * 0.44, thrushSizeScore * 0.31, thrushSizeScore * 0.13, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Faixa escura/preta através do olho
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(thrushSizeScore * 0.25, -thrushSizeScore * 0.31, thrushSizeScore * 0.38, thrushSizeScore * 0.1, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Área abaixo do olho em cinza-marrom claro
            ctx.fillStyle = '#D2B48C';
            ctx.beginPath();
            ctx.ellipse(thrushSizeScore * 0.19, -thrushSizeScore * 0.19, thrushSizeScore * 0.25, thrushSizeScore * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            // Corpo marrom-acinzentado
            ctx.fillStyle = '#8B7355';
            ctx.beginPath();
            ctx.ellipse(thrushSizeScore * 0.13, thrushSizeScore * 0.13, thrushSizeScore * 0.38, thrushSizeScore * 0.31, 0, 0, Math.PI * 2);
            ctx.fill();
            // Asas com padrão: bordas claras
            ctx.strokeStyle = '#F5F5DC';
            ctx.lineWidth = 0.2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(-thrushSizeScore * 0.25 + i * thrushSizeScore * 0.1, -thrushSizeScore * 0.06, thrushSizeScore * 0.08, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Cauda longa e escura
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.ellipse(-thrushSizeScore * 0.44, thrushSizeScore * 0.25, thrushSizeScore * 0.25, thrushSizeScore * 0.19, 0.1, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'orange-thrush': // Sabiá Laranjeira
            const orangeThrushSizeScore = size;
            // Dorso e asas marrom-oliva escuro
            ctx.fillStyle = '#556B2F';
            ctx.beginPath();
            ctx.ellipse(-orangeThrushSizeScore * 0.25, -orangeThrushSizeScore * 0.06, orangeThrushSizeScore * 0.38, orangeThrushSizeScore * 0.19, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Cauda longa e esbelta
            ctx.beginPath();
            ctx.ellipse(-orangeThrushSizeScore * 0.44, orangeThrushSizeScore * 0.25, orangeThrushSizeScore * 0.25, orangeThrushSizeScore * 0.19, 0.1, 0, Math.PI * 2);
            ctx.fill();
            // Cabeça marrom escuro
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.ellipse(orangeThrushSizeScore * 0.25, -orangeThrushSizeScore * 0.38, orangeThrushSizeScore * 0.25, orangeThrushSizeScore * 0.19, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Garganta e peito superior cinza-esbranquiçado claro
            ctx.fillStyle = '#F5F5F5';
            ctx.beginPath();
            ctx.ellipse(orangeThrushSizeScore * 0.19, -orangeThrushSizeScore * 0.06, orangeThrushSizeScore * 0.31, orangeThrushSizeScore * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            // Estrias verticais escuras finas
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 0.15;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(orangeThrushSizeScore * 0.06 + i * orangeThrushSizeScore * 0.06, -orangeThrushSizeScore * 0.19);
                ctx.lineTo(orangeThrushSizeScore * 0.06 + i * orangeThrushSizeScore * 0.06, orangeThrushSizeScore * 0.06);
                ctx.stroke();
            }
            // Barriga laranja-vermelho vibrante
            ctx.fillStyle = '#FF4500';
            ctx.beginPath();
            ctx.ellipse(orangeThrushSizeScore * 0.13, orangeThrushSizeScore * 0.25, orangeThrushSizeScore * 0.38, orangeThrushSizeScore * 0.31, 0, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'sayaca-tanager': // Sanhaço Cinzento
            const tanagerSizeScore = size;
            // Cabeça em tom mais claro de cinza-azulado
            ctx.fillStyle = '#B0C4DE'; // Cinza-azulado claro
            ctx.beginPath();
            ctx.ellipse(tanagerSizeScore * 0.25, -tanagerSizeScore * 0.38, tanagerSizeScore * 0.25, tanagerSizeScore * 0.19, -0.1, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'kiskadee': // Bem-te-vi
            const kiskadeeSizeScore = size;
            // Coroa branca
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(kiskadeeSizeScore * 0.25, -kiskadeeSizeScore * 0.44, kiskadeeSizeScore * 0.31, kiskadeeSizeScore * 0.19, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Faixa ocular preta
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(kiskadeeSizeScore * 0.31, -kiskadeeSizeScore * 0.31, kiskadeeSizeScore * 0.38, kiskadeeSizeScore * 0.13, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Bochechas e garganta brancas
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(kiskadeeSizeScore * 0.25, -kiskadeeSizeScore * 0.13, kiskadeeSizeScore * 0.25, kiskadeeSizeScore * 0.19, 0, 0, Math.PI * 2);
            ctx.fill();
            // Costas marrom-oliva
            ctx.fillStyle = '#556B2F';
            ctx.beginPath();
            ctx.ellipse(-kiskadeeSizeScore * 0.19, -kiskadeeSizeScore * 0.06, kiskadeeSizeScore * 0.38, kiskadeeSizeScore * 0.19, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Peito e barriga amarelo vibrante
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(kiskadeeSizeScore * 0.13, kiskadeeSizeScore * 0.13, kiskadeeSizeScore * 0.31, kiskadeeSizeScore * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'barn-owl': // Coruja Suindara
            const barnOwlSizeScore = size;
            const topOfHeadBarnScore = -barnOwlSizeScore * 1.06;
            
            // Disco facial branco em formato de coração
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(barnOwlSizeScore * 0.19, -barnOwlSizeScore * 0.13, barnOwlSizeScore * 0.44, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(barnOwlSizeScore * 0.56, -barnOwlSizeScore * 0.13, barnOwlSizeScore * 0.35, 0, Math.PI * 2);
            ctx.fill();
            // Parte inferior do coração (ponta)
            ctx.beginPath();
            ctx.moveTo(-barnOwlSizeScore * 0.13, -barnOwlSizeScore * 0.13);
            ctx.lineTo(barnOwlSizeScore * 0.88, -barnOwlSizeScore * 0.13);
            ctx.lineTo(barnOwlSizeScore * 0.38, barnOwlSizeScore * 0.38);
            ctx.closePath();
            ctx.fill();
            
            // Borda dourada pálida ao redor do disco facial
            ctx.strokeStyle = '#D2B48C';
            ctx.lineWidth = 0.25;
            ctx.beginPath();
            ctx.arc(barnOwlSizeScore * 0.19, -barnOwlSizeScore * 0.13, barnOwlSizeScore * 0.44, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(barnOwlSizeScore * 0.56, -barnOwlSizeScore * 0.13, barnOwlSizeScore * 0.35, 0, Math.PI * 2);
            ctx.stroke();
            
            // Testa dourada pálida
            ctx.fillStyle = '#F5DEB3';
            ctx.beginPath();
            ctx.ellipse(barnOwlSizeScore * 0.38, -barnOwlSizeScore * 0.63, barnOwlSizeScore * 0.38, barnOwlSizeScore * 0.19, -0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // Coroa com padrão cinza e branco manchado
            ctx.fillStyle = '#E0E0E0';
            ctx.beginPath();
            ctx.ellipse(barnOwlSizeScore * 0.38, topOfHeadBarnScore, barnOwlSizeScore * 0.38, barnOwlSizeScore * 0.19, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Manchas escuras na coroa
            ctx.fillStyle = '#808080';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(barnOwlSizeScore * 0.19 + i * barnOwlSizeScore * 0.19, topOfHeadBarnScore, barnOwlSizeScore * 0.05, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Padrão de penas manchadas no peito (branco com pequenas manchas escuras esparsas)
            ctx.fillStyle = 'rgba(128,128,128,0.3)';
            for (let row = 0; row < 2; row++) {
                for (let i = 0; i < 3; i++) {
                    if (Math.random() > 0.3) {
                        ctx.beginPath();
                        ctx.arc(
                            -barnOwlSizeScore * 0.25 + i * barnOwlSizeScore * 0.31,
                            barnOwlSizeScore * 0.25 + row * barnOwlSizeScore * 0.25,
                            barnOwlSizeScore * 0.05,
                            0, Math.PI * 2
                        );
                        ctx.fill();
                    }
                }
            }
            
            // Asas e costas com padrão dourado-marrom
            ctx.fillStyle = '#D2B48C';
            ctx.beginPath();
            ctx.ellipse(-barnOwlSizeScore * 0.38, -barnOwlSizeScore * 0.13, barnOwlSizeScore * 0.5, barnOwlSizeScore * 0.25, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Manchas cinza nas asas
            ctx.fillStyle = '#E0E0E0';
            ctx.beginPath();
            ctx.ellipse(-barnOwlSizeScore * 0.44, 0, barnOwlSizeScore * 0.25, barnOwlSizeScore * 0.19, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Manchas escuras nas asas
            ctx.fillStyle = 'rgba(101,67,33,0.4)';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(-barnOwlSizeScore * 0.5 + i * barnOwlSizeScore * 0.15, -barnOwlSizeScore * 0.13, barnOwlSizeScore * 0.04, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'caracara': // Carcará
            const caracaraSizeScore = size;
            // Crista preta no topo da cabeça
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(caracaraSizeScore * 0.25, -caracaraSizeScore * 0.5, caracaraSizeScore * 0.31, caracaraSizeScore * 0.19, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Pele facial laranja-vermelho ao redor dos olhos e bico
            ctx.fillStyle = '#FF4500';
            ctx.beginPath();
            ctx.ellipse(caracaraSizeScore * 0.31, -caracaraSizeScore * 0.31, caracaraSizeScore * 0.25, caracaraSizeScore * 0.19, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Garganta e pescoço superior brancos
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(caracaraSizeScore * 0.19, -caracaraSizeScore * 0.13, caracaraSizeScore * 0.25, caracaraSizeScore * 0.19, 0, 0, Math.PI * 2);
            ctx.fill();
            // Peito branco com barrado escuro
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(caracaraSizeScore * 0.13, caracaraSizeScore * 0.06, caracaraSizeScore * 0.31, caracaraSizeScore * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            // Barrado escuro (listras horizontais)
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 0.2;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(-caracaraSizeScore * 0.13, caracaraSizeScore * 0.13 + i * caracaraSizeScore * 0.06);
                ctx.lineTo(caracaraSizeScore * 0.38, caracaraSizeScore * 0.13 + i * caracaraSizeScore * 0.06);
                ctx.stroke();
            }
            break;
    }
}

function drawScoreBird(x, y, color, wingColor, facingRight, scale = 1, type = null, beakColor = null, eyeColor = null) {
    ctx.save();
    ctx.translate(x, y);

    // Espelhar se estiver virado para esquerda (antes do scale)
    if (!facingRight) {
        ctx.scale(-1, 1);
    }

    // Aplicar scale após o espelhamento
    ctx.scale(scale, scale);

    const size = 8; // Tamanho base

    // Corpo - para Tuiuiu e Falcão-das-pradarias, garantir que seja branco
    const bodyColor = (type === 'tuiuiu' || type === 'prairie-falcon') ? '#ffffff' : color;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    // Asa - para Tuiuiu e Falcão-das-pradarias, usar cor apropriada
    let finalWingColor = wingColor;
    if (type === 'tuiuiu') {
        finalWingColor = '#f5f5f5';
    } else if (type === 'prairie-falcon') {
        finalWingColor = '#8B7355'; // Marrom acinzentado para asas
    }
    ctx.fillStyle = finalWingColor;
    ctx.beginPath();
    ctx.ellipse(-3, 2, 5, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Detalhes específicos do tipo
    if (type) {
        drawScoreBirdTypeDetails(ctx, type, size, wingColor, color, beakColor, eyeColor);
    }

    // Olho bravo (não desenhar para Bacurau e Tuiuiu, pois já foram desenhados nos detalhes)
    if (type !== 'bacurau' && type !== 'tuiuiu') {
        if (type === 'toucan') {
            // Tucano - olho azul com anel laranja
            // Anel laranja ao redor do olho
            ctx.fillStyle = '#FF8C00';
            ctx.beginPath();
            ctx.arc(3, -2, 2.2, 0, Math.PI * 2);
            ctx.fill();
            // Olho azul
            ctx.fillStyle = '#4169E1';
            ctx.beginPath();
            ctx.arc(3, -2, 1.8, 0, Math.PI * 2);
            ctx.fill();
            // Pupila preta
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(3.3, -2, 1.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'gull') {
            // Gaivota - olho vermelho-laranja com anel amarelo claro
            // Anel amarelo claro ao redor do olho
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(3, -2, 2.2, 0, Math.PI * 2);
            ctx.fill();
            // Olho vermelho-laranja
            ctx.fillStyle = '#FF4500';
            ctx.beginPath();
            ctx.arc(3, -2, 1.8, 0, Math.PI * 2);
            ctx.fill();
            // Pupila preta
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(3.3, -2, 1.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'guara') {
                // Guará - olho pequeno e escuro com anel rosa-avermelhado
                // Anel rosa-avermelhado ao redor do olho
                ctx.fillStyle = '#FF69B4';
                ctx.beginPath();
                ctx.arc(3, -2, 1.8, 0, Math.PI * 2);
                ctx.fill();
                // Olho escuro
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 1.3, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'pelican') {
                // Pelicano - olho pequeno e escuro com anel rosa-avermelhado
                // Anel rosa-avermelhado ao redor do olho
                ctx.fillStyle = '#FF69B4';
                ctx.beginPath();
                ctx.arc(3, -2, 1.8, 0, Math.PI * 2);
                ctx.fill();
                // Olho escuro
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 1.3, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'pyrrhuloxia') {
                // Pyrrhuloxia - olho vermelho brilhante
                ctx.fillStyle = '#DC143C';
                ctx.beginPath();
                ctx.arc(3, -2, 1.8, 0, Math.PI * 2);
                ctx.fill();
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'acorn-woodpecker') {
                // Acorn Woodpecker - olho escuro com íris vermelho-marrom
                ctx.fillStyle = '#8B4513'; // Íris vermelho-marrom
                ctx.beginPath();
                ctx.arc(3, -2, 1.8, 0, Math.PI * 2);
                ctx.fill();
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'virginias-warbler') {
                // Virginia's Warbler - olho pequeno, redondo e preto
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'bearded-vulture') {
                // Abutre Barbudo - olho vermelho intenso com pupila preta
                ctx.fillStyle = '#DC143C'; // Vermelho intenso
                ctx.beginPath();
                ctx.arc(3, -2, 1.8, 0, Math.PI * 2);
                ctx.fill();
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'phainopepla') {
                // Phainopepla - olho vermelho intenso com pupila preta
                ctx.fillStyle = '#DC143C'; // Vermelho intenso
                ctx.beginPath();
                ctx.arc(3, -2, 1.5, 0, Math.PI * 2);
                ctx.fill();
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 1, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'prairie-falcon') {
                // Falcão-das-pradarias - olho escuro
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'ground-dove') {
                // Rolinha - olho vermelho brilhante
                ctx.fillStyle = '#DC143C'; // Vermelho brilhante
                ctx.beginPath();
                ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
                ctx.fill();
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 0.8, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'rufous-backed-thrush') {
                // Sabiá do Campo - olho amarelo brilhante
                ctx.fillStyle = '#FFD700'; // Amarelo brilhante
                ctx.beginPath();
                ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
                ctx.fill();
                // Pupila escura
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 0.8, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'rufous-backed-thrush') {
                // Sabiá do Campo - olho amarelo brilhante
                ctx.fillStyle = '#FFD700'; // Amarelo brilhante
                ctx.beginPath();
                ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
                ctx.fill();
                // Pupila escura
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 0.8, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'orange-thrush') {
                // Sabiá Laranjeira - olho com anel laranja-amarelo claro e íris laranja-marrom claro
                // Anel ocular laranja-amarelo claro
                ctx.fillStyle = '#FFD700'; // Laranja-amarelo claro
                ctx.beginPath();
                ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
                ctx.fill();
                // Íris laranja-marrom claro
                ctx.fillStyle = '#D2691E'; // Laranja-marrom claro
                ctx.beginPath();
                ctx.arc(3, -2, 0.9, 0, Math.PI * 2);
                ctx.fill();
                // Pupila escura
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 0.6, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'sayaca-tanager') {
                // Sanhaço Cinzento - olho escuro
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 0.6, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'kiskadee') {
                // Bem-te-vi - olho escuro
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 0.6, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'caracara') {
                // Carcará - olho marrom escuro com anel orbital laranja-vermelho
                // Anel orbital laranja-vermelho
                ctx.fillStyle = '#FF4500';
                ctx.beginPath();
                ctx.arc(3, -2, 1.5, 0, Math.PI * 2);
                ctx.fill();
                // Olho marrom escuro/preto
                ctx.fillStyle = '#8B4513';
                ctx.beginPath();
                ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
                ctx.fill();
                // Pupila preta
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 0.8, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'barn-owl') {
                // Coruja Suindara - olhos grandes, redondos e escuros (quase pretos)
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(3, -2, 1.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(3, -2, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Pupila - usar cor específica se disponível, senão vermelho padrão
            if (type === 'saracura' && eyeColor) {
                ctx.fillStyle = eyeColor;
            } else {
                ctx.fillStyle = '#c0392b';
            }
            ctx.beginPath();
            ctx.arc(3.5, -2, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Sobrancelha brava (diagonal para baixo)
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(1, -4);
    ctx.lineTo(5, -3);
    ctx.stroke();

    // Bico aberto (gritando) - usar cor específica se disponível
    let beakLength = 2.5;
    let beakWidth = 0.5;
    if (type === 'toucan') {
        beakLength = 5;
        beakWidth = 1;
        // Gradiente para o bico do tucano
        const gradient = ctx.createLinearGradient(size - 1, 0, size + beakLength, 0);
        gradient.addColorStop(0, '#FFD700'); // Amarelo na base
        gradient.addColorStop(0.5, '#FF8C00'); // Laranja no meio
        gradient.addColorStop(0.8, '#FF4500'); // Vermelho-laranja
        gradient.addColorStop(1, '#000000'); // Preto na ponta
        ctx.fillStyle = gradient;
    } else if (type === 'gull') {
        beakLength = 2.2;
        beakWidth = 0.6;
        ctx.fillStyle = '#FFD700'; // Bico amarelo para gaivota
    } else if (type === 'guara') {
        beakLength = 4;
        beakWidth = 0.4;
        ctx.fillStyle = '#FFE4B5'; // Bico rosa-bege para Guará
    } else if (type === 'pelican') {
        beakLength = 4;
        beakWidth = 1.2;
        ctx.fillStyle = '#FF8C00'; // Bico amarelo-laranja para pelicano
    } else if (type === 'tuiuiu') {
        beakLength = 3;
        beakWidth = 0.8;
        ctx.fillStyle = '#000000'; // Bico preto para Tuiuiu
    } else if (type === 'pyrrhuloxia') {
        beakLength = 1.5;
        beakWidth = 0.5;
        ctx.fillStyle = '#DC143C'; // Bico vermelho brilhante para Pyrrhuloxia
    } else if (type === 'acorn-woodpecker') {
        beakLength = 2.5;
        beakWidth = 0.4;
        ctx.fillStyle = '#C0C0C0'; // Bico prata-acinzentado metálico para Acorn Woodpecker
    } else if (type === 'virginias-warbler') {
        beakLength = 1.2;
        beakWidth = 0.3;
        ctx.fillStyle = '#2F2F2F'; // Bico curto, pontiagudo, cinza escuro para Virginia's Warbler
    } else if (type === 'bearded-vulture') {
        beakLength = 2.8;
        beakWidth = 0.6;
        ctx.fillStyle = '#4A4A4A'; // Bico forte, curvado, cinza escuro para Abutre Barbudo
    } else if (type === 'phainopepla') {
        beakLength = 1.5;
        beakWidth = 0.4;
        ctx.fillStyle = '#000000'; // Bico curto, grosso e pontiagudo, preto para Phainopepla
    } else if (type === 'prairie-falcon') {
        beakLength = 2.2;
        beakWidth = 0.5;
        ctx.fillStyle = '#708090'; // Bico azul-cinza para Falcão-das-pradarias
    } else if (type === 'ground-dove') {
        beakLength = 1.5;
        beakWidth = 0.3;
        ctx.fillStyle = '#F5DEB3'; // Bico fino e claro (amarelo pálido) para Rolinha
    } else if (type === 'rufous-backed-thrush') {
        beakLength = 2.5;
        beakWidth = 0.3;
        ctx.fillStyle = '#000000'; // Bico preto, longo e fino para Sabiá do Campo
    } else if (type === 'orange-thrush') {
        beakLength = 1.8;
        beakWidth = 0.3;
        ctx.fillStyle = '#FF8C00'; // Bico amarelo-laranja brilhante para Sabiá Laranjeira
    } else {
        ctx.fillStyle = beakColor || '#f39c12';
    }
    
    if (type === 'pelican') {
        // Bico do pelicano - mandíbula superior com crista vermelho-laranja, mandíbula inferior amarelo-laranja
        // Mandíbula superior com crista vermelho-laranja
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.moveTo(size - 1, -beakWidth / 3);
        ctx.lineTo(size + beakLength, beakWidth / 3);
        ctx.lineTo(size - 1, beakWidth / 2);
        ctx.closePath();
        ctx.fill();
        
        // Linha escura abaixo da crista (purplish-grey)
        ctx.strokeStyle = '#6B5B6B';
        ctx.lineWidth = 0.15;
        ctx.beginPath();
        ctx.moveTo(size - 1, beakWidth / 4);
        ctx.lineTo(size + beakLength * 0.9, beakWidth / 3);
        ctx.stroke();
        
        // Mandíbula inferior e bolsa gular amarelo-laranja vibrante
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.moveTo(size - 1, beakWidth / 2);
        ctx.lineTo(size + beakLength * 0.9, beakWidth * 1.2);
        ctx.lineTo(size - 1, beakWidth * 1.5);
        ctx.closePath();
        ctx.fill();
        
        // Bolsa gular expandida (parte inferior mais larga)
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.ellipse(size + beakLength * 0.6, beakWidth * 1.3, beakLength * 0.25, beakWidth * 0.4, 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Ponta do bico com toque vermelho-laranja
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.arc(size + beakLength * 0.95, beakWidth * 0.8, 0.2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Parte superior do bico
        ctx.beginPath();
        ctx.moveTo(size - 1, -beakWidth);
        ctx.lineTo(size + beakLength, 0);
        ctx.lineTo(size - 1, beakWidth);
        ctx.closePath();
        ctx.fill();
        
        // Parte inferior do bico (boca aberta)
        if (type === 'toucan') {
            // Gradiente para bico inferior do tucano
            const gradient2 = ctx.createLinearGradient(size - 1, beakWidth, size + beakLength * 0.8, beakWidth);
            gradient2.addColorStop(0, '#FFD700');
            gradient2.addColorStop(0.5, '#FF8C00');
            gradient2.addColorStop(0.8, '#FF4500');
            gradient2.addColorStop(1, '#000000');
            ctx.fillStyle = gradient2;
        } else if (type === 'gull') {
            ctx.fillStyle = '#FFD700';
        } else if (type === 'guara') {
            ctx.fillStyle = '#FFE4B5';
        }
        
        ctx.beginPath();
        ctx.moveTo(size - 1, beakWidth);
        ctx.lineTo(size + beakLength * 0.8, 1);
        ctx.lineTo(size - 1, beakWidth * 2);
        ctx.closePath();
        ctx.fill();
        
        // Mancha vermelho-laranja no bico da gaivota (mandíbula inferior)
        if (type === 'gull') {
            ctx.fillStyle = '#FF4500';
            ctx.beginPath();
            ctx.arc(size + beakLength * 0.7, 1, 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

// Desenhar UI do jogo no canvas
// Desenhar partículas de texto (+1, +5) quando come fruta
function drawScoreTextEffects() {
    for (let i = scoreTextEffects.length - 1; i >= 0; i--) {
        const effect = scoreTextEffects[i];

        effect.life--;
        effect.y += effect.vy;
        effect.alpha = effect.life / effect.maxLife;
        effect.scale = 1 + (1 - effect.life / effect.maxLife) * 0.3; // Cresce um pouco

        if (effect.life <= 0) {
            scoreTextEffects.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${20 * effect.scale}px Arial`;
        ctx.fillStyle = effect.text.includes('5') ? '#f1c40f' : '#2ecc71'; // Dourado para +5, verde para +1
        ctx.globalAlpha = effect.alpha;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(effect.text, effect.x, effect.y);
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

function drawGameUI() {
    const padding = 15;
    const fontSize = 32; // Aumentado para 32
    const topY = padding;
    const boxHeight = 60; // Aumentado para 60

    ctx.save();
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = 'middle'; // Mudado para middle para centralizar verticalmente

    if (isBonusStage) {
        // UI da fase bônus - Player esquerda, Tempo centro
        ctx.textAlign = 'left';
        let playerText;
        let textColor;
        if (currentArea === 7) {
            playerText = `❄️ Frutas: ${playerScore} / 25`;
            textColor = '#87CEEB';
        } else if (currentArea === 2) {
            playerText = `🦟 Insetos: ${playerScore} / 25`;
            textColor = '#8e44ad';
        } else if (currentArea === 3) {
            playerText = `🐟 Peixes: ${playerScore} / 25`;
            textColor = '#16a085';
        } else if (currentArea === 4) {
            playerText = `🌵 Frutos: ${playerScore} / 25`;
            textColor = '#f39c12';
        } else if (currentArea === 5) {
            playerText = `🍞 Pães: ${playerScore} / 25`;
            textColor = '#34495e';
        } else {
            playerText = `🪱 Minhocas: ${playerScore} / 25`;
            textColor = '#f39c12';
        }
        ctx.fillStyle = textColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(playerText, padding, topY + boxHeight / 2);
        ctx.shadowBlur = 0;

        // Timer - Centro (apenas número, cor que se destaca do céu)
        ctx.textAlign = 'center';
        const timerText = `${timeLeft}s`;

        // Cor amarela/laranja para se destacar do céu azul
        ctx.fillStyle = timeLeft <= 10 ? '#ff4444' : '#ffaa00';
        // Sombra para melhor visibilidade
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(timerText, canvas.width / 2, topY + boxHeight / 2);
        ctx.shadowBlur = 0;
    } else {
        // Fase normal
        // Player - Superior esquerdo
        ctx.textAlign = 'left';
        const playerScoreText = `${playerScore}`;
        const scoreTextWidth = ctx.measureText(playerScoreText).width;
        const birdSize = 20; // Tamanho base da ave
        const birdScale = 3.5; // Escala maior (aumentado de 2.5 para 3.5)
        const playerWidth = birdSize * birdScale + scoreTextWidth + 30; // Espaço para ave + número

        // Desenhar ave do player (maior)
        drawScoreBird(padding + birdSize * birdScale / 2, topY + boxHeight / 2, selectedPlayerColor || '#2ecc71', selectedPlayerWing || '#27ae60', true, birdScale);

        // Desenhar pontuação ao lado da ave com animação
        ctx.save();
        const playerAnimProgress = playerScoreAnimation > 0 ? playerScoreAnimation / 30 : 0;
        const playerScale = 1 + playerAnimProgress * 0.5; // Cresce até 1.5x
        const playerOffsetY = -playerAnimProgress * 5; // Move para cima
        const playerAlpha = 0.7 + playerAnimProgress * 0.3; // Fica mais brilhante

        const playerTextX = padding + birdSize * birdScale + 15;
        ctx.translate(playerTextX + ctx.measureText(playerScoreText).width / 2, topY + boxHeight / 2);
        ctx.scale(playerScale, playerScale);
        ctx.translate(-ctx.measureText(playerScoreText).width / 2, playerOffsetY);

        // Cor mais brilhante durante animação
        ctx.fillStyle = playerScoreAnimation > 0 ? '#4ade80' : '#2ecc71';
        ctx.globalAlpha = playerAlpha;
        // Sombra para melhor visibilidade
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(playerScoreText, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Timer - Centro (apenas número, cor que se destaca do céu)
        ctx.textAlign = 'center';
        const timerText = `${timeLeft}s`;

        // Cor amarela/laranja para se destacar do céu azul
        ctx.fillStyle = timeLeft <= 10 ? '#ff4444' : '#ffaa00';
        // Sombra para melhor visibilidade
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(timerText, canvas.width / 2, topY + boxHeight / 2);
        ctx.shadowBlur = 0;

        // CPU - Superior direito
        ctx.textAlign = 'right';
        const cpuScoreText = `${cpuScore}`;
        const cpuScoreTextWidth = ctx.measureText(cpuScoreText).width;
        const cpuWidth = birdSize * birdScale + cpuScoreTextWidth + 30; // Espaço para ave + número

        // Desenhar ave da CPU (maior, posicionada à direita)
        const cpuBirdX = canvas.width - padding - cpuWidth + birdSize * birdScale / 2;
        drawScoreBird(cpuBirdX, topY + boxHeight / 2, cpu.color || '#e74c3c', cpu.wingColor || '#c0392b', false, birdScale, cpu.type || null, cpu.beakColor || null, cpu.eyeColor || null);

        // Desenhar pontuação à direita da ave com animação
        ctx.save();
        const cpuAnimProgress = cpuScoreAnimation > 0 ? cpuScoreAnimation / 30 : 0;
        const cpuScale = 1 + cpuAnimProgress * 0.5; // Cresce até 1.5x
        const cpuOffsetY = -cpuAnimProgress * 5; // Move para cima
        const cpuAlpha = 0.7 + cpuAnimProgress * 0.3; // Fica mais brilhante

        const cpuTextX = canvas.width - padding - cpuWidth + birdSize * birdScale + 15;
        ctx.translate(cpuTextX + ctx.measureText(cpuScoreText).width / 2, topY + boxHeight / 2);
        ctx.scale(cpuScale, cpuScale);
        ctx.translate(-ctx.measureText(cpuScoreText).width / 2, cpuOffsetY);

        // Cor mais brilhante durante animação
        ctx.fillStyle = cpuScoreAnimation > 0 ? '#ff6b6b' : '#e74c3c';
        ctx.globalAlpha = cpuAlpha;
        // Sombra para melhor visibilidade
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 6;
        ctx.textAlign = 'left';
        ctx.fillText(cpuScoreText, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
        ctx.textAlign = 'right'; // Restaurar alinhamento

        // Barra de Stun do Player - Abaixo do placar
        const stunBarSpacing = 8; // Espaço entre placar e barra
        const stunBarWidth = playerWidth * 0.8; // 80% da largura do placar
        const stunBarHeight = 14; // Altura menor e proporcional
        const stunBarX = padding;
        const stunBarY = topY + boxHeight + stunBarSpacing;

        // Fundo da barra
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(stunBarX, stunBarY, stunBarWidth, stunBarHeight);

        // Preenchimento da barra
        let playerStunProgress = player.stunCharge / player.stunChargeMax;
        // Se o stun está pronto, a barra regride conforme o timer
        if (player.stunCharge >= player.stunChargeMax && player.stunChargeTimer > 0) {
            // Timer máximo é 300 frames (5 segundos), calcular progresso regressivo
            const maxTimer = 300;
            playerStunProgress = player.stunChargeTimer / maxTimer; // Regride de 1.0 para 0.0
        }
        ctx.fillStyle = player.stunCharge >= player.stunChargeMax ? '#f39c12' : '#9b59b6';
        ctx.fillRect(stunBarX, stunBarY, stunBarWidth * playerStunProgress, stunBarHeight);

        // Borda da barra
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(stunBarX, stunBarY, stunBarWidth, stunBarHeight);

        // Texto do stun (menor e proporcional)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle'; // Centralizar verticalmente
        ctx.font = `bold ${fontSize * 0.5}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        // Sombra para melhor visibilidade
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        if (player.stunCharge >= player.stunChargeMax) {
            // Mostrar timer quando stun está pronto
            const secondsLeft = Math.ceil(player.stunChargeTimer / 60);
            ctx.fillText(`💥 ${secondsLeft}s`, stunBarX + stunBarWidth + 8, stunBarY + stunBarHeight / 2);
            ctx.shadowBlur = 0;

            // Aviso quando tempo está acabando
            if (secondsLeft <= 2) {
                ctx.fillStyle = '#e74c3c';
                ctx.font = `bold ${fontSize * 0.6}px Arial`;
                ctx.shadowBlur = 4;
                ctx.fillText('⚠️', stunBarX + stunBarWidth + 8, stunBarY + stunBarHeight + 12);
                ctx.shadowBlur = 0;
                ctx.font = `bold ${fontSize * 0.5}px Arial`;
            } else {
                ctx.fillStyle = '#2ecc71';
                ctx.font = `bold ${fontSize * 0.6}px Arial`;
                ctx.shadowBlur = 4;
                ctx.fillText('⚡', stunBarX + stunBarWidth + 8, stunBarY + stunBarHeight + 12);
                ctx.shadowBlur = 0;
                ctx.font = `bold ${fontSize * 0.5}px Arial`;
            }
        } else {
            ctx.fillText(`💥 ${player.stunCharge}/${player.stunChargeMax}`, stunBarX + stunBarWidth + 8, stunBarY + stunBarHeight / 2);
            ctx.shadowBlur = 0;
        }

        // Desenhar estrelas abaixo do contador de stun do player (apenas em fases normais)
        if (!isBonusStage) {
            const currentStars = calculateCurrentStars();

            // Detectar mudança de estrelas e iniciar animação
            if (currentStars !== lastStarCount) {
                if (currentStars > lastStarCount) {
                    // Estrela aumentou - iniciar animação
                    starAnimationFrame = 20; // Duração da animação (20 frames)
                    starAnimationIndex = currentStars - 1; // Índice da nova estrela
                }
                lastStarCount = currentStars;
            }

            const starSize = 14; // Tamanho maior
            const starSpacing = 4;
            const totalStarsWidth = (starSize + starSpacing) * 5 - starSpacing; // Largura total das 5 estrelas
            const stunBarCenterX = stunBarX + stunBarWidth / 2;
            const starsStartX = stunBarCenterX - totalStarsWidth / 2; // Centralizar abaixo da barra de stun
            const starsY = stunBarY + stunBarHeight + 8; // Abaixo da barra de stun

            ctx.save();
            ctx.textAlign = 'left';

            for (let i = 0; i < 5; i++) {
                const starX = starsStartX + (starSize + starSpacing) * i;
                let animScale = 1;
                let animY = starsY;

                // Animação quando estrela é preenchida ou removida
                if (starAnimationFrame > 0 && i === starAnimationIndex) {
                    const progress = starAnimationFrame / 20; // 1.0 = início, 0.0 = fim
                    animScale = 1 + (1 - progress) * 0.6; // Cresce de 1.6x para 1x
                    animY = starsY - (1 - progress) * 8; // Sobe e desce
                    starAnimationFrame--;
                }

                ctx.font = `${starSize * animScale}px Arial`;

                if (i < currentStars) {
                    // Estrela preenchida (dourada com brilho)
                    ctx.fillStyle = '#f1c40f';
                    ctx.shadowColor = '#f39c12';
                    ctx.shadowBlur = 6;
                    ctx.fillText('★', starX, animY);
                } else {
                    // Estrela vazia (cinza suave)
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                    ctx.shadowBlur = 0;
                    ctx.fillText('☆', starX, animY);
                }
            }

            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Barra de Stun da CPU - Abaixo do placar da CPU
        const cpuStunBarWidth = cpuWidth * 0.8; // 80% da largura do placar
        const cpuStunBarHeight = 14; // Mesma altura
        const cpuStunBarX = canvas.width - padding - cpuWidth;
        const cpuStunBarY = topY + boxHeight + stunBarSpacing;

        // Fundo da barra
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(cpuStunBarX, cpuStunBarY, cpuStunBarWidth, cpuStunBarHeight);

        // Preenchimento da barra
        let cpuStunProgress = cpu.stunCharge / cpu.stunChargeMax;
        // Se o stun está pronto, a barra regride conforme o timer
        if (cpu.stunCharge >= cpu.stunChargeMax && cpu.stunChargeTimer > 0) {
            // Timer máximo é 300 frames (5 segundos), calcular progresso regressivo
            const maxTimer = 300;
            cpuStunProgress = cpu.stunChargeTimer / maxTimer; // Regride de 1.0 para 0.0
        }
        ctx.fillStyle = cpu.stunCharge >= cpu.stunChargeMax ? '#f39c12' : '#9b59b6';
        ctx.fillRect(cpuStunBarX, cpuStunBarY, cpuStunBarWidth * cpuStunProgress, cpuStunBarHeight);

        // Borda da barra
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cpuStunBarX, cpuStunBarY, cpuStunBarWidth, cpuStunBarHeight);

        // Texto do stun da CPU (menor e proporcional)
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle'; // Centralizar verticalmente
        ctx.font = `bold ${fontSize * 0.5}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        // Sombra para melhor visibilidade
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        if (cpu.stunCharge >= cpu.stunChargeMax) {
            // Mostrar timer quando stun está pronto
            const cpuSecondsLeft = Math.ceil(cpu.stunChargeTimer / 60);
            ctx.fillText(`💥 ${cpuSecondsLeft}s`, cpuStunBarX - 8, cpuStunBarY + cpuStunBarHeight / 2);
            ctx.shadowBlur = 0;

            // Aviso quando tempo está acabando
            if (cpuSecondsLeft <= 2) {
                ctx.fillStyle = '#e74c3c';
                ctx.font = `bold ${fontSize * 0.6}px Arial`;
                ctx.shadowBlur = 4;
                ctx.fillText('⚠️', cpuStunBarX - 8, cpuStunBarY + cpuStunBarHeight + 12);
                ctx.shadowBlur = 0;
                ctx.font = `bold ${fontSize * 0.5}px Arial`;
            } else {
                ctx.fillStyle = '#2ecc71';
                ctx.font = `bold ${fontSize * 0.6}px Arial`;
                ctx.shadowBlur = 4;
                ctx.fillText('⚡', cpuStunBarX - 8, cpuStunBarY + cpuStunBarHeight + 12);
                ctx.shadowBlur = 0;
                ctx.font = `bold ${fontSize * 0.5}px Arial`;
            }
        } else {
            ctx.fillText(`💥 ${cpu.stunCharge}/${cpu.stunChargeMax}`, cpuStunBarX - 8, cpuStunBarY + cpuStunBarHeight / 2);
            ctx.shadowBlur = 0;
        }
    }

    ctx.restore();
}

// Desenhar pássaro feliz (vencedor)
// Função auxiliar para desenhar detalhes específicos do tipo na tela de resultado
function drawResultBirdTypeDetails(ctxW, type, size, wingColor, baseColor) {
    if (!type) return;

    switch (type) {
        case 'tuiuiu':
            // Cabeça e pescoço superior pretos
            ctxW.fillStyle = '#000000';
            ctxW.beginPath();
            ctxW.arc(0, -size * 0.3, size * 0.4, 0, Math.PI * 2);
            ctxW.fill();
            ctxW.beginPath();
            ctxW.ellipse(0, -size * 0.1, size * 0.25, size * 0.35, 0, 0, Math.PI * 2);
            ctxW.fill();
            // Colar vermelho vibrante
            const collarY = size * 0.15;
            ctxW.fillStyle = '#e74c3c';
            ctxW.beginPath();
            ctxW.ellipse(0, collarY, size * 0.35, size * 0.12, 0, 0, Math.PI * 2);
            ctxW.fill();
            ctxW.fillStyle = '#c0392b';
            ctxW.beginPath();
            ctxW.ellipse(0, collarY - size * 0.02, size * 0.32, size * 0.08, 0, 0, Math.PI * 2);
            ctxW.fill();
            break;

        case 'owl':
            // Coruja - orelhas
            const topOfHead = -size * 0.85;
            const earHeight = size * 0.6;
            ctxW.fillStyle = wingColor || baseColor;
            ctxW.beginPath();
            ctxW.moveTo(-size * 0.5, topOfHead + earHeight * 0.3);
            ctxW.lineTo(-size * 0.35, topOfHead - earHeight * 0.5);
            ctxW.lineTo(-size * 0.15, topOfHead + earHeight * 0.3);
            ctxW.closePath();
            ctxW.fill();
            ctxW.beginPath();
            ctxW.moveTo(size * 0.15, topOfHead + earHeight * 0.3);
            ctxW.lineTo(size * 0.35, topOfHead - earHeight * 0.5);
            ctxW.lineTo(size * 0.55, topOfHead + earHeight * 0.3);
            ctxW.closePath();
            ctxW.fill();
            break;

        case 'woodpecker': // Pica-pau
            // Mancha vermelha na bochecha
            ctxW.fillStyle = '#DC143C';
            ctxW.beginPath();
            ctxW.arc(8, 2, size * 0.25, 0, Math.PI * 2);
            ctxW.fill();
            // Listras no pescoço
            for (let i = 0; i < 3; i++) {
                const stripeY = size * 0.3 + (i * size * 0.15);
                ctxW.fillStyle = '#000000';
                ctxW.fillRect(-size * 0.4, stripeY - size * 0.05, size * 0.8, size * 0.08);
            }
            // Crista amarela
            ctxW.fillStyle = '#FFD700';
            ctxW.beginPath();
            ctxW.moveTo(-size * 0.2, -size * 0.7);
            ctxW.lineTo(0, -size * 0.9);
            ctxW.lineTo(size * 0.2, -size * 0.7);
            ctxW.closePath();
            ctxW.fill();
            break;

        case 'sete-cores': // Saíra-sete-cores
            // Cabeça turquesa
            ctxW.fillStyle = '#40E0D0';
            ctxW.beginPath();
            ctxW.arc(0, -size * 0.6, size * 0.4, 0, Math.PI * 2);
            ctxW.fill();
            // Nuca amarelo-verde
            ctxW.fillStyle = '#ADFF2F';
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.3, -size * 0.2, size * 0.5, size * 0.3, -0.3, 0, Math.PI * 2);
            ctxW.fill();
            // Costas azul escuro
            ctxW.fillStyle = '#191970';
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.4, 0, size * 0.6, size * 0.4, -0.2, 0, Math.PI * 2);
            ctxW.fill();
            // Peito laranja
            ctxW.fillStyle = '#FF6347';
            ctxW.beginPath();
            ctxW.ellipse(0, size * 0.2, size * 0.5, size * 0.4, 0, 0, Math.PI * 2);
            ctxW.fill();
            break;

        case 'cavalaria': // Cavalaria-do-brejo
            // Corpo vermelho brilhante (já desenhado pela cor base)
            // Asas e dorso pretos
            ctxW.fillStyle = '#000000'; // Preto sólido
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.4, -size * 0.2, size * 0.5, size * 0.4, -0.2, 0, Math.PI * 2);
            ctxW.fill();
            // Segunda parte preta nas asas
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.3, size * 0.1, size * 0.4, size * 0.3, -0.15, 0, Math.PI * 2);
            ctxW.fill();
            // Cauda preta
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.5, size * 0.3, size * 0.3, size * 0.25, -0.3, 0, Math.PI * 2);
            ctxW.fill();
            // Faixa branca horizontal na parte superior do peito
            ctxW.fillStyle = '#FFFFFF'; // Branco nítido
            ctxW.beginPath();
            ctxW.ellipse(0, -size * 0.15, size * 0.5, size * 0.08, 0, 0, Math.PI * 2);
            ctxW.fill();
            break;

        case 'lavadeira': // Lavadeira-de-cauda
            // Corpo branco (já desenhado pela cor base)
            // Asas pretas/escuras
            ctxW.fillStyle = '#000000'; // Preto
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.4, -size * 0.1, size * 0.5, size * 0.35, -0.2, 0, Math.PI * 2);
            ctxW.fill();
            // Segunda parte preta nas asas
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.3, size * 0.15, size * 0.4, size * 0.3, -0.15, 0, Math.PI * 2);
            ctxW.fill();
            // Marcas brancas sutis nas asas
            ctxW.fillStyle = '#FFFFFF';
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.35, size * 0.05, size * 0.15, size * 0.08, -0.2, 0, Math.PI * 2);
            ctxW.fill();
            break;

        case 'saracura': // Saracura três potes
            // Cabeça e pescoço cinza ardósia
            ctxW.fillStyle = '#708090'; // Cinza ardósia
            ctxW.beginPath();
            ctxW.ellipse(0, -size * 0.5, size * 0.4, size * 0.3, 0, 0, Math.PI * 2);
            ctxW.fill();
            // Pescoço cinza
            ctxW.beginPath();
            ctxW.ellipse(0, -size * 0.2, size * 0.25, size * 0.35, 0, 0, Math.PI * 2);
            ctxW.fill();
            // Corpo superior (costas e asas) - marrom-oliva
            ctxW.fillStyle = '#6B8E23'; // Marrom-oliva
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.3, -size * 0.1, size * 0.5, size * 0.4, -0.2, 0, Math.PI * 2);
            ctxW.fill();
            // Segunda parte marrom-oliva nas asas
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.25, size * 0.1, size * 0.4, size * 0.3, -0.15, 0, Math.PI * 2);
            ctxW.fill();
            // Cauda curta e escura
            ctxW.fillStyle = '#2F4F2F'; // Verde escuro/marrom escuro
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.5, size * 0.25, size * 0.25, size * 0.2, -0.3, 0, Math.PI * 2);
            ctxW.fill();
            break;

        case 'martim': // Martim-pescador
            // Peito/ventre branco ou creme claro
            ctxW.fillStyle = '#F5F5DC'; // Bege claro
            ctxW.beginPath();
            ctxW.ellipse(0, size * 0.25, size * 0.5, size * 0.63, 0, 0, Math.PI * 2);
            ctxW.fill();
            // Faixa escura na cabeça
            ctxW.fillStyle = '#1a3d0e'; // Verde escuro
            ctxW.beginPath();
            ctxW.ellipse(0, -size * 0.75, size * 0.44, size * 0.19, 0, 0, Math.PI * 2);
            ctxW.fill();
            // Padrão de penas nas asas (verde mais escuro)
            ctxW.fillStyle = '#2ecc71'; // Verde médio
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.38, -size * 0.13, size * 0.56, size * 0.44, -0.2, 0, Math.PI * 2);
            ctxW.fill();
            // Detalhes nas asas - faixas mais escuras
            ctxW.fillStyle = '#27ae60'; // Verde mais escuro
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.31, size * 0.13, size * 0.44, size * 0.35, -0.15, 0, Math.PI * 2);
            ctxW.fill();
            break;

        case 'arara': // Arara-azul-e-amarela (Ara ararauna)
            // 1. Peito/barriga amarelo dourado (com camada adicional)
            ctxW.fillStyle = '#FFD700';
            ctxW.beginPath();
            ctxW.ellipse(0, size * 0.25, size * 0.45, size * 0.55, 0, 0, Math.PI * 2);
            ctxW.fill();
            ctxW.fillStyle = '#FFA500';
            ctxW.beginPath();
            ctxW.ellipse(0, size * 0.35, size * 0.35, size * 0.4, 0, 0, Math.PI * 2);
            ctxW.fill();
            // 2. Dorso e asas azul vívido (com detalhes)
            ctxW.fillStyle = '#0066FF';
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.3, -size * 0.15, size * 0.5, size * 0.4, -0.2, 0, Math.PI * 2);
            ctxW.fill();
            ctxW.fillStyle = '#0044CC';
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.35, -size * 0.1, size * 0.3, size * 0.25, -0.25, 0, Math.PI * 2);
            ctxW.fill();
            ctxW.fillStyle = '#0066FF';
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.25, size * 0.1, size * 0.4, size * 0.3, -0.15, 0, Math.PI * 2);
            ctxW.fill();
            ctxW.fillStyle = '#0044CC';
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.3, size * 0.15, size * 0.25, size * 0.2, -0.2, 0, Math.PI * 2);
            ctxW.fill();
            // 3. Cabeça azul
            ctxW.fillStyle = '#0066FF';
            ctxW.beginPath();
            ctxW.arc(size * 0.25, -size * 0.65, size * 0.4, 0, Math.PI * 2);
            ctxW.fill();
            ctxW.fillStyle = '#0044CC';
            ctxW.beginPath();
            ctxW.arc(size * 0.2, -size * 0.75, size * 0.25, 0, Math.PI * 2);
            ctxW.fill();
            // 4. Face branca
            ctxW.fillStyle = '#FFFFFF';
            ctxW.beginPath();
            ctxW.ellipse(size * 0.45, -size * 0.1, size * 0.5, size * 0.5, -0.1, 0, Math.PI * 2);
            ctxW.fill();
            ctxW.fillStyle = '#F5F5F5';
            ctxW.beginPath();
            ctxW.ellipse(size * 0.5, -size * 0.05, size * 0.3, size * 0.3, -0.1, 0, Math.PI * 2);
            ctxW.fill();
            // 5. Padrão de penas pretas ao redor dos olhos
            ctxW.fillStyle = '#000000';
            for (let i = 0; i < 4; i++) {
                ctxW.beginPath();
                ctxW.arc(size * 0.35 + i * size * 0.06, -size * 0.15, size * 0.04, 0, Math.PI * 2);
                ctxW.fill();
            }
            for (let i = 0; i < 3; i++) {
                ctxW.beginPath();
                ctxW.arc(size * 0.4 + i * size * 0.06, size * 0.1, size * 0.035, 0, Math.PI * 2);
                ctxW.fill();
            }
            for (let i = 0; i < 2; i++) {
                ctxW.beginPath();
                ctxW.arc(size * 0.25 + i * size * 0.1, -size * 0.05, size * 0.03, 0, Math.PI * 2);
                ctxW.fill();
            }
            // 6. Transição entre azul e amarelo
            ctxW.strokeStyle = '#FFA500';
            ctxW.lineWidth = 1.5;
            ctxW.beginPath();
            ctxW.moveTo(-size * 0.4, size * 0.15);
            ctxW.quadraticCurveTo(0, size * 0.2, size * 0.4, size * 0.15);
            ctxW.stroke();
            // 7. Cauda
            ctxW.fillStyle = '#0066FF';
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.5, size * 0.3, size * 0.2, size * 0.4, -0.3, 0, Math.PI * 2);
            ctxW.fill();
            ctxW.fillStyle = '#0044CC';
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.55, size * 0.4, size * 0.15, size * 0.3, -0.3, 0, Math.PI * 2);
            ctxW.fill();
            break;

        case 'flamingo': // Flamingo
            // Pescoço longo e curvado
            ctxW.fillStyle = '#FF69B4'; // Rosa coral vibrante
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.25, -size * 0.75, size * 0.19, size * 0.63, -0.3, 0, Math.PI * 2);
            ctxW.fill();
            // Cabeça arredondada
            ctxW.beginPath();
            ctxW.arc(-size * 0.38, -size * 1.13, size * 0.31, 0, Math.PI * 2);
            ctxW.fill();
            // Asas com penas mais escuras
            ctxW.fillStyle = '#FF1493'; // Rosa mais profundo
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.38, -size * 0.13, size * 0.56, size * 0.44, -0.2, 0, Math.PI * 2);
            ctxW.fill();
            // Segunda camada de asas
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.31, size * 0.13, size * 0.44, size * 0.35, -0.15, 0, Math.PI * 2);
            ctxW.fill();
            break;

        case 'gaviao-caramujeiro': // Gavião Caramujeiro
            // Padrão de penas escuras com textura sutil
            ctxW.fillStyle = '#0d0d0d'; // Preto mais profundo para asas
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.44, -size * 0.13, size * 0.63, size * 0.5, -0.2, 0, Math.PI * 2);
            ctxW.fill();
            // Segunda camada de penas escuras
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.35, size * 0.13, size * 0.5, size * 0.38, -0.15, 0, Math.PI * 2);
            ctxW.fill();
            // Detalhes sutis de textura nas penas
            ctxW.fillStyle = '#2c2c2c'; // Cinza muito escuro para textura
            const textureSpotsW = [
                { x: -size * 0.38, y: -size * 0.06, size: size * 0.1 },
                { x: -size * 0.25, y: size * 0.19, size: size * 0.08 },
                { x: -size * 0.19, y: size * 0.31, size: size * 0.09 }
            ];
            textureSpotsW.forEach(spot => {
                ctxW.beginPath();
                ctxW.arc(spot.x, spot.y, spot.size, 0, Math.PI * 2);
                ctxW.fill();
            });
            break;

        case 'araponga': // Araponga
            // Círculo azul turquesa
            ctxW.fillStyle = '#40E0D0';
            ctxW.beginPath();
            ctxW.arc(size * 0.4, size * 0.2, size * 0.5, 0, Math.PI * 2);
            ctxW.fill();
            // Cabeça escura
            ctxW.fillStyle = '#2C2C2C';
            ctxW.beginPath();
            ctxW.ellipse(0, -size * 0.5, size * 0.45, size * 0.3, 0, 0, Math.PI * 2);
            ctxW.fill();
            // Costas escuras
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.3, -size * 0.1, size * 0.5, size * 0.35, -0.2, 0, Math.PI * 2);
            ctxW.fill();
            // Manchas nas asas
            ctxW.fillStyle = '#1A1A1A';
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.4, size * 0.1, size * 0.3, size * 0.25, -0.3, 0, Math.PI * 2);
            ctxW.fill();
            break;

        case 'tie-sangue': // Tie-sangue (Red-necked Tanager)
            // Corpo vermelho brilhante (já desenhado pela cor base)
            // Asas/parte traseira muito escura (quase preta)
            ctxW.fillStyle = '#1C1C1C'; // Preto/cinza carvão profundo
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.4, 0, size * 0.5, size * 0.4, -0.2, 0, Math.PI * 2);
            ctxW.fill();

            // Segunda parte escura na asa
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.3, size * 0.2, size * 0.35, size * 0.3, -0.15, 0, Math.PI * 2);
            ctxW.fill();

            // Mancha branca na base do bico (característica marcante)
            ctxW.fillStyle = '#FFFFFF'; // Branco brilhante
            ctxW.beginPath();
            ctxW.ellipse(-size * 0.15, -size * 0.3, size * 0.12, size * 0.08, 0.3, 0, Math.PI * 2);
            ctxW.fill();
            break;

        case 'bacurau': // Bacurau
            // Cabeça achatada escura
            ctxW.fillStyle = '#6B5B4A';
            ctxW.beginPath();
            ctxW.ellipse(0, -size * 0.6, size * 0.4, size * 0.25, 0, 0, Math.PI * 2);
            ctxW.fill();
            // Padrão de penas manchado
            ctxW.fillStyle = '#5C4A3A';
            const darkSpots = [
                { angle: 0, dist: 0.35 },
                { angle: Math.PI / 3, dist: 0.4 },
                { angle: Math.PI * 2 / 3, dist: 0.3 },
                { angle: Math.PI, dist: 0.45 },
                { angle: Math.PI * 4 / 3, dist: 0.35 },
                { angle: Math.PI * 5 / 3, dist: 0.4 }
            ];
            darkSpots.forEach(spot => {
                const distance = size * spot.dist;
                const spotX = Math.cos(spot.angle) * distance;
                const spotY = Math.sin(spot.angle) * distance;
                ctxW.beginPath();
                ctxW.arc(spotX, spotY, size * 0.08, 0, Math.PI * 2);
                ctxW.fill();
            });
            // Manchas claras
            ctxW.fillStyle = '#D4C5A9';
            const lightSpots = [
                { angle: Math.PI / 4, dist: 0.28 },
                { angle: Math.PI * 3 / 4, dist: 0.32 },
                { angle: Math.PI * 5 / 4, dist: 0.3 },
                { angle: Math.PI * 7 / 4, dist: 0.35 }
            ];
            lightSpots.forEach(spot => {
                const distance = size * spot.dist;
                const spotX = Math.cos(spot.angle) * distance;
                const spotY = Math.sin(spot.angle) * distance;
                ctxW.beginPath();
                ctxW.arc(spotX, spotY, size * 0.06, 0, Math.PI * 2);
                ctxW.fill();
            });
            break;
    }
}

function drawHappyBird(ctxW, x, y, color, wingColor, scale, type = null) {
    ctxW.save();
    ctxW.translate(x, y);
    ctxW.scale(scale, scale);

    // Aura de vitória
    ctxW.shadowColor = color;
    ctxW.shadowBlur = 15;

    // Corpo - para Tuiuiu, garantir que seja branco
    const bodyColor = (type === 'tuiuiu') ? '#ffffff' : color;
    ctxW.fillStyle = bodyColor;
    ctxW.beginPath();
    ctxW.arc(0, 0, 35, 0, Math.PI * 2);
    ctxW.fill();

    ctxW.shadowBlur = 0;

    // Detalhes específicos do tipo
    drawResultBirdTypeDetails(ctxW, type, 35, wingColor, color);

    // Olho feliz
    ctxW.fillStyle = 'white';
    ctxW.beginPath();
    ctxW.arc(10, -5, 10, 0, Math.PI * 2);
    ctxW.fill();

    // Pupila - amarela para Bacurau, preta para outros
    if (type === 'bacurau') {
        ctxW.fillStyle = '#FFD700'; // Amarelo para Bacurau
    } else {
        ctxW.fillStyle = 'black';
    }
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

    // Bico sorrindo (aberto) - ajustar para Tuiuiu (maior e preto)
    const isTuiuiu = type === 'tuiuiu';
    const beakColor = isTuiuiu ? '#000000' : '#f39c12';
    const beakLength = isTuiuiu ? 25 : 18;
    const beakWidth = isTuiuiu ? 8 : 5;

    ctxW.fillStyle = beakColor;
    ctxW.beginPath();
    ctxW.moveTo(30, -beakWidth / 2);
    ctxW.lineTo(30 + beakLength, 3);
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
function drawSadBird(ctxW, x, y, color, wingColor, scale, type = null) {
    ctxW.save();
    ctxW.translate(x, y);
    ctxW.scale(scale, scale);

    // Sem aura (perdeu)

    // Corpo (mais escuro/apagado) - para Tuiuiu, garantir que seja branco
    const bodyColor = (type === 'tuiuiu') ? '#ffffff' : color;
    ctxW.fillStyle = bodyColor;
    ctxW.globalAlpha = 0.7;
    ctxW.beginPath();
    ctxW.arc(0, 0, 35, 0, Math.PI * 2);
    ctxW.fill();
    ctxW.globalAlpha = 1;

    // Detalhes específicos do tipo (com transparência)
    ctxW.globalAlpha = 0.7;
    drawResultBirdTypeDetails(ctxW, type, 35, wingColor, color);
    ctxW.globalAlpha = 1;

    // Olho triste
    ctxW.fillStyle = 'white';
    ctxW.beginPath();
    ctxW.arc(10, -5, 10, 0, Math.PI * 2);
    ctxW.fill();

    // Pupila olhando para baixo - amarela para Bacurau, preta para outros
    if (type === 'bacurau') {
        ctxW.fillStyle = '#FFD700'; // Amarelo para Bacurau
    } else {
        ctxW.fillStyle = 'black';
    }
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

    // Bico fechado e triste - ajustar para Tuiuiu (maior e preto)
    const isTuiuiu = type === 'tuiuiu';
    const beakColor = isTuiuiu ? '#000000' : '#f39c12';
    const beakLength = isTuiuiu ? 20 : 15;
    const beakWidth = isTuiuiu ? 7 : 5;

    ctxW.fillStyle = beakColor;
    ctxW.beginPath();
    ctxW.moveTo(30, 2);
    ctxW.lineTo(30 + beakLength, 8);
    ctxW.lineTo(30, 12);
    ctxW.closePath();
    ctxW.fill();

    // Lágrima
    ctxW.fillStyle = '#3498db';
    ctxW.beginPath();
    ctxW.ellipse(22, 8, 3, 5, 0, 0, Math.PI * 2);
    ctxW.fill();

    // Asa caída (triste) - para Tuiuiu, usar cor branca
    const finalWingColor = (type === 'tuiuiu') ? '#f5f5f5' : wingColor;
    ctxW.fillStyle = finalWingColor;
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

            // Determinar tema baseado na área atual
            let bonusEmoji = '🪱'; // Padrão (floresta)
            let bonusEmojis = ['🪱', '🪱', '🪱']; // Emojis ao redor

            if (currentArea === 2) {
                // Pântano - insetos
                bonusEmoji = '🦟';
                bonusEmojis = ['🦟', '🪰', '🦗', '🦟', '🪰', '🦗'];
            } else if (currentArea === 3) {
                // Ilha Tropical - peixes
                bonusEmoji = '🐟';
                bonusEmojis = ['🐟', '🐠', '🐡', '🦈', '🐟', '🐠'];
            } else if (currentArea === 5) {
                // Metrópole - pães
                bonusEmoji = '🍞';
                bonusEmojis = ['🍞', '🍞', '🍞', '🍞', '🍞', '🍞'];
            } else if (currentArea === 4) {
                // Deserto - frutos de cacto
                bonusEmoji = '🌵';
                bonusEmojis = ['🌵', '🍇', '🍊', '🍑', '🌵', '🍇'];
            } else if (currentArea === 7) {
                // Gelo - frutas congeladas
                bonusEmoji = '❄️';
                bonusEmojis = ['❄️', '🍎', '🍌', '🍇', '❄️', '🍎'];
            }

            if (playerWon) {
                // Sucesso!
                ctxW.fillText(bonusEmoji, 200, 30 + bounce);

                // Elementos temáticos ao redor
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + time;
                    const dist = 70;
                    ctxW.font = '20px Arial';
                    ctxW.fillText(bonusEmojis[i % bonusEmojis.length], 200 + Math.cos(angle) * dist, 85 + Math.sin(angle) * dist * 0.5);
                }

                drawHappyBird(ctxW, 200, 85 + bounce, selectedPlayerColor, selectedPlayerWing, scale);
            } else {
                // Falhou
                drawSadBird(ctxW, 200, 95, selectedPlayerColor, selectedPlayerWing, scale * 0.9);

                // Elementos temáticos fugindo
                ctxW.font = '15px Arial';
                for (let i = 0; i < 4; i++) {
                    const wx = 50 + i * 100 + Math.sin(time * 3 + i) * 10;
                    ctxW.fillText(bonusEmojis[i % bonusEmojis.length], wx, 150);
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
            ctxW.translate(-300 / scale, -85 / scale);
            drawHappyBird(ctxW, 0, 0, cpu.color, cpu.wingColor, 1, cpu.type);
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
            drawSadBird(ctxW, 0, 95, cpu.color, cpu.wingColor, scale * 0.9, cpu.type);
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
            drawHappyBird(ctxW, 0, 85 + bounce, cpu.color, cpu.wingColor, scale, cpu.type);
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
    // Esconder controles touch quando o jogo parar
    hideTouchControls();

    // OTIMIZAÇÃO: Limpar todos os intervals para evitar memory leaks
    if (foodSpawnInterval) {
        clearInterval(foodSpawnInterval);
        foodSpawnInterval = null;
    }
    if (specialFoodSpawnInterval) {
        clearInterval(specialFoodSpawnInterval);
        specialFoodSpawnInterval = null;
    }
    if (speedItemSpawnInterval) {
        clearInterval(speedItemSpawnInterval);
        speedItemSpawnInterval = null;
    }
    if (wormSpawnInterval) {
        clearInterval(wormSpawnInterval);
        wormSpawnInterval = null;
    }
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
                // Configurar como efeito sonoro especial sem loop
                sounds.bossWin.loop = false; // Sem loop - efeito sonoro único
                sounds.bossWin.volume = masterVolume;
                sounds.bossWin.currentTime = 0;

                // Tentar tocar diretamente (já que precisa de loop)
                sounds.bossWin.play().catch(e => {
                    console.log('Erro ao tocar boss-win:', e);
                    // Tentar após interação do usuário
                    const tryPlay = () => {
                        if (sounds.bossWin && !sfxMuted) {
                            sounds.bossWin.loop = false; // Sem loop - efeito sonoro único
                            sounds.bossWin.currentTime = 0;
                            sounds.bossWin.play().catch(() => { });
                        }
                    };
                    document.addEventListener('click', tryPlay, { once: true });
                    document.addEventListener('keydown', tryPlay, { once: true });
                    document.addEventListener('touchstart', tryPlay, { once: true });
                });
            }

            // Tela de vitória especial do boss
            // Calcular estrelas antes de desenhar
            const bossStars = calculateCurrentStars();
            window.victoryStars = bossStars; // Salvar para mostrar na tela
            drawBossVictoryScene();
        } else {
            resultTitle.textContent = isBonusStage ?
                (currentArea === 7 ? '❄️ BÔNUS COMPLETO! ❄️' :
                    currentArea === 5 ? '🍞 BÔNUS COMPLETO! 🍞' :
                        currentArea === 4 ? '🌵 BÔNUS COMPLETO! 🌵' :
                            currentArea === 3 ? '🐟 BÔNUS COMPLETO! 🐟' :
                                currentArea === 2 ? '🦟 BÔNUS COMPLETO! 🦟' :
                                    '🪱 BÔNUS COMPLETO! 🪱') :
                '🎉 VOCÊ VENCEU! 🎉';
            resultTitle.className = 'win';

            // 🔊 Som de vitória normal
            playSound('win');

            // Calcular estrelas antes de desenhar
            const victoryStars = calculateCurrentStars();
            window.victoryStars = victoryStars; // Salvar para mostrar na tela
            drawResultScene(true, false);
        }

        // Inicializar arrays se não existirem
        if (!gameProgress.completedStages[currentArea]) {
            gameProgress.completedStages[currentArea] = [];
        }
        if (!gameProgress.unlockedStages[currentArea]) {
            gameProgress.unlockedStages[currentArea] = [1];
        }

        // Verificar se é primeira vitória nesta fase
        const isFirstVictory = !gameProgress.completedStages[currentArea] ||
            !gameProgress.completedStages[currentArea].includes(currentSubstage);

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
            const maxAreas = Object.keys(areaConfig).length;
            if (nextArea <= maxAreas && !gameProgress.unlockedAreas.includes(nextArea)) {
                gameProgress.unlockedAreas.push(nextArea);
                if (!gameProgress.unlockedStages[nextArea]) {
                    gameProgress.unlockedStages[nextArea] = [1];
                }
            }
        }

        // Calcular estrelas (sistema de 5 estrelas)
        const stars = calculateCurrentStars();

        // Salvar melhor resultado de estrelas
        const stageKey = `${currentArea}-${currentSubstage}`;
        if (!gameProgress.stageStars[stageKey] || stars > gameProgress.stageStars[stageKey]) {
            gameProgress.stageStars[stageKey] = stars;
        }

        // Ganhar moedas na vitória (balanceado: primeira vitória dá mais + bônus de estrelas)
        let coinsEarned;
        const starBonus = stars * 3; // Bônus por estrela: 3 moedas por estrela

        if (isFirstVictory) {
            // Primeira vitória - recompensa maior
            if (currentSubstage === 7) {
                coinsEarned = 50 + starBonus; // Boss primeira vez + bônus estrelas
            } else if (isBonusStage) {
                coinsEarned = 25 + starBonus; // Fase bônus primeira vez + bônus estrelas
            } else {
                coinsEarned = 25 + starBonus; // Fase normal primeira vez: 25 base + bônus estrelas
            }
        } else {
            // Refazendo fase - recompensa reduzida
            if (currentSubstage === 7) {
                coinsEarned = 15 + Math.floor(starBonus * 0.5); // Boss refazer + bônus reduzido
            } else if (isBonusStage) {
                coinsEarned = 10 + Math.floor(starBonus * 0.4); // Fase bônus refazer + bônus reduzido
            } else {
                coinsEarned = 5 + Math.floor(starBonus * 0.4); // Fase normal refazer: 5 base + bônus reduzido
            }
        }

        // Salvar moedas ganhas antes de adicionar (para mostrar na tela)
        window.lastCoinsEarned = coinsEarned;
        addCoins(coinsEarned);

        saveProgress();

    } else if (isBonusStage) {
        // Fase bônus - não atingiu a meta
        resultTitle.textContent = currentArea === 7 ? '❄️ NÃO CONSEGUIU! ❄️' :
            currentArea === 5 ? '🍞 NÃO CONSEGUIU! 🍞' :
                currentArea === 4 ? '🌵 NÃO CONSEGUIU! 🌵' :
                    currentArea === 3 ? '🐟 NÃO CONSEGUIU! 🐟' :
                        currentArea === 2 ? '🦟 NÃO CONSEGUIU! 🦟' :
                            '🪱 NÃO CONSEGUIU!';
        resultTitle.className = 'lose';

        // 🔊 Som de derrota
        playSound('lose');

        // Perder uma vida e salvar quantidade restante
        const livesBefore = gameProgress.lives;
        loseLife();
        window.livesRemaining = gameProgress.lives;
        window.lifeLost = true;

        drawResultScene(false, false);
    } else if (cpuScore > playerScore) {
        resultTitle.textContent = '😔 VOCÊ PERDEU!';
        resultTitle.className = 'lose';

        // 🔊 Som de derrota
        playSound('lose');

        // Perder uma vida e salvar quantidade restante
        const livesBefore = gameProgress.lives;
        loseLife();
        window.livesRemaining = gameProgress.lives;
        window.lifeLost = true;

        drawResultScene(false, false);
    } else {
        resultTitle.textContent = '🤝 EMPATE!';
        resultTitle.className = '';
        drawResultScene(false, true);
    }

    // Mostrar informações de vitória ou derrota
    if (isVictory) {
        // Vitória - mostrar moedas ganhas e estrelas
        const coinsEarned = window.lastCoinsEarned || 0;
        const stars = window.victoryStars || calculateCurrentStars();

        // Criar HTML das estrelas
        let starsHTML = '<div style="display: flex; justify-content: center; gap: 8px; margin-top: 15px; font-size: 2em;">';
        for (let i = 0; i < 5; i++) {
            if (i < stars) {
                starsHTML += '<span style="color: #f1c40f; text-shadow: 0 0 10px #f39c12;">★</span>';
            } else {
                starsHTML += '<span style="color: rgba(255, 255, 255, 0.3);">☆</span>';
            }
        }
        starsHTML += '</div>';

        if (currentSubstage === 7) {
            // Boss derrotado
            resultText.innerHTML = `Você: ${playerScore} 🍎 | CPU: ${cpuScore} 🍎<br><span style="color: #f1c40f; font-size: 1.1em; margin-top: 10px; display: block;">🪙 Ganhou ${coinsEarned} moedas!</span>${starsHTML}`;
        } else if (isBonusStage) {
            if (currentArea === 7) {
                resultText.innerHTML = `Frutas: ${playerScore} / ${config.goalScore} ❄️<br><span style="color: #f1c40f; font-size: 1.1em; margin-top: 10px; display: block;">🪙 Ganhou ${coinsEarned} moedas!</span>${starsHTML}`;
            } else if (currentArea === 7) {
                resultText.innerHTML = `Frutas: ${playerScore} / ${config.goalScore} ❄️<br><span style="color: #f1c40f; font-size: 1.1em; margin-top: 10px; display: block;">🪙 Ganhou ${coinsEarned} moedas!</span>${starsHTML}`;
            } else if (currentArea === 4) {
                resultText.innerHTML = `Frutos: ${playerScore} / ${config.goalScore} 🌵<br><span style="color: #f1c40f; font-size: 1.1em; margin-top: 10px; display: block;">🪙 Ganhou ${coinsEarned} moedas!</span>${starsHTML}`;
            } else if (currentArea === 5) {
                resultText.innerHTML = `Pães: ${playerScore} / ${config.goalScore} 🍞<br><span style="color: #f1c40f; font-size: 1.1em; margin-top: 10px; display: block;">🪙 Ganhou ${coinsEarned} moedas!</span>${starsHTML}`;
            } else if (currentArea === 3) {
                resultText.innerHTML = `Peixes: ${playerScore} / ${config.goalScore} 🐟<br><span style="color: #f1c40f; font-size: 1.1em; margin-top: 10px; display: block;">🪙 Ganhou ${coinsEarned} moedas!</span>${starsHTML}`;
            } else if (currentArea === 2) {
                resultText.innerHTML = `Insetos: ${playerScore} / ${config.goalScore} 🦟<br><span style="color: #f1c40f; font-size: 1.1em; margin-top: 10px; display: block;">🪙 Ganhou ${coinsEarned} moedas!</span>${starsHTML}`;
            } else {
                resultText.innerHTML = `Minhocas: ${playerScore} / ${config.goalScore} 🪱<br><span style="color: #f1c40f; font-size: 1.1em; margin-top: 10px; display: block;">🪙 Ganhou ${coinsEarned} moedas!</span>${starsHTML}`;
            }
        } else {
            resultText.innerHTML = `Você: ${playerScore} 🍎 | CPU: ${cpuScore} 🍎<br><span style="color: #f1c40f; font-size: 1.1em; margin-top: 10px; display: block;">🪙 Ganhou ${coinsEarned} moedas!</span>${starsHTML}`;
        }
        window.lastCoinsEarned = null; // Limpar
        window.victoryStars = null; // Limpar
    } else if (window.lifeLost) {
        // Derrota - mostrar vidas perdidas e restantes
        const livesRemaining = window.livesRemaining || 0;
        if (isBonusStage) {
            if (currentArea === 7) {
                resultText.innerHTML = `Frutas: ${playerScore} / ${config.goalScore} ❄️<br><span style="color: #e74c3c; font-size: 1.1em; margin-top: 10px; display: block;">❤️ Perdeu 1 vida! Restam ${livesRemaining} vidas</span>`;
            } else if (currentArea === 7) {
                resultText.innerHTML = `Frutas: ${playerScore} / ${config.goalScore} ❄️<br><span style="color: #e74c3c; font-size: 1.1em; margin-top: 10px; display: block;">❤️ Perdeu 1 vida! Restam ${livesRemaining} vidas</span>`;
            } else if (currentArea === 5) {
                resultText.innerHTML = `Pães: ${playerScore} / ${config.goalScore} 🍞<br><span style="color: #e74c3c; font-size: 1.1em; margin-top: 10px; display: block;">❤️ Perdeu 1 vida! Restam ${livesRemaining} vidas</span>`;
            } else if (currentArea === 4) {
                resultText.innerHTML = `Frutos: ${playerScore} / ${config.goalScore} 🌵<br><span style="color: #e74c3c; font-size: 1.1em; margin-top: 10px; display: block;">❤️ Perdeu 1 vida! Restam ${livesRemaining} vidas</span>`;
            } else if (currentArea === 3) {
                resultText.innerHTML = `Peixes: ${playerScore} / ${config.goalScore} 🐟<br><span style="color: #e74c3c; font-size: 1.1em; margin-top: 10px; display: block;">❤️ Perdeu 1 vida! Restam ${livesRemaining} vidas</span>`;
            } else if (currentArea === 2) {
                resultText.innerHTML = `Insetos: ${playerScore} / ${config.goalScore} 🦟<br><span style="color: #e74c3c; font-size: 1.1em; margin-top: 10px; display: block;">❤️ Perdeu 1 vida! Restam ${livesRemaining} vidas</span>`;
            } else {
                resultText.innerHTML = `Minhocas: ${playerScore} / ${config.goalScore} 🪱<br><span style="color: #e74c3c; font-size: 1.1em; margin-top: 10px; display: block;">❤️ Perdeu 1 vida! Restam ${livesRemaining} vidas</span>`;
            }
        } else {
            resultText.innerHTML = `Você: ${playerScore} 🍎 | CPU: ${cpuScore} 🍎<br><span style="color: #e74c3c; font-size: 1.1em; margin-top: 10px; display: block;">❤️ Perdeu 1 vida! Restam ${livesRemaining} vidas</span>`;
        }
        window.lifeLost = false; // Limpar
    } else {
        // Empate ou outros casos
        if (isBonusStage) {
            if (currentArea === 7) {
                resultText.textContent = `Frutas: ${playerScore} / ${config.goalScore} ❄️`;
            } else if (currentArea === 5) {
                resultText.textContent = `Pães: ${playerScore} / ${config.goalScore} 🍞`;
            } else if (currentArea === 4) {
                resultText.textContent = `Frutos: ${playerScore} / ${config.goalScore} 🌵`;
            } else if (currentArea === 3) {
                resultText.textContent = `Peixes: ${playerScore} / ${config.goalScore} 🐟`;
            } else if (currentArea === 2) {
                resultText.textContent = `Insetos: ${playerScore} / ${config.goalScore} 🦟`;
            } else {
                resultText.textContent = `Minhocas: ${playerScore} / ${config.goalScore} 🪱`;
            }
        } else {
            resultText.textContent = `Você: ${playerScore} 🍎 | CPU: ${cpuScore} 🍎`;
        }
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
    } else if (cpuScore > playerScore || (isBonusStage && !isVictory)) {
        // Derrota - Tentar novamente ou Roadmap (incluindo boss)
        const livesRemaining = window.livesRemaining || 0;
        const canRetry = livesRemaining > 0;

        if (canRetry) {
            resultButtons.innerHTML = `
                <button class="result-btn retry" onclick="restartGame()">🔄 Tentar Novamente</button>
                <button class="result-btn menu" onclick="goToRoadmap()">🗺️ Roadmap</button>
                    `;
        } else {
            resultButtons.innerHTML = `
                <button class="result-btn menu" onclick="goToRoadmap()">🗺️ Roadmap</button>
                    `;
        }
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
    const maxAreas = Object.keys(areaConfig).length;
    if (nextArea <= maxAreas && gameProgress.unlockedStages[nextArea] &&
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

    // Atualizar vidas antes de voltar ao menu
    updateLivesFromTime();
    updateLivesUI();

    // Fechar tela de game over e jogo
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('gameContainer').classList.remove('active');
    
    // Esconder controles touch ao voltar ao menu
    hideTouchControls();

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

    // Reiniciar animação do menu se não estiver rodando
    if (menuOverlay && menuOverlay.style.display !== 'none') {
        if (!menuAnimFrame) {
            resetMenuWaitTime(); // Resetar tempo de espera
            animateMenu();
        }
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
// Parar som de vespas quando necessário
function stopBuzzSound() {
    if (sounds.buzz && !sounds.buzz.paused) {
        sounds.buzz.pause();
        sounds.buzz.currentTime = 0;
    }
}

function restartGame() {
    // Parar som de vespas se estiver tocando
    stopBuzzSound();
    
    // Verificar se o jogador tem vidas disponíveis
    updateLivesFromTime();
    if (gameProgress.lives <= 0) {
        alert('Você não tem vidas disponíveis! Aguarde a regeneração ou compre uma vida com moedas.');
        return;
    }

    // Atualizar cor do jogador com a cor selecionada
    player.color = selectedPlayerColor;

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
    // Resetar gordura do jogador
    if (player.fatness) {
        player.fatness = 0;
    }
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
    bat.active = false;
    bat.cooldown = 0;
    bat.warningTime = 0;

    hawk.active = false;
    hawk.cooldown = 0;
    hawk.warningTime = 0;
    player.stunTime = 0;
    player.eatAnimation = 0;
    player.facingRight = true;
    cpu.eatAnimation = 0;
    cpu.facingRight = false;

    // Reset fase bônus
    if (isBonusStage) {
        if (currentArea === 7) {
            initFrozenFruits();
        } else if (currentArea === 4) {
            initCactusFruits();
        } else if (currentArea === 3) {
            initTropicalFish();
            // Atualizar texto do contador para peixes
            const bonusCounter = document.querySelector('.bonus-counter');
            if (bonusCounter) {
                const config = substageConfig[currentSubstage];
                bonusCounter.innerHTML = `🐟 Peixes: <span id="wormCount">0</span> / <span id="wormGoal">${config.goalScore}</span>`;
            }
        } else if (currentArea === 2) {
            initSwampInsects();
            // Atualizar texto do contador para insetos
            const bonusCounter = document.querySelector('.bonus-counter');
            if (bonusCounter) {
                const config = substageConfig[currentSubstage];
                bonusCounter.innerHTML = `🦟 Insetos: <span id="wormCount">0</span> / <span id="wormGoal">${config.goalScore}</span>`;
            }
        } else {
            initWormHoles();
        }
        const wormCountEl = document.getElementById('wormCount');
        if (wormCountEl) {
            wormCountEl.textContent = '0';
        }
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

// OTIMIZAÇÃO: Armazenar interval IDs para limpeza adequada
let foodSpawnInterval = null;
let specialFoodSpawnInterval = null;
let speedItemSpawnInterval = null;
let wormSpawnInterval = null;

// Spawn de comida periódico (1 a 5 de cada vez)
foodSpawnInterval = setInterval(() => {
    if (gameRunning && !isBonusStage) {
        // Garantir que frutas aparecem em todas as áreas, incluindo pântano
        const quantidade = 1 + Math.floor(Math.random() * 5); // 1 a 5
        for (let i = 0; i < quantidade; i++) {
            spawnFood();
        }
    }
}, 2000);

// Spawn de comida especial (a cada 8-15 segundos)
specialFoodSpawnInterval = setInterval(() => {
    if (gameRunning && !isBonusStage) {
        spawnSpecialFood();
    }
}, 8000 + Math.random() * 7000);

// Spawn de item de velocidade (a cada 10-18 segundos)
speedItemSpawnInterval = setInterval(() => {
    if (gameRunning && !isBonusStage) {
        spawnSpeedItem();
    }
}, 10000 + Math.random() * 8000);

// Spawn de minhocas (fase bônus - a cada 0.3-0.8 segundos)
wormSpawnInterval = setInterval(() => {
    if (gameRunning && isBonusStage) {
        spawnWorm();
    }
}, 300 + Math.random() * 500);

// Loop principal do jogo
function gameLoop() {
    if (!gameRunning) return;

    // OTIMIZAÇÃO: Cachear Date.now() uma vez por frame (usado 40+ vezes)
    const currentTime = Date.now();

    updatePlayer();

    if (isBonusStage) {
        if (currentArea === 7) {
            // Fase bônus do gelo - frutas congeladas
            updateFrozenFruits();
            checkFrozenFruitCollisions();
            updateWormEatEffects(); // Reutilizar efeitos visuais
        } else if (currentArea === 4) {
            // Fase bônus do deserto - frutos de cactos
            updateCactusFruits();
            checkCactusFruitCollisions();
            updateWormEatEffects(); // Reutilizar efeitos visuais
        } else if (currentArea === 5) {
            // Fase bônus da Metrópole - pães
            updateMetropolisBread();
            checkMetropolisBreadCollisions();
            updateWormEatEffects(); // Reutilizar efeitos visuais
        } else if (currentArea === 3) {
            // Fase bônus da Ilha Tropical - peixes
            updateTropicalFish();
            checkTropicalFishCollisions();
            updateWormEatEffects(); // Reutilizar efeitos visuais
        } else if (currentArea === 2) {
            // Fase bônus do pântano - insetos
            updateSwampInsects();
            checkSwampInsectCollisions();
            updateWormEatEffects(); // Reutilizar efeitos visuais
        } else {
            // Fase bônus genérica - apenas minhocas (outras áreas)
            updateWorms();
            checkWormCollisions();
            updateWormEatEffects();
        }
    } else {
        // Fase normal - CPU e comidas
        updateCPU();
        updateFood();
        updateBat();
        updateHawk();
        checkBirdCollision();
        checkCollisions();

        // Atualizar gotas de suor no deserto e ilha tropical
        updateSweatDrops();

        // Atualizar gotas de água no pântano
        updateWaterDrops();

        // Atualizar chuva na floresta
        updateRain();

        // Atualizar elementos decorativos do gelo
        if (currentArea === 7) {
            updateIceDecorations();
            updateColdEffects();
        }

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

    // Atualizar animações do placar
    if (playerScoreAnimation > 0) {
        playerScoreAnimation--;
    }
    if (cpuScoreAnimation > 0) {
        cpuScoreAnimation--;
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

// Sistema de Vidas e Moedas
const MAX_LIVES = 5;
const LIFE_REGENERATION_TIME = 5 * 60 * 1000; // 5 minutos em milissegundos
const LIFE_COST = 50; // Moedas necessárias para comprar uma vida
const COLOR_COST = 25; // Moedas necessárias para mudar a cor do personagem

if (gameProgress.lives === undefined) {
    gameProgress.lives = MAX_LIVES;
}
if (gameProgress.coins === undefined) {
    gameProgress.coins = 0;
}
if (gameProgress.lastLifeLossTime === undefined) {
    gameProgress.lastLifeLossTime = null;
}

// Função para atualizar vidas baseado no tempo decorrido
function updateLivesFromTime() {
    if (gameProgress.lives >= MAX_LIVES) {
        gameProgress.lastLifeLossTime = null;
        return;
    }

    if (gameProgress.lastLifeLossTime === null) {
        return;
    }

    const now = Date.now();
    const timeSinceLastLoss = now - gameProgress.lastLifeLossTime;
    const livesToRegenerate = Math.floor(timeSinceLastLoss / LIFE_REGENERATION_TIME);

    if (livesToRegenerate > 0) {
        gameProgress.lives = Math.min(MAX_LIVES, gameProgress.lives + livesToRegenerate);

        // Se chegou ao máximo, resetar o timer
        if (gameProgress.lives >= MAX_LIVES) {
            gameProgress.lastLifeLossTime = null;
        } else {
            // Ajustar o timestamp para o próximo ciclo
            gameProgress.lastLifeLossTime += livesToRegenerate * LIFE_REGENERATION_TIME;
        }

        saveProgress();
        updateLivesUI();
    }
}

// Função para obter tempo restante até próxima vida
function getTimeUntilNextLife() {
    if (gameProgress.lives >= MAX_LIVES || gameProgress.lastLifeLossTime === null) {
        return 0;
    }

    const now = Date.now();
    const timeSinceLastLoss = now - gameProgress.lastLifeLossTime;
    const timeUntilNext = LIFE_REGENERATION_TIME - (timeSinceLastLoss % LIFE_REGENERATION_TIME);

    return Math.max(0, timeUntilNext);
}

// Função para perder uma vida
function loseLife() {
    if (gameProgress.lives > 0) {
        gameProgress.lives--;
        gameProgress.lastLifeLossTime = Date.now();
        saveProgress();
        updateLivesUI();
    }
}

// Função para comprar uma vida
function buyLife() {
    if (gameProgress.lives >= MAX_LIVES) {
        return false; // Já está no máximo
    }

    if (gameProgress.coins >= LIFE_COST) {
        gameProgress.coins -= LIFE_COST;
        gameProgress.lives = Math.min(MAX_LIVES, gameProgress.lives + 1);

        // Se chegou ao máximo, resetar timer
        if (gameProgress.lives >= MAX_LIVES) {
            gameProgress.lastLifeLossTime = null;
        }

        saveProgress();
        updateLivesUI();
        return true;
    }

    return false; // Moedas insuficientes
}

// Função para ganhar moedas
function addCoins(amount) {
    gameProgress.coins = (gameProgress.coins || 0) + amount;
    saveProgress();
    updateLivesUI();
}

// Função para atualizar UI de vidas e moedas
function updateLivesUI() {
    const livesCountEl = document.getElementById('livesCount');
    const coinsCountEl = document.getElementById('coinsCount');
    const livesTimerEl = document.getElementById('livesTimer');
    const buyLifeBtn = document.getElementById('buyLifeBtn');

    if (livesCountEl) {
        livesCountEl.textContent = gameProgress.lives;
    }

    if (coinsCountEl) {
        coinsCountEl.textContent = gameProgress.coins || 0;
    }

    // Atualizar timer de regeneração
    if (livesTimerEl) {
        const timeUntilNext = getTimeUntilNextLife();
        if (gameProgress.lives >= MAX_LIVES) {
            livesTimerEl.textContent = '';
        } else if (timeUntilNext > 0) {
            const minutes = Math.floor(timeUntilNext / 60000);
            const seconds = Math.floor((timeUntilNext % 60000) / 1000);
            livesTimerEl.textContent = `(${minutes}:${seconds.toString().padStart(2, '0')})`;
        } else {
            livesTimerEl.textContent = '';
        }
    }

    // Mostrar/ocultar botão de comprar vida
    if (buyLifeBtn) {
        if (gameProgress.lives < MAX_LIVES && gameProgress.coins >= LIFE_COST) {
            buyLifeBtn.style.display = 'block';
            buyLifeBtn.disabled = false;
        } else {
            buyLifeBtn.style.display = 'none';
            buyLifeBtn.disabled = true;
        }
    }
}

// Função para comprar vida (chamada pelo botão)
function buyLifeWithCoins() {
    if (buyLife()) {
        // Feedback visual/sonoro pode ser adicionado aqui
        updateLivesUI();
    } else {
        // Mostrar mensagem de erro se necessário
        alert('Moedas insuficientes! Ganhe mais moedas completando fases.');
    }
}

// Atualizar vidas ao carregar o jogo
updateLivesFromTime();

// Atualizar vidas periodicamente (a cada segundo)
setInterval(() => {
    updateLivesFromTime();
    updateLivesUI();
}, 1000);

// Atualizar UI inicialmente
updateLivesUI();

let currentArea = 1;
let currentSubstage = 1;
let currentLevel = 1; // Mantido para compatibilidade

// Salvar progresso
function saveProgress() {
    localStorage.setItem('birdGameProgress', JSON.stringify(gameProgress));
}


// Atualizar visual do roadmap de áreas
function updateRoadmapVisual() {
    const roadmapAreas = document.getElementById('roadmapAreas');
    const totalAreas = Object.keys(areaConfig).length;

    // Criar elementos HTML para áreas que não existem
    for (let i = 1; i <= totalAreas; i++) {
        let areaEl = document.getElementById('area' + i);
        let progressEl = document.getElementById('areaProgress' + i);

        // Se a área não existe, criar o elemento
        if (!areaEl) {
            areaEl = document.createElement('div');
            areaEl.className = 'area-card locked';
            areaEl.id = 'area' + i;

            const lockDiv = document.createElement('div');
            lockDiv.className = 'area-lock';
            lockDiv.textContent = '🔒';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'area-name';
            nameDiv.textContent = areaConfig[i].name;
            // Garantir que o texto seja branco e visível
            nameDiv.style.color = '#ffffff';
            nameDiv.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';

            progressEl = document.createElement('div');
            progressEl.className = 'area-progress';
            progressEl.id = 'areaProgress' + i;
            progressEl.textContent = '0/7';

            areaEl.appendChild(lockDiv);
            areaEl.appendChild(nameDiv);
            areaEl.appendChild(progressEl);
            roadmapAreas.appendChild(areaEl);
        }

        // Se o progressEl não existe, procurar ou criar
        if (!progressEl) {
            progressEl = areaEl.querySelector('.area-progress');
            if (!progressEl) {
                progressEl = document.createElement('div');
                progressEl.className = 'area-progress';
                progressEl.id = 'areaProgress' + i;
                progressEl.textContent = '0/7';
                areaEl.appendChild(progressEl);
            } else {
                progressEl.id = 'areaProgress' + i;
            }
        }

        const config = areaConfig[i];
        const isUnlocked = gameProgress.unlockedAreas.includes(i);
        const completed = gameProgress.completedStages[i] ? gameProgress.completedStages[i].length : 0;
        const isCompleted = completed >= 7;
        const isCurrentArea = currentArea === i;

        // Aplicar cor de fundo da área
        if (isUnlocked) {
            // Área desbloqueada - usar cor da área com transparência
            areaEl.style.backgroundColor = config.color + '40'; // 40 = ~25% de opacidade
            areaEl.style.borderColor = config.color;
        } else {
            // Área bloqueada - cinza escuro
            areaEl.style.backgroundColor = 'rgba(50, 50, 50, 0.5)';
            areaEl.style.borderColor = '#666';
        }

        if (isUnlocked) {
            // Área desbloqueada
            areaEl.classList.remove('locked');
            areaEl.classList.add('unlocked');
            areaEl.onclick = () => openArea(i);

            // Atualizar nome da área
            let nameEl = areaEl.querySelector('.area-name');
            if (!nameEl) {
                nameEl = document.createElement('div');
                nameEl.className = 'area-name';
                areaEl.appendChild(nameEl);
            }
            nameEl.textContent = config.name;
            // Garantir que o texto seja branco e visível
            nameEl.style.color = '#ffffff';
            nameEl.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';

            // Mostrar ícone da área
            const lockEl = areaEl.querySelector('.area-lock');
            const iconEl = areaEl.querySelector('.area-icon');
            const completionEl = areaEl.querySelector('.area-completion');

            if (lockEl) {
                lockEl.outerHTML = `<div class="area-icon">${config.icon}</div>`;
            } else if (!iconEl) {
                const iconDiv = document.createElement('div');
                iconDiv.className = 'area-icon';
                iconDiv.textContent = config.icon;
                areaEl.insertBefore(iconDiv, areaEl.firstChild);
            } else {
                iconEl.textContent = config.icon;
            }

            // Adicionar ou remover ícone de conclusão
            if (isCompleted) {
                if (!completionEl) {
                    const completionDiv = document.createElement('div');
                    completionDiv.className = 'area-completion';
                    completionDiv.textContent = '✅';
                    completionDiv.title = 'Área Concluída!';
                    areaEl.appendChild(completionDiv);
                }
                areaEl.classList.add('completed');
            } else {
                if (completionEl) {
                    completionEl.remove();
                }
                areaEl.classList.remove('completed');
            }

            // Destacar área atual (sem animação de pulso)
            if (isCurrentArea) {
                areaEl.classList.add('current-area');
                areaEl.style.boxShadow = `0 0 15px ${config.color}`;
            } else {
                areaEl.classList.remove('current-area');
                areaEl.style.boxShadow = '';
            }

            // Atualizar progresso
            progressEl.textContent = `${completed}/7`;
        } else {
            // Área trancada
            areaEl.classList.remove('unlocked', 'completed', 'current-area');
            areaEl.classList.add('locked');
            areaEl.onclick = null;
            areaEl.style.boxShadow = '';

            // Atualizar nome da área mesmo quando trancada
            let nameEl = areaEl.querySelector('.area-name');
            if (!nameEl) {
                nameEl = document.createElement('div');
                nameEl.className = 'area-name';
                areaEl.appendChild(nameEl);
            }
            nameEl.textContent = config.name;
            // Garantir que o texto seja branco e visível
            nameEl.style.color = '#ffffff';
            nameEl.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';

            // Mostrar cadeado
            const iconEl = areaEl.querySelector('.area-icon');
            const completionEl = areaEl.querySelector('.area-completion');
            if (iconEl) {
                iconEl.outerHTML = `<div class="area-lock">🔒</div>`;
            }
            if (completionEl) {
                completionEl.remove();
            }

            // Resetar progresso
            progressEl.textContent = '0/7';
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
// Função auxiliar para esconder controles touch
function hideTouchControls() {
    const touchControls = document.getElementById('touchControls');
    if (touchControls) {
        touchControls.style.display = 'none';
        touchControls.style.pointerEvents = 'none';
    }
}

// Função auxiliar para detectar se é mobile
function isMobileDevice() {
    // Verificar por largura, altura ou user agent
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isSmallScreen = width <= 750 || height <= 750;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // É mobile se: tela pequena E (tem touch OU user agent mobile)
    return isSmallScreen && (isTouchDevice || isMobileUserAgent);
}

// Função auxiliar para mostrar controles touch (apenas em mobile e quando jogo está rodando)
function showTouchControls() {
    const touchControls = document.getElementById('touchControls');
    if (!touchControls) return;
    
    const isMobile = isMobileDevice();
    
    if (isMobile && gameRunning) {
        // Forçar visibilidade usando setProperty com important
        touchControls.style.setProperty('display', 'flex', 'important');
        touchControls.style.setProperty('pointer-events', 'auto', 'important');
        touchControls.style.setProperty('visibility', 'visible', 'important');
        touchControls.style.setProperty('opacity', '1', 'important');
    } else {
        touchControls.style.setProperty('display', 'none', 'important');
        touchControls.style.setProperty('pointer-events', 'none', 'important');
    }
}

// Atualizar controles quando a orientação mudar
window.addEventListener('resize', function() {
    if (gameRunning) {
        // Pequeno delay para garantir que a orientação mudou
        setTimeout(showTouchControls, 100);
    }
});

window.addEventListener('orientationchange', function() {
    if (gameRunning) {
        // Delay maior para orientationchange
        setTimeout(showTouchControls, 200);
    }
});

function closeRoadmap() {
    // Esconder controles touch ao fechar roadmap
    hideTouchControls();
    
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

        // Reiniciar animação do menu se não estiver rodando
        // Usar setTimeout para garantir que o DOM foi atualizado
        setTimeout(() => {
            if (!menuAnimFrame) {
                resetMenuWaitTime(); // Resetar tempo de espera
                animateMenu();
            }
        }, 50);
    }
}

// Abrir área (mostrar sub-fases)
function openArea(area) {
    if (!gameProgress.unlockedAreas.includes(area)) return;

    currentArea = area;
    const config = areaConfig[area];

    // Atualizar título
    document.getElementById('substagesTitle').textContent = `${config.icon} ${config.name}`;

    // Personalizar cores e estilo baseado na área
    const substagesOverlayEl = document.getElementById('substagesOverlay');
    const substagesBox = document.querySelector('.substages-box');

    if (substagesOverlayEl && substagesBox) {
        // Remover classes de área anteriores
        substagesOverlayEl.classList.remove('area-forest', 'area-desert', 'area-ice', 'area-volcano', 'area-castle', 'area-tropical', 'area-metropolis', 'area-mountain', 'area-swamp', 'area-sky');
        substagesBox.classList.remove('area-forest', 'area-desert', 'area-ice', 'area-volcano', 'area-castle', 'area-tropical', 'area-metropolis', 'area-mountain', 'area-swamp', 'area-sky');

        // Adicionar classe da área atual (usar cor padrão se não houver classe específica)
        const areaClasses = {
            1: 'area-forest',
            2: 'area-swamp',
            3: 'area-tropical',
            4: 'area-desert',
            5: 'area-metropolis',
            6: 'area-volcano',
            7: 'area-ice',
            8: 'area-sky',
            9: 'area-castle',
            10: 'area-mountain'
        };
        const areaClass = areaClasses[area] || 'area-forest';
        substagesOverlayEl.classList.add(areaClass);
        substagesBox.classList.add(areaClass);

        // Aplicar cores personalizadas via estilo inline
        const areaStyles = {
            1: { // Floresta
                overlayBg: 'rgba(26, 61, 14, 0.95)',
                boxBg: 'linear-gradient(135deg, #1a3d0e 0%, #2d5016 100%)',
                borderColor: '#27ae60',
                titleColor: '#2ecc71'
            },
            2: { // Deserto
                overlayBg: 'rgba(139, 69, 19, 0.95)',
                boxBg: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)',
                borderColor: '#d2691e',
                titleColor: '#f39c12'
            },
            3: { // Gelo
                overlayBg: 'rgba(26, 61, 92, 0.95)',
                boxBg: 'linear-gradient(135deg, #1a3d5c 0%, #2c4a6b 100%)',
                borderColor: '#87CEEB',
                titleColor: '#B0E0E6'
            },
            4: { // Vulcão
                overlayBg: 'rgba(93, 26, 26, 0.95)',
                boxBg: 'linear-gradient(135deg, #5d1a1a 0%, #7d2a2a 100%)',
                borderColor: '#e74c3c',
                titleColor: '#ff6b6b'
            },
            2: { // Pântano
                overlayBg: 'rgba(46, 204, 113, 0.95)',
                boxBg: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
                borderColor: '#2ecc71',
                titleColor: '#ffffff'
            },
            3: { // Ilha Tropical
                overlayBg: 'rgba(22, 160, 133, 0.95)',
                boxBg: 'linear-gradient(135deg, #16a085 0%, #1abc9c 100%)',
                borderColor: '#16a085',
                titleColor: '#ffffff'
            },
            4: { // Deserto
                overlayBg: 'rgba(139, 69, 19, 0.95)',
                boxBg: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)',
                borderColor: '#d2691e',
                titleColor: '#f39c12'
            },
            5: { // Metrópole
                overlayBg: 'rgba(52, 73, 94, 0.95)',
                boxBg: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
                borderColor: '#34495e',
                titleColor: '#ecf0f1'
            },
            6: { // Vulcão
                overlayBg: 'rgba(93, 26, 26, 0.95)',
                boxBg: 'linear-gradient(135deg, #5d1a1a 0%, #7d2a2a 100%)',
                borderColor: '#e74c3c',
                titleColor: '#ff6b6b'
            },
            7: { // Gelo
                overlayBg: 'rgba(26, 61, 92, 0.95)',
                boxBg: 'linear-gradient(135deg, #1a3d5c 0%, #2c4a6b 100%)',
                borderColor: '#87CEEB',
                titleColor: '#B0E0E6'
            },
            8: { // Céu
                overlayBg: 'rgba(236, 240, 241, 0.95)',
                boxBg: 'linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%)',
                borderColor: '#ecf0f1',
                titleColor: '#ffffff'
            },
            9: { // Castelo
                overlayBg: 'rgba(44, 44, 84, 0.95)',
                boxBg: 'linear-gradient(135deg, #2c2c54 0%, #40407a 100%)',
                borderColor: '#9b59b6',
                titleColor: '#bb8fce'
            },
            10: { // Montanha (FINAL)
                overlayBg: 'rgba(149, 165, 166, 0.95)',
                boxBg: 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',
                borderColor: '#95a5a6',
                titleColor: '#ffffff'
            }
        };

        const style = areaStyles[area] || areaStyles[1];
        substagesOverlayEl.style.background = style.overlayBg;
        substagesBox.style.background = style.boxBg;
        substagesBox.style.borderColor = style.borderColor;
        const titleEl = substagesBox.querySelector('h3');
        if (titleEl) {
            titleEl.style.color = style.titleColor;
            // Adicionar sombra de texto para melhor visibilidade, especialmente para áreas verdes
            if (area === 2 || area === 3) { // Pântano ou Ilha Tropical
                titleEl.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
            }
        }
    }

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

        // Usar nome da fase se disponível, senão usar numeração genérica
        let displayName;
        if (substage.isBoss) {
            // Mostrar nome do boss específico da área
            const bossType = bossCpuTypes[area];
            if (bossType && bossType.name) {
                displayName = `👑 ${bossType.name}`;
            } else {
                displayName = '👑 CHEFE';
            }
        } else if (substage.isBonus) {
            // Personalizar texto do bônus baseado na área
            if (area === 7) { // Gelo
                displayName = '❄️ BÔNUS';
            } else if (area === 4) { // Deserto
                displayName = '🌵 BÔNUS';
            } else if (area === 3) { // Ilha Tropical
                displayName = '🐟 BÔNUS';
            } else if (area === 5) { // Metrópole
                displayName = '🍞 BÔNUS';
            } else if (area === 2) { // Pântano
                displayName = '🦟 BÔNUS';
            } else {
                displayName = '🪱 BÔNUS';
            }
        } else {
            // Verificar se há nome específico para esta área e fase
            if (substageNames[area] && substageNames[area][i]) {
                displayName = substageNames[area][i];
            } else {
                // Nomes genéricos para áreas ainda não implementadas
                const genericNames = {
                    1: 'Fase Inicial',
                    2: 'Fase Intermediária',
                    3: 'Fase Avançada',
                    4: 'Fase Bônus',
                    5: 'Fase Final',
                    6: 'Fase Especial',
                    7: 'Fase do Chefe'
                };
                displayName = genericNames[i] || `${area}-${i}`;
            }
        }

        card.innerHTML = `
                    <div class="substage-number">${displayName}</div>
                    <div class="substage-stars">
                <span class="${stars >= 1 ? 'filled' : ''}">${stars >= 1 ? '★' : '☆'}</span>
                <span class="${stars >= 2 ? 'filled' : ''}">${stars >= 2 ? '★' : '☆'}</span>
                <span class="${stars >= 3 ? 'filled' : ''}">${stars >= 3 ? '★' : '☆'}</span>
                <span class="${stars >= 4 ? 'filled' : ''}">${stars >= 4 ? '★' : '☆'}</span>
                <span class="${stars >= 5 ? 'filled' : ''}">${stars >= 5 ? '★' : '☆'}</span>
                    </div>
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
    if (substagesOverlay) {
        substagesOverlay.classList.remove('active');
        // Não definir style.display = 'none' para permitir que CSS controle a exibição
        // O CSS já define display: none quando não tem a classe 'active'
    }
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

        // Mapeamento especial para area 1 (Floresta), area 2 (Pantano) e area 3 (Ilha Tropical) devido a fase bonus
        let cpuIndex;
        if (area === 1) {
            // Floresta: 1=Pica-pau, 2=Sete Cores, 3=Araponga, 5=Tie-sangue, 6=Bacurau
            const florestaMap = { 1: 0, 2: 1, 3: 2, 5: 3, 6: 4 };
            cpuIndex = florestaMap[substage] !== undefined ? florestaMap[substage] : 0;
        } else if (area === 2) {
            // Pântano: 1=Cavalaria, 2=Lavadeira, 3=Saracura, 5=Martim, 6=Gavião Caramujeiro
            const pantanoMap = { 1: 0, 2: 1, 3: 2, 5: 3, 6: 4 };
            cpuIndex = pantanoMap[substage] !== undefined ? pantanoMap[substage] : 0;
        } else if (area === 3) {
            // Ilha Tropical: 1=Flamingo, 2=Arara, 3=Guará, 5=Gaivota, 6=Pelicano
            const tropicalMap = { 1: 0, 2: 1, 3: 2, 5: 3, 6: 4 };
            cpuIndex = tropicalMap[substage] !== undefined ? tropicalMap[substage] : 0;
        } else if (area === 4) {
            // Deserto: 1=Pyrrhuloxia, 2=Acorn Woodpecker, 3=Virginia's Warbler, 5=Abutre Barbudo, 6=Phainopepla
            const desertoMap = { 1: 0, 2: 1, 3: 2, 5: 3, 6: 4 };
            cpuIndex = desertoMap[substage] !== undefined ? desertoMap[substage] : 0;
        } else {
            // Outras áreas: usar índice padrão (substage - 1)
            cpuIndex = substage - 1;
        }

        const cpuData = areaCpus[cpuIndex] || areaCpus[0];
        cpu.color = cpuData.color;
        cpu.wingColor = cpuData.wingColor;
        cpu.type = cpuData.type || null; // Usar tipo se definido
        cpu.eyeColor = cpuData.eyeColor || null;
        cpu.beakColor = cpuData.beakColor || '#f39c12';
        cpu.size = 35; // Tamanho normal
    }

    // Configurar velocidade da CPU (com modificador de dificuldade)
    cpu.baseSpeed = config.cpuSpeed;
    cpu.speed = config.cpuSpeed;
    cpu.reactionDelay = diffMod.cpuReactionDelay;
}

// Atualizar UI baseado no tipo de fase
// Calcular estrelas baseado na performance atual
function calculateCurrentStars() {
    if (isBonusStage) {
        const config = substageConfig[currentSubstage];
        const extra = playerScore - config.goalScore;
        if (extra >= 20) return 5;
        if (extra >= 15) return 4;
        if (extra >= 10) return 3;
        if (extra >= 5) return 2;
        if (playerScore >= config.goalScore) return 1;
        return 0;
    } else {
        const diff = playerScore - cpuScore;
        if (diff >= 20) return 5;
        if (diff >= 15) return 4;
        if (diff >= 10) return 3;
        if (diff >= 5) return 2;
        if (diff > 0) return 1;
        return 0;
    }
}

// Função para atualizar estrelas (agora desenhadas no canvas, não precisa mais)
function updateStarsHUD() {
    // Estrelas são desenhadas diretamente no canvas durante o draw()
    // Esta função é mantida para compatibilidade mas não faz nada
}

function updateStageUI() {
    const bonusUI = document.getElementById('bonusUI');
    const cooldownContainer = document.getElementById('cooldownContainer');
    const starsHud = document.getElementById('starsHud');

    if (isBonusStage) {
        // Fase bônus - esconder stun e estrelas (placar já está no canvas)
        if (cooldownContainer) cooldownContainer.style.display = 'none';
        if (starsHud) starsHud.style.display = 'none';
        // Esconder UI bônus HTML (placar já está desenhado no canvas)
        if (bonusUI) bonusUI.style.display = 'none';

        // Atualizar meta de minhocas/insetos/frutas (para referência interna)
        const config = substageConfig[currentSubstage];
        const bonusCounter = document.querySelector('.bonus-counter');
        const wormGoal = document.getElementById('wormGoal');
        const wormCount = document.getElementById('wormCount');

        // Atualizar texto do contador baseado na área
        if (bonusCounter) {
            if (currentArea === 7) {
                bonusCounter.innerHTML = `❄️ Frutas: <span id="wormCount">0</span> / <span id="wormGoal">${config.goalScore}</span>`;
            } else if (currentArea === 5) {
                bonusCounter.innerHTML = `🍞 Pães: <span id="wormCount">0</span> / <span id="wormGoal">${config.goalScore}</span>`;
            } else if (currentArea === 4) {
                bonusCounter.innerHTML = `🌵 Frutos: <span id="wormCount">0</span> / <span id="wormGoal">${config.goalScore}</span>`;
            } else if (currentArea === 3) {
                bonusCounter.innerHTML = `🐟 Peixes: <span id="wormCount">0</span> / <span id="wormGoal">${config.goalScore}</span>`;
            } else if (currentArea === 2) {
                bonusCounter.innerHTML = `🦟 Insetos: <span id="wormCount">0</span> / <span id="wormGoal">${config.goalScore}</span>`;
            } else {
                bonusCounter.innerHTML = `🪱 Minhocas: <span id="wormCount">0</span> / <span id="wormGoal">${config.goalScore}</span>`;
            }
        }

        if (wormGoal) wormGoal.textContent = config.goalScore;
        if (wormCount) wormCount.textContent = '0';
    } else {
        // Fase normal - elementos HTML escondidos (tudo no canvas)
        if (cooldownContainer) cooldownContainer.style.display = 'none';
        if (bonusUI) bonusUI.style.display = 'none';
    }
}

// Selecionar sub-fase
function selectSubstage(area, substage) {
    if (!gameProgress.unlockedStages[area] || !gameProgress.unlockedStages[area].includes(substage)) return;

    // Parar som de vespas se estiver tocando (ao mudar de fase)
    stopBuzzSound();

    // Verificar se o jogador tem vidas disponíveis
    updateLivesFromTime();
    if (gameProgress.lives <= 0) {
        alert('Você não tem vidas disponíveis! Aguarde a regeneração ou compre uma vida com moedas.');
        return;
    }

    // Atualizar cor do jogador com a cor selecionada
    player.color = selectedPlayerColor;

    currentArea = area;
    currentSubstage = substage;
    currentLevel = area; // Compatibilidade

    // Inicializar elementos decorativos do cenário
    initBackgroundDecorations();

    // Zerar placar ao iniciar nova fase
    playerScore = 0;
    cpuScore = 0;
    lastStarCount = 0; // Resetar contador de estrelas
    starAnimationFrame = 0; // Resetar animação
    scoreTextEffects = []; // Limpar partículas de texto
    // Placar agora é desenhado no canvas, não precisa atualizar HTML

    // Zerar stun ao iniciar nova fase
    player.stunCharge = 0;
    player.stunChargeTimer = 0;
    player.stunned = false;
    player.stunTime = 0;
    // Resetar gordura do jogador ao mudar de fase
    if (player.fatness) {
        player.fatness = 0;
        player.speed = player.baseSpeed;
        player.boostedSpeed = 10;
    }
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
        if (currentArea === 7) {
            // Inicializar frutas congeladas para área do gelo
            initFrozenFruits();
        } else if (currentArea === 4) {
            // Inicializar frutos de cactos para área do deserto
            initCactusFruits();
        } else if (currentArea === 5) {
            // Inicializar pães para área da Metrópole
            initMetropolisBread();
            // Atualizar texto do contador para pães
            const bonusCounter = document.querySelector('.bonus-counter');
            if (bonusCounter) {
                const config = substageConfig[currentSubstage];
                bonusCounter.innerHTML = `🍞 Pães: <span id="wormCount">0</span> / <span id="wormGoal">${config.goalScore}</span>`;
            }
        } else if (currentArea === 5) {
            // Inicializar pães para área da Metrópole
            initMetropolisBread();
            // Atualizar texto do contador para pães
            const bonusCounter = document.querySelector('.bonus-counter');
            if (bonusCounter) {
                const config = substageConfig[currentSubstage];
                bonusCounter.innerHTML = `🍞 Pães: <span id="wormCount">0</span> / <span id="wormGoal">${config.goalScore}</span>`;
            }
        } else if (currentArea === 3) {
            // Inicializar peixes para área da Ilha Tropical
            initTropicalFish();
            // Atualizar texto do contador para peixes
            const bonusCounter = document.querySelector('.bonus-counter');
            if (bonusCounter) {
                const config = substageConfig[currentSubstage];
                bonusCounter.innerHTML = `🐟 Peixes: <span id="wormCount">0</span> / <span id="wormGoal">${config.goalScore}</span>`;
            }
        } else if (currentArea === 2) {
            // Inicializar insetos para área do pântano
            initSwampInsects();
            // Atualizar texto do contador para insetos
            const bonusCounter = document.querySelector('.bonus-counter');
            if (bonusCounter) {
                const config = substageConfig[currentSubstage];
                bonusCounter.innerHTML = `🦟 Insetos: <span id="wormCount">0</span> / <span id="wormGoal">${config.goalScore}</span>`;
            }
        } else {
            // Inicializar minhocas para outras áreas
            initWormHoles();
        }
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
function drawCountdownBird(ctxC, x, y, color, facingRight, time, wingColor = null, type = null, beakColor = null, eyeColor = null) {
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

    // Corpo - para Tuiuiu e Falcão-das-pradarias, garantir que seja branco
    const bodyColor = (type === 'tuiuiu' || type === 'prairie-falcon') ? '#ffffff' : color;
    ctxC.fillStyle = bodyColor;
    ctxC.beginPath();
    ctxC.arc(0, 0, 35, 0, Math.PI * 2);
    ctxC.fill();

    ctxC.shadowBlur = 0;

    // Desenhar detalhes específicos do tipo ANTES do olho e bico
    if (type) {
        drawCountdownBirdTypeDetails(ctxC, type, 35, wingColor, color);
    }

    // Olho
    if (type === 'toucan') {
        // Tucano - olho azul com anel laranja
        // Anel laranja ao redor do olho
        ctxC.fillStyle = '#FF8C00';
        ctxC.beginPath();
        ctxC.arc(10, -5, 8, 0, Math.PI * 2);
        ctxC.fill();
        // Olho azul
        ctxC.fillStyle = '#4169E1';
        ctxC.beginPath();
        ctxC.arc(10, -5, 6, 0, Math.PI * 2);
        ctxC.fill();
        // Pupila preta
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(12, -5, 4, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'gull') {
        // Gaivota - olho vermelho-laranja com anel amarelo claro
        // Anel amarelo claro ao redor do olho
        ctxC.fillStyle = '#FFD700';
        ctxC.beginPath();
        ctxC.arc(10, -5, 8, 0, Math.PI * 2);
        ctxC.fill();
        // Olho vermelho-laranja
        ctxC.fillStyle = '#FF4500';
        ctxC.beginPath();
        ctxC.arc(10, -5, 6, 0, Math.PI * 2);
        ctxC.fill();
        // Pupila preta
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(12, -5, 4, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'guara') {
        // Guará - olho pequeno e escuro com anel rosa-avermelhado
        // Anel rosa-avermelhado ao redor do olho
        ctxC.fillStyle = '#FF69B4';
        ctxC.beginPath();
        ctxC.arc(10, -5, 6, 0, Math.PI * 2);
        ctxC.fill();
        // Olho escuro
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(10, -5, 4, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'pelican') {
        // Pelicano - olho pequeno e escuro com anel rosa-avermelhado
        // Anel rosa-avermelhado ao redor do olho
        ctxC.fillStyle = '#FF69B4';
        ctxC.beginPath();
        ctxC.arc(10, -5, 6, 0, Math.PI * 2);
        ctxC.fill();
        // Olho escuro
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(10, -5, 4, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'pyrrhuloxia') {
        // Pyrrhuloxia - olho vermelho brilhante
        ctxC.fillStyle = '#DC143C';
        ctxC.beginPath();
        ctxC.arc(10, -5, 8, 0, Math.PI * 2);
        ctxC.fill();
        // Pupila preta
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(10, -5, 5, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'acorn-woodpecker') {
        // Acorn Woodpecker - olho escuro com íris vermelho-marrom
        ctxC.fillStyle = '#8B4513'; // Íris vermelho-marrom
        ctxC.beginPath();
        ctxC.arc(10, -5, 8, 0, Math.PI * 2);
        ctxC.fill();
        // Pupila preta
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(10, -5, 5, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'virginias-warbler') {
        // Virginia's Warbler - olho pequeno, redondo e preto
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(10, -5, 6, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'bearded-vulture') {
        // Abutre Barbudo - olho vermelho intenso com pupila preta
        ctxC.fillStyle = '#DC143C'; // Vermelho intenso
        ctxC.beginPath();
        ctxC.arc(10, -5, 8, 0, Math.PI * 2);
        ctxC.fill();
        // Pupila preta
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(10, -5, 5, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'phainopepla') {
        // Phainopepla - olho vermelho intenso com pupila preta
        ctxC.fillStyle = '#DC143C'; // Vermelho intenso
        ctxC.beginPath();
        ctxC.arc(10, -5, 7, 0, Math.PI * 2);
        ctxC.fill();
        // Pupila preta
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(10, -5, 4.5, 0, Math.PI * 2);
        ctxC.fill();
    } else {
        ctxC.fillStyle = 'white';
        ctxC.beginPath();
        ctxC.arc(10, -5, 10, 0, Math.PI * 2);
        ctxC.fill();

        // Pupila - cor específica para Bacurau (amarelo) ou Saracura (vermelho brilhante), senão vermelha (raiva)
        if (type === 'bacurau' && eyeColor) {
            ctxC.fillStyle = eyeColor; // Amarelo para Bacurau
        } else if (type === 'saracura' && eyeColor) {
            ctxC.fillStyle = eyeColor; // Vermelho brilhante para Saracura
        } else {
            ctxC.fillStyle = '#c0392b'; // Vermelho para outros
        }
        ctxC.beginPath();
        ctxC.arc(12, -5, 6, 0, Math.PI * 2);
        ctxC.fill();
    }

    // Sobrancelha brava
    ctxC.strokeStyle = 'black';
    ctxC.lineWidth = 3;
    ctxC.beginPath();
    ctxC.moveTo(2, -18);
    ctxC.lineTo(20, -12);
    ctxC.stroke();

    // Bico aberto (gritando) - usar cor específica se fornecida
    let beakLengthC = 20;
    let beakWidthC = 3;
    if (type === 'toucan') {
        beakLengthC = 45;
        beakWidthC = 6;
        // Gradiente para o bico do tucano
        const gradient = ctxC.createLinearGradient(30, 0, 30 + beakLengthC, 0);
        gradient.addColorStop(0, '#FFD700'); // Amarelo na base
        gradient.addColorStop(0.5, '#FF8C00'); // Laranja no meio
        gradient.addColorStop(0.8, '#FF4500'); // Vermelho-laranja
        gradient.addColorStop(1, '#000000'); // Preto na ponta
        ctxC.fillStyle = gradient;
    } else if (type === 'gull') {
        beakLengthC = 18;
        beakWidthC = 4;
        ctxC.fillStyle = '#FFD700'; // Bico amarelo para gaivota
    } else if (type === 'guara') {
        beakLengthC = 35;
        beakWidthC = 2;
        ctxC.fillStyle = '#FFE4B5'; // Bico rosa-bege para Guará
    } else if (type === 'pyrrhuloxia') {
        beakLengthC = 18;
        beakWidthC = 4;
        ctxC.fillStyle = '#DC143C'; // Bico vermelho brilhante para Pyrrhuloxia
    } else if (type === 'acorn-woodpecker') {
        beakLengthC = 25;
        beakWidthC = 3;
        ctxC.fillStyle = '#C0C0C0'; // Bico prata-acinzentado metálico para Acorn Woodpecker
    } else if (type === 'virginias-warbler') {
        beakLengthC = 15;
        beakWidthC = 2;
        ctxC.fillStyle = '#2F2F2F'; // Bico curto, pontiagudo, cinza escuro para Virginia's Warbler
    } else if (type === 'bearded-vulture') {
        beakLengthC = 28;
        beakWidthC = 4;
        ctxC.fillStyle = '#4A4A4A'; // Bico forte, curvado, cinza escuro para Abutre Barbudo
    } else if (type === 'phainopepla') {
        beakLengthC = 18;
        beakWidthC = 3;
        ctxC.fillStyle = '#000000'; // Bico curto, grosso e pontiagudo, preto para Phainopepla
    } else {
        ctxC.fillStyle = beakColor || '#f39c12';
    }
    
    ctxC.beginPath();
    ctxC.moveTo(30, -beakWidthC);
    ctxC.lineTo(30 + beakLengthC, 0);
    ctxC.lineTo(30, beakWidthC);
    ctxC.closePath();
    ctxC.fill();

    if (type === 'toucan') {
        // Gradiente para bico inferior do tucano
        const gradient2 = ctxC.createLinearGradient(30, beakWidthC, 30 + beakLengthC * 0.8, beakWidthC);
        gradient2.addColorStop(0, '#FFD700');
        gradient2.addColorStop(0.5, '#FF8C00');
        gradient2.addColorStop(0.8, '#FF4500');
        gradient2.addColorStop(1, '#000000');
        ctxC.fillStyle = gradient2;
    } else if (type === 'gull') {
        ctxC.fillStyle = '#FFD700';
    } else if (type === 'guara') {
        ctxC.fillStyle = '#FFE4B5';
    }

    ctxC.beginPath();
    ctxC.moveTo(30, beakWidthC);
    ctxC.lineTo(30 + beakLengthC * 0.8, 8);
    ctxC.lineTo(30, beakWidthC * 2);
    ctxC.closePath();
    ctxC.fill();
    
    // Mancha vermelho-laranja no bico da gaivota (mandíbula inferior)
    if (type === 'gull') {
        ctxC.fillStyle = '#FF4500';
        ctxC.beginPath();
        ctxC.arc(30 + beakLengthC * 0.7, 8, 2, 0, Math.PI * 2);
        ctxC.fill();
    }

    // Asa batendo
    const wingFlap = Math.sin(time / 80) * 0.5;
    const wingY = 5 + Math.sin(time / 80) * 8;
    const finalWingColor = facingRight ? selectedPlayerWing : (wingColor || cpu.wingColor || '#c0392b');
    ctxC.fillStyle = finalWingColor;
    ctxC.beginPath();
    ctxC.ellipse(-10, wingY, 20, 12 + Math.cos(time / 80) * 6, -0.3 + wingFlap, 0, Math.PI * 2);
    ctxC.fill();

    // Símbolos de raiva
    ctxC.font = '16px Arial';
    ctxC.fillText('💢', -25, -30 + Math.sin(time / 150) * 3);

    ctxC.restore();
}

// Função auxiliar para desenhar detalhes específicos do tipo no countdown
function drawCountdownBirdTypeDetails(ctxC, type, size, wingColor, baseColor) {
    switch (type) {
        case 'woodpecker': // Pica-pau
            // Mancha vermelha na bochecha
            ctxC.fillStyle = '#DC143C';
            ctxC.beginPath();
            ctxC.arc(8, 2, size * 0.25, 0, Math.PI * 2);
            ctxC.fill();
            // Listras no pescoço
            for (let i = 0; i < 3; i++) {
                const stripeY = size * 0.3 + (i * size * 0.15);
                ctxC.fillStyle = '#000000';
                ctxC.fillRect(-size * 0.4, stripeY - size * 0.05, size * 0.8, size * 0.08);
            }
            // Crista amarela
            ctxC.fillStyle = '#FFD700';
            ctxC.beginPath();
            ctxC.moveTo(-size * 0.2, -size * 0.7);
            ctxC.lineTo(0, -size * 0.9);
            ctxC.lineTo(size * 0.2, -size * 0.7);
            ctxC.closePath();
            ctxC.fill();
            break;

        case 'sete-cores': // Saíra-sete-cores
            // Cabeça turquesa
            ctxC.fillStyle = '#40E0D0';
            ctxC.beginPath();
            ctxC.arc(0, -size * 0.6, size * 0.4, 0, Math.PI * 2);
            ctxC.fill();
            // Nuca amarelo-verde
            ctxC.fillStyle = '#ADFF2F';
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.3, -size * 0.2, size * 0.5, size * 0.3, -0.3, 0, Math.PI * 2);
            ctxC.fill();
            // Costas azul escuro
            ctxC.fillStyle = '#191970';
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.4, 0, size * 0.6, size * 0.4, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            // Peito laranja
            ctxC.fillStyle = '#FF6347';
            ctxC.beginPath();
            ctxC.ellipse(0, size * 0.2, size * 0.5, size * 0.4, 0, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'cavalaria': // Cavalaria-do-brejo
            // Corpo vermelho brilhante (já desenhado pela cor base)
            // Asas e dorso pretos
            ctxC.fillStyle = '#000000'; // Preto sólido
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.4, -size * 0.2, size * 0.5, size * 0.4, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            // Segunda parte preta nas asas
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.3, size * 0.1, size * 0.4, size * 0.3, -0.15, 0, Math.PI * 2);
            ctxC.fill();
            // Cauda preta
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.5, size * 0.3, size * 0.3, size * 0.25, -0.3, 0, Math.PI * 2);
            ctxC.fill();
            // Faixa branca horizontal na parte superior do peito
            ctxC.fillStyle = '#FFFFFF'; // Branco nítido
            ctxC.beginPath();
            ctxC.ellipse(0, -size * 0.15, size * 0.5, size * 0.08, 0, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'lavadeira': // Lavadeira-de-cauda
            // Corpo branco (já desenhado pela cor base)
            // Asas pretas/escuras
            ctxC.fillStyle = '#000000'; // Preto
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.4, -size * 0.1, size * 0.5, size * 0.35, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            // Segunda parte preta nas asas
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.3, size * 0.15, size * 0.4, size * 0.3, -0.15, 0, Math.PI * 2);
            ctxC.fill();
            // Marcas brancas sutis nas asas
            ctxC.fillStyle = '#FFFFFF';
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.35, size * 0.05, size * 0.15, size * 0.08, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'saracura': // Saracura três potes
            // Cabeça e pescoço cinza ardósia
            ctxC.fillStyle = '#708090'; // Cinza ardósia
            ctxC.beginPath();
            ctxC.ellipse(0, -size * 0.5, size * 0.4, size * 0.3, 0, 0, Math.PI * 2);
            ctxC.fill();
            // Pescoço cinza
            ctxC.beginPath();
            ctxC.ellipse(0, -size * 0.2, size * 0.25, size * 0.35, 0, 0, Math.PI * 2);
            ctxC.fill();
            // Corpo superior (costas e asas) - marrom-oliva
            ctxC.fillStyle = '#6B8E23'; // Marrom-oliva
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.3, -size * 0.1, size * 0.5, size * 0.4, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            // Segunda parte marrom-oliva nas asas
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.25, size * 0.1, size * 0.4, size * 0.3, -0.15, 0, Math.PI * 2);
            ctxC.fill();
            // Cauda curta e escura
            ctxC.fillStyle = '#2F4F2F'; // Verde escuro/marrom escuro
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.5, size * 0.25, size * 0.25, size * 0.2, -0.3, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'martim': // Martim-pescador
            // Peito/ventre branco ou creme claro
            ctxC.fillStyle = '#F5F5DC'; // Bege claro
            ctxC.beginPath();
            ctxC.ellipse(0, size * 0.25, size * 0.5, size * 0.63, 0, 0, Math.PI * 2);
            ctxC.fill();
            // Faixa escura na cabeça
            ctxC.fillStyle = '#1a3d0e'; // Verde escuro
            ctxC.beginPath();
            ctxC.ellipse(0, -size * 0.75, size * 0.44, size * 0.19, 0, 0, Math.PI * 2);
            ctxC.fill();
            // Padrão de penas nas asas (verde mais escuro)
            ctxC.fillStyle = '#2ecc71'; // Verde médio
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.38, -size * 0.13, size * 0.56, size * 0.44, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            // Detalhes nas asas - faixas mais escuras
            ctxC.fillStyle = '#27ae60'; // Verde mais escuro
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.31, size * 0.13, size * 0.44, size * 0.35, -0.15, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'arara': // Arara-azul-e-amarela (Ara ararauna)
            // 1. Peito/barriga amarelo dourado (com camada adicional e textura)
            ctxC.fillStyle = '#FFD700';
            ctxC.beginPath();
            ctxC.ellipse(0, size * 0.25, size * 0.45, size * 0.55, 0, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.fillStyle = '#FFA500';
            ctxC.beginPath();
            ctxC.ellipse(0, size * 0.35, size * 0.35, size * 0.4, 0, 0, Math.PI * 2);
            ctxC.fill();
            // Textura de penas no peito
            ctxC.fillStyle = 'rgba(255, 200, 0, 0.3)';
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 3; j++) {
                    ctxC.beginPath();
                    ctxC.arc(-size * 0.2 + i * size * 0.1, size * 0.3 + j * size * 0.15, size * 0.03, 0, Math.PI * 2);
                    ctxC.fill();
                }
            }
            // 2. Dorso e asas azul vívido (com detalhes e padrão de penas)
            ctxC.fillStyle = '#0066FF';
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.3, -size * 0.15, size * 0.5, size * 0.4, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.fillStyle = '#0044CC';
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.35, -size * 0.1, size * 0.3, size * 0.25, -0.25, 0, Math.PI * 2);
            ctxC.fill();
            // Padrão de penas nas asas
            ctxC.strokeStyle = '#0033AA';
            ctxC.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                ctxC.beginPath();
                ctxC.moveTo(-size * 0.5, -size * 0.2 + i * size * 0.08);
                ctxC.lineTo(-size * 0.25, -size * 0.15 + i * size * 0.08);
                ctxC.stroke();
            }
            ctxC.fillStyle = '#0066FF';
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.25, size * 0.1, size * 0.4, size * 0.3, -0.15, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.fillStyle = '#0044CC';
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.3, size * 0.15, size * 0.25, size * 0.2, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            // Padrão de penas na segunda camada
            for (let i = 0; i < 3; i++) {
                ctxC.beginPath();
                ctxC.moveTo(-size * 0.45, size * 0.05 + i * size * 0.08);
                ctxC.lineTo(-size * 0.2, size * 0.1 + i * size * 0.08);
                ctxC.stroke();
            }
            // 3. Cabeça azul (com detalhes)
            ctxC.fillStyle = '#0066FF';
            ctxC.beginPath();
            ctxC.arc(size * 0.25, -size * 0.65, size * 0.4, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.fillStyle = '#0044CC';
            ctxC.beginPath();
            ctxC.arc(size * 0.2, -size * 0.75, size * 0.25, 0, Math.PI * 2);
            ctxC.fill();
            // Detalhes de penas na cabeça
            ctxC.strokeStyle = '#0033AA';
            for (let i = 0; i < 3; i++) {
                ctxC.beginPath();
                ctxC.moveTo(-size * 0.1, -size * 0.7 + i * size * 0.05);
                ctxC.lineTo(size * 0.15, -size * 0.65 + i * size * 0.05);
                ctxC.stroke();
            }
            // 4. Face branca (com borda)
            ctxC.fillStyle = '#FFFFFF';
            ctxC.beginPath();
            ctxC.ellipse(size * 0.45, -size * 0.1, size * 0.5, size * 0.5, -0.1, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.fillStyle = '#F5F5F5';
            ctxC.beginPath();
            ctxC.ellipse(size * 0.5, -size * 0.05, size * 0.3, size * 0.3, -0.1, 0, Math.PI * 2);
            ctxC.fill();
            // Borda sutil
            ctxC.strokeStyle = '#E0E0E0';
            ctxC.lineWidth = 1;
            ctxC.beginPath();
            ctxC.ellipse(size * 0.45, -size * 0.1, size * 0.5, size * 0.5, -0.1, 0, Math.PI * 2);
            ctxC.stroke();
            // 5. Padrão de penas pretas ao redor dos olhos (em leque)
            ctxC.fillStyle = '#000000';
            for (let i = 0; i < 5; i++) {
                const angle = (i - 2) * 0.15;
                const x = size * 0.35 + i * size * 0.05;
                const y = -size * 0.15;
                ctxC.beginPath();
                ctxC.ellipse(x, y, size * 0.04, size * 0.03, angle, 0, Math.PI * 2);
                ctxC.fill();
            }
            for (let i = 0; i < 4; i++) {
                const angle = (i - 1.5) * 0.12;
                const x = size * 0.4 + i * size * 0.05;
                const y = size * 0.1;
                ctxC.beginPath();
                ctxC.ellipse(x, y, size * 0.035, size * 0.025, angle, 0, Math.PI * 2);
                ctxC.fill();
            }
            for (let i = 0; i < 3; i++) {
                const angle = (i - 1) * 0.1;
                const x = size * 0.25 + i * size * 0.08;
                const y = -size * 0.05;
                ctxC.beginPath();
                ctxC.ellipse(x, y, size * 0.03, size * 0.02, angle, 0, Math.PI * 2);
                ctxC.fill();
            }
            // Linhas conectando as penas
            ctxC.strokeStyle = '#000000';
            ctxC.lineWidth = 0.5;
            for (let i = 0; i < 3; i++) {
                ctxC.beginPath();
                ctxC.moveTo(size * 0.35 + i * size * 0.05, -size * 0.15);
                ctxC.lineTo(size * 0.4 + i * size * 0.05, size * 0.1);
                ctxC.stroke();
            }
            // 6. Transição entre azul e amarelo
            ctxC.strokeStyle = '#FFA500';
            ctxC.lineWidth = 1;
            ctxC.beginPath();
            ctxC.moveTo(-size * 0.4, size * 0.15);
            ctxC.quadraticCurveTo(0, size * 0.2, size * 0.4, size * 0.15);
            ctxC.stroke();
            ctxC.strokeStyle = '#FF8C00';
            ctxC.lineWidth = 0.5;
            ctxC.beginPath();
            ctxC.moveTo(-size * 0.38, size * 0.18);
            ctxC.quadraticCurveTo(0, size * 0.22, size * 0.38, size * 0.18);
            ctxC.stroke();
            // 7. Cauda (com padrão de penas)
            ctxC.fillStyle = '#0066FF';
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.5, size * 0.3, size * 0.2, size * 0.4, -0.3, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.fillStyle = '#0044CC';
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.55, size * 0.4, size * 0.15, size * 0.3, -0.3, 0, Math.PI * 2);
            ctxC.fill();
            // Padrão de penas na cauda
            ctxC.strokeStyle = '#0033AA';
            for (let i = 0; i < 3; i++) {
                ctxC.beginPath();
                ctxC.moveTo(-size * 0.6, size * 0.25 + i * size * 0.1);
                ctxC.lineTo(-size * 0.45, size * 0.3 + i * size * 0.1);
                ctxC.stroke();
            }
            break;

        case 'flamingo': // Flamingo
            // Pescoço longo e curvado
            ctxC.fillStyle = '#FF69B4'; // Rosa coral vibrante
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.25, -size * 0.75, size * 0.19, size * 0.63, -0.3, 0, Math.PI * 2);
            ctxC.fill();
            // Cabeça arredondada
            ctxC.beginPath();
            ctxC.arc(-size * 0.38, -size * 1.13, size * 0.31, 0, Math.PI * 2);
            ctxC.fill();
            // Asas com penas mais escuras
            ctxC.fillStyle = '#FF1493'; // Rosa mais profundo
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.38, -size * 0.13, size * 0.56, size * 0.44, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            // Segunda camada de asas
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.31, size * 0.13, size * 0.44, size * 0.35, -0.15, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'gaviao-caramujeiro': // Gavião Caramujeiro
            // Padrão de penas escuras com textura sutil
            ctxC.fillStyle = '#0d0d0d'; // Preto mais profundo para asas
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.44, -size * 0.13, size * 0.63, size * 0.5, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            // Segunda camada de penas escuras
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.35, size * 0.13, size * 0.5, size * 0.38, -0.15, 0, Math.PI * 2);
            ctxC.fill();
            // Detalhes sutis de textura nas penas
            ctxC.fillStyle = '#2c2c2c'; // Cinza muito escuro para textura
            const textureSpotsC = [
                { x: -size * 0.38, y: -size * 0.06, size: size * 0.1 },
                { x: -size * 0.25, y: size * 0.19, size: size * 0.08 },
                { x: -size * 0.19, y: size * 0.31, size: size * 0.09 }
            ];
            textureSpotsC.forEach(spot => {
                ctxC.beginPath();
                ctxC.arc(spot.x, spot.y, spot.size, 0, Math.PI * 2);
                ctxC.fill();
            });
            break;

        case 'araponga': // Araponga
            // Círculo azul turquesa
            ctxC.fillStyle = '#40E0D0';
            ctxC.beginPath();
            ctxC.arc(size * 0.4, size * 0.2, size * 0.5, 0, Math.PI * 2);
            ctxC.fill();
            // Cabeça escura
            ctxC.fillStyle = '#2C2C2C';
            ctxC.beginPath();
            ctxC.ellipse(0, -size * 0.5, size * 0.45, size * 0.3, 0, 0, Math.PI * 2);
            ctxC.fill();
            // Costas escuras
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.3, -size * 0.1, size * 0.5, size * 0.35, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            // Manchas nas asas
            ctxC.fillStyle = '#1A1A1A';
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.4, size * 0.1, size * 0.3, size * 0.25, -0.3, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'tie-sangue': // Tie-sangue (Red-necked Tanager)
            // Corpo vermelho brilhante (já desenhado pela cor base)
            // Asas/parte traseira muito escura (quase preta)
            ctxC.fillStyle = '#1C1C1C'; // Preto/cinza carvão profundo
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.4, 0, size * 0.5, size * 0.4, -0.2, 0, Math.PI * 2);
            ctxC.fill();

            // Segunda parte escura na asa
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.3, size * 0.2, size * 0.35, size * 0.3, -0.15, 0, Math.PI * 2);
            ctxC.fill();

            // Mancha branca na base do bico (característica marcante)
            ctxC.fillStyle = '#FFFFFF'; // Branco brilhante
            ctxC.beginPath();
            ctxC.ellipse(-size * 0.15, -size * 0.3, size * 0.12, size * 0.08, 0.3, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'bacurau': // Bacurau
            // Cabeça achatada escura
            ctxC.fillStyle = '#6B5B4A';
            ctxC.beginPath();
            ctxC.ellipse(0, -size * 0.6, size * 0.4, size * 0.25, 0, 0, Math.PI * 2);
            ctxC.fill();
            // Padrão de penas manchado
            ctxC.fillStyle = '#5C4A3A';
            const darkSpots = [
                { angle: 0, dist: 0.35 },
                { angle: Math.PI / 3, dist: 0.4 },
                { angle: Math.PI * 2 / 3, dist: 0.3 },
                { angle: Math.PI, dist: 0.45 },
                { angle: Math.PI * 4 / 3, dist: 0.35 },
                { angle: Math.PI * 5 / 3, dist: 0.4 }
            ];
            darkSpots.forEach(spot => {
                const distance = size * spot.dist;
                const spotX = Math.cos(spot.angle) * distance;
                const spotY = Math.sin(spot.angle) * distance;
                ctxC.beginPath();
                ctxC.arc(spotX, spotY, size * 0.08, 0, Math.PI * 2);
                ctxC.fill();
            });
            // Manchas claras
            ctxC.fillStyle = '#D4C5A9';
            const lightSpots = [
                { angle: Math.PI / 4, dist: 0.28 },
                { angle: Math.PI * 3 / 4, dist: 0.32 },
                { angle: Math.PI * 5 / 4, dist: 0.3 },
                { angle: Math.PI * 7 / 4, dist: 0.35 }
            ];
            lightSpots.forEach(spot => {
                const distance = size * spot.dist;
                const spotX = Math.cos(spot.angle) * distance;
                const spotY = Math.sin(spot.angle) * distance;
                ctxC.beginPath();
                ctxC.arc(spotX, spotY, size * 0.06, 0, Math.PI * 2);
                ctxC.fill();
            });
            // Cerdas ao redor do bico
            ctxC.strokeStyle = '#654321';
            ctxC.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const angle = -0.5 + (i * 0.2);
                const startX = -size * 0.2;
                const startY = -size * 0.3;
                const endX = startX + Math.cos(angle) * size * 0.15;
                const endY = startY + Math.sin(angle) * size * 0.15;
                ctxC.beginPath();
                ctxC.moveTo(startX, startY);
                ctxC.lineTo(endX, endY);
                ctxC.stroke();
            }
            break;

        case 'toucan': // Tucano
            const toucanSize = size;
            // Mancha branca no peito
            ctxC.fillStyle = '#ffffff';
            ctxC.beginPath();
            ctxC.ellipse(0, toucanSize * 0.2, toucanSize * 0.4, toucanSize * 0.3, 0, 0, Math.PI * 2);
            ctxC.fill();
            // Linha separadora entre o peito branco e o corpo preto
            ctxC.strokeStyle = '#000000';
            ctxC.lineWidth = 2;
            ctxC.beginPath();
            ctxC.moveTo(-toucanSize * 0.4, toucanSize * 0.15);
            ctxC.lineTo(toucanSize * 0.4, toucanSize * 0.15);
            ctxC.stroke();
            // Detalhes nas asas (penas mais escuras - preto)
            ctxC.fillStyle = '#1a1a1a';
            ctxC.beginPath();
            ctxC.ellipse(-toucanSize * 0.3, 0, toucanSize * 0.25, toucanSize * 0.15, -0.3, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'gull': // Gaivota
            const gullSize = size;
            // Corpo branco (já desenhado como base)
            // Asas pretas nas costas
            ctxC.fillStyle = '#000000';
            ctxC.beginPath();
            // Asa esquerda (superior)
            ctxC.ellipse(-gullSize * 0.3, -gullSize * 0.1, gullSize * 0.35, gullSize * 0.15, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            // Asa direita (inferior)
            ctxC.beginPath();
            ctxC.ellipse(-gullSize * 0.25, gullSize * 0.1, gullSize * 0.3, gullSize * 0.12, 0.1, 0, Math.PI * 2);
            ctxC.fill();
            // Parte superior das costas preta
            ctxC.fillStyle = '#000000';
            ctxC.beginPath();
            ctxC.ellipse(-gullSize * 0.15, -gullSize * 0.25, gullSize * 0.2, gullSize * 0.1, -0.1, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'guara': // Guará (Scarlet Ibis)
            const guaraSize = size;
            // Corpo vermelho escarlate (já desenhado como base)
            // Pontas pretas nas penas primárias das asas
            ctxC.fillStyle = '#000000';
            ctxC.beginPath();
            // Pontas pretas nas asas (penas primárias)
            ctxC.ellipse(-guaraSize * 0.35, -guaraSize * 0.15, guaraSize * 0.15, guaraSize * 0.08, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.beginPath();
            ctxC.ellipse(-guaraSize * 0.3, guaraSize * 0.15, guaraSize * 0.12, guaraSize * 0.06, 0.1, 0, Math.PI * 2);
            ctxC.fill();
            // Linhas brancas nas penas secundárias/cobertas (parte inferior das costas)
            ctxC.strokeStyle = '#ffffff';
            ctxC.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctxC.beginPath();
                ctxC.moveTo(-guaraSize * 0.4, guaraSize * 0.1 + i * guaraSize * 0.08);
                ctxC.lineTo(-guaraSize * 0.2, guaraSize * 0.15 + i * guaraSize * 0.08);
                ctxC.stroke();
            }
            break;

        case 'pelican': // Pelicano
            const pelicanSize = size;
            // Corpo branco (já desenhado como base)
            // Penacho de penas brancas espetadas na parte de trás da cabeça
            ctxC.fillStyle = '#ffffff';
            for (let i = 0; i < 5; i++) {
                const angle = -Math.PI / 2 + (i - 2) * 0.3;
                const startX = -pelicanSize * 0.3;
                const startY = -pelicanSize * 0.4;
                const endX = startX + Math.cos(angle) * pelicanSize * 0.15;
                const endY = startY + Math.sin(angle) * pelicanSize * 0.15;
                ctxC.beginPath();
                ctxC.moveTo(startX, startY);
                ctxC.lineTo(endX, endY);
                ctxC.lineWidth = 2;
                ctxC.strokeStyle = '#ffffff';
                ctxC.stroke();
            }
            // Pele rosa-avermelhada ao redor dos olhos e na parte superior da cabeça
            ctxC.fillStyle = '#FFB6C1';
            ctxC.beginPath();
            ctxC.ellipse(-pelicanSize * 0.25, -pelicanSize * 0.3, pelicanSize * 0.2, pelicanSize * 0.15, -0.1, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'pyrrhuloxia': // Pyrrhuloxia (Cardeal do Deserto)
            const pyrrhuloxiaSize = size;
            // Corpo cinza médio (já desenhado como base)
            // Crista vermelha vibrante no topo da cabeça
            ctxC.strokeStyle = '#DC143C';
            ctxC.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                const angle = -Math.PI / 2 + (i - 2) * 0.25;
                const startX = pyrrhuloxiaSize * 0.3;
                const startY = -pyrrhuloxiaSize * 0.4;
                const endX = startX + Math.cos(angle) * pyrrhuloxiaSize * 0.2;
                const endY = startY + Math.sin(angle) * pyrrhuloxiaSize * 0.2;
                ctxC.beginPath();
                ctxC.moveTo(startX, startY);
                ctxC.lineTo(endX, endY);
                ctxC.stroke();
            }
            // Máscara vermelha ao redor dos olhos
            ctxC.fillStyle = '#DC143C';
            ctxC.beginPath();
            ctxC.ellipse(pyrrhuloxiaSize * 0.35, -pyrrhuloxiaSize * 0.15, pyrrhuloxiaSize * 0.15, pyrrhuloxiaSize * 0.12, -0.1, 0, Math.PI * 2);
            ctxC.fill();
            // Peito e barriga vermelho-rosado
            ctxC.fillStyle = '#FF69B4';
            ctxC.beginPath();
            ctxC.ellipse(pyrrhuloxiaSize * 0.2, pyrrhuloxiaSize * 0.1, pyrrhuloxiaSize * 0.35, pyrrhuloxiaSize * 0.25, 0, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'acorn-woodpecker': // Acorn Woodpecker (Pica-pau das Bolotas)
            const acornWoodpeckerSizeCountdown = size;
            // Corpo preto brilhante (já desenhado como base)
            // Capa vermelha brilhante no topo da cabeça
            ctxC.fillStyle = '#DC143C';
            ctxC.beginPath();
            ctxC.ellipse(acornWoodpeckerSizeCountdown * 0.2, -acornWoodpeckerSizeCountdown * 0.4, acornWoodpeckerSizeCountdown * 0.3, acornWoodpeckerSizeCountdown * 0.15, -0.1, 0, Math.PI * 2);
            ctxC.fill();
            // Mancha branca acima do bico
            ctxC.fillStyle = '#ffffff';
            ctxC.beginPath();
            ctxC.ellipse(acornWoodpeckerSizeCountdown * 0.35, -acornWoodpeckerSizeCountdown * 0.25, acornWoodpeckerSizeCountdown * 0.1, acornWoodpeckerSizeCountdown * 0.08, 0, 0, Math.PI * 2);
            ctxC.fill();
            // Faixa branca atrás do olho (bigode/bochecha)
            ctxC.fillStyle = '#ffffff';
            ctxC.beginPath();
            ctxC.ellipse(acornWoodpeckerSizeCountdown * 0.25, -acornWoodpeckerSizeCountdown * 0.1, acornWoodpeckerSizeCountdown * 0.2, acornWoodpeckerSizeCountdown * 0.12, 0.3, 0, Math.PI * 2);
            ctxC.fill();
            // Mancha branca no ombro/asa superior
            ctxC.fillStyle = '#ffffff';
            ctxC.beginPath();
            ctxC.ellipse(-acornWoodpeckerSizeCountdown * 0.2, -acornWoodpeckerSizeCountdown * 0.05, acornWoodpeckerSizeCountdown * 0.15, acornWoodpeckerSizeCountdown * 0.1, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            // Mancha branca maior no flanco inferior
            ctxC.fillStyle = '#ffffff';
            ctxC.beginPath();
            ctxC.ellipse(-acornWoodpeckerSizeCountdown * 0.15, acornWoodpeckerSizeCountdown * 0.2, acornWoodpeckerSizeCountdown * 0.2, acornWoodpeckerSizeCountdown * 0.15, 0.1, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'virginias-warbler': // Virginia's Warbler
            const warblerSizeCountdown = size;
            // Corpo cinza claro (já desenhado como base)
            // Mancha amarela brilhante na testa
            ctxC.fillStyle = '#FFD700';
            ctxC.beginPath();
            ctxC.ellipse(warblerSizeCountdown * 0.3, -warblerSizeCountdown * 0.4, warblerSizeCountdown * 0.12, warblerSizeCountdown * 0.08, -0.1, 0, Math.PI * 2);
            ctxC.fill();
            // Garganta e peito superior branco
            ctxC.fillStyle = '#ffffff';
            ctxC.beginPath();
            ctxC.ellipse(warblerSizeCountdown * 0.2, -warblerSizeCountdown * 0.05, warblerSizeCountdown * 0.25, warblerSizeCountdown * 0.15, 0, 0, Math.PI * 2);
            ctxC.fill();
            // Parte inferior amarelo vibrante
            ctxC.fillStyle = '#FFD700';
            ctxC.beginPath();
            ctxC.ellipse(warblerSizeCountdown * 0.15, warblerSizeCountdown * 0.15, warblerSizeCountdown * 0.3, warblerSizeCountdown * 0.2, 0, 0, Math.PI * 2);
            ctxC.fill();
            // Estrias cinza mais escuras nas asas
            ctxC.fillStyle = '#808080';
            ctxC.beginPath();
            ctxC.ellipse(-warblerSizeCountdown * 0.25, -warblerSizeCountdown * 0.1, warblerSizeCountdown * 0.2, warblerSizeCountdown * 0.08, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.beginPath();
            ctxC.ellipse(-warblerSizeCountdown * 0.2, warblerSizeCountdown * 0.1, warblerSizeCountdown * 0.18, warblerSizeCountdown * 0.07, 0.1, 0, Math.PI * 2);
            ctxC.fill();
            break;

        case 'bearded-vulture': // Abutre Barbudo (Lammergeier)
            const vultureSizeCountdown = size;
            // Corpo base (bege creme no peito inferior, já desenhado)
            // Cabeça branca
            ctxC.fillStyle = '#ffffff';
            ctxC.beginPath();
            ctxC.ellipse(vultureSizeCountdown * 0.25, -vultureSizeCountdown * 0.35, vultureSizeCountdown * 0.25, vultureSizeCountdown * 0.2, -0.1, 0, Math.PI * 2);
            ctxC.fill();
            // Máscara preta
            ctxC.fillStyle = '#000000';
            ctxC.beginPath();
            ctxC.ellipse(vultureSizeCountdown * 0.3, -vultureSizeCountdown * 0.25, vultureSizeCountdown * 0.15, vultureSizeCountdown * 0.12, -0.1, 0, Math.PI * 2);
            ctxC.fill();
            // "Barba" ou tufo de cerdas pretas
            ctxC.strokeStyle = '#000000';
            ctxC.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                const angle = Math.PI / 2 + (i - 2) * 0.2;
                const startX = vultureSizeCountdown * 0.3;
                const startY = -vultureSizeCountdown * 0.15;
                const endX = startX + Math.cos(angle) * vultureSizeCountdown * 0.1;
                const endY = startY + Math.sin(angle) * vultureSizeCountdown * 0.1;
                ctxC.beginPath();
                ctxC.moveTo(startX, startY);
                ctxC.lineTo(endX, endY);
                ctxC.stroke();
            }
            // Pescoço e peito superior laranja-marrom
            ctxC.fillStyle = '#CD853F';
            ctxC.beginPath();
            ctxC.ellipse(vultureSizeCountdown * 0.15, -vultureSizeCountdown * 0.1, vultureSizeCountdown * 0.25, vultureSizeCountdown * 0.2, 0, 0, Math.PI * 2);
            ctxC.fill();
            // Asas cinza ardósia
            ctxC.fillStyle = '#708090';
            ctxC.beginPath();
            ctxC.ellipse(-vultureSizeCountdown * 0.2, -vultureSizeCountdown * 0.05, vultureSizeCountdown * 0.3, vultureSizeCountdown * 0.15, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.beginPath();
            ctxC.ellipse(-vultureSizeCountdown * 0.15, vultureSizeCountdown * 0.1, vultureSizeCountdown * 0.25, vultureSizeCountdown * 0.12, 0.1, 0, Math.PI * 2);
            ctxC.fill();
            // Estrias paralelas nas asas
            ctxC.strokeStyle = '#556B2F';
            ctxC.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                ctxC.beginPath();
                ctxC.moveTo(-vultureSizeCountdown * 0.4, -vultureSizeCountdown * 0.05 + i * vultureSizeCountdown * 0.05);
                ctxC.lineTo(-vultureSizeCountdown * 0.1, -vultureSizeCountdown * 0.05 + i * vultureSizeCountdown * 0.05);
                ctxC.stroke();
            }
            break;

        case 'phainopepla': // Phainopepla
            const phainopeplaSizeCountdown = size;
            // Corpo preto brilhante (já desenhado como base)
            // Crista de penas pretas na cabeça
            ctxC.strokeStyle = '#000000';
            ctxC.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const angle = -Math.PI / 2 + (i - 2.5) * 0.2;
                const startX = phainopeplaSizeCountdown * 0.25;
                const startY = -phainopeplaSizeCountdown * 0.4;
                const endX = startX + Math.cos(angle) * phainopeplaSizeCountdown * 0.15;
                const endY = startY + Math.sin(angle) * phainopeplaSizeCountdown * 0.15;
                ctxC.beginPath();
                ctxC.moveTo(startX, startY);
                ctxC.lineTo(endX, endY);
                ctxC.stroke();
            }
            // Manchas vermelhas brilhantes abaixo de cada olho (nas bochechas)
            ctxC.fillStyle = '#DC143C';
            ctxC.beginPath();
            ctxC.arc(phainopeplaSizeCountdown * 0.3, -phainopeplaSizeCountdown * 0.15, phainopeplaSizeCountdown * 0.08, 0, Math.PI * 2);
            ctxC.fill();
            break;
    }
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

    // Corpo - para Tuiuiu e Falcão-das-pradarias, garantir que seja branco
    const bodyColor = (type === 'tuiuiu' || type === 'prairie-falcon') ? '#ffffff' : color;
    ctxC.fillStyle = bodyColor;
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
    } else if (type === 'tuiuiu') {
        // Tuiuiu - Cabeça e pescoço pretos, colar vermelho, corpo branco
        const tuiuiuSize = 35;

        // Cabeça preta (parte superior)
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(0, -tuiuiuSize * 0.3, tuiuiuSize * 0.4, 0, Math.PI * 2);
        ctxC.fill();

        // Pescoço superior preto
        ctxC.beginPath();
        ctxC.ellipse(0, -tuiuiuSize * 0.1, tuiuiuSize * 0.25, tuiuiuSize * 0.35, 0, 0, Math.PI * 2);
        ctxC.fill();

        // Colar vermelho vibrante (característica marcante do Tuiuiu)
        const collarY = tuiuiuSize * 0.15;
        ctxC.fillStyle = '#e74c3c'; // Vermelho vibrante
        ctxC.beginPath();
        ctxC.ellipse(0, collarY, tuiuiuSize * 0.35, tuiuiuSize * 0.12, 0, 0, Math.PI * 2);
        ctxC.fill();

        // Detalhe do colar (textura)
        ctxC.fillStyle = '#c0392b'; // Vermelho mais escuro
        ctxC.beginPath();
        ctxC.ellipse(0, collarY - tuiuiuSize * 0.02, tuiuiuSize * 0.32, tuiuiuSize * 0.08, 0, 0, Math.PI * 2);
        ctxC.fill();

        // Olho pequeno e escuro
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(8, -tuiuiuSize * 0.25, 4, 0, Math.PI * 2);
        ctxC.fill();

        // Brilho no olho
        ctxC.fillStyle = 'white';
        ctxC.beginPath();
        ctxC.arc(9, -tuiuiuSize * 0.27, 1.5, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'toucan') {
        // Tucano - Bico grande e colorido, mancha branca no peito
        const toucanSize = 35;

        // Mancha branca no peito (característica do tucano)
        ctxC.fillStyle = '#ffffff';
        ctxC.beginPath();
        ctxC.ellipse(0, toucanSize * 0.2, toucanSize * 0.4, toucanSize * 0.3, 0, 0, Math.PI * 2);
        ctxC.fill();

        // Linha separadora entre o peito branco e o corpo preto
        ctxC.strokeStyle = '#000000';
        ctxC.lineWidth = 2;
        ctxC.beginPath();
        ctxC.moveTo(-toucanSize * 0.4, toucanSize * 0.15);
        ctxC.lineTo(toucanSize * 0.4, toucanSize * 0.15);
        ctxC.stroke();

        // Detalhes nas asas (penas mais escuras - preto)
        ctxC.fillStyle = '#1a1a1a';
        ctxC.beginPath();
        ctxC.ellipse(-toucanSize * 0.3, 0, toucanSize * 0.25, toucanSize * 0.15, -0.3, 0, Math.PI * 2);
        ctxC.fill();

        // Olho azul com anel laranja
        // Anel laranja ao redor do olho
        ctxC.fillStyle = '#FF8C00';
        ctxC.beginPath();
        ctxC.arc(8, -8, 6, 0, Math.PI * 2);
        ctxC.fill();

        // Olho azul
        ctxC.fillStyle = '#4169E1';
        ctxC.beginPath();
        ctxC.arc(8, -8, 4.5, 0, Math.PI * 2);
        ctxC.fill();

        // Pupila preta
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(9, -8, 3, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'gull') {
        // Gaivota - Branco com asas pretas
        const gullSize = 35;

        // Corpo branco (já desenhado como base)
        // Asas pretas nas costas
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        // Asa esquerda (superior)
        ctxC.ellipse(-gullSize * 0.3, -gullSize * 0.1, gullSize * 0.35, gullSize * 0.15, -0.2, 0, Math.PI * 2);
        ctxC.fill();
        // Asa direita (inferior)
        ctxC.beginPath();
        ctxC.ellipse(-gullSize * 0.25, gullSize * 0.1, gullSize * 0.3, gullSize * 0.12, 0.1, 0, Math.PI * 2);
        ctxC.fill();

        // Parte superior das costas preta
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.ellipse(-gullSize * 0.15, -gullSize * 0.25, gullSize * 0.2, gullSize * 0.1, -0.1, 0, Math.PI * 2);
        ctxC.fill();

        // Olho vermelho-laranja com anel amarelo claro
        // Anel amarelo claro ao redor do olho
        ctxC.fillStyle = '#FFD700';
        ctxC.beginPath();
        ctxC.arc(8, -8, 6, 0, Math.PI * 2);
        ctxC.fill();

        // Olho vermelho-laranja
        ctxC.fillStyle = '#FF4500';
        ctxC.beginPath();
        ctxC.arc(8, -8, 4.5, 0, Math.PI * 2);
        ctxC.fill();

        // Pupila preta
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(9, -8, 3, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'guara') {
        // Guará (Scarlet Ibis) - Vermelho escarlate
        const guaraSize = 35;

        // Corpo vermelho escarlate (já desenhado como base)
        // Pontas pretas nas penas primárias das asas
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        // Pontas pretas nas asas (penas primárias)
        ctxC.ellipse(-guaraSize * 0.35, -guaraSize * 0.15, guaraSize * 0.15, guaraSize * 0.08, -0.2, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.beginPath();
        ctxC.ellipse(-guaraSize * 0.3, guaraSize * 0.15, guaraSize * 0.12, guaraSize * 0.06, 0.1, 0, Math.PI * 2);
        ctxC.fill();

        // Linhas brancas nas penas secundárias/cobertas (parte inferior das costas)
        ctxC.strokeStyle = '#ffffff';
        ctxC.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctxC.beginPath();
            ctxC.moveTo(-guaraSize * 0.4, guaraSize * 0.1 + i * guaraSize * 0.08);
            ctxC.lineTo(-guaraSize * 0.2, guaraSize * 0.15 + i * guaraSize * 0.08);
            ctxC.stroke();
        }

        // Olho pequeno e escuro com anel rosa-avermelhado
        // Anel rosa-avermelhado ao redor do olho
        ctxC.fillStyle = '#FF69B4';
        ctxC.beginPath();
        ctxC.arc(8, -8, 5, 0, Math.PI * 2);
        ctxC.fill();
        
        // Olho escuro
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(8, -8, 3, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'hawk') {
        // Falcão (genérico) - Marcas no rosto
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.moveTo(5, 5);
        ctxC.lineTo(-5, 20);
        ctxC.lineTo(2, 20);
        ctxC.lineTo(10, 8);
        ctxC.closePath();
        ctxC.fill();

        // Olho
        ctxC.fillStyle = 'white';
        ctxC.beginPath();
        ctxC.arc(12, -5, 10, 0, Math.PI * 2);
        ctxC.fill();

        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(14, -5, 6, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'sayaca-tanager') {
        // Sanhaço Cinzento - Cabeça em tom mais claro de cinza-azulado
        const tanagerSizeC = 35;
        ctxC.fillStyle = '#B0C4DE'; // Cinza-azulado claro
        ctxC.beginPath();
        ctxC.ellipse(tanagerSizeC * 0.2, -tanagerSizeC * 0.3, tanagerSizeC * 0.2, tanagerSizeC * 0.15, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        
        // Olho escuro
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(8, -8, 3, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'kiskadee') {
        // Bem-te-vi - Cabeça com padrão preto e branco
        const kiskadeeSizeC = 35;
        // Coroa branca
        ctxC.fillStyle = '#FFFFFF';
        ctxC.beginPath();
        ctxC.ellipse(kiskadeeSizeC * 0.2, -kiskadeeSizeC * 0.35, kiskadeeSizeC * 0.25, kiskadeeSizeC * 0.12, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        // Faixa ocular preta
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.ellipse(kiskadeeSizeC * 0.25, -kiskadeeSizeC * 0.25, kiskadeeSizeC * 0.3, kiskadeeSizeC * 0.08, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        // Bochechas e garganta brancas
        ctxC.fillStyle = '#FFFFFF';
        ctxC.beginPath();
        ctxC.ellipse(kiskadeeSizeC * 0.2, -kiskadeeSizeC * 0.1, kiskadeeSizeC * 0.2, kiskadeeSizeC * 0.15, 0, 0, Math.PI * 2);
        ctxC.fill();
        // Costas marrom-oliva
        ctxC.fillStyle = '#556B2F';
        ctxC.beginPath();
        ctxC.ellipse(-kiskadeeSizeC * 0.15, -kiskadeeSizeC * 0.05, kiskadeeSizeC * 0.3, kiskadeeSizeC * 0.15, -0.2, 0, Math.PI * 2);
        ctxC.fill();
        // Peito e barriga amarelo vibrante
        ctxC.fillStyle = '#FFD700';
        ctxC.beginPath();
        ctxC.ellipse(kiskadeeSizeC * 0.1, kiskadeeSizeC * 0.1, kiskadeeSizeC * 0.25, kiskadeeSizeC * 0.2, 0, 0, Math.PI * 2);
        ctxC.fill();
        
        // Olho escuro
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(8, -8, 3, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'barn-owl') {
        // Coruja Suindara - Cabeça com padrão específico
        const barnOwlSizeC = 35;
        // Disco facial branco em formato de coração
        ctxC.fillStyle = '#FFFFFF';
        ctxC.beginPath();
        ctxC.arc(barnOwlSizeC * 0.2, -barnOwlSizeC * 0.35, barnOwlSizeC * 0.25, 0, Math.PI * 2);
        ctxC.fill();
        // Parte inferior do coração (ponta)
        ctxC.beginPath();
        ctxC.moveTo(-barnOwlSizeC * 0.05, -barnOwlSizeC * 0.05);
        ctxC.lineTo(barnOwlSizeC * 0.45, -barnOwlSizeC * 0.05);
        ctxC.lineTo(barnOwlSizeC * 0.2, barnOwlSizeC * 0.15);
        ctxC.closePath();
        ctxC.fill();
        // Borda dourada pálida
        ctxC.strokeStyle = '#D2B48C';
        ctxC.lineWidth = 1;
        ctxC.beginPath();
        ctxC.arc(barnOwlSizeC * 0.2, -barnOwlSizeC * 0.35, barnOwlSizeC * 0.25, 0, Math.PI * 2);
        ctxC.stroke();
        // Testa dourada pálida
        ctxC.fillStyle = '#F5DEB3';
        ctxC.beginPath();
        ctxC.ellipse(barnOwlSizeC * 0.2, -barnOwlSizeC * 0.45, barnOwlSizeC * 0.2, barnOwlSizeC * 0.1, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        // Coroa com padrão cinza e branco manchado
        ctxC.fillStyle = '#E0E0E0';
        ctxC.beginPath();
        ctxC.ellipse(barnOwlSizeC * 0.2, -barnOwlSizeC * 0.55, barnOwlSizeC * 0.2, barnOwlSizeC * 0.12, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        // Manchas escuras na coroa
        ctxC.fillStyle = '#808080';
        for (let i = 0; i < 3; i++) {
            ctxC.beginPath();
            ctxC.arc(barnOwlSizeC * 0.1 + i * barnOwlSizeC * 0.1, -barnOwlSizeC * 0.55, barnOwlSizeC * 0.03, 0, Math.PI * 2);
            ctxC.fill();
        }
        // Peito branco com manchas escuras
        ctxC.fillStyle = '#FFFFFF';
        ctxC.beginPath();
        ctxC.ellipse(barnOwlSizeC * 0.1, barnOwlSizeC * 0.05, barnOwlSizeC * 0.25, barnOwlSizeC * 0.2, 0, 0, Math.PI * 2);
        ctxC.fill();
        // Manchas escuras esparsas
        ctxC.fillStyle = '#808080';
        for (let i = 0; i < 4; i++) {
            ctxC.beginPath();
            ctxC.arc(-barnOwlSizeC * 0.1 + (i % 2) * barnOwlSizeC * 0.2, barnOwlSizeC * 0.1 + Math.floor(i / 2) * barnOwlSizeC * 0.1, barnOwlSizeC * 0.02, 0, Math.PI * 2);
            ctxC.fill();
        }
        // Asas com padrão dourado-marrom
        ctxC.fillStyle = '#D2B48C';
        ctxC.beginPath();
        ctxC.ellipse(-barnOwlSizeC * 0.15, -barnOwlSizeC * 0.05, barnOwlSizeC * 0.3, barnOwlSizeC * 0.15, -0.2, 0, Math.PI * 2);
        ctxC.fill();
        // Manchas cinza nas asas
        ctxC.fillStyle = '#E0E0E0';
        ctxC.beginPath();
        ctxC.ellipse(-barnOwlSizeC * 0.2, 0, barnOwlSizeC * 0.15, barnOwlSizeC * 0.1, -0.2, 0, Math.PI * 2);
        ctxC.fill();
        // Manchas escuras nas asas
        ctxC.fillStyle = '#654321';
        for (let i = 0; i < 3; i++) {
            ctxC.beginPath();
            ctxC.arc(-barnOwlSizeC * 0.25 + i * barnOwlSizeC * 0.1, -barnOwlSizeC * 0.05, barnOwlSizeC * 0.02, 0, Math.PI * 2);
            ctxC.fill();
        }
        
        // Olhos grandes, redondos e escuros (quase pretos)
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(8, -8, 6, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.beginPath();
        ctxC.arc(12, -8, 6, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'penguin') {
        // Pinguim - Barriga branca
        ctxC.fillStyle = 'white';
        ctxC.beginPath();
        ctxC.ellipse(0, 5, 20, 25, 0, 0, Math.PI * 2);
        ctxC.fill();

        // Bochechas rosadas
        ctxC.fillStyle = 'rgba(255, 182, 193, 0.5)';
        ctxC.beginPath();
        ctxC.arc(-20, 5, 8, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.beginPath();
        ctxC.arc(30, 5, 8, 0, Math.PI * 2);
        ctxC.fill();

        // Olho
        ctxC.fillStyle = 'white';
        ctxC.beginPath();
        ctxC.arc(12, -5, 10, 0, Math.PI * 2);
        ctxC.fill();

        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(14, -5, 6, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'phoenix') {
        // Fênix - Crista e chama
        // Crista
        ctxC.fillStyle = '#f39c12';
        ctxC.beginPath();
        ctxC.moveTo(0, -30);
        ctxC.lineTo(5, -42);
        ctxC.lineTo(10, -30);
        ctxC.closePath();
        ctxC.fill();

        // Chama na cauda
        ctxC.fillStyle = '#e74c3c';
        ctxC.beginPath();
        ctxC.moveTo(-25, 0);
        ctxC.lineTo(-45, 20);
        ctxC.lineTo(-25, 5);
        ctxC.closePath();
        ctxC.fill();

        ctxC.fillStyle = '#f39c12';
        ctxC.beginPath();
        ctxC.moveTo(-25, 0);
        ctxC.lineTo(-40, 15);
        ctxC.lineTo(-25, 5);
        ctxC.closePath();
        ctxC.fill();

        // Olho
        ctxC.fillStyle = 'white';
        ctxC.beginPath();
        ctxC.arc(12, -5, 10, 0, Math.PI * 2);
        ctxC.fill();

        ctxC.fillStyle = '#f1c40f';
        ctxC.beginPath();
        ctxC.arc(14, -5, 6, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'eagle') {
        // Águia Real - Crista dourada
        ctxC.fillStyle = '#f1c40f';
        ctxC.beginPath();
        ctxC.moveTo(5, -30);
        ctxC.lineTo(10, -45);
        ctxC.lineTo(15, -30);
        ctxC.closePath();
        ctxC.fill();
        ctxC.beginPath();
        ctxC.moveTo(15, -28);
        ctxC.lineTo(20, -40);
        ctxC.lineTo(25, -28);
        ctxC.closePath();
        ctxC.fill();

        // Marca branca na cabeça
        ctxC.fillStyle = 'white';
        ctxC.beginPath();
        ctxC.arc(15, -20, 8, 0, Math.PI * 2);
        ctxC.fill();

        // Olho
        ctxC.fillStyle = 'white';
        ctxC.beginPath();
        ctxC.arc(12, -5, 10, 0, Math.PI * 2);
        ctxC.fill();

        ctxC.fillStyle = '#f1c40f';
        ctxC.beginPath();
        ctxC.arc(14, -5, 6, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'prairie-falcon') {
        // Falcão-das-pradarias - Cabeça e pescoço com padrão específico
        const falconSizeCountdown = 35;
        
        // Capa marrom na cabeça
        ctxC.fillStyle = '#8B4513';
        ctxC.beginPath();
        ctxC.ellipse(falconSizeCountdown * 0.15, -falconSizeCountdown * 0.35, falconSizeCountdown * 0.25, falconSizeCountdown * 0.15, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        
        // Garganta branca
        ctxC.fillStyle = '#ffffff';
        ctxC.beginPath();
        ctxC.ellipse(falconSizeCountdown * 0.2, -falconSizeCountdown * 0.1, falconSizeCountdown * 0.2, falconSizeCountdown * 0.15, 0, 0, Math.PI * 2);
        ctxC.fill();
        
        // Listras malares pretas (bigodes)
        ctxC.strokeStyle = '#000000';
        ctxC.lineWidth = 2;
        ctxC.beginPath();
        ctxC.moveTo(falconSizeCountdown * 0.3, -falconSizeCountdown * 0.2);
        ctxC.lineTo(falconSizeCountdown * 0.4, -falconSizeCountdown * 0.05);
        ctxC.stroke();
        ctxC.beginPath();
        ctxC.moveTo(falconSizeCountdown * 0.32, -falconSizeCountdown * 0.15);
        ctxC.lineTo(falconSizeCountdown * 0.42, 0);
        ctxC.stroke();
        
        // Área ao redor dos olhos e cere amarelo vibrante
        ctxC.fillStyle = '#FFD700';
        ctxC.beginPath();
        ctxC.ellipse(falconSizeCountdown * 0.3, -falconSizeCountdown * 0.2, falconSizeCountdown * 0.12, falconSizeCountdown * 0.1, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.beginPath();
        ctxC.ellipse(falconSizeCountdown * 0.4, -falconSizeCountdown * 0.05, falconSizeCountdown * 0.08, falconSizeCountdown * 0.06, 0, 0, Math.PI * 2);
        ctxC.fill();
        
        // Peito e barriga brancos com manchas/escalas escuras
        ctxC.fillStyle = '#2F2F2F';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 3; j++) {
                const spotX = falconSizeCountdown * 0.1 + i * falconSizeCountdown * 0.12;
                const spotY = falconSizeCountdown * 0.1 + j * falconSizeCountdown * 0.1;
                ctxC.beginPath();
                ctxC.ellipse(spotX, spotY, falconSizeCountdown * 0.05, falconSizeCountdown * 0.04, 0, 0, Math.PI * 2);
                ctxC.fill();
            }
        }
        
        // Costas e asas com padrão escamado/barrado
        ctxC.fillStyle = '#8B7355';
        ctxC.beginPath();
        ctxC.ellipse(-falconSizeCountdown * 0.2, -falconSizeCountdown * 0.05, falconSizeCountdown * 0.3, falconSizeCountdown * 0.15, -0.2, 0, Math.PI * 2);
        ctxC.fill();
        // Barras escuras nas asas
        ctxC.strokeStyle = '#5C4A3A';
        ctxC.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctxC.beginPath();
            ctxC.moveTo(-falconSizeCountdown * 0.4, -falconSizeCountdown * 0.05 + i * falconSizeCountdown * 0.08);
            ctxC.lineTo(-falconSizeCountdown * 0.1, -falconSizeCountdown * 0.05 + i * falconSizeCountdown * 0.08);
            ctxC.stroke();
        }
        // Manchas brancas nas asas
        ctxC.fillStyle = '#ffffff';
        ctxC.beginPath();
        ctxC.ellipse(-falconSizeCountdown * 0.25, -falconSizeCountdown * 0.05, falconSizeCountdown * 0.08, falconSizeCountdown * 0.06, -0.2, 0, Math.PI * 2);
        ctxC.fill();
        
        // Olho escuro
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(falconSizeCountdown * 0.3, -falconSizeCountdown * 0.2, falconSizeCountdown * 0.08, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'ground-dove') {
        // Rolinha - Cabeça e corpo com padrão específico
        const doveSizeCountdown = 35;
        
        // Cabeça cinza pálida
        ctxC.fillStyle = '#E8E8E8';
        ctxC.beginPath();
        ctxC.ellipse(doveSizeCountdown * 0.2, -doveSizeCountdown * 0.3, doveSizeCountdown * 0.2, doveSizeCountdown * 0.15, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        
        // Corpo rosa poeirento
        ctxC.fillStyle = '#D2B48C';
        ctxC.beginPath();
        ctxC.ellipse(doveSizeCountdown * 0.1, doveSizeCountdown * 0.1, doveSizeCountdown * 0.3, doveSizeCountdown * 0.25, 0, 0, Math.PI * 2);
        ctxC.fill();
        
        // Manchas escuras nas asas
        ctxC.fillStyle = '#8B4513';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 2; j++) {
                const spotX = doveSizeCountdown * 0.1 + i * doveSizeCountdown * 0.12;
                const spotY = doveSizeCountdown * 0.1 + j * doveSizeCountdown * 0.1;
                ctxC.beginPath();
                ctxC.ellipse(spotX, spotY, doveSizeCountdown * 0.05, doveSizeCountdown * 0.04, 0, 0, Math.PI * 2);
                ctxC.fill();
            }
        }
        // Estrias nas asas
        ctxC.strokeStyle = '#8B4513';
        ctxC.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctxC.beginPath();
            ctxC.moveTo(-doveSizeCountdown * 0.3, -doveSizeCountdown * 0.05 + i * doveSizeCountdown * 0.08);
            ctxC.lineTo(-doveSizeCountdown * 0.1, doveSizeCountdown * 0.05 + i * doveSizeCountdown * 0.08);
            ctxC.stroke();
        }
        
        // Cauda mais escura
        ctxC.fillStyle = '#CD853F';
        ctxC.beginPath();
        ctxC.ellipse(-doveSizeCountdown * 0.35, doveSizeCountdown * 0.15, doveSizeCountdown * 0.15, doveSizeCountdown * 0.12, 0.1, 0, Math.PI * 2);
        ctxC.fill();
        
        // Olho vermelho brilhante
        ctxC.fillStyle = '#DC143C';
        ctxC.beginPath();
        ctxC.arc(doveSizeCountdown * 0.25, -doveSizeCountdown * 0.25, doveSizeCountdown * 0.08, 0, Math.PI * 2);
        ctxC.fill();
        // Pupila preta
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(doveSizeCountdown * 0.25, -doveSizeCountdown * 0.25, doveSizeCountdown * 0.05, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'rufous-backed-thrush') {
        // Sabiá do Campo - Cabeça e corpo com padrão específico
        const thrushSizeCountdown = 35;
        
        // Faixa branca/creme pálida acima do olho
        ctxC.fillStyle = '#F5F5DC';
        ctxC.beginPath();
        ctxC.ellipse(thrushSizeCountdown * 0.2, -thrushSizeCountdown * 0.35, thrushSizeCountdown * 0.25, thrushSizeCountdown * 0.1, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        
        // Faixa escura/preta através do olho
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.ellipse(thrushSizeCountdown * 0.2, -thrushSizeCountdown * 0.25, thrushSizeCountdown * 0.3, thrushSizeCountdown * 0.08, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        
        // Área abaixo do olho em cinza-marrom claro
        ctxC.fillStyle = '#D2B48C';
        ctxC.beginPath();
        ctxC.ellipse(thrushSizeCountdown * 0.15, -thrushSizeCountdown * 0.15, thrushSizeCountdown * 0.2, thrushSizeCountdown * 0.12, 0, 0, Math.PI * 2);
        ctxC.fill();
        
        // Corpo marrom-acinzentado
        ctxC.fillStyle = '#8B7355';
        ctxC.beginPath();
        ctxC.ellipse(thrushSizeCountdown * 0.1, thrushSizeCountdown * 0.1, thrushSizeCountdown * 0.3, thrushSizeCountdown * 0.25, 0, 0, Math.PI * 2);
        ctxC.fill();
        
        // Asas com padrão: bordas claras
        ctxC.strokeStyle = '#F5F5DC';
        ctxC.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctxC.beginPath();
            ctxC.arc(-thrushSizeCountdown * 0.2 + i * thrushSizeCountdown * 0.08, -thrushSizeCountdown * 0.05, thrushSizeCountdown * 0.06, 0, Math.PI * 2);
            ctxC.stroke();
        }
        
        // Cauda longa e escura
        ctxC.fillStyle = '#654321';
        ctxC.beginPath();
        ctxC.ellipse(-thrushSizeCountdown * 0.35, thrushSizeCountdown * 0.2, thrushSizeCountdown * 0.2, thrushSizeCountdown * 0.15, 0.1, 0, Math.PI * 2);
        ctxC.fill();
        
        // Olho amarelo brilhante
        ctxC.fillStyle = '#FFD700';
        ctxC.beginPath();
        ctxC.arc(thrushSizeCountdown * 0.25, -thrushSizeCountdown * 0.25, thrushSizeCountdown * 0.08, 0, Math.PI * 2);
        ctxC.fill();
        // Pupila escura
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(thrushSizeCountdown * 0.25, -thrushSizeCountdown * 0.25, thrushSizeCountdown * 0.05, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'orange-thrush') {
        // Sabiá Laranjeira - Cabeça e corpo com padrão específico
        const orangeThrushSizeCountdown = 35;
        
        // Dorso e asas marrom-oliva escuro
        ctxC.fillStyle = '#556B2F';
        ctxC.beginPath();
        ctxC.ellipse(-orangeThrushSizeCountdown * 0.2, -orangeThrushSizeCountdown * 0.05, orangeThrushSizeCountdown * 0.3, orangeThrushSizeCountdown * 0.15, -0.2, 0, Math.PI * 2);
        ctxC.fill();
        // Cauda longa e esbelta
        ctxC.beginPath();
        ctxC.ellipse(-orangeThrushSizeCountdown * 0.35, orangeThrushSizeCountdown * 0.2, orangeThrushSizeCountdown * 0.2, orangeThrushSizeCountdown * 0.12, 0.1, 0, Math.PI * 2);
        ctxC.fill();
        
        // Cabeça marrom escuro
        ctxC.fillStyle = '#654321';
        ctxC.beginPath();
        ctxC.ellipse(orangeThrushSizeCountdown * 0.2, -orangeThrushSizeCountdown * 0.3, orangeThrushSizeCountdown * 0.2, orangeThrushSizeCountdown * 0.15, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        
        // Garganta e peito superior cinza-esbranquiçado claro
        ctxC.fillStyle = '#F5F5F5';
        ctxC.beginPath();
        ctxC.ellipse(orangeThrushSizeCountdown * 0.15, -orangeThrushSizeCountdown * 0.05, orangeThrushSizeCountdown * 0.25, orangeThrushSizeCountdown * 0.2, 0, 0, Math.PI * 2);
        ctxC.fill();
        // Estrias verticais escuras finas
        ctxC.strokeStyle = '#8B4513';
        ctxC.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            ctxC.beginPath();
            ctxC.moveTo(orangeThrushSizeCountdown * 0.05 + i * orangeThrushSizeCountdown * 0.05, -orangeThrushSizeCountdown * 0.15);
            ctxC.lineTo(orangeThrushSizeCountdown * 0.05 + i * orangeThrushSizeCountdown * 0.05, orangeThrushSizeCountdown * 0.05);
            ctxC.stroke();
        }
        
        // Barriga laranja-vermelho vibrante
        ctxC.fillStyle = '#FF4500';
        ctxC.beginPath();
        ctxC.ellipse(orangeThrushSizeCountdown * 0.1, orangeThrushSizeCountdown * 0.2, orangeThrushSizeCountdown * 0.3, orangeThrushSizeCountdown * 0.25, 0, 0, Math.PI * 2);
        ctxC.fill();
        
        // Olho com anel laranja-amarelo claro e íris laranja-marrom claro
        // Anel ocular laranja-amarelo claro
        ctxC.fillStyle = '#FFD700';
        ctxC.beginPath();
        ctxC.arc(orangeThrushSizeCountdown * 0.25, -orangeThrushSizeCountdown * 0.25, orangeThrushSizeCountdown * 0.1, 0, Math.PI * 2);
        ctxC.fill();
        // Íris laranja-marrom claro
        ctxC.fillStyle = '#D2691E';
        ctxC.beginPath();
        ctxC.arc(orangeThrushSizeCountdown * 0.25, -orangeThrushSizeCountdown * 0.25, orangeThrushSizeCountdown * 0.07, 0, Math.PI * 2);
        ctxC.fill();
        // Pupila escura
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(orangeThrushSizeCountdown * 0.25, -orangeThrushSizeCountdown * 0.25, orangeThrushSizeCountdown * 0.05, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'sayaca-tanager') {
        // Sanhaço Cinzento - Cabeça e corpo com padrão específico
        const tanagerSizeCountdown = 35;
        
        // Cabeça em tom mais claro de cinza-azulado
        ctxC.fillStyle = '#B0C4DE'; // Cinza-azulado claro
        ctxC.beginPath();
        ctxC.ellipse(tanagerSizeCountdown * 0.2, -tanagerSizeCountdown * 0.3, tanagerSizeCountdown * 0.2, tanagerSizeCountdown * 0.15, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        
        // Olho escuro
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(tanagerSizeCountdown * 0.25, -tanagerSizeCountdown * 0.25, tanagerSizeCountdown * 0.05, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'kiskadee') {
        // Bem-te-vi - Cabeça e corpo com padrão específico
        const kiskadeeSizeCountdown = 35;
        
        // Coroa branca
        ctxC.fillStyle = '#FFFFFF';
        ctxC.beginPath();
        ctxC.ellipse(kiskadeeSizeCountdown * 0.2, -kiskadeeSizeCountdown * 0.35, kiskadeeSizeCountdown * 0.25, kiskadeeSizeCountdown * 0.12, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        // Faixa ocular preta
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.ellipse(kiskadeeSizeCountdown * 0.25, -kiskadeeSizeCountdown * 0.25, kiskadeeSizeCountdown * 0.3, kiskadeeSizeCountdown * 0.08, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        // Bochechas e garganta brancas
        ctxC.fillStyle = '#FFFFFF';
        ctxC.beginPath();
        ctxC.ellipse(kiskadeeSizeCountdown * 0.2, -kiskadeeSizeCountdown * 0.1, kiskadeeSizeCountdown * 0.2, kiskadeeSizeCountdown * 0.15, 0, 0, Math.PI * 2);
        ctxC.fill();
        // Costas marrom-oliva
        ctxC.fillStyle = '#556B2F';
        ctxC.beginPath();
        ctxC.ellipse(-kiskadeeSizeCountdown * 0.15, -kiskadeeSizeCountdown * 0.05, kiskadeeSizeCountdown * 0.3, kiskadeeSizeCountdown * 0.15, -0.2, 0, Math.PI * 2);
        ctxC.fill();
        // Peito e barriga amarelo vibrante
        ctxC.fillStyle = '#FFD700';
        ctxC.beginPath();
        ctxC.ellipse(kiskadeeSizeCountdown * 0.1, kiskadeeSizeCountdown * 0.1, kiskadeeSizeCountdown * 0.25, kiskadeeSizeCountdown * 0.2, 0, 0, Math.PI * 2);
        ctxC.fill();
        
        // Olho escuro
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(kiskadeeSizeCountdown * 0.25, -kiskadeeSizeCountdown * 0.25, kiskadeeSizeCountdown * 0.05, 0, Math.PI * 2);
        ctxC.fill();
    } else if (type === 'barn-owl') {
        // Coruja Suindara - Baseado na estrutura da coruja 'owl', mas adaptada
        const barnOwlSizeCountdown = 35;
        const topOfHeadBarnCountdown = -barnOwlSizeCountdown * 1.06;
        
        // Disco facial branco em formato de coração (característica da suindara)
        ctxC.fillStyle = '#FFFFFF';
        ctxC.beginPath();
        // Parte superior arredondada do coração
        ctxC.arc(barnOwlSizeCountdown * 0.19, -barnOwlSizeCountdown * 0.13, barnOwlSizeCountdown * 0.44, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.beginPath();
        ctxC.arc(barnOwlSizeCountdown * 0.56, -barnOwlSizeCountdown * 0.13, barnOwlSizeCountdown * 0.35, 0, Math.PI * 2);
        ctxC.fill();
        // Parte inferior do coração (ponta)
        ctxC.beginPath();
        ctxC.moveTo(-barnOwlSizeCountdown * 0.13, -barnOwlSizeCountdown * 0.13);
        ctxC.lineTo(barnOwlSizeCountdown * 0.88, -barnOwlSizeCountdown * 0.13);
        ctxC.lineTo(barnOwlSizeCountdown * 0.38, barnOwlSizeCountdown * 0.38);
        ctxC.closePath();
        ctxC.fill();
        
        // Borda dourada pálida ao redor do disco facial
        ctxC.strokeStyle = '#D2B48C';
        ctxC.lineWidth = 1;
        ctxC.beginPath();
        ctxC.arc(barnOwlSizeCountdown * 0.19, -barnOwlSizeCountdown * 0.13, barnOwlSizeCountdown * 0.44, 0, Math.PI * 2);
        ctxC.stroke();
        ctxC.beginPath();
        ctxC.arc(barnOwlSizeCountdown * 0.56, -barnOwlSizeCountdown * 0.13, barnOwlSizeCountdown * 0.35, 0, Math.PI * 2);
        ctxC.stroke();
        
        // Testa dourada pálida acima do disco facial
        ctxC.fillStyle = '#F5DEB3';
        ctxC.beginPath();
        ctxC.ellipse(barnOwlSizeCountdown * 0.38, -barnOwlSizeCountdown * 0.63, barnOwlSizeCountdown * 0.38, barnOwlSizeCountdown * 0.19, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        
        // Coroa com padrão cinza e branco manchado
        ctxC.fillStyle = '#E0E0E0';
        ctxC.beginPath();
        ctxC.ellipse(barnOwlSizeCountdown * 0.38, topOfHeadBarnCountdown, barnOwlSizeCountdown * 0.38, barnOwlSizeCountdown * 0.19, -0.1, 0, Math.PI * 2);
        ctxC.fill();
        // Manchas escuras na coroa
        ctxC.fillStyle = '#808080';
        for (let i = 0; i < 4; i++) {
            ctxC.beginPath();
            ctxC.arc(barnOwlSizeCountdown * 0.19 + i * barnOwlSizeCountdown * 0.19, topOfHeadBarnCountdown, barnOwlSizeCountdown * 0.05, 0, Math.PI * 2);
            ctxC.fill();
        }
        
        // Padrão de penas manchadas no peito (branco com pequenas manchas escuras esparsas)
        ctxC.fillStyle = 'rgba(128,128,128,0.3)';
        for (let row = 0; row < 2; row++) {
            for (let i = 0; i < 3; i++) {
                if (Math.random() > 0.3) {
                    ctxC.beginPath();
                    ctxC.arc(
                        -barnOwlSizeCountdown * 0.25 + i * barnOwlSizeCountdown * 0.31,
                        barnOwlSizeCountdown * 0.25 + row * barnOwlSizeCountdown * 0.25,
                        barnOwlSizeCountdown * 0.05,
                        0, Math.PI * 2
                    );
                    ctxC.fill();
                }
            }
        }
        
        // Asas e costas com padrão dourado-marrom
        ctxC.fillStyle = '#D2B48C';
        ctxC.beginPath();
        ctxC.ellipse(-barnOwlSizeCountdown * 0.38, -barnOwlSizeCountdown * 0.13, barnOwlSizeCountdown * 0.5, barnOwlSizeCountdown * 0.25, -0.2, 0, Math.PI * 2);
        ctxC.fill();
        // Manchas cinza nas asas
        ctxC.fillStyle = '#E0E0E0';
        ctxC.beginPath();
        ctxC.ellipse(-barnOwlSizeCountdown * 0.44, 0, barnOwlSizeCountdown * 0.25, barnOwlSizeCountdown * 0.19, -0.2, 0, Math.PI * 2);
        ctxC.fill();
        // Manchas escuras nas asas
        ctxC.fillStyle = 'rgba(101,67,33,0.4)';
        for (let i = 0; i < 4; i++) {
            ctxC.beginPath();
            ctxC.arc(-barnOwlSizeCountdown * 0.5 + i * barnOwlSizeCountdown * 0.15, -barnOwlSizeCountdown * 0.13, barnOwlSizeCountdown * 0.04, 0, Math.PI * 2);
            ctxC.fill();
        }
        
        // Olhos grandes, redondos e escuros (quase pretos)
        ctxC.fillStyle = '#000000';
        ctxC.beginPath();
        ctxC.arc(barnOwlSizeCountdown * 0.25, -barnOwlSizeCountdown * 0.13, barnOwlSizeCountdown * 0.1, 0, Math.PI * 2);
        ctxC.fill();
        ctxC.beginPath();
        ctxC.arc(barnOwlSizeCountdown * 0.5, -barnOwlSizeCountdown * 0.13, barnOwlSizeCountdown * 0.1, 0, Math.PI * 2);
        ctxC.fill();
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

    // Bico - ajustar para Tuiuiu (maior e preto)
    const isTuiuiu = type === 'tuiuiu';
    const isToucan = type === 'toucan';
    const isGull = type === 'gull';
    const isGuara = type === 'guara';
    const isPelican = type === 'pelican';
    const isPrairieFalcon = type === 'prairie-falcon';
    const isSayacaTanager = type === 'sayaca-tanager';
    const isKiskadee = type === 'kiskadee';
    const isCaracara = type === 'caracara';
    const beakColor = isTuiuiu ? '#000000' : (isToucan ? '#f39c12' : (isGull ? '#FFD700' : (isGuara ? '#FFE4B5' : (isPelican ? '#FF8C00' : (isPrairieFalcon ? '#708090' : (isSayacaTanager ? '#87CEEB' : (isKiskadee ? '#000000' : (isCaracara ? '#FFD700' : '#f39c12'))))))));
    const beakLength = isTuiuiu ? 25 : (isToucan ? 45 : (isGull ? 18 : (isGuara ? 35 : (isPelican ? 40 : (isPrairieFalcon ? 22 : (isSayacaTanager ? 16 : (isKiskadee ? 18 : (isCaracara ? 20 : 20)))))))); // Bico mais longo para tucano, Guará, Pelicano e Falcão-das-pradarias
    const beakWidth = isTuiuiu ? 8 : (isToucan ? 10 : (isGull ? 6 : (isGuara ? 4 : (isPelican ? 12 : (isPrairieFalcon ? 4 : (isSayacaTanager ? 4 : (isKiskadee ? 5 : (isCaracara ? 5 : 5))))))));

    if (isToucan) {
        // Gradiente para o bico do tucano
        const gradient = ctxC.createLinearGradient(30, 0, 30 + beakLength, 0);
        gradient.addColorStop(0, '#FFD700'); // Amarelo na base
        gradient.addColorStop(0.5, '#FF8C00'); // Laranja no meio
        gradient.addColorStop(0.8, '#FF4500'); // Vermelho-laranja
        gradient.addColorStop(1, '#000000'); // Preto na ponta
        ctxC.fillStyle = gradient;
    } else if (isGull) {
        // Bico amarelo para gaivota
        ctxC.fillStyle = '#FFD700';
    } else if (isGuara) {
        // Bico rosa-bege para Guará
        ctxC.fillStyle = '#FFE4B5';
    } else if (isPelican) {
        // Bico amarelo-laranja para pelicano (será desenhado separadamente com crista)
        ctxC.fillStyle = '#FF8C00';
    } else if (isPrairieFalcon) {
        // Bico azul-cinza para Falcão-das-pradarias
        ctxC.fillStyle = '#708090';
    } else if (isSayacaTanager) {
        // Bico azul céu para Sanhaço Cinzento
        ctxC.fillStyle = '#87CEEB';
    } else if (isKiskadee) {
        // Bico preto para Bem-te-vi
        ctxC.fillStyle = '#000000';
    } else if (isCaracara) {
        // Bico amarelo com ponta preta para Carcará
        ctxC.fillStyle = '#FFD700';
    } else if (type === 'ground-dove') {
        beakLengthC = 18;
        beakWidthC = 3;
        ctxC.fillStyle = '#F5DEB3'; // Bico fino e claro (amarelo pálido) para Rolinha
    } else if (type === 'rufous-backed-thrush') {
        beakLengthC = 25;
        beakWidthC = 3;
        ctxC.fillStyle = '#000000'; // Bico preto, longo e fino para Sabiá do Campo
    } else if (type === 'orange-thrush') {
        beakLengthC = 22;
        beakWidthC = 3;
        ctxC.fillStyle = '#FF8C00'; // Bico amarelo-laranja brilhante para Sabiá Laranjeira
    } else if (type === 'sayaca-tanager') {
        beakLengthC = 18;
        beakWidthC = 3;
        ctxC.fillStyle = '#87CEEB'; // Bico azul céu para Sanhaço Cinzento
    } else if (type === 'kiskadee') {
        beakLengthC = 18;
        beakWidthC = 5;
        ctxC.fillStyle = '#000000'; // Bico preto para Bem-te-vi
    } else {
        ctxC.fillStyle = beakColor;
    }
    
    if (isPelican) {
        // Bico do pelicano - mandíbula superior com crista vermelho-laranja, mandíbula inferior amarelo-laranja
        // Mandíbula superior com crista vermelho-laranja
        ctxC.fillStyle = '#FF4500';
        ctxC.beginPath();
        ctxC.moveTo(30, -beakWidth / 3);
        ctxC.lineTo(30 + beakLength, beakWidth / 3);
        ctxC.lineTo(30, beakWidth / 2);
        ctxC.closePath();
        ctxC.fill();
        
        // Linha escura abaixo da crista (purplish-grey)
        ctxC.strokeStyle = '#6B5B6B';
        ctxC.lineWidth = 1.5;
        ctxC.beginPath();
        ctxC.moveTo(30, beakWidth / 4);
        ctxC.lineTo(30 + beakLength * 0.9, beakWidth / 3);
        ctxC.stroke();
        
        // Mandíbula inferior e bolsa gular amarelo-laranja vibrante
        ctxC.fillStyle = '#FF8C00';
        ctxC.beginPath();
        ctxC.moveTo(30, beakWidth / 2);
        ctxC.lineTo(30 + beakLength * 0.9, beakWidth * 1.2);
        ctxC.lineTo(30, beakWidth * 1.5);
        ctxC.closePath();
        ctxC.fill();
        
        // Bolsa gular expandida (parte inferior mais larga)
        ctxC.fillStyle = '#FFA500';
        ctxC.beginPath();
        ctxC.ellipse(30 + beakLength * 0.6, beakWidth * 1.3, beakLength * 0.25, beakWidth * 0.4, 0.2, 0, Math.PI * 2);
        ctxC.fill();
        
        // Ponta do bico com toque vermelho-laranja
        ctxC.fillStyle = '#FF4500';
        ctxC.beginPath();
        ctxC.arc(30 + beakLength * 0.95, beakWidth * 0.8, 2, 0, Math.PI * 2);
        ctxC.fill();
    } else if (isGuara) {
        // Bico curvado para baixo (decurved) do Guará
        ctxC.beginPath();
        // Bico superior curvado
        ctxC.moveTo(30, -beakWidth / 4);
        ctxC.quadraticCurveTo(30 + beakLength * 0.5, beakWidth, 30 + beakLength, beakWidth * 1.5);
        ctxC.lineTo(30, beakWidth);
        ctxC.closePath();
        ctxC.fill();
        // Bico inferior curvado
        ctxC.beginPath();
        ctxC.moveTo(30, beakWidth / 2);
        ctxC.quadraticCurveTo(30 + beakLength * 0.4, beakWidth * 1.2, 30 + beakLength * 0.8, beakWidth * 1.8);
        ctxC.lineTo(30, beakWidth);
        ctxC.closePath();
        ctxC.fill();
        // Ponta do bico um pouco mais escura
        ctxC.fillStyle = '#D2B48C';
        ctxC.beginPath();
        ctxC.arc(30 + beakLength * 0.9, beakWidth * 1.6, 2, 0, Math.PI * 2);
        ctxC.fill();
    } else {
        ctxC.beginPath();
        ctxC.moveTo(30, -beakWidth / 2);
        ctxC.lineTo(30 + beakLength, 0);
        ctxC.lineTo(30, beakWidth / 2);
        ctxC.closePath();
        ctxC.fill();
        
        if (isToucan) {
            // Gradiente para o bico inferior também
            const gradient2 = ctxC.createLinearGradient(30, beakWidth / 2, 30 + beakLength * 0.8, beakWidth / 2);
            gradient2.addColorStop(0, '#FFD700');
            gradient2.addColorStop(0.5, '#FF8C00');
            gradient2.addColorStop(0.8, '#FF4500');
            gradient2.addColorStop(1, '#000000');
            ctxC.fillStyle = gradient2;
        } else if (isGull) {
            // Bico amarelo para gaivota
            ctxC.fillStyle = '#FFD700';
        }
        
        ctxC.beginPath();
        ctxC.moveTo(30, beakWidth / 2);
        ctxC.lineTo(30 + beakLength * 0.8, 10);
        ctxC.lineTo(30, beakWidth);
        ctxC.closePath();
        ctxC.fill();

        // Mancha vermelho-laranja no bico da gaivota (mandíbula inferior)
        if (isGull) {
            ctxC.fillStyle = '#FF4500';
            ctxC.beginPath();
            ctxC.arc(30 + beakLength * 0.6, 10, 3, 0, Math.PI * 2);
            ctxC.fill();
        }
    }

    // Asa - para Tuiuiu e Falcão-das-pradarias, usar cor apropriada
    const wingFlap = Math.sin(time / 60) * 0.5;
    const wingY = 5 + Math.sin(time / 60) * 10;
    let finalWingColor = wingColor || '#c0392b';
    if (type === 'tuiuiu') {
        finalWingColor = '#f5f5f5';
    } else if (type === 'prairie-falcon') {
        finalWingColor = '#8B7355'; // Marrom acinzentado para asas
    }
    ctxC.fillStyle = finalWingColor;
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
    const particlesEl = document.getElementById('countdownParticles');
    const stageInfoEl = document.getElementById('countdownStageInfo');
    const vsEl = document.getElementById('countdownVs');
    const countdownCanvas = document.getElementById('countdownCanvas');
    const ctxC = countdownCanvas.getContext('2d');

    overlay.style.display = 'flex';
    effectsEl.innerHTML = '';
    particlesEl.innerHTML = '';

    // Atualizar informações da fase
    const config = substageConfig[currentSubstage];
    const areaConfigData = areaConfig[currentArea];
    const stageName = substageNames[currentArea] && substageNames[currentArea][currentSubstage]
        ? substageNames[currentArea][currentSubstage]
        : `${currentArea}-${currentSubstage}`;
    const difficultyNames = {
        easy: 'Fácil',
        normal: 'Normal',
        hard: 'Difícil'
    };

    if (config.isBoss) {
        vsEl.textContent = '⚔️ BOSS FIGHT! ⚔️';
        stageInfoEl.innerHTML = `
                    <div class="stage-name">${areaConfigData.icon} ${areaConfigData.name} - ${stageName}</div>
                    <div class="difficulty">Dificuldade: ${difficultyNames[gameDifficulty]}</div>
                `;
    } else if (isBonusStage) {
        vsEl.textContent = '🌟 FASE BÔNUS! 🌟';
        // Personalizar emoji do bônus baseado na área
        let bonusEmoji = '🪱';
        if (currentArea === 7) bonusEmoji = '❄️';
        else if (currentArea === 5) bonusEmoji = '🍞';
        else if (currentArea === 4) bonusEmoji = '🌵';
        else if (currentArea === 3) bonusEmoji = '🐟';
        else if (currentArea === 2) bonusEmoji = '🦟';
        
        stageInfoEl.innerHTML = `
                    <div class="stage-name">${areaConfigData.icon} ${areaConfigData.name} - ${stageName}</div>
                    <div class="difficulty">${bonusEmoji} Meta: ${config.goalScore} em ${config.time}s</div>
                `;
    } else {
        vsEl.textContent = '⚔️ PREPARE-SE PARA A BATALHA ⚔️';
        stageInfoEl.innerHTML = `
                    <div class="stage-name">${areaConfigData.icon} ${areaConfigData.name} - ${stageName}</div>
                    <div class="difficulty">Dificuldade: ${difficultyNames[gameDifficulty]} | Tempo: 60s</div>
                `;
    }

    // Tocar som especial do boss coruja se for a fase do boss coruja
    if (config.isBoss && currentArea === 1) {
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

        // Raios de energia no centro (melhorados)
        ctxC.strokeStyle = `rgba(241, 196, 15, ${0.4 + Math.sin(time / 100) * 0.3})`;
        ctxC.lineWidth = 3;
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + time / 500;
            const length = 50 + Math.sin(time / 200 + i) * 15;
            ctxC.beginPath();
            ctxC.moveTo(300, 100);
            ctxC.lineTo(300 + Math.cos(angle) * length, 100 + Math.sin(angle) * length);
            ctxC.stroke();
        }

        // Círculo de energia pulsante no centro
        ctxC.strokeStyle = `rgba(241, 196, 15, ${0.2 + Math.sin(time / 150) * 0.2})`;
        ctxC.lineWidth = 2;
        const pulseRadius = 30 + Math.sin(time / 200) * 10;
        ctxC.beginPath();
        ctxC.arc(300, 100, pulseRadius, 0, Math.PI * 2);
        ctxC.stroke();

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

            const config = substageConfig[currentSubstage];

            if (currentArea === 3) {
                // Fase bônus da Ilha Tropical - peixes
                // Título no topo
                ctxC.font = 'bold 28px Arial';
                ctxC.fillStyle = '#16a085';
                ctxC.textAlign = 'center';
                ctxC.shadowColor = '#0e6655';
                ctxC.shadowBlur = 10;
                ctxC.fillText('🐟 CAÇA AOS PEIXES! 🐟', 300, 35);
                ctxC.shadowBlur = 0;

                // Pássaro no centro (mais abaixo)
                drawCountdownBird(ctxC, 300, 95, selectedPlayerColor, true, time);

                // Peixes pulando da água animados na parte inferior
                const fishEmojis = ['🐟', '🐠', '🐡', '🦈'];
                ctxC.font = '30px Arial';
                const waterLevel = 160; // Nível da água
                
                // Desenhar água
                ctxC.fillStyle = 'rgba(52, 152, 219, 0.4)';
                ctxC.fillRect(50, waterLevel, 500, 30);
                
                for (let i = 0; i < 5; i++) {
                    const fx = 100 + i * 100;
                    // Animação de peixe pulando: sobe e desce
                    const jumpPhase = (time / 300 + i * 0.5) % (Math.PI * 2);
                    const jumpHeight = Math.abs(Math.sin(jumpPhase)) * 40;
                    const fy = waterLevel - 10 - jumpHeight;
                    const rotation = jumpPhase < Math.PI ? Math.PI / 2 : -Math.PI / 2; // Olha para cima ao subir, para baixo ao cair
                    
                    ctxC.save();
                    ctxC.translate(fx, fy);
                    ctxC.rotate(rotation);

                    // Brilho ao redor do peixe quando está no ar
                    if (jumpHeight > 10) {
                        ctxC.fillStyle = 'rgba(22, 160, 133, 0.3)';
                        ctxC.beginPath();
                        ctxC.arc(0, 0, 18, 0, Math.PI * 2);
                        ctxC.fill();
                    }

                    // Peixe
                    ctxC.fillStyle = '#000000';
                    ctxC.fillText(fishEmojis[i % fishEmojis.length], 0, 0);

                    // Gotas de água caindo quando o peixe está descendo
                    if (jumpPhase > Math.PI / 2 && jumpPhase < Math.PI * 1.5 && jumpHeight > 5) {
                        ctxC.fillStyle = 'rgba(52, 152, 219, 0.6)';
                        for (let j = 0; j < 3; j++) {
                            const dropX = (j - 1) * 8;
                            const dropY = 15 + (jumpPhase - Math.PI / 2) * 5;
                            ctxC.beginPath();
                            ctxC.arc(dropX, dropY, 2, 0, Math.PI * 2);
                            ctxC.fill();
                        }
                    }

                    ctxC.restore();
                }

                // Meta de peixes
                ctxC.font = 'bold 18px Arial';
                ctxC.fillStyle = '#16a085';
                ctxC.fillText(`Meta: ${config.goalScore} peixes em ${config.time}s!`, 300, 195);
            } else if (currentArea === 7) {
                // Fase bônus do gelo - frutas congeladas
                // Título no topo
                ctxC.font = 'bold 28px Arial';
                ctxC.fillStyle = '#87CEEB';
                ctxC.textAlign = 'center';
                ctxC.shadowColor = '#5DADE2';
                ctxC.shadowBlur = 10;
                ctxC.fillText('❄️ FRUTAS CONGELADAS! ❄️', 300, 35);
                ctxC.shadowBlur = 0;

                // Pássaro no centro (mais abaixo)
                drawCountdownBird(ctxC, 300, 95, selectedPlayerColor, true, time);

                // Frutas congeladas animadas na parte inferior
                const frozenFruitEmojis = ['🍎', '🍌', '🍇', '🍊', '🍓'];
                ctxC.font = '30px Arial';
                for (let i = 0; i < 5; i++) {
                    const fx = 80 + i * 110;
                    const fy = 175 + Math.sin(time / 200 + i * 0.8) * 6;
                    const float = Math.sin(time / 150 + i) * 3;
                    ctxC.save();
                    ctxC.translate(fx, fy);
                    ctxC.rotate(float * 0.03);

                    // Camada de gelo ao redor da fruta
                    ctxC.fillStyle = 'rgba(200, 220, 255, 0.6)';
                    ctxC.beginPath();
                    ctxC.arc(0, 0, 20, 0, Math.PI * 2);
                    ctxC.fill();

                    // Fruta dentro do gelo
                    ctxC.fillText(frozenFruitEmojis[i % frozenFruitEmojis.length], 0, 0);

                    // Cristais de gelo pequenos ao redor
                    ctxC.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    for (let j = 0; j < 6; j++) {
                        const angle = (j / 6) * Math.PI * 2 + time / 300;
                        const px = Math.cos(angle) * 15;
                        const py = Math.sin(angle) * 15;
                        ctxC.fillText('❄', px, py);
                    }

                    ctxC.restore();
                }

                // Meta de frutas
                ctxC.font = 'bold 18px Arial';
                ctxC.fillStyle = '#87CEEB';
                ctxC.fillText(`Meta: ${config.goalScore} frutas em ${config.time}s!`, 300, 195);
            } else if (currentArea === 4) {
                // Fase bônus do deserto - frutos de cactos
                // Título no topo
                ctxC.font = 'bold 28px Arial';
                ctxC.fillStyle = '#f39c12';
                ctxC.textAlign = 'center';
                ctxC.shadowColor = '#d2691e';
                ctxC.shadowBlur = 10;
                ctxC.fillText('🌵 FRUTOS DE CACTOS! 🌵', 300, 35);
                ctxC.shadowBlur = 0;

                // Pássaro no centro (mais abaixo)
                drawCountdownBird(ctxC, 300, 95, selectedPlayerColor, true, time);

                // Frutos de cactos animados na parte inferior
                const fruitEmojis = ['🌵', '🍇', '🍊', '🍑'];
                ctxC.font = '30px Arial';
                for (let i = 0; i < 5; i++) {
                    const fx = 80 + i * 110;
                    const fy = 175 + Math.sin(time / 200 + i * 0.8) * 6;
                    const float = Math.sin(time / 150 + i) * 3;
                    ctxC.save();
                    ctxC.translate(fx, fy);
                    ctxC.rotate(float * 0.03);

                    // Efeito de calor (ondas)
                    const heatAlpha = 0.3 + Math.sin(time / 100 + i) * 0.2;
                    ctxC.globalAlpha = heatAlpha;
                    ctxC.fillStyle = '#f39c12';
                    ctxC.beginPath();
                    ctxC.arc(0, 0, 20, 0, Math.PI * 2);
                    ctxC.fill();

                    // Fruto
                    ctxC.globalAlpha = 1;
                    ctxC.fillText(fruitEmojis[i % fruitEmojis.length], 0, 0);

                    ctxC.restore();
                }

                // Meta de frutos
                ctxC.font = 'bold 18px Arial';
                ctxC.fillStyle = '#f39c12';
                ctxC.fillText(`Meta: ${config.goalScore} frutos em ${config.time}s!`, 300, 195);
            } else if (currentArea === 2) {
                // Fase bônus do pântano - insetos
                // Título no topo
                ctxC.font = 'bold 28px Arial';
                ctxC.fillStyle = '#2ecc71';
                ctxC.textAlign = 'center';
                ctxC.shadowColor = '#27ae60';
                ctxC.shadowBlur = 10;
                ctxC.fillText('🦟 CAÇA AOS INSETOS! 🦟', 300, 35);
                ctxC.shadowBlur = 0;

                // Pássaro no centro (mais abaixo)
                drawCountdownBird(ctxC, 300, 95, selectedPlayerColor, true, time);
            } else if (currentArea === 5) {
                // Fase bônus da Metrópole - pães
                // Título no topo
                ctxC.font = 'bold 28px Arial';
                ctxC.fillStyle = '#34495e';
                ctxC.textAlign = 'center';
                ctxC.shadowColor = '#2c3e50';
                ctxC.shadowBlur = 10;
                ctxC.fillText('🍞 CAÇA AOS PÃES! 🍞', 300, 35);
                ctxC.shadowBlur = 0;

                // Pássaro no centro (mais abaixo)
                drawCountdownBird(ctxC, 300, 95, selectedPlayerColor, true, time);

                // Senhor idoso jogando pães no canto superior direito
                ctxC.font = '70px Arial';
                ctxC.fillStyle = '#000000';
                const throwOffset = Math.sin(time / 100) * 5;
                ctxC.fillText('👴', 550, 50 + throwOffset); // Canto superior direito

                // Pães caindo animados
                ctxC.font = '25px Arial';
                const breadEmojis = ['🍞'];
                for (let i = 0; i < 3; i++) {
                    const breadX = 200 + i * 100;
                    const breadY = 80 + (time / 50 + i * 20) % 80;
                    ctxC.fillText('🍞', breadX, breadY);
                }

                // Meta de pães
                ctxC.font = 'bold 18px Arial';
                ctxC.fillStyle = '#34495e';
                ctxC.fillText(`Meta: ${config.goalScore} pães em ${config.time}s!`, 300, 195);
            } else if (currentArea === 2) {
                // Fase bônus do pântano - insetos
                // Título no topo
                ctxC.font = 'bold 28px Arial';
                ctxC.fillStyle = '#2ecc71';
                ctxC.textAlign = 'center';
                ctxC.shadowColor = '#27ae60';
                ctxC.shadowBlur = 10;
                ctxC.fillText('🦟 CAÇA AOS INSETOS! 🦟', 300, 35);
                ctxC.shadowBlur = 0;

                // Pássaro no centro (mais abaixo)
                drawCountdownBird(ctxC, 300, 95, selectedPlayerColor, true, time);

                // Insetos animados na parte inferior
                const insectEmojis = ['🦟', '🪰', '🦗', '🐛'];
                ctxC.font = '30px Arial';
                for (let i = 0; i < 5; i++) {
                    const ix = 80 + i * 110;
                    const iy = 175 + Math.sin(time / 120 + i * 0.8) * 8;
                    const fly = Math.sin(time / 80 + i) * 6;
                    ctxC.save();
                    ctxC.translate(ix, iy);
                    ctxC.rotate(fly * 0.08);

                    // Efeito de movimento (voo)
                    const flyAlpha = 0.7 + Math.sin(time / 100 + i) * 0.3;
                    ctxC.globalAlpha = flyAlpha;

                    // Inseto
                    ctxC.fillText(insectEmojis[i % insectEmojis.length], 0, 0);

                    ctxC.restore();
                }

                // Meta de insetos
                ctxC.font = 'bold 18px Arial';
                ctxC.fillStyle = '#2ecc71';
                ctxC.fillText(`Meta: ${config.goalScore} insetos em ${config.time}s!`, 300, 195);
            } else {
                // Fase bônus - minhocas (outras áreas)
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
                ctxC.font = 'bold 18px Arial';
                ctxC.fillStyle = '#f1c40f';
                ctxC.fillText(`Meta: ${config.goalScore} minhocas em ${config.time}s!`, 300, 195);
            }
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

                // Desenhar BOSS (direita, MAIOR) - usar bossCpuTypes diretamente para garantir que está correto
                const bossType = bossCpuTypes[currentArea];
                if (bossType) {
                    drawCountdownBoss(ctxC, 480, 95, bossType.color, bossType.wingColor, bossType.type, time);

                    // Nome do boss
                    ctxC.font = 'bold 16px Arial';
                    ctxC.fillStyle = '#e74c3c';
                    ctxC.fillText(`👑 ${bossType.name}`, 480, 175);
                } else {
                    // Fallback caso não encontre o boss
                    drawCountdownBoss(ctxC, 480, 95, cpu.color, cpu.wingColor, cpu.type, time);
                    ctxC.font = 'bold 16px Arial';
                    ctxC.fillStyle = '#e74c3c';
                    ctxC.fillText(`👑 Boss`, 480, 175);
                }
            } else {
                ctxC.fillText('VS', 300, 100);
                ctxC.shadowBlur = 0;

                // Desenhar pássaro do jogador (esquerda, olhando para direita)
                drawCountdownBird(ctxC, 100, 100, selectedPlayerColor, true, time);

                // Desenhar pássaro da CPU (direita, olhando para esquerda)
                // Desenhar pássaro da CPU com todos os detalhes específicos
                drawCountdownBird(ctxC, 500, 100, cpu.color, false, time, cpu.wingColor, cpu.type, cpu.beakColor, cpu.eyeColor);
            }
        }

        animFrame = requestAnimationFrame(animateBirds);
    }

    animateBirds();

    // Adicionar faíscas entre os pássaros
    function addSparks() {
        for (let i = 0; i < 8; i++) {
            const spark = document.createElement('div');
            spark.className = 'spark';
            spark.textContent = ['⚡', '✨', '💥', '🔥', '⭐', '🌟'][Math.floor(Math.random() * 6)];
            spark.style.setProperty('--x', (Math.random() - 0.5) * 300 + 'px');
            spark.style.setProperty('--y', (Math.random() - 0.5) * 200 + 'px');
            effectsEl.appendChild(spark);

            setTimeout(() => spark.remove(), 600);
        }
    }

    // Adicionar partículas flutuantes
    function addParticles() {
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.boxShadow = `0 0 10px ${particle.style.background}`;
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 2 + 's';
            particlesEl.appendChild(particle);

            setTimeout(() => particle.remove(), 2000);
        }
    }

    addSparks();
    addParticles();

    // Desenhar o cenário parado durante a contagem
    draw();

    // 🔊 Tocar som do countdown apenas uma vez
    playSound('countdown');

    const countInterval = setInterval(() => {
        count--;
        addSparks();
        addParticles();

        if (count > 0) {
            numberEl.textContent = count;
            // Reiniciar animação com shake
            numberEl.style.animation = 'none';
            setTimeout(() => {
                numberEl.style.animation = 'countPulse 0.5s ease-out, countShake 0.1s ease-out 0.3s';
            }, 10);
        } else if (count === 0) {
            numberEl.textContent = 'VAI!';
            numberEl.className = 'countdown-number countdown-go';
            numberEl.style.animation = 'none';
            setTimeout(() => {
                numberEl.style.animation = 'countPulse 0.6s ease-out, countShake 0.15s ease-out 0.4s';
            }, 10);

            // Mais faíscas e partículas no VAI!
            for (let i = 0; i < 5; i++) {
                setTimeout(() => addSparks(), i * 100);
            }
            addParticles();
        } else {
            clearInterval(countInterval);
            cancelAnimationFrame(animFrame);
            overlay.style.display = 'none';

            // Agora inicia o jogo de verdade
            gameStarted = true;
            gameRunning = true;
            
            // Mostrar controles touch imediatamente quando o jogo começar
            showTouchControls();
            
            // Forçar múltiplas tentativas para garantir que apareça (especialmente em landscape)
            setTimeout(showTouchControls, 50);
            setTimeout(showTouchControls, 150);
            setTimeout(showTouchControls, 300);
            setTimeout(showTouchControls, 500);

            // Recriar intervals de spawn (podem ter sido limpos em endGame anterior)
            if (!foodSpawnInterval) {
                foodSpawnInterval = setInterval(() => {
                    if (gameRunning && !isBonusStage) {
                        const quantidade = 1 + Math.floor(Math.random() * 5);
                        for (let i = 0; i < quantidade; i++) {
                            spawnFood();
                        }
                    }
                }, 2000);
            }
            if (!specialFoodSpawnInterval) {
                specialFoodSpawnInterval = setInterval(() => {
                    if (gameRunning && !isBonusStage) {
                        spawnSpecialFood();
                    }
                }, 8000 + Math.random() * 7000);
            }
            if (!speedItemSpawnInterval) {
                speedItemSpawnInterval = setInterval(() => {
                    if (gameRunning && !isBonusStage) {
                        spawnSpeedItem();
                    }
                }, 10000 + Math.random() * 8000);
            }
            if (!wormSpawnInterval) {
                wormSpawnInterval = setInterval(() => {
                    if (gameRunning && isBonusStage) {
                        spawnWorm();
                    }
                }, 300 + Math.random() * 500);
            }

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
        menuOverlay.style.removeProperty('display'); console.log('Voltando ao menu');
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
    // Esconder controles touch quando o jogo parar
    hideTouchControls();
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
    if (!menuCanvas) {
        menuAnimFrame = null;
        return;
    }

    // Verificar se o menu está visível antes de animar
    const menuOverlay = document.getElementById('menuOverlay');
    if (menuOverlay && menuOverlay.style.display === 'none') {
        menuAnimFrame = null;
        return;
    }

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

    // Desenhar pássaro preview (centralizado)
    const centerX = previewCanvas.width / 2;
    const centerY = previewCanvas.height / 2;
    drawPreviewBird(ctxP, centerX, centerY, selectedPlayerColor, selectedPlayerWing, time);

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
let selectedPlayerColor = localStorage.getItem('birdGameSelectedColor') || '#2ecc71';
let selectedPlayerWing = localStorage.getItem('birdGameSelectedWing') || '#27ae60';

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
        stageStars: {},
        lives: MAX_LIVES,
        coins: 0,
        lastLifeLossTime: null
    };

    localStorage.setItem('birdGameProgress', JSON.stringify(gameProgress));

    // Fechar roadmap e sub-fases se estiverem abertas
    closeRoadmap();
    closeSubstages();

    // Atualizar UI
    updateLivesUI();
    updateRoadmapVisual();

    alert('✅ Progresso resetado com sucesso!\n\nVocê voltou ao início do jogo.\n\nTodas as áreas foram trancadas, exceto a primeira.');

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

// Função para mostrar mensagens temporárias
function showColorMessage(message, type = 'info') {
    // Remover mensagem anterior se existir
    const existingMsg = document.getElementById('colorChangeMessage');
    if (existingMsg) {
        existingMsg.remove();
    }

    const msgDiv = document.createElement('div');
    msgDiv.id = 'colorChangeMessage';
    msgDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: ${type === 'warning' ? '#e74c3c' : '#2ecc71'};
                color: white;
                padding: 15px 25px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: bold;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 300px;
                animation: fadeIn 0.3s ease;
            `;
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);

    setTimeout(() => {
        if (msgDiv.parentNode) {
            msgDiv.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => msgDiv.remove(), 300);
        }
    }, 2000);
}

// Selecionar cor
function selectColor(element) {
    const newColor = element.dataset.color;
    const newWing = element.dataset.wing;

    // Se já está selecionada, não fazer nada
    if (selectedPlayerColor === newColor && selectedPlayerWing === newWing) {
        return;
    }

    // Verificar se tem moedas suficientes
    if (gameProgress.coins < COLOR_COST) {
        // Mostrar mensagem de moedas insuficientes
        showColorMessage(`💰 Você precisa de ${COLOR_COST} moedas!\nVocê tem ${gameProgress.coins} moedas.`, 'warning');
        return;
    }

    // Mostrar confirmação antes de comprar
    const confirmMessage = `💰 Deseja comprar esta cor por ${COLOR_COST} moedas?\n\nVocê tem ${gameProgress.coins} moedas.\nApós a compra: ${gameProgress.coins - COLOR_COST} moedas.`;

    if (!confirm(confirmMessage)) {
        // Usuário cancelou
        return;
    }

    // Debitar moedas
    gameProgress.coins -= COLOR_COST;
    localStorage.setItem('birdGameProgress', JSON.stringify(gameProgress));
    updateLivesUI();

    // Remover seleção anterior
    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));

    // Adicionar seleção
    element.classList.add('selected');

    // Guardar cor
    selectedPlayerColor = newColor;
    selectedPlayerWing = newWing;

    // Salvar no localStorage
    localStorage.setItem('birdGameSelectedColor', selectedPlayerColor);
    localStorage.setItem('birdGameSelectedWing', selectedPlayerWing);

    // Atualizar cor do jogador
    player.color = selectedPlayerColor;

    // Atualizar CPU para cor diferente
    updateCpuColor();

    // Atualizar canvas do menu
    animateMenu();

    // Mostrar mensagem de sucesso
    showColorMessage(`✅ Cor alterada! (-${COLOR_COST} moedas)`, 'success');
}

// Atualizar seleção visual da cor ao carregar
function updateColorSelection() {
    document.querySelectorAll('.color-option').forEach(el => {
        if (el.dataset.color === selectedPlayerColor && el.dataset.wing === selectedPlayerWing) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });
}

// Atualizar seleção quando a página carregar
setTimeout(() => {
    updateColorSelection();
}, 100);

// Versão do jogo (pode ser atualizada manualmente ou via build script)
const GAME_VERSION = '1.0.0';

// Atualizar versão do jogo na UI
function updateGameVersion() {
    const versionEl = document.getElementById('gameVersion');
    if (versionEl) {
        versionEl.textContent = `v${GAME_VERSION}`;
    }
}

// Atualizar versão ao carregar
updateGameVersion();

// Prevenir zoom no mobile (double-tap, pinch)
document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
        e.preventDefault(); // Prevenir pinch zoom
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault(); // Prevenir double-tap zoom
    }
    lastTouchEnd = now;
}, { passive: false });

// Prevenir zoom com gestos
document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
}, { passive: false });

document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
}, { passive: false });

document.addEventListener('gestureend', function(e) {
    e.preventDefault();
}, { passive: false });

// Função para tela cheia
function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
        // Entrar em tela cheia
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    } else {
        // Sair de tela cheia
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Detectar mudanças de tela cheia
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
document.addEventListener('mozfullscreenchange', updateFullscreenButton);
document.addEventListener('MSFullscreenChange', updateFullscreenButton);

function updateFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        fullscreenBtn.textContent = isFullscreen ? '⛶' : '⛶';
        fullscreenBtn.title = isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia';
    }
}

// Garantir que controles sejam atualizados quando necessário
// Verificar periodicamente se os controles devem estar visíveis (para casos de mudança de orientação)
setInterval(function() {
    if (gameRunning) {
        const touchControls = document.getElementById('touchControls');
        if (touchControls) {
            const isMobile = window.innerWidth <= 750 || window.innerHeight <= 750;
            const shouldBeVisible = isMobile && gameRunning;
            const isVisible = touchControls.style.display === 'flex';
            
            if (shouldBeVisible && !isVisible) {
                showTouchControls();
            } else if (!shouldBeVisible && isVisible) {
                hideTouchControls();
            }
        }
    }
}, 500); // Verificar a cada 500ms

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
    // Ativar na subfase 1-3 da floresta OU em todas as sub-fases do pântano
    if ((currentArea === 1 && currentSubstage === 3) || (currentArea === 2 && currentSubstage >= 1 && currentSubstage <= 7)) {
        // Criar novas gotas periodicamente (mais intensa no pântano)
        const rainIntensity = currentArea === 2 ? 0.4 : 0.3;
        if (Math.random() < rainIntensity) {
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
    } else {
        // Limpar chuva se não estiver na área correta
        rainDrops = [];
    }
}

// Desenhar chuva
function drawRain() {
    ctx.save();

    // Cor da chuva diferente para pântano (mais escura/verde-azulada)
    if (currentArea === 2) {
        ctx.strokeStyle = '#5F9EA0'; // Verde-azulado escuro para pântano
    } else {
        ctx.strokeStyle = '#87CEEB'; // Cor azul claro da chuva (floresta)
    }

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
        if (currentArea === 2) {
            ctx.fillStyle = '#7FB3B3'; // Verde-azulado para pântano
        } else {
            ctx.fillStyle = '#B0E0E6'; // Azul claro para floresta
        }
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
    // Posição na parte superior da cabeça do pássaro
    const offsetX = (Math.random() - 0.5) * bird.size * 0.3; // Pequena variação horizontal
    const startX = bird.x + offsetX;
    const startY = bird.y - bird.size * 0.8; // Acima da cabeça do pássaro

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
    if (currentArea !== 3 && currentArea !== 4) {
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

    // OTIMIZAÇÃO: Limitar número total de gotas (evitar memory leak)
    if (sweatDrops.length > 20) {
        sweatDrops.splice(0, sweatDrops.length - 20);
    }
}

// Criar efeito de frio (vapor/fumaça branca)
function createColdEffect(bird, isPlayer) {
    const birdId = isPlayer ? 'player' : 'cpu';
    const angle = Math.random() * Math.PI * 2;
    const distance = bird.size + 5 + Math.random() * 10;

    coldEffects.push({
        birdId: birdId,
        x: bird.x + Math.cos(angle) * distance,
        y: bird.y - bird.size * 0.5 + Math.sin(angle) * distance * 0.3, // Mais acima do pássaro
        vx: (Math.random() - 0.5) * 0.3, // Movimento horizontal suave
        vy: -0.5 - Math.random() * 0.5, // Movimento para cima
        size: 2 + Math.random() * 2.5, // Tamanho intermediário
        life: 50 + Math.random() * 25, // Duração intermediária
        maxLife: 50 + Math.random() * 25,
        alpha: 0.6 + Math.random() * 0.25 // Transparência intermediária
    });
}

// Atualizar efeitos de frio
function updateColdEffects() {
    if (currentArea !== 7) {
        coldEffects = [];
        return;
    }

    const coldProgress = getColdProgress();

    // Limitar número máximo de efeitos por pássaro (aumenta com o frio)
    const playerEffects = coldEffects.filter(d => d.birdId === 'player').length;
    const cpuEffects = coldEffects.filter(d => d.birdId === 'cpu').length;
    const maxEffectsPerBird = 3 + Math.floor(coldProgress * 4); // 3 a 7 efeitos conforme o frio

    // Criar novos efeitos periodicamente (probabilidade aumenta com o frio)
    const spawnChance = 0.05 + coldProgress * 0.08; // 5% a 13% conforme o frio
    if (!player.stunned && playerEffects < maxEffectsPerBird && Math.random() < spawnChance) {
        createColdEffect(player, true);
    }
    if (!cpu.stunned && cpuEffects < maxEffectsPerBird && Math.random() < spawnChance) {
        createColdEffect(cpu, false);
    }

    // Atualizar efeitos existentes
    for (let i = coldEffects.length - 1; i >= 0; i--) {
        const effect = coldEffects[i];

        // Mover efeito (vapor sobe e se dispersa)
        effect.x += effect.vx;
        effect.y += effect.vy;

        // Dispersão (movimento horizontal aumenta)
        effect.vx += (Math.random() - 0.5) * 0.05;

        // Efeito sobe e se expande
        effect.size += 0.05;
        effect.vy -= 0.02; // Desacelera conforme sobe

        // Reduzir vida
        effect.life--;

        // Remover se saiu da tela ou acabou a vida
        if (effect.life <= 0 || effect.y < -20 || effect.x < -20 || effect.x > canvas.width + 20) {
            coldEffects.splice(i, 1);
        }
    }

    // OTIMIZAÇÃO: Limitar número total de efeitos (evitar memory leak)
    if (coldEffects.length > 20) {
        coldEffects.splice(0, coldEffects.length - 20);
    }
}

// Desenhar efeitos de frio ao redor do pássaro
function drawColdEffects(bird, isPlayer) {
    const birdId = isPlayer ? 'player' : 'cpu';

    // Desenhar apenas os efeitos deste pássaro
    coldEffects.forEach(effect => {
        if (effect.birdId === birdId) {
            const alpha = (effect.life / effect.maxLife) * effect.alpha;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Vapor branco/fumegante
            const gradient = ctx.createRadialGradient(
                effect.x, effect.y, 0,
                effect.x, effect.y, effect.size
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.5, 'rgba(200, 220, 255, 0.4)');
            gradient.addColorStop(1, 'rgba(150, 180, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
            ctx.fill();

            // Partículas menores de gelo ao redor
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            for (let i = 0; i < 3; i++) {
                const angle = (Math.PI * 2 / 3) * i + effect.life * 0.1;
                const px = effect.x + Math.cos(angle) * effect.size * 0.6;
                const py = effect.y + Math.sin(angle) * effect.size * 0.6;
                ctx.beginPath();
                ctx.arc(px, py, 1, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    });
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

// ========== FUNÇÕES DE GOTAS DE ÁGUA NO PÂNTANO ==========

// Criar gota de água
function createWaterDrop(bird, isPlayer) {
    // Posição na parte superior da cabeça do pássaro
    const offsetX = (Math.random() - 0.5) * bird.size * 0.4; // Variação horizontal
    const startX = bird.x + offsetX;
    const startY = bird.y - bird.size * 0.7; // Acima da cabeça do pássaro

    waterDrops.push({
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 0.5, // Velocidade horizontal
        vy: 0.8 + Math.random() * 0.4, // Velocidade vertical (caindo)
        size: 2.5 + Math.random() * 2, // Tamanho da gota
        life: 60 + Math.random() * 30, // Duração da gota
        maxLife: 60 + Math.random() * 30,
        birdId: isPlayer ? 'player' : 'cpu',
        alpha: 0.7 + Math.random() * 0.2 // Transparência
    });
}

// Atualizar gotas de água
function updateWaterDrops() {
    if (currentArea !== 2) {
        waterDrops = [];
        return;
    }

    // Limitar número máximo de gotas por pássaro
    const playerDrops = waterDrops.filter(d => d.birdId === 'player').length;
    const cpuDrops = waterDrops.filter(d => d.birdId === 'cpu').length;
    const maxDropsPerBird = 8; // Máximo de 8 gotas por pássaro (mais que suor, pois é chuva)

    // Criar novas gotas periodicamente para cada pássaro (mais frequente que suor)
    if (!player.stunned && playerDrops < maxDropsPerBird && Math.random() < 0.12) {
        createWaterDrop(player, true);
    }
    if (!cpu.stunned && cpuDrops < maxDropsPerBird && Math.random() < 0.12) {
        createWaterDrop(cpu, false);
    }

    // Atualizar gotas existentes
    for (let i = waterDrops.length - 1; i >= 0; i--) {
        const drop = waterDrops[i];

        // Mover gota
        drop.x += drop.vx;
        drop.y += drop.vy;

        // Aceleração gravitacional
        drop.vy += 0.12;

        // Reduzir vida
        drop.life--;

        // Remover se saiu da tela ou acabou a vida
        if (drop.life <= 0 || drop.y > canvas.height + 20) {
            waterDrops.splice(i, 1);
        }
    }

    // OTIMIZAÇÃO: Limitar número total de gotas (evitar memory leak)
    if (waterDrops.length > 20) {
        waterDrops.splice(0, waterDrops.length - 20);
    }
}

// Desenhar gotas de água ao redor do pássaro
function drawWaterDrops(bird, isPlayer) {
    const birdId = isPlayer ? 'player' : 'cpu';

    // Desenhar apenas as gotas deste pássaro
    waterDrops.forEach(drop => {
        if (drop.birdId === birdId) {
            const alpha = (drop.life / drop.maxLife) * drop.alpha;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Cor da gota de água (azul-verde claro, típico de água)
            ctx.fillStyle = '#5F9EA0';
            ctx.strokeStyle = '#4682B4';
            ctx.lineWidth = 0.5;

            // Desenhar gota (formato de lágrima alongada)
            ctx.beginPath();
            ctx.ellipse(drop.x, drop.y, drop.size * 0.6, drop.size, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Brilho na gota (mais intenso que suor, pois é água)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.ellipse(drop.x - drop.size * 0.3, drop.y - drop.size * 0.3, drop.size * 0.3, drop.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    });
}

