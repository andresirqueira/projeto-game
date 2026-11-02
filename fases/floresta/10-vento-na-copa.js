// Vento na Copa — o voo é entre as copas.
// A rajada empurra para cima ou para baixo. A copa seguinte pede mudar de altura.
// Nos vãos, um pássaro sobe e desce, carregado pelo vento.
window.PASSAGE_LAYOUTS = window.PASSAGE_LAYOUTS || {};

(function () {
    const emojis = ['🍎', '🍒', '🍊', '🍓'];
    let fruitIndex = 0;
    const leaves = ['#196f3d', '#145a32', '#1e8449', '#0e6655'];
    const crowns = [
        { x: 480, top: 118, w: 160 },
        { x: 840, top: 164, w: 150 },
        { x: 2280, top: 96, w: 180 },
        { x: 2720, top: 150, w: 150 },
        { x: 4400, top: 108, w: 170 },
        { x: 4860, top: 172, w: 140 },
        { x: 6420, top: 90, w: 190 },
        { x: 8080, top: 136, w: 160 },
        { x: 8520, top: 104, w: 170 },
        { x: 10120, top: 118, w: 180 },
        { x: 11680, top: 156, w: 150 },
        { x: 12160, top: 96, w: 170 }
    ];
    const blows = [
        { x: 1240, w: 300, y: 46, h: 150, force: -3.2 },
        { x: 1780, w: 260, y: 300, h: 155, force: 3.3 },
        { x: 3220, w: 340, y: 40, h: 168, force: -3.5 },
        { x: 3760, w: 280, y: 286, h: 165, force: 3.4 },
        { x: 5520, w: 380, y: 36, h: 176, force: -3.8 },
        { x: 7080, w: 300, y: 292, h: 160, force: 3.5 },
        { x: 9160, w: 340, y: 48, h: 162, force: -3.6 },
        { x: 10880, w: 300, y: 274, h: 175, force: 3.6 }
    ];

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

    function gustList(scale, grow) {
        return blows.map(function (gust) {
            return {
                x: gust.x,
                y: gust.y - grow,
                w: gust.w,
                h: gust.h + grow * 2,
                force: Math.round(gust.force * scale * 10) / 10
            };
        });
    }

    const riders = [
        { x: 2160, y: 188, radius: 34, range: 46, speed: 0.042, phase: 0.3, color: '#1a5276', wingColor: '#154360', beak: '#f4d03f' },
        { x: 2590, y: 246, radius: 36, range: 52, speed: 0.038, phase: 1.6, color: '#1c2833', wingColor: '#17202a', beak: '#e67e22' },
        { x: 3040, y: 210, radius: 42, range: 74, speed: 0.046, phase: 0.8, color: '#2c3e50', wingColor: '#1a252f', beak: '#f4d03f' },
        { x: 4220, y: 268, radius: 44, range: 68, speed: 0.044, phase: 2.1, color: '#6b4f3a', wingColor: '#4a3728', beak: '#e67e22' },
        { x: 6160, y: 186, radius: 42, range: 48, speed: 0.05, phase: 0.5, color: '#1a5276', wingColor: '#154360', beak: '#f1c40f' },
        { x: 6840, y: 204, radius: 40, range: 70, speed: 0.042, phase: 1.2, color: '#4a235a', wingColor: '#2c1654', beak: '#e67e22' },
        { x: 7620, y: 286, radius: 40, range: 58, speed: 0.04, phase: 2.4, color: '#1e8449', wingColor: '#145a32', beak: '#f4d03f' },
        { x: 7940, y: 178, radius: 38, range: 40, speed: 0.048, phase: 0.2, color: '#1c2833', wingColor: '#17202a', beak: '#f1c40f' },
        { x: 8920, y: 224, radius: 42, range: 72, speed: 0.044, phase: 1.5, color: '#2c3e50', wingColor: '#1a252f', beak: '#e74c3c' },
        { x: 9820, y: 184, radius: 42, range: 44, speed: 0.05, phase: 0.9, color: '#1a5276', wingColor: '#154360', beak: '#f4d03f' },
        { x: 10590, y: 238, radius: 42, range: 66, speed: 0.042, phase: 1.8, color: '#6b4f3a', wingColor: '#4a3728', beak: '#e67e22' },
        { x: 11420, y: 274, radius: 40, range: 56, speed: 0.046, phase: 2.6, color: '#1c2833', wingColor: '#17202a', beak: '#f4d03f' }
    ];

    function windBirds(mode) {
        const hard = mode === 'hard';
        const easy = mode === 'easy';
        return riders.map(function (bird) {
            return {
                x: bird.x,
                y: bird.y,
                radius: Math.max(28, bird.radius + (hard ? 4 : easy ? -8 : 0)),
                range: Math.round(bird.range * (hard ? 1.22 : easy ? 0.62 : 1)),
                speed: Math.round(bird.speed * (hard ? 1.28 : easy ? 0.62 : 1) * 1000) / 1000,
                axis: 'y',
                phase: bird.phase,
                color: bird.color,
                wingColor: bird.wingColor,
                beak: bird.beak
            };
        });
    }

    const fruits = [];
    crowns.forEach(function (crown) {
        fruits.push(fruit(crown.x + crown.w / 2, crown.top - 52));
    });
    blows.forEach(function (gust) {
        const mid = gust.x + gust.w / 2;
        fruits.push(fruit(mid, gust.force < 0 ? 320 : 168));
    });

    window.PASSAGE_LAYOUTS['1-10'] = {
        length: 13200,
        time: 62,
        boostFruits: 14,
        fruits: fruits,
        obstacles: crownList(0),
        gusts: gustList(1, 0),
        birds: windBirds('normal'),
        frogs: [],
        enemies: [],
        snakes: [],
        bigFruits: {
            easy: [{ x: 6515, y: 80, emoji: '🍉' }, { x: 10210, y: 108, emoji: '🍉' }],
            normal: [{ x: 6515, y: 48, emoji: '🍉' }, { x: 10210, y: 74, emoji: '🍉' }],
            hard: [{ x: 6515, y: 42, emoji: '🍉' }, { x: 10210, y: 66, emoji: '🍉' }]
        },
        stars: {
            easy: [{ x: 5200, y: 230 }],
            normal: [{ x: 5200, y: 188 }],
            hard: [{ x: 5200, y: 150 }]
        },
        difficulties: {
            easy: {
                time: 74,
                boostFruits: 12,
                obstacles: crownList(28),
                gusts: gustList(0.62, -22),
                birds: windBirds('easy')
            },
            hard: {
                time: 50,
                boostFruits: 16,
                obstacles: crownList(-14),
                gusts: gustList(1.3, 16),
                birds: windBirds('hard')
            }
        }
    };
})();
