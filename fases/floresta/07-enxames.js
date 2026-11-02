// Enxames — abelhas e sapos no mesmo trecho, árvores com colmeia logo ao lado.
// Embaixo da nuvem o voo passa entre as abelhas e o pulo. Em seguida sobe na copa.
window.PASSAGE_LAYOUTS = window.PASSAGE_LAYOUTS || {};

(function () {
    const starts = [160, 1660, 3160, 4660, 6160, 7660, 9160];
    const emojis = ['🍎', '🍒', '🍊', '🍓'];
    let fruitIndex = 0;

    function fruit(x, y) {
        const item = { x: x, y: y, emoji: emojis[fruitIndex % emojis.length] };
        fruitIndex += 1;
        return item;
    }

    function swarms(first, second) {
        const list = [];
        starts.forEach(function (s, n) {
            [[s + 180, first], [s + 1200, second]].forEach(function (item, i) {
                const spec = item[1];
                list.push({
                    x: item[0],
                    y: spec.y,
                    radius: spec.radius,
                    range: spec.range,
                    speed: spec.speed + ((n + i) % 3) * 0.003,
                    axis: 'y',
                    phase: n * 0.8 + i * 1.3
                });
            });
        });
        return list;
    }

    function trees(topA, topB, wA, wB) {
        const leaves = ['#196f3d', '#145a32'];
        const list = [];
        starts.forEach(function (s) {
            [[s + 520, topA, wA, false], [s + 700, topB, wB, true]].forEach(function (item, i) {
                list.push({
                    x: item[0],
                    y: item[1],
                    w: item[2],
                    h: 500 - item[1],
                    kind: 'tree',
                    leaf: leaves[i],
                    hive: item[3]
                });
            });
        });
        return list;
    }

    function frogs(spec) {
        const list = [];
        starts.forEach(function (s, n) {
            const spots = spec.single
                ? [s + 180, s + 1200]
                : [s + 70, s + 300, s + 1090, s + 1320];
            spots.forEach(function (x, i) {
                const tune = spec.single ? spec : spec.pair[i % 2];
                list.push({
                    x: x,
                    y: tune.y,
                    radius: tune.radius,
                    range: tune.range,
                    speed: tune.speed,
                    hop: tune.hop,
                    phase: n * 0.5 + i * 0.35
                });
            });
        });
        return list;
    }

    const fruits = [];
    starts.forEach(function (s) {
        fruits.push(fruit(s + 180, 308));
        fruits.push(fruit(s + 570, 70));
        fruits.push(fruit(s + 760, 62));
        fruits.push(fruit(s + 1200, 312));
    });

    window.PASSAGE_LAYOUTS['1-7'] = {
        length: 11020,
        time: 50,
        boostFruits: 11,
        fruits: fruits,
        obstacles: trees(178, 162, 170, 190),
        birds: [],
        frogs: frogs({
            pair: [
                { y: 442, radius: 34, range: 68, speed: 0.042, hop: 24 },
                { y: 436, radius: 36, range: 74, speed: 0.046, hop: 28 }
            ]
        }),
        swarms: swarms(
            { y: 150, radius: 64, range: 44, speed: 0.036 },
            { y: 158, radius: 68, range: 42, speed: 0.04 }
        ),
        bigFruits: {
            easy: [{ x: 3340, y: 300, emoji: '🍉' }],
            normal: [{ x: 3340, y: 280, emoji: '🍉' }, { x: 3860, y: 110, emoji: '🍉' }],
            hard: [{ x: 3340, y: 300, emoji: '🍉' }, { x: 3860, y: 90, emoji: '🍉' }]
        },
        stars: {
            easy: [{ x: 340, y: 280 }],
            normal: [{ x: 340, y: 290 }],
            hard: [{ x: 340, y: 300 }]
        },
        difficulties: {
            easy: {
                time: 62,
                boostFruits: 9,
                obstacles: trees(214, 198, 150, 160),
                frogs: frogs({
                    single: true,
                    y: 452,
                    radius: 26,
                    range: 32,
                    speed: 0.03,
                    hop: 12
                }),
                swarms: swarms(
                    { y: 158, radius: 52, range: 42, speed: 0.024 },
                    { y: 164, radius: 54, range: 40, speed: 0.026 }
                )
            },
            hard: {
                time: 40,
                boostFruits: 13,
                obstacles: trees(156, 140, 190, 210),
                frogs: frogs({
                    pair: [
                        { y: 434, radius: 38, range: 86, speed: 0.05, hop: 24 },
                        { y: 428, radius: 40, range: 92, speed: 0.054, hop: 28 }
                    ]
                }),
                swarms: swarms(
                    { y: 146, radius: 74, range: 40, speed: 0.05 },
                    { y: 154, radius: 78, range: 38, speed: 0.054 }
                )
            }
        }
    };
})();
