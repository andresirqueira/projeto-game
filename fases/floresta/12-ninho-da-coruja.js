// Ninho da Coruja — chefe da floresta.
// A luta fica no motor, compartilhada com os outros mundos.
// Aqui ficam o nome da fase e a coruja deste mundo.
window.STAGE_DEFS = window.STAGE_DEFS || {};

window.STAGE_DEFS['1-12'] = {
    name: 'Ninho da Coruja',
    type: 'boss',
    theme: 'forest',
    night: true,
    boss: {
        name: 'Coruja',
        color: '#8B4513',
        wingColor: '#654321',
        type: 'owl',
        eyeColor: '#FFD700',
        beakColor: '#D2691E'
    }
};
