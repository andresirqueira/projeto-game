// Bosque Profundo — um passo acima da Trilha.
// Bosques de árvores fecham o meio e obrigam a subir.
// Entre um bosque e outro, pássaros no alto obrigam a descer.
window.PASSAGE_LAYOUTS = window.PASSAGE_LAYOUTS || {};
window.PASSAGE_LAYOUTS['1-3'] = {
    length: 8600,
    time: 36,
    boostFruits: 8,
    fruits: [
        { x: 1040, y: 72, emoji: '🍎' },
        { x: 1240, y: 78, emoji: '🍎' },
        { x: 1620, y: 140, emoji: '🍊' },
        { x: 1860, y: 390, emoji: '🍎' },
        { x: 2240, y: 410, emoji: '🍎' },
        { x: 2580, y: 120, emoji: '🍎' },
        { x: 3120, y: 70, emoji: '🍒' },
        { x: 3380, y: 80, emoji: '🍎' },
        { x: 3720, y: 150, emoji: '🍎' },
        { x: 4000, y: 380, emoji: '🍊' },
        { x: 4380, y: 420, emoji: '🍎' },
        { x: 4780, y: 130, emoji: '🍎' },
        { x: 5220, y: 72, emoji: '🍎' },
        { x: 5440, y: 84, emoji: '🍎' },
        { x: 5780, y: 400, emoji: '🍊' },
        { x: 6080, y: 370, emoji: '🍎' },
        { x: 6480, y: 410, emoji: '🍎' },
        { x: 6820, y: 125, emoji: '🍎' },
        { x: 7300, y: 70, emoji: '🍒' },
        { x: 7480, y: 82, emoji: '🍎' },
        { x: 8000, y: 160, emoji: '🍎' },
        { x: 8350, y: 400, emoji: '🍎' }
    ],
    obstacles: [
        { x: 900, y: 235, w: 180, h: 265, kind: 'tree', leaf: '#196f3d' },
        { x: 1050, y: 160, w: 210, h: 340, kind: 'tree', leaf: '#145a32' },
        { x: 1230, y: 205, w: 180, h: 295, kind: 'tree', leaf: '#0e6655' },
        { x: 2860, y: 205, w: 180, h: 295, kind: 'tree', leaf: '#196f3d' },
        { x: 3010, y: 148, w: 210, h: 352, kind: 'tree', leaf: '#0e6655' },
        { x: 3190, y: 175, w: 190, h: 325, kind: 'tree', leaf: '#145a32' },
        { x: 3350, y: 215, w: 170, h: 285, kind: 'tree', leaf: '#1e8449' },
        { x: 5050, y: 200, w: 170, h: 300, kind: 'tree', leaf: '#196f3d' },
        { x: 5190, y: 150, w: 210, h: 350, kind: 'tree', leaf: '#0e6655' },
        { x: 5370, y: 180, w: 180, h: 320, kind: 'tree', leaf: '#145a32' },
        { x: 7120, y: 195, w: 170, h: 305, kind: 'tree', leaf: '#1e8449' },
        { x: 7260, y: 155, w: 200, h: 345, kind: 'tree', leaf: '#145a32' },
        { x: 7430, y: 190, w: 170, h: 310, kind: 'tree', leaf: '#0e6655' }
    ],
    birds: [
        { x: 1860, y: 94, radius: 44, range: 70, speed: 0.03, axis: 'x', color: '#5d6d7e', wingColor: '#34495e', beak: '#e67e22' },
        { x: 2240, y: 120, radius: 46, range: 60, speed: 0.034, axis: 'x', phase: 1.2, color: '#6b4f3a', wingColor: '#4a3728', beak: '#f1c40f' },
        { x: 4000, y: 88, radius: 44, range: 65, speed: 0.032, axis: 'x', phase: 0.6, color: '#1a5276', wingColor: '#154360', beak: '#e74c3c' },
        { x: 4380, y: 110, radius: 46, range: 55, speed: 0.036, axis: 'x', phase: 2, color: '#1c2833', wingColor: '#17202a', beak: '#f4d03f' },
        { x: 6080, y: 100, radius: 46, range: 55, speed: 0.034, axis: 'x', phase: 0.8, color: '#4a235a', wingColor: '#2c1654', beak: '#e67e22' },
        { x: 6480, y: 124, radius: 44, range: 40, speed: 0.038, axis: 'y', phase: 1.4, color: '#2c3e50', wingColor: '#1a252f', beak: '#e67e22' }
    ],
    frogs: [],
    enemies: [],
    bigFruits: {
        easy: [{ x: 3100, y: 190, emoji: '🍉' }],
        normal: [{ x: 3010, y: 100, emoji: '🍉' }, { x: 2240, y: 210, emoji: '🍉' }],
        hard: [{ x: 2960, y: 62, emoji: '🍉' }, { x: 2280, y: 260, emoji: '🍉' }]
    },
    stars: {
        easy: [{ x: 2500, y: 160 }],
        normal: [{ x: 4000, y: 200 }],
        hard: [{ x: 4000, y: 240 }]
    },
    difficulties: {
        easy: {
            time: 48,
            boostFruits: 6,
            obstacles: [
                { x: 940, y: 300, w: 140, h: 200, kind: 'tree', leaf: '#27ae60' },
                { x: 1100, y: 250, w: 160, h: 250, kind: 'tree', leaf: '#1e8449' },
                { x: 2920, y: 280, w: 150, h: 220, kind: 'tree', leaf: '#27ae60' },
                { x: 3100, y: 240, w: 170, h: 260, kind: 'tree', leaf: '#1e8449' },
                { x: 5120, y: 270, w: 150, h: 230, kind: 'tree', leaf: '#27ae60' },
                { x: 5300, y: 235, w: 160, h: 265, kind: 'tree', leaf: '#1e8449' },
                { x: 7200, y: 265, w: 150, h: 235, kind: 'tree', leaf: '#27ae60' },
                { x: 7380, y: 240, w: 160, h: 260, kind: 'tree', leaf: '#1e8449' }
            ],
            birds: [
                { x: 1900, y: 70, radius: 40, range: 30, speed: 0.016, axis: 'x', color: '#85929e', wingColor: '#5d6d7e', beak: '#f5cba7' },
                { x: 4200, y: 78, radius: 40, range: 28, speed: 0.018, axis: 'x', color: '#7f8c8d', wingColor: '#566573', beak: '#f5cba7' },
                { x: 6300, y: 74, radius: 40, range: 24, speed: 0.016, axis: 'y', color: '#85929e', wingColor: '#5d6d7e', beak: '#f1c40f' }
            ]
        },
        hard: {
            time: 28,
            boostFruits: 10,
            obstacles: [
                { x: 860, y: 180, w: 200, h: 320, kind: 'tree', leaf: '#0e6655' },
                { x: 1040, y: 108, w: 230, h: 392, kind: 'tree', leaf: '#0b5345' },
                { x: 1240, y: 155, w: 190, h: 345, kind: 'tree', leaf: '#145a32' },
                { x: 2780, y: 165, w: 190, h: 335, kind: 'tree', leaf: '#0e6655' },
                { x: 2960, y: 100, w: 240, h: 400, kind: 'tree', leaf: '#0b5345' },
                { x: 3180, y: 130, w: 210, h: 370, kind: 'tree', leaf: '#145a32' },
                { x: 3360, y: 170, w: 180, h: 330, kind: 'tree', leaf: '#0e6655' },
                { x: 4980, y: 160, w: 190, h: 340, kind: 'tree', leaf: '#145a32' },
                { x: 5150, y: 102, w: 240, h: 398, kind: 'tree', leaf: '#0b5345' },
                { x: 5360, y: 140, w: 200, h: 360, kind: 'tree', leaf: '#0e6655' },
                { x: 7050, y: 155, w: 190, h: 345, kind: 'tree', leaf: '#145a32' },
                { x: 7220, y: 105, w: 230, h: 395, kind: 'tree', leaf: '#0b5345' },
                { x: 7420, y: 145, w: 190, h: 355, kind: 'tree', leaf: '#0e6655' }
            ],
            birds: [
                { x: 1860, y: 150, radius: 48, range: 90, speed: 0.046, axis: 'x', color: '#2c3e50', wingColor: '#1a252f', beak: '#e74c3c' },
                { x: 2280, y: 162, radius: 48, range: 70, speed: 0.05, axis: 'x', phase: 0.8, color: '#3d2b1f', wingColor: '#2c1810', beak: '#e67e22' },
                { x: 4000, y: 146, radius: 48, range: 80, speed: 0.048, axis: 'x', phase: 1.4, color: '#1a5276', wingColor: '#154360', beak: '#e74c3c' },
                { x: 4420, y: 158, radius: 48, range: 60, speed: 0.052, axis: 'x', phase: 2.1, color: '#1c2833', wingColor: '#17202a', beak: '#f4d03f' },
                { x: 6080, y: 154, radius: 50, range: 65, speed: 0.05, axis: 'x', phase: 0.5, color: '#4a235a', wingColor: '#2c1654', beak: '#e67e22' },
                { x: 6520, y: 168, radius: 46, range: 42, speed: 0.054, axis: 'y', phase: 1.2, color: '#1a252f', wingColor: '#17202a', beak: '#e74c3c' }
            ]
        }
    }
};
