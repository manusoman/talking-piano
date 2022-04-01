(() => { 'use strict';

const note_frequencies = get_note_frequencies();

function Piano(context) {
    this.context = context;
}

Piano.prototype = {
    constructor : Piano,

    playNote : function(frequency) {
        const ctx = this.context;
        const main = ctx.createOscillator();
        const harmonic1 = ctx.createOscillator();
        const harmonic2 = ctx.createOscillator();
        const harmonic3 = ctx.createOscillator();
        
        main.frequency.value = frequency;
        harmonic1.frequency.value = frequency * 2;
        harmonic2.frequency.value = frequency * (2 ** (7 / 12));
        harmonic3.frequency.value = frequency * (2 ** (4 / 12));
          
        const ct = ctx.currentTime;
        applyGain(ctx, 1, ct, main);
        applyGain(ctx, 0.8, ct, harmonic1);
        applyGain(ctx, 0.6, ct, harmonic2);
        applyGain(ctx, 0.4, ct, harmonic3);
          
        main.start();
        harmonic1.start();
        harmonic2.start();
        harmonic3.start();
    }
}

function applyGain(ctx, level, ct, osc) {
    const gain = ctx.createGain();
    
    gain.gain.setValueAtTime(0, ct);
    gain.gain.linearRampToValueAtTime(0.9 * level, ct + 0.04);
    gain.gain.linearRampToValueAtTime(0.6 * level, ct + 0.7);
    gain.gain.linearRampToValueAtTime(0, ct + 2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
}

function get_note_frequencies() {
    const totalNotes = 88;
    const frequencies = [];
    const A_index = 48; // Index of middle A

    frequencies[A_index] = 440;

    for(let i = 1; i <= A_index ; ++i) {
        const scalar = 2 ** (i / 12);
        frequencies[A_index - i] = 440 / scalar;
        
        if(A_index + i < totalNotes) {
            frequencies[A_index + i] = 440 * scalar;
        }
    }

    return frequencies;
}

window.Piano = Piano;

})();