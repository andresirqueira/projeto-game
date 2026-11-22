// Frases e diálogos da Floresta. Cada chave é uma fase.
// kind "scene" é uma frase da situação. kind "say" é alguém falando.
// "1-12-depois" toca só quando a Coruja é vencida.
window.FOREST_LORE = {
    '1-1': [
        { kind: 'scene', text: 'A clareira está quieta demais.' },
        { kind: 'say', who: 'Você', text: 'Se a maldição está aqui, eu atravesso.' }
    ],
    '1-2': [
        { kind: 'scene', text: 'Os pássaros descem sem motivo.' },
        { kind: 'say', who: 'Você', text: 'Não é briga. Alguma coisa os empurra.' }
    ],
    '1-3': [
        { kind: 'scene', text: 'O bosque escurece no meio do dia.' },
        { kind: 'say', who: 'Você', text: 'A maldição está mais perto.' }
    ],
    '1-4': [
        { kind: 'scene', text: 'O chão ainda oferece comida.' },
        { kind: 'say', who: 'Você', text: 'A floresta não desistiu. Eu também não.' }
    ],
    '1-5': [
        { kind: 'scene', text: 'Um brilho ruim desce com a água.' },
        { kind: 'say', who: 'Você', text: 'Ele vai para um lugar úmido. Ainda não é a hora.' }
    ],
    '1-6': [
        { kind: 'scene', text: 'O chão fechou. O caminho é por cima.' },
        { kind: 'say', who: 'Você', text: 'Ela quer que eu não chegue.' }
    ],
    '1-7': [
        { kind: 'scene', text: 'O enxame gira, fugindo do que não se vê.' },
        { kind: 'say', who: 'Você', text: 'Até os insetos sentem.' }
    ],
    '1-8': [
        { kind: 'scene', text: 'A noite cai de uma vez.' },
        { kind: 'say', who: 'Você', text: 'Daqui para a frente, o território é da Coruja.' }
    ],
    '1-9': [
        { kind: 'scene', text: 'As raízes entortaram sozinhas.' },
        { kind: 'say', who: 'Você', text: 'A maldição já mexe na floresta.' }
    ],
    '1-10': [
        { kind: 'scene', text: 'O vento sopra sempre para o mesmo lado.' },
        { kind: 'say', who: 'Você', text: 'É o ninho. Ela está me chamando.' }
    ],
    '1-11': [
        { kind: 'scene', text: 'A sombra no chão marca a descida.' },
        { kind: 'say', who: 'Você', text: 'Os olhos ainda são vermelhos. Ela não está livre.' }
    ],
    '1-12': [
        { kind: 'say', who: 'Coruja', text: 'Saia. Isto não fui eu quem escolheu.' },
        { kind: 'say', who: 'Você', text: 'Então eu quebro o feitiço.' }
    ],
    '1-12-depois': [
        { kind: 'say', who: 'Coruja', text: 'A floresta está livre. A maldição foi para o Pântano.' },
        { kind: 'say', who: 'Você', text: 'Então eu vou atrás.' }
    ]
};
