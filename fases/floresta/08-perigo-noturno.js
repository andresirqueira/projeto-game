// Perigo Noturno — morcegos, cobras e árvores espalhados, sem alternar um a um.
// O morcego pede descer, a cobra pede subir, a árvore pede passar por cima da copa.
window.PASSAGE_LAYOUTS = window.PASSAGE_LAYOUTS || {};

(function () {
    const emojis = ['🍎', '🍒', '🍊', '🍓'];
    let fruitIndex = 0;
    const batXs = [460, 820, 1980, 3480, 4680, 5750, 6680, 7920, 9780, 10820];
    const snakeXs = [2500, 3050, 5200, 6200, 8480, 10340];
    const treeXs = [1220, 1400, 3920, 4100, 7160, 7340, 9040, 9220];

    function fruit(x, y) {
        const item = { x: x, y: y, emoji: emojis[fruitIndex % emojis.length] };
        fruitIndex += 1;
        return item;
    }

    function bats(minY, maxY, speed) {
        return batXs.map(function (x, i) {
            const shift = (i % 3 - 1) * 16;
            const low = minY + shift;
            const high = maxY + shift;
            return {
                x: x,
                y: low + ((i % 4) * (high - low)) / 4,
                minY: low,
                maxY: high,
                speed: speed + (i % 3) * 0.15,
                dir: i % 2 === 0 ? 1 : -1,
                wing: i * 0.8
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
                speed: speed + (i % 2) * 0.006,
                radius: 16,
                phase: (i % 5) * 0.7,
                facing: i % 2 === 0 ? 1 : -1
            };
        });
    }

    function trees(tops, widths) {
        const leaves = ['#0e3b24', '#145a32', '#0b2e1c', '#196f3d'];
        return treeXs.map(function (x, i) {
            return {
                x: x,
                y: tops[i],
                w: widths[i],
                h: 500 - tops[i],
                kind: 'tree',
                leaf: leaves[i % leaves.length]
            };
        });
    }

    const fruits = [];
    batXs.forEach(function (x) { fruits.push(fruit(x, 418)); });
    snakeXs.forEach(function (x) { fruits.push(fruit(x, 86)); });
    treeXs.forEach(function (x, i) { fruits.push(fruit(x + 50, i % 2 === 0 ? 68 : 58)); });

    window.PASSAGE_LAYOUTS['1-8'] = {
        length: 11600,
        time: 54,
        boostFruits: 12,
        fruits: fruits,
        obstacles: trees(
            [186, 162, 178, 154, 174, 156, 182, 158],
            [170, 200, 160, 190, 180, 190, 160, 180]
        ),
        birds: [],
        frogs: [],
        enemies: bats(88, 240, 1.8),
        snakes: snakes(196, 26, 0.04),
        bigFruits: {
            easy: [{ x: 3480, y: 360, emoji: '🍉' }, { x: 5200, y: 250, emoji: '🍉' }],
            normal: [{ x: 3480, y: 340, emoji: '🍉' }, { x: 5200, y: 160, emoji: '🍉' }],
            hard: [{ x: 3480, y: 390, emoji: '🍉' }, { x: 5200, y: 120, emoji: '🍉' }]
        },
        stars: {
            easy: [{ x: 2300, y: 220 }],
            normal: [{ x: 2300, y: 200 }],
            hard: [{ x: 2300, y: 170 }]
        },
        difficulties: {
            easy: {
                time: 66,
                boostFruits: 10,
                obstacles: trees(
                    [218, 196, 212, 188, 208, 186, 214, 192],
                    [150, 170, 150, 160, 160, 170, 150, 160]
                ),
                enemies: bats(64, 228, 1.3),
                snakes: snakes(110, 16, 0.028)
            },
            hard: {
                time: 42,
                boostFruits: 14,
                obstacles: trees(
                    [154, 136, 148, 132, 146, 130, 150, 134],
                    [190, 210, 180, 200, 190, 200, 180, 190]
                ),
                enemies: bats(110, 300, 2.3),
                snakes: snakes(236, 34, 0.052)
            }
        }
    };
})();
