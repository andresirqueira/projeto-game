// Galhos Baixos — o emaranhado cresce do chão, com a copa para cima.
// O voo passa por cima dos galhos. Onde não há árvore, pássaros no alto obrigam a descer.
window.PASSAGE_LAYOUTS = window.PASSAGE_LAYOUTS || {};
window.PASSAGE_LAYOUTS['1-6'] = {
    length: 9600,
    time: 42,
    boostFruits: 10,
    fruits: [
        { x: 1100, y: 90, emoji: '🍎' },
        { x: 1280, y: 78, emoji: '🍊' },
        { x: 1600, y: 400, emoji: '🍎' },
        { x: 2000, y: 370, emoji: '🍒' },
        { x: 2300, y: 340, emoji: '🍎' },
        { x: 2450, y: 390, emoji: '🍎' },
        { x: 2860, y: 86, emoji: '🍊' },
        { x: 3060, y: 74, emoji: '🍎' },
        { x: 3500, y: 400, emoji: '🍎' },
        { x: 4000, y: 360, emoji: '🍒' },
        { x: 4450, y: 390, emoji: '🍎' },
        { x: 4780, y: 88, emoji: '🍎' },
        { x: 5000, y: 72, emoji: '🍊' },
        { x: 5400, y: 410, emoji: '🍎' },
        { x: 5900, y: 380, emoji: '🍎' },
        { x: 6500, y: 400, emoji: '🍒' },
        { x: 6860, y: 90, emoji: '🍎' },
        { x: 7080, y: 76, emoji: '🍊' },
        { x: 7500, y: 370, emoji: '🍎' },
        { x: 8100, y: 400, emoji: '🍎' },
        { x: 8700, y: 360, emoji: '🍎' },
        { x: 9200, y: 390, emoji: '🍒' }
    ],
    birds: [
        { x: 480, y: 132, radius: 34, range: 46, speed: 0.03, axis: 'x', color: '#5d6d7e', wingColor: '#34495e' },
        { x: 800, y: 118, radius: 32, range: 36, speed: 0.034, phase: 1.2, axis: 'x', color: '#7f8c8d', wingColor: '#566573' },
        { x: 1750, y: 146, radius: 38, range: 54, speed: 0.032, axis: 'x', color: '#6e2c00', wingColor: '#4a235a' },
        { x: 2150, y: 128, radius: 36, range: 48, speed: 0.036, phase: 2, axis: 'x', color: '#5d6d7e', wingColor: '#2c3e50' },
        { x: 2520, y: 150, radius: 34, range: 40, speed: 0.03, phase: 0.6, axis: 'x', color: '#7f8c8d', wingColor: '#34495e' },
        { x: 3500, y: 140, radius: 38, range: 56, speed: 0.034, axis: 'x', color: '#6e2c00', wingColor: '#4a235a' },
        { x: 4020, y: 122, radius: 36, range: 50, speed: 0.038, phase: 1.4, axis: 'x', color: '#5d6d7e', wingColor: '#2c3e50' },
        { x: 4460, y: 152, radius: 40, range: 42, speed: 0.032, phase: 0.4, axis: 'x', color: '#7f8c8d', wingColor: '#566573' },
        { x: 5460, y: 136, radius: 36, range: 52, speed: 0.034, axis: 'x', color: '#6e2c00', wingColor: '#34495e' },
        { x: 6020, y: 154, radius: 40, range: 58, speed: 0.04, phase: 1.1, axis: 'x', color: '#5d6d7e', wingColor: '#2c3e50' },
        { x: 6480, y: 126, radius: 34, range: 40, speed: 0.032, phase: 2.2, axis: 'x', color: '#7f8c8d', wingColor: '#34495e' },
        { x: 7560, y: 144, radius: 38, range: 50, speed: 0.036, axis: 'x', color: '#6e2c00', wingColor: '#4a235a' },
        { x: 8160, y: 130, radius: 36, range: 48, speed: 0.034, phase: 0.8, axis: 'x', color: '#5d6d7e', wingColor: '#2c3e50' },
        { x: 8720, y: 156, radius: 40, range: 44, speed: 0.038, phase: 1.6, axis: 'x', color: '#7f8c8d', wingColor: '#566573' },
        { x: 9220, y: 134, radius: 34, range: 36, speed: 0.03, phase: 0.3, axis: 'x', color: '#6e2c00', wingColor: '#34495e' }
    ],
    frogs: [],
    obstacles: [
        { x: 980, y: 290, w: 220, h: 210, kind: 'branch', leaf: '#196f3d' },
        { x: 1160, y: 250, w: 220, h: 250, kind: 'branch', leaf: '#145a32' },
        { x: 2760, y: 270, w: 220, h: 230, kind: 'branch', leaf: '#0e6655' },
        { x: 2940, y: 230, w: 220, h: 270, kind: 'branch', leaf: '#196f3d' },
        { x: 4680, y: 260, w: 220, h: 240, kind: 'branch', leaf: '#145a32' },
        { x: 4860, y: 220, w: 220, h: 280, kind: 'branch', leaf: '#0e6655' },
        { x: 6760, y: 280, w: 220, h: 220, kind: 'branch', leaf: '#196f3d' },
        { x: 6940, y: 240, w: 220, h: 260, kind: 'branch', leaf: '#1e8449' }
    ],
    enemies: [],
    bigFruits: {
        easy: [{ x: 1270, y: 250, emoji: '🍉' }],
        normal: [{ x: 4970, y: 168, emoji: '🍉' }, { x: 2100, y: 210, emoji: '🍉' }],
        hard: [{ x: 4970, y: 108, emoji: '🍉' }, { x: 2000, y: 300, emoji: '🍉' }]
    },
    stars: {
        easy: [{ x: 1600, y: 180 }],
        normal: [{ x: 1600, y: 200 }],
        hard: [{ x: 1560, y: 240 }]
    },
    difficulties: {
        easy: {
            time: 54,
            boostFruits: 8,
            obstacles: [
                { x: 980, y: 340, w: 220, h: 160, kind: 'branch', leaf: '#27ae60' },
                { x: 1160, y: 310, w: 220, h: 190, kind: 'branch', leaf: '#1e8449' },
                { x: 2760, y: 330, w: 220, h: 170, kind: 'branch', leaf: '#27ae60' },
                { x: 2940, y: 300, w: 220, h: 200, kind: 'branch', leaf: '#196f3d' },
                { x: 4680, y: 320, w: 220, h: 180, kind: 'branch', leaf: '#1e8449' },
                { x: 4860, y: 290, w: 220, h: 210, kind: 'branch', leaf: '#27ae60' },
                { x: 6760, y: 340, w: 220, h: 160, kind: 'branch', leaf: '#1e8449' },
                { x: 6940, y: 310, w: 220, h: 190, kind: 'branch', leaf: '#196f3d' }
            ],
            birds: [
                { x: 520, y: 108, radius: 28, range: 28, speed: 0.022, axis: 'x', color: '#85929e', wingColor: '#5d6d7e' },
                { x: 1780, y: 116, radius: 30, range: 34, speed: 0.024, phase: 1, axis: 'x', color: '#aab7b8', wingColor: '#7f8c8d' },
                { x: 2360, y: 104, radius: 28, range: 30, speed: 0.022, phase: 2, axis: 'x', color: '#85929e', wingColor: '#5d6d7e' },
                { x: 3600, y: 112, radius: 30, range: 32, speed: 0.024, axis: 'x', color: '#aab7b8', wingColor: '#7f8c8d' },
                { x: 4300, y: 100, radius: 28, range: 28, speed: 0.02, phase: 0.7, axis: 'x', color: '#85929e', wingColor: '#5d6d7e' },
                { x: 5600, y: 118, radius: 30, range: 34, speed: 0.024, axis: 'x', color: '#aab7b8', wingColor: '#7f8c8d' },
                { x: 6400, y: 106, radius: 28, range: 30, speed: 0.022, phase: 1.5, axis: 'x', color: '#85929e', wingColor: '#5d6d7e' },
                { x: 7700, y: 114, radius: 30, range: 32, speed: 0.024, axis: 'x', color: '#aab7b8', wingColor: '#7f8c8d' },
                { x: 8600, y: 102, radius: 28, range: 28, speed: 0.02, phase: 0.4, axis: 'x', color: '#85929e', wingColor: '#5d6d7e' },
                { x: 9300, y: 120, radius: 30, range: 24, speed: 0.022, phase: 1.8, axis: 'x', color: '#aab7b8', wingColor: '#7f8c8d' }
            ]
        },
        hard: {
            time: 34,
            boostFruits: 12,
            obstacles: [
                { x: 980, y: 200, w: 220, h: 300, kind: 'branch', leaf: '#0e6655' },
                { x: 1160, y: 170, w: 220, h: 330, kind: 'branch', leaf: '#0b5345' },
                { x: 2760, y: 190, w: 220, h: 310, kind: 'branch', leaf: '#145a32' },
                { x: 2940, y: 155, w: 220, h: 345, kind: 'branch', leaf: '#0b5345' },
                { x: 4680, y: 180, w: 220, h: 320, kind: 'branch', leaf: '#0e6655' },
                { x: 4860, y: 150, w: 220, h: 350, kind: 'branch', leaf: '#0b5345' },
                { x: 6760, y: 200, w: 220, h: 300, kind: 'branch', leaf: '#145a32' },
                { x: 6940, y: 165, w: 220, h: 335, kind: 'branch', leaf: '#0e6655' }
            ],
            birds: [
                { x: 470, y: 188, radius: 42, range: 36, speed: 0.05, axis: 'x', color: '#4a235a', wingColor: '#1c2833' },
                { x: 790, y: 204, radius: 44, range: 30, speed: 0.054, phase: 1, axis: 'y', color: '#6e2c00', wingColor: '#4a235a' },
                { x: 1720, y: 196, radius: 46, range: 40, speed: 0.052, axis: 'x', color: '#1c2833', wingColor: '#4a235a' },
                { x: 2140, y: 210, radius: 44, range: 34, speed: 0.058, phase: 1.6, axis: 'y', color: '#6e2c00', wingColor: '#1c2833' },
                { x: 2500, y: 186, radius: 42, range: 32, speed: 0.05, phase: 0.5, axis: 'x', color: '#4a235a', wingColor: '#1c2833' },
                { x: 3480, y: 200, radius: 46, range: 42, speed: 0.056, axis: 'x', color: '#1c2833', wingColor: '#6e2c00' },
                { x: 4000, y: 214, radius: 44, range: 36, speed: 0.06, phase: 1.3, axis: 'y', color: '#6e2c00', wingColor: '#4a235a' },
                { x: 4440, y: 190, radius: 46, range: 30, speed: 0.052, phase: 0.2, axis: 'x', color: '#4a235a', wingColor: '#1c2833' },
                { x: 5440, y: 202, radius: 44, range: 40, speed: 0.056, axis: 'x', color: '#1c2833', wingColor: '#4a235a' },
                { x: 6000, y: 216, radius: 48, range: 38, speed: 0.062, phase: 1.1, axis: 'y', color: '#6e2c00', wingColor: '#1c2833' },
                { x: 6460, y: 188, radius: 42, range: 30, speed: 0.05, phase: 2, axis: 'x', color: '#4a235a', wingColor: '#1c2833' },
                { x: 7540, y: 206, radius: 46, range: 40, speed: 0.058, axis: 'x', color: '#1c2833', wingColor: '#6e2c00' },
                { x: 8140, y: 194, radius: 44, range: 36, speed: 0.054, phase: 0.9, axis: 'y', color: '#6e2c00', wingColor: '#4a235a' },
                { x: 8700, y: 212, radius: 48, range: 32, speed: 0.06, phase: 1.7, axis: 'x', color: '#4a235a', wingColor: '#1c2833' },
                { x: 9200, y: 184, radius: 42, range: 28, speed: 0.05, phase: 0.4, axis: 'x', color: '#1c2833', wingColor: '#4a235a' }
            ]
        }
    }
};
