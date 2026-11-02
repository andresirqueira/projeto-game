// Trilha dos Pássaros — o bando grande fica no alto e um bando menor voa embaixo.
// As frutas ficam no alto ou rente ao chão, fora do meio, para o voo reto não levar todas.
window.PASSAGE_LAYOUTS = window.PASSAGE_LAYOUTS || {};
window.PASSAGE_LAYOUTS['1-2'] = {
    length: 7600,
    time: 32,
    boostFruits: 7,
    fruits: [
        { x: 420, y: 140, emoji: '🍎' },
        { x: 500, y: 410, emoji: '🍎' },
        { x: 680, y: 125, emoji: '🍊' },
        { x: 1350, y: 150, emoji: '🍎' },
        { x: 1580, y: 415, emoji: '🍎' },
        { x: 1700, y: 135, emoji: '🍎' },
        { x: 2250, y: 145, emoji: '🍒' },
        { x: 2480, y: 405, emoji: '🍎' },
        { x: 2600, y: 420, emoji: '🍊' },
        { x: 3150, y: 130, emoji: '🍎' },
        { x: 3400, y: 410, emoji: '🍎' },
        { x: 3500, y: 150, emoji: '🍎' },
        { x: 4050, y: 140, emoji: '🍎' },
        { x: 4300, y: 420, emoji: '🍊' },
        { x: 4400, y: 128, emoji: '🍎' },
        { x: 4950, y: 155, emoji: '🍎' },
        { x: 5200, y: 408, emoji: '🍎' },
        { x: 5300, y: 140, emoji: '🍎' },
        { x: 5850, y: 132, emoji: '🍒' },
        { x: 6100, y: 418, emoji: '🍎' },
        { x: 6000, y: 400, emoji: '🍎' },
        { x: 6750, y: 148, emoji: '🍎' },
        { x: 6950, y: 412, emoji: '🍊' },
        { x: 7300, y: 136, emoji: '🍎' },
        { x: 7420, y: 400, emoji: '🍎' }
    ],
    obstacles: [],
    birds: [
        { x: 1000, y: 98, radius: 46, range: 70, speed: 0.028, axis: 'x', color: '#5d6d7e', wingColor: '#34495e', beak: '#e67e22' },
        { x: 1080, y: 378, radius: 28, range: 60, speed: 0.04, axis: 'x', phase: 1.4, color: '#e67e22', wingColor: '#d35400', beak: '#f9e79f' },
        { x: 1900, y: 132, radius: 46, range: 78, speed: 0.032, axis: 'x', phase: 0.7, color: '#6b4f3a', wingColor: '#4a3728', beak: '#f1c40f' },
        { x: 1980, y: 386, radius: 30, range: 64, speed: 0.042, axis: 'x', phase: 2.1, color: '#e74c3c', wingColor: '#922b21', beak: '#f7dc6f' },
        { x: 2800, y: 108, radius: 44, range: 58, speed: 0.03, axis: 'x', phase: 1.1, color: '#1a5276', wingColor: '#154360', beak: '#e74c3c' },
        { x: 2880, y: 370, radius: 28, range: 52, speed: 0.038, axis: 'x', color: '#16a085', wingColor: '#0e6655', beak: '#f5cba7' },
        { x: 3700, y: 96, radius: 44, range: 54, speed: 0.03, axis: 'x', phase: 2.4, color: '#7b241c', wingColor: '#641e16', beak: '#f5b041' },
        { x: 3780, y: 382, radius: 26, range: 66, speed: 0.044, axis: 'x', phase: 0.5, color: '#f39c12', wingColor: '#b9770e', beak: '#fdebd0' },
        { x: 4600, y: 122, radius: 46, range: 50, speed: 0.034, axis: 'x', phase: 1.8, color: '#1c2833', wingColor: '#17202a', beak: '#f4d03f' },
        { x: 4680, y: 374, radius: 28, range: 48, speed: 0.04, axis: 'x', phase: 2.8, color: '#d35400', wingColor: '#a04000', beak: '#fdebd0' },
        { x: 5500, y: 104, radius: 44, range: 46, speed: 0.032, axis: 'y', phase: 0.4, color: '#4a235a', wingColor: '#2c1654', beak: '#e67e22' },
        { x: 5580, y: 388, radius: 26, range: 44, speed: 0.042, axis: 'x', phase: 1.2, color: '#c0392b', wingColor: '#7b241c', beak: '#f5b041' },
        { x: 6400, y: 116, radius: 46, range: 42, speed: 0.036, axis: 'x', phase: 0.9, color: '#2c3e50', wingColor: '#1a252f', beak: '#e67e22' },
        { x: 6480, y: 376, radius: 28, range: 40, speed: 0.04, axis: 'x', phase: 2.2, color: '#1abc9c', wingColor: '#148f77', beak: '#fdebd0' },
        { x: 7200, y: 100, radius: 44, range: 36, speed: 0.034, axis: 'y', color: '#6b4f3a', wingColor: '#4a3728', beak: '#f1c40f' },
        { x: 7120, y: 384, radius: 26, range: 34, speed: 0.046, axis: 'x', phase: 0.6, color: '#e74c3c', wingColor: '#922b21', beak: '#f7dc6f' }
    ],
    frogs: [],
    enemies: [],
    bigFruits: {
        easy: [{ x: 1440, y: 180, emoji: '🍉' }],
        normal: [{ x: 1040, y: 210, emoji: '🍉' }, { x: 4640, y: 300, emoji: '🍉' }],
        hard: [{ x: 1040, y: 295, emoji: '🍉' }, { x: 4640, y: 290, emoji: '🍉' }]
    },
    stars: {
        easy: [{ x: 2840, y: 240 }],
        normal: [{ x: 3740, y: 250 }],
        hard: [{ x: 3740, y: 290 }]
    },
    difficulties: {
        easy: {
            time: 42,
            boostFruits: 5,
            birds: [
                { x: 1400, y: 72, radius: 40, range: 36, speed: 0.016, axis: 'x', color: '#85929e', wingColor: '#5d6d7e', beak: '#f5cba7' },
                { x: 1480, y: 430, radius: 22, range: 28, speed: 0.026, axis: 'x', phase: 1, color: '#f5b041', wingColor: '#d68910', beak: '#fdebd0' },
                { x: 2800, y: 88, radius: 42, range: 40, speed: 0.018, axis: 'x', phase: 0.8, color: '#7f8c8d', wingColor: '#566573', beak: '#f5cba7' },
                { x: 2880, y: 424, radius: 24, range: 30, speed: 0.028, axis: 'x', color: '#f0b27a', wingColor: '#dc7633', beak: '#fdebd0' },
                { x: 4600, y: 76, radius: 40, range: 24, speed: 0.016, axis: 'x', color: '#6b4f3a', wingColor: '#4a3728', beak: '#f1c40f' },
                { x: 4680, y: 428, radius: 22, range: 22, speed: 0.024, axis: 'x', phase: 1.5, color: '#f5cba7', wingColor: '#e59866', beak: '#fdebd0' },
                { x: 6600, y: 80, radius: 40, range: 24, speed: 0.016, axis: 'y', color: '#85929e', wingColor: '#5d6d7e', beak: '#f5cba7' },
                { x: 6680, y: 432, radius: 22, range: 20, speed: 0.024, axis: 'x', color: '#f8c471', wingColor: '#e67e22', beak: '#fdebd0' }
            ],
            frogs: []
        },
        hard: {
            time: 26,
            boostFruits: 9,
            birds: [
                { x: 1000, y: 186, radius: 48, range: 64, speed: 0.044, axis: 'x', color: '#2c3e50', wingColor: '#1a252f', beak: '#e74c3c' },
                { x: 1080, y: 388, radius: 32, range: 48, speed: 0.056, axis: 'x', phase: 1.2, color: '#e74c3c', wingColor: '#7b241c', beak: '#f5b041' },
                { x: 1900, y: 186, radius: 48, range: 70, speed: 0.048, axis: 'x', phase: 0.6, color: '#3d2b1f', wingColor: '#2c1810', beak: '#e67e22' },
                { x: 1980, y: 390, radius: 32, range: 52, speed: 0.058, axis: 'x', phase: 2, color: '#d35400', wingColor: '#a04000', beak: '#fdebd0' },
                { x: 2800, y: 178, radius: 46, range: 50, speed: 0.046, axis: 'y', phase: 1.1, color: '#1a5276', wingColor: '#154360', beak: '#e74c3c' },
                { x: 2880, y: 386, radius: 30, range: 44, speed: 0.054, axis: 'x', color: '#117a65', wingColor: '#0e6655', beak: '#f5cba7' },
                { x: 3700, y: 186, radius: 48, range: 48, speed: 0.05, axis: 'x', phase: 2.2, color: '#7b241c', wingColor: '#641e16', beak: '#e74c3c' },
                { x: 3780, y: 392, radius: 32, range: 50, speed: 0.06, axis: 'x', phase: 0.4, color: '#b9770e', wingColor: '#7d6608', beak: '#f9e79f' },
                { x: 4600, y: 184, radius: 48, range: 42, speed: 0.048, axis: 'x', phase: 1.6, color: '#1c2833', wingColor: '#17202a', beak: '#f4d03f' },
                { x: 4680, y: 388, radius: 30, range: 40, speed: 0.056, axis: 'x', phase: 2.6, color: '#c0392b', wingColor: '#7b241c', beak: '#f5b041' },
                { x: 5500, y: 180, radius: 46, range: 40, speed: 0.05, axis: 'y', phase: 0.5, color: '#4a235a', wingColor: '#2c1654', beak: '#e67e22' },
                { x: 5580, y: 390, radius: 30, range: 36, speed: 0.058, axis: 'x', phase: 1.1, color: '#e67e22', wingColor: '#ca6f1e', beak: '#fdebd0' },
                { x: 6400, y: 186, radius: 48, range: 36, speed: 0.052, axis: 'x', phase: 0.8, color: '#1a252f', wingColor: '#17202a', beak: '#e74c3c' },
                { x: 6480, y: 388, radius: 32, range: 34, speed: 0.06, axis: 'x', phase: 2.1, color: '#0e6655', wingColor: '#0b5345', beak: '#f5cba7' },
                { x: 7200, y: 182, radius: 48, range: 32, speed: 0.05, axis: 'y', color: '#2c3e50', wingColor: '#1a252f', beak: '#f5b041' },
                { x: 7120, y: 392, radius: 30, range: 30, speed: 0.058, axis: 'x', phase: 0.7, color: '#922b21', wingColor: '#641e16', beak: '#f7dc6f' }
            ],
            frogs: []
        }
    }
};
