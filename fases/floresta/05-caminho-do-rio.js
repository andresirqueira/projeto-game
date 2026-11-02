// Caminho do Rio — o voo acompanha a água.
// Peixes pulam, sapos pousam e pulam, e a cachoeira é o rio subindo:
// o caminho estreita, sobe com a água e desce de novo.
window.PASSAGE_LAYOUTS = window.PASSAGE_LAYOUTS || {};
window.PASSAGE_LAYOUTS['1-5'] = {
    length: 9800,
    time: 40,
    boostFruits: 9,
    river: true,
    fruits: [
        { x: 1000, y: 86, emoji: '🍎' },
        { x: 1200, y: 84, emoji: '🍊' },
        { x: 1400, y: 90, emoji: '🍎' },
        { x: 1680, y: 350, emoji: '🍎' },
        { x: 2200, y: 170, emoji: '🍎' },
        { x: 2480, y: 180, emoji: '🍒' },
        { x: 3550, y: 96, emoji: '🍎' },
        { x: 4360, y: 340, emoji: '🍎' },
        { x: 4560, y: 88, emoji: '🍎' },
        { x: 4980, y: 92, emoji: '🍊' },
        { x: 5200, y: 350, emoji: '🍎' },
        { x: 5480, y: 165, emoji: '🍎' },
        { x: 5760, y: 175, emoji: '🍎' },
        { x: 6810, y: 96, emoji: '🍒' },
        { x: 7620, y: 350, emoji: '🍎' },
        { x: 7800, y: 86, emoji: '🍎' },
        { x: 8240, y: 90, emoji: '🍊' },
        { x: 8520, y: 350, emoji: '🍎' },
        { x: 8860, y: 170, emoji: '🍎' },
        { x: 9320, y: 200, emoji: '🍎' },
        { x: 9560, y: 340, emoji: '🍎' }
    ],
    obstacles: [],
    birds: [],
    frogs: [
        { x: 2100, y: 400, radius: 30, range: 46, speed: 0.04, hop: 24, color: '#1e8449', belly: '#f7dc6f' },
        { x: 2340, y: 406, radius: 28, range: 40, speed: 0.046, hop: 20, phase: 1.2, color: '#196f3d', belly: '#f9e79f' },
        { x: 2580, y: 398, radius: 32, range: 50, speed: 0.042, hop: 26, phase: 2.1, color: '#27ae60', belly: '#f7dc6f' },
        { x: 5360, y: 404, radius: 30, range: 44, speed: 0.044, hop: 22, color: '#1e8449', belly: '#f9e79f' },
        { x: 5620, y: 396, radius: 32, range: 48, speed: 0.04, hop: 28, phase: 0.8, color: '#145a32', belly: '#f7dc6f' },
        { x: 5880, y: 408, radius: 28, range: 36, speed: 0.048, hop: 18, phase: 1.8, color: '#196f3d', belly: '#f9e79f' },
        { x: 8720, y: 402, radius: 30, range: 42, speed: 0.042, hop: 22, color: '#27ae60', belly: '#f7dc6f' },
        { x: 8980, y: 396, radius: 28, range: 38, speed: 0.046, hop: 24, phase: 1.4, color: '#1e8449', belly: '#f9e79f' }
    ],
    fishes: [
        { x: 900, jump: 200, speed: 0.04, phase: 0, color: '#e67e22', belly: '#f5cba7' },
        { x: 1100, jump: 230, speed: 0.046, phase: 1.7, color: '#85929e', belly: '#d5d8dc' },
        { x: 1300, jump: 190, speed: 0.042, phase: 3, color: '#1abc9c', belly: '#a3e4d7' },
        { x: 1500, jump: 240, speed: 0.05, phase: 0.6, color: '#e67e22', belly: '#fdebd0' },
        { x: 4440, jump: 210, speed: 0.044, phase: 0.4, color: '#85929e', belly: '#d5d8dc' },
        { x: 4660, jump: 240, speed: 0.05, phase: 2, color: '#e74c3c', belly: '#f5b7b1' },
        { x: 4880, jump: 200, speed: 0.042, phase: 1.1, color: '#1abc9c', belly: '#a3e4d7' },
        { x: 5100, jump: 230, speed: 0.048, phase: 2.8, color: '#e67e22', belly: '#f5cba7' },
        { x: 7700, jump: 220, speed: 0.046, phase: 0.2, color: '#e67e22', belly: '#fdebd0' },
        { x: 7920, jump: 250, speed: 0.052, phase: 1.6, color: '#85929e', belly: '#d5d8dc' },
        { x: 8140, jump: 200, speed: 0.044, phase: 3.1, color: '#1abc9c', belly: '#a3e4d7' },
        { x: 8360, jump: 240, speed: 0.05, phase: 0.9, color: '#e74c3c', belly: '#f5b7b1' }
    ],
    falls: [
        { x0: 2860, x1: 3420, x2: 3680, x3: 4240, top: 158, ceil: 42 },
        { x0: 6120, x1: 6680, x2: 6940, x3: 7500, top: 158, ceil: 42 }
    ],
    enemies: [],
    bigFruits: {
        easy: [{ x: 3480, y: 70, emoji: '🍉' }],
        normal: [{ x: 3480, y: 118, emoji: '🍉' }, { x: 6740, y: 118, emoji: '🍉' }],
        hard: [{ x: 3480, y: 110, emoji: '🍉' }, { x: 6740, y: 110, emoji: '🍉' }]
    },
    stars: {
        easy: [{ x: 2700, y: 240 }],
        normal: [{ x: 2700, y: 220 }],
        hard: [{ x: 2680, y: 180 }]
    },
    difficulties: {
        easy: {
            time: 52,
            boostFruits: 7,
            frogs: [
                { x: 2200, y: 430, radius: 26, range: 24, speed: 0.028, hop: 12, color: '#27ae60', belly: '#f7dc6f' },
                { x: 5480, y: 428, radius: 26, range: 22, speed: 0.03, hop: 10, color: '#1e8449', belly: '#f9e79f' },
                { x: 8800, y: 432, radius: 24, range: 20, speed: 0.026, hop: 8, color: '#27ae60', belly: '#f7dc6f' }
            ],
            fishes: [
                { x: 940, jump: 130, speed: 0.028, phase: 0.4, color: '#f5b041', belly: '#fdebd0' },
                { x: 1220, jump: 150, speed: 0.03, phase: 1.8, color: '#85929e', belly: '#d5d8dc' },
                { x: 4480, jump: 140, speed: 0.028, phase: 0.6, color: '#1abc9c', belly: '#a3e4d7' },
                { x: 4920, jump: 160, speed: 0.032, phase: 2.2, color: '#f5b041', belly: '#fdebd0' },
                { x: 7760, jump: 145, speed: 0.03, phase: 1, color: '#85929e', belly: '#d5d8dc' }
            ],
            falls: [
                { x0: 2860, x1: 3420, x2: 3680, x3: 4240, top: 210, ceil: 16 },
                { x0: 6120, x1: 6680, x2: 6940, x3: 7500, top: 210, ceil: 16 }
            ]
        },
        hard: {
            time: 32,
            boostFruits: 11,
            frogs: [
                { x: 2080, y: 390, radius: 34, range: 60, speed: 0.055, hop: 40, color: '#0e6655', belly: '#f7dc6f' },
                { x: 2360, y: 386, radius: 36, range: 55, speed: 0.06, hop: 44, phase: 1, color: '#145a32', belly: '#f9e79f' },
                { x: 2620, y: 392, radius: 34, range: 50, speed: 0.052, hop: 36, phase: 2, color: '#0e6655', belly: '#f7dc6f' },
                { x: 5340, y: 388, radius: 36, range: 58, speed: 0.058, hop: 42, color: '#145a32', belly: '#f9e79f' },
                { x: 5620, y: 384, radius: 34, range: 52, speed: 0.054, hop: 38, phase: 1.3, color: '#0e6655', belly: '#f7dc6f' },
                { x: 5880, y: 390, radius: 32, range: 46, speed: 0.06, hop: 34, phase: 0.5, color: '#196f3d', belly: '#f9e79f' },
                { x: 8700, y: 386, radius: 34, range: 48, speed: 0.056, hop: 40, color: '#0e6655', belly: '#f7dc6f' },
                { x: 8960, y: 390, radius: 32, range: 44, speed: 0.052, hop: 36, phase: 1.6, color: '#145a32', belly: '#f9e79f' }
            ],
            fishes: [
                { x: 900, jump: 270, speed: 0.058, phase: 0.2, radius: 20, color: '#d35400', belly: '#f5cba7' },
                { x: 1100, jump: 290, speed: 0.064, phase: 1.5, radius: 20, color: '#5d6d7e', belly: '#d5d8dc' },
                { x: 1300, jump: 260, speed: 0.06, phase: 2.8, radius: 18, color: '#117a65', belly: '#a3e4d7' },
                { x: 1500, jump: 300, speed: 0.066, phase: 0.7, radius: 20, color: '#c0392b', belly: '#f5b7b1' },
                { x: 4440, jump: 280, speed: 0.06, phase: 0.3, radius: 20, color: '#d35400', belly: '#fdebd0' },
                { x: 4660, jump: 300, speed: 0.068, phase: 1.9, radius: 20, color: '#5d6d7e', belly: '#d5d8dc' },
                { x: 4880, jump: 270, speed: 0.062, phase: 3.2, radius: 18, color: '#117a65', belly: '#a3e4d7' },
                { x: 5100, jump: 290, speed: 0.064, phase: 0.9, radius: 20, color: '#c0392b', belly: '#f5b7b1' },
                { x: 7700, jump: 280, speed: 0.062, phase: 0.4, radius: 20, color: '#d35400', belly: '#f5cba7' },
                { x: 7920, jump: 310, speed: 0.07, phase: 1.7, radius: 20, color: '#5d6d7e', belly: '#d5d8dc' },
                { x: 8140, jump: 270, speed: 0.06, phase: 2.6, radius: 18, color: '#117a65', belly: '#a3e4d7' },
                { x: 8360, jump: 300, speed: 0.066, phase: 0.8, radius: 20, color: '#c0392b', belly: '#f5b7b1' }
            ],
            falls: [
                { x0: 2860, x1: 3420, x2: 3680, x3: 4240, top: 136, ceil: 58 },
                { x0: 6120, x1: 6680, x2: 6940, x3: 7500, top: 136, ceil: 58 }
            ]
        }
    }
};
