// Sombra da Coruja — noite de morcegos e cobras.
// De tempos em tempos a coruja cruza o céu.
// No ataque, uma sombra oval no chão marca onde ela desce e sobe.
window.PASSAGE_LAYOUTS = window.PASSAGE_LAYOUTS || {};

(function () {
    const emojis = ['🍎', '🍒', '🍊', '🍓'];
    let fruitIndex = 0;
    const leaves = ['#0e3b24', '#145a32', '#0b2e1c', '#196f3d'];
    const crowns = [
        { x: 720, top: 150, w: 160 },
        { x: 2480, top: 112, w: 180 },
        { x: 4680, top: 138, w: 170 },
        { x: 7120, top: 100, w: 190 },
        { x: 9480, top: 146, w: 160 },
        { x: 12040, top: 108, w: 180 }
    ];
    const batXs = [1280, 1960, 3200, 4000, 5480, 6400, 8000, 8800, 10400, 11240, 12900, 13640];
    const snakeXs = [1600, 3600, 5900, 8400, 10800, 13240];

    function fruit(x, y) {
        const item = { x: x, y: y, emoji: emojis[fruitIndex % emojis.length] };
        fruitIndex += 1;
        return item;
    }

    function crownList(shift) {
        return crowns.map(function (crown, i) {
            const top = crown.top + shift;
            return {
                x: crown.x,
                y: top,
                w: crown.w,
                h: 500 - top,
                kind: 'tree',
                leaf: leaves[i % leaves.length]
            };
        });
    }

    function bats(minY, maxY, speed) {
        return batXs.map(function (x, i) {
            const lift = i % 4 === 0 ? 34 : minY;
            const low = lift + (i % 3 - 1) * 8;
            const high = maxY + (i % 3 - 1) * 8;
            return {
                x: x,
                y: low + ((i % 4) * (high - low)) / 4,
                minY: low,
                maxY: high,
                speed: speed + (i % 3) * 0.12,
                dir: i % 2 === 0 ? 1 : -1,
                wing: i * 0.7
            };
        });
    }

    function snakes(strike, lunge, speed) {
        return snakeXs.map(function (x, i) {
            return {
                x: x,
                y: 466,
                strike: strike + (i % 3 - 1) * 8,
                lunge: lunge,
                speed: speed + (i % 2) * 0.004,
                radius: 16,
                phase: (i % 5) * 0.6,
                facing: i % 2 === 0 ? 1 : -1
            };
        });
    }

    function owl(warn, strike, gap) {
        return { warn: warn, strike: strike, gap: gap };
    }

    const fruits = [];
    crowns.forEach(function (crown) {
        fruits.push(fruit(crown.x + crown.w / 2, crown.top - 54));
    });
    batXs.forEach(function (x) { fruits.push(fruit(x, 418)); });
    snakeXs.forEach(function (x) { fruits.push(fruit(x, 78)); });

    window.PASSAGE_LAYOUTS['1-11'] = {
        length: 14400,
        time: 68,
        boostFruits: 15,
        fruits: fruits,
        obstacles: crownList(0),
        shadows: [],
        birds: [],
        frogs: [],
        enemies: bats(92, 246, 1.7),
        snakes: snakes(188, 24, 0.038),
        owl: owl(150, 34, 190),
        bigFruits: {
            easy: [{ x: 7215, y: 96, emoji: '🍉' }, { x: 12130, y: 104, emoji: '🍉' }],
            normal: [{ x: 7215, y: 64, emoji: '🍉' }, { x: 12130, y: 70, emoji: '🍉' }],
            hard: [{ x: 7215, y: 50, emoji: '🍉' }, { x: 12130, y: 56, emoji: '🍉' }]
        },
        stars: {
            easy: [{ x: 5100, y: 240 }],
            normal: [{ x: 5100, y: 200 }],
            hard: [{ x: 5100, y: 160 }]
        },
        difficulties: {
            easy: {
                time: 82,
                boostFruits: 13,
                obstacles: crownList(24),
                enemies: bats(70, 210, 1.2),
                snakes: snakes(120, 16, 0.026),
                owl: owl(200, 42, 260)
            },
            hard: {
                time: 54,
                boostFruits: 17,
                obstacles: crownList(-12),
                enemies: bats(110, 310, 2.2),
                snakes: snakes(230, 32, 0.05),
                owl: owl(110, 28, 130)
            }
        }
    };
})();
