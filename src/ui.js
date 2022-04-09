(() => { 'use strict';

const pianoFrame = document.getElementById('piano');
const frequencyBars = document.getElementById('frequencyBars');
const canvas = document.getElementById('canvas');
const record_button = document.getElementById('record');
const play_button = document.getElementById('play');
const talk_button = document.getElementById('talk');

const totalNotes = 88;
const keyList = [];
const canvasContext = canvas.getContext('2d');

let piano = null;

createPianoUI();
setCanvas();


window.UI = {
    init : (pno, callbacks) => {
        piano = pno;
        record_button.addEventListener('mousedown', callbacks.record, true);
        record_button.addEventListener('mouseup', callbacks.stop_recording, true);
        play_button.addEventListener('click', callbacks.playSound, true);
        talk_button.addEventListener('click', callbacks.talk, true);
    },

    pressKey : keyIndex => {
        keyList[keyIndex].classList.add('keyDown');
    },
    
    releaseKey : keyIndex => {
        keyList[keyIndex].classList.remove('keyDown');
    },

    clearKeyPresses : function() {
        let i = totalNotes;
        while(i--) this.releaseKey(i);
    },

    plotData : (freqArray) => {
        const barWidth = canvas.width / freqArray.length;
        const cv = canvas.width, ch = canvas.height;
        let i = freqArray.length;
    
        canvasContext.clearRect(0, 0, cv, ch);
        canvasContext.fillStyle = '#f00';
    
        while(i--) {
            const height = freqArray[i] * ch / 255;
            canvasContext.fillRect(i * barWidth, ch, barWidth, -height);
        }
    
        canvasContext.fill();
    },

    clearCanvas : () => {
        const cv = canvas.width, ch = canvas.height;
        canvasContext.clearRect(0, 0, cv, ch);
    }
};

function createPianoUI() {
    const pattern = [ 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0 ];

    for(let i = 0; i < totalNotes; ++i) {
        const key = document.createElement('div');

        key.classList.add(pattern[i % 12] ? 'white' : 'black');
        pianoFrame.appendChild(key);
        keyList.push(key);

        key.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            playKey(i);
            this.classList.add('keyDown');
        }, true);

        key.addEventListener('mouseup', function(e) {
            e.stopPropagation();
            this.classList.remove('keyDown');
        }, true);
    }
}

function setCanvas() {
    canvas.width = frequencyBars.clientWidth;
    canvas.height = frequencyBars.clientHeight;
}

function playKey(keyIndex) {
    if(piano) piano.playNote(keyIndex, 1);
    else throw "No piano available";
}

})();