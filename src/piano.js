(() => { 'use strict';

const UI = window.UI;
const totalNotes = 88;
const { floor, log2 } = Math;
const note_frequencies = get_note_frequencies();
const note_shift = 5;

function Piano(context) {
    this.context = context;
    this.currentlyPlaying = new Uint8Array(totalNotes);
}

Piano.prototype = {
    constructor : Piano,

    play : function(frequencies, amplitudes) {
        const len = frequencies.length;
        const playingIndices = [];

        for(let i = 0; i < len; ++i) {
            const freq = frequencies[i];

            if(freq < 28 || freq > 4100) continue;
            // To avoid frequencies that fall below or beyond the piano range

            const index = getNearestNoteIndex(freq) - note_shift;
            // note_shift is used to play everything at a lower pitch

            playingIndices.push(index);

            if(!this.currentlyPlaying[index]) {
                this.playNote(index, amplitudes[i] / 255);
                UI.pressKey(index);
            }
        }

        for(let i = 0, j = 0; i < totalNotes; ++i) {
            if(i === playingIndices[j]) {
                this.currentlyPlaying[i] = 1;
                ++j;
            } else {
                this.currentlyPlaying[i] = 0;
                UI.releaseKey(i);
            }
        }
    },

    playNote : function(noteIndex, gain) {
        const ctx = this.context;
        const main = ctx.createOscillator();
        
        main.frequency.value = note_frequencies[noteIndex];
          
        const ct = ctx.currentTime;
        applyGain(ctx, gain, ct, main);
        main.start();
    }
}

function getNearestNoteIndex(freq) {
    const first = 27.5;
    const index = floor(log2(freq / first) * 12);
    const a = freq - note_frequencies[index];
    const b = note_frequencies[index + 1] - freq;

    return a < b ? index : index + 1;
}

function applyGain(ctx, level, ct, osc) {
    const gain = ctx.createGain();
    
    gain.gain.setValueAtTime(0, ct);
    gain.gain.linearRampToValueAtTime(0.9 * level, ct + 0.04);
    gain.gain.linearRampToValueAtTime(0.6 * level, ct + 0.3);
    gain.gain.linearRampToValueAtTime(0, ct + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
}

function get_note_frequencies() {
    const first = 27.5; // Lowest note frequency
    const frequencies = new Float64Array(totalNotes);
    let i = totalNotes;

    while(i--) frequencies[i] = first * Math.pow(2, i / 12);
    return frequencies;
}


window.Piano = Piano;

})();