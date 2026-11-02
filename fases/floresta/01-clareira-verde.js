// Clareira Verde — a fase abre no alto.
// Pássaro, depois sapo, depois pássaro. Os dois nunca dividem o mesmo trecho.
window.PASSAGE_LAYOUTS = window.PASSAGE_LAYOUTS || {};
window.PASSAGE_LAYOUTS['1-1'] = {
    length: 6800,
    time: 28,
    boostFruits: 6,
    fruits: [
        { x: 480, y: 250, emoji: '🍎' },
        { x: 680, y: 230, emoji: '🍎' },
        { x: 860, y: 210, emoji: '🍎' },
        { x: 1040, y: 195, emoji: '🍎' },
        { x: 1220, y: 180, emoji: '🍎' },
        { x: 1480, y: 220, emoji: '🍎' },
        { x: 1700, y: 400, emoji: '🍊' },
        { x: 1760, y: 300, emoji: '🍎' },
        { x: 2100, y: 270, emoji: '🍎' },
        { x: 2300, y: 240, emoji: '🍎' },
        { x: 2550, y: 210, emoji: '🍎' },
        { x: 2750, y: 200, emoji: '🍎' },
        { x: 3050, y: 220, emoji: '🍊' },
        { x: 3280, y: 190, emoji: '🍎' },
        { x: 3600, y: 210, emoji: '🍎' },
        { x: 3920, y: 230, emoji: '🍎' },
        { x: 4200, y: 240, emoji: '🍎' },
        { x: 4680, y: 245, emoji: '🍒' },
        { x: 5100, y: 200, emoji: '🍎' },
        { x: 5300, y: 220, emoji: '🍎' },
        { x: 5600, y: 120, emoji: '🍊' },
        { x: 5900, y: 250, emoji: '🍎' }
    ],
    obstacles: [],
    birds: [
        { x: 1760, y: 108, radius: 46, range: 90, speed: 0.03, axis: 'x', color: '#5d6d7e', wingColor: '#34495e', beak: '#e67e22' },
        { x: 4506, y: 88, radius: 44, range: 22, speed: 0.026, axis: 'y', color: '#6b4f3a', wingColor: '#4a3728', beak: '#f1c40f' }
    ],
    frogs: [
        { x: 3140, y: 448, radius: 34, range: 80, speed: 0.042, hop: 20 }
    ],
    enemies: [],
    bigFruits: {
        easy: [{ x: 3220, y: 360, emoji: '🍉' }],
        normal: [{ x: 1760, y: 210, emoji: '🍉' }, { x: 3140, y: 330, emoji: '🍉' }],
        hard: [{ x: 1680, y: 255, emoji: '🍉' }, { x: 3080, y: 310, emoji: '🍉' }]
    },
    stars: {
        easy: [{ x: 1480, y: 170 }],
        normal: [{ x: 1520, y: 200 }],
        hard: [{ x: 1400, y: 240 }]
    },
    difficulties: {
        easy: {
            time: 38,
            boostFruits: 4,
            birds: [
                { x: 1780, y: 70, radius: 42, range: 28, speed: 0.016, axis: 'x', color: '#85929e', wingColor: '#5d6d7e', beak: '#f5cba7' }
            ],
            frogs: [
                { x: 3220, y: 458, radius: 28, range: 36, speed: 0.028, hop: 10 }
            ]
        },
        hard: {
            time: 22,
            boostFruits: 8,
            birds: [
                { x: 1680, y: 150, radius: 50, range: 110, speed: 0.046, axis: 'x', color: '#2c3e50', wingColor: '#1a252f', beak: '#e74c3c' },
                { x: 2380, y: 132, radius: 46, range: 48, speed: 0.038, axis: 'y', phase: 1.2, color: '#3d2b1f', wingColor: '#2c1810', beak: '#e67e22' },
                { x: 4506, y: 118, radius: 50, range: 28, speed: 0.05, axis: 'y', phase: 0.6, color: '#1c2833', wingColor: '#17202a', beak: '#f4d03f' }
            ],
            frogs: [
                { x: 3080, y: 440, radius: 38, range: 90, speed: 0.055, hop: 32 },
                { x: 3680, y: 446, radius: 34, range: 60, speed: 0.05, hop: 24, phase: 1.4 }
            ]
        }
    }
};
