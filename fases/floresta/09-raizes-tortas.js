// Raízes Tortas — mangue à noite. Raízes e garças entram sem ordem fixa.
// A garça sobe e desce no canal, cada uma com um mergulho diferente.
window.PASSAGE_LAYOUTS = window.PASSAGE_LAYOUTS || {};

(function () {
    const emojis = ['🍎', '🍒', '🍊', '🍓'];
    let fruitIndex = 0;
    const groves = [
        { xs: [460], peaks: [152] },
        { xs: [960, 1014, 1068], peaks: [184, 158, 176] },
        { xs: [2520, 2574, 2628, 2682, 2736, 2790], peaks: [190, 166, 148, 172, 156, 194] },
        { xs: [3180, 3234, 3288, 3342], peaks: [178, 150, 168, 188] },
        { xs: [4320], peaks: [196] },
        { xs: [5760, 5814, 5868, 5922], peaks: [170, 146, 182, 160] },
        { xs: [7920, 7974, 8028, 8082, 8136, 8190, 8244], peaks: [186, 162, 144, 174, 152, 190, 168] },
        { xs: [8720], peaks: [180] },
        { xs: [10200, 10254, 10308, 10362, 10416], peaks: [192, 158, 146, 170, 184] },
        { xs: [11440, 11494], peaks: [164, 188] }
    ];
    const heronSpots = [
        { x: 1580, y: 132, dive: 70, fruitY: 378 },
        { x: 2000, y: 158, dive: 96, fruitY: 400 },
        { x: 3820, y: 172, dive: 102, fruitY: 402 },
        { x: 4780, y: 128, dive: 62, fruitY: 372 },
        { x: 5220, y: 166, dive: 90, fruitY: 398 },
        { x: 6480, y: 146, dive: 74, fruitY: 384 },
        { x: 6920, y: 170, dive: 98, fruitY: 402 },
        { x: 7380, y: 124, dive: 78, fruitY: 376 },
        { x: 9280, y: 160, dive: 88, fruitY: 396 },
        { x: 9720, y: 138, dive: 66, fruitY: 380 },
        { x: 10920, y: 164, dive: 92, fruitY: 400 }
    ];

    function fruit(x, y) {
        const item = { x: x, y: y, emoji: emojis[fruitIndex % emojis.length] };
        fruitIndex += 1;
        return item;
    }

    function roots(delta) {
        const list = [];
        groves.forEach(function (grove, g) {
            grove.xs.forEach(function (x, i) {
                list.push({
                    x: x,
                    y: grove.peaks[i] + delta,
                    kind: 'root',
                    lean: (g + i) % 2 === 0 ? 1 : -1,
                    bend: 0.88 + ((g + i) % 3) * 0.1
                });
            });
        });
        return list;
    }

    function herons(diveScale, yShift, radius, speed) {
        return heronSpots.map(function (spot, i) {
            return {
                x: spot.x,
                y: spot.y + yShift,
                radius: radius,
                range: Math.round(spot.dive * diveScale),
                speed: speed + (i % 3) * 0.014,
                axis: 'y',
                phase: (i * 1.7) % 6.2,
                kind: 'heron',
                color: '#f7f9f9',
                wingColor: '#95a5a6',
                beak: '#f4d03f'
            };
        });
    }

    const fruits = [];
    groves.forEach(function (grove) {
        let tall = 0;
        let short = 0;
        grove.peaks.forEach(function (peak, i) {
            if (peak < grove.peaks[tall]) tall = i;
            if (peak > grove.peaks[short]) short = i;
        });
        fruits.push(fruit(grove.xs[tall], 58 + (grove.xs.length % 3) * 4));
        if (grove.xs.length > 1 && short !== tall) fruits.push(fruit(grove.xs[short], 76));
    });
    heronSpots.forEach(function (spot) { fruits.push(fruit(spot.x, spot.fruitY)); });

    window.PASSAGE_LAYOUTS['1-9'] = {
        length: 12160,
        time: 56,
        boostFruits: 13,
        swamp: true,
        fruits: fruits,
        obstacles: roots(0),
        birds: herons(1, 0, 34, 0.052),
        frogs: [],
        enemies: [],
        snakes: [],
        bigFruits: {
            easy: [{ x: 3820, y: 340, emoji: '🍉' }, { x: 8028, y: 120, emoji: '🍉' }],
            normal: [{ x: 3820, y: 368, emoji: '🍉' }, { x: 8028, y: 78, emoji: '🍉' }],
            hard: [{ x: 3820, y: 392, emoji: '🍉' }, { x: 8028, y: 70, emoji: '🍉' }]
        },
        stars: {
            easy: [{ x: 7600, y: 140 }],
            normal: [{ x: 7600, y: 110 }],
            hard: [{ x: 7600, y: 90 }]
        },
        difficulties: {
            easy: {
                time: 68,
                boostFruits: 11,
                obstacles: roots(30),
                birds: herons(0.62, -8, 32, 0.036)
            },
            hard: {
                time: 44,
                boostFruits: 15,
                obstacles: roots(-12),
                birds: herons(1.18, 8, 40, 0.07)
            }
        }
    };
})();
