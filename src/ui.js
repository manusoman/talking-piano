(() => { 'use strict';

const overlay = document.getElementById('overlay');
const noSupport = document.getElementById('noSupport');

// Browser support test
(() => {
    const support = (window.webkitAudioContext || window.AudioContext) && 
                    window.navigator.mediaDevices &&
                    window.navigator.mediaDevices.getUserMedia &&
                    window.navigator.mediaDevices.enumerateDevices &&
                    window.navigator.permissions &&
                    window.MediaRecorder;

    if(!support) {
        window.appSupport = false;
        overlay.classList.remove('off');
        noSupport.classList.remove('off');

        // stop process
        throw 'No app support';
    }

    window.appSupport = true;
})();



const permissionRequest = document.getElementById('permissionRequest');
const grant_permission = document.getElementById('grant_permission');
const errorReport = document.getElementById('errorReport');
const errorText = document.getElementById('errorText');
const pianoFrame = document.getElementById('piano');
const frequencyBars = document.getElementById('frequencyBars');
const canvas = document.getElementById('canvas');
const record_button = document.getElementById('record');
const play_button = document.getElementById('play');
const talk_button = document.getElementById('talk');

const totalNotes = 88;
const keyList = [];
const canvasContext = canvas.getContext('2d');

let PIANO = null;

createPianoUI();
setCanvas();


window.UI = {
    init : (piano, callbacks) => {
        PIANO = piano;

        grant_permission.addEventListener('click', () => {
            callbacks.initMediaRecorder(() => {
                // Callback for disabling permission request overlay
                permissionRequest.classList.add('off');
                overlay.classList.add('off');
            });
        }, true);

        record_button.addEventListener('mousedown', callbacks.record, true);
        record_button.addEventListener('mouseup', callbacks.stop_recording, true);
        play_button.addEventListener('click', callbacks.playSound, true);
        talk_button.addEventListener('click', callbacks.talk, true);
    },

    ask_microPhone_permission : () => {
        overlay.classList.remove('off');
        permissionRequest.classList.remove('off');
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

    plotData : (freqArray, startIndex, length) => {
        const barWidth = canvas.width / length;
        const cv = canvas.width, ch = canvas.height;
    
        canvasContext.clearRect(0, 0, cv, ch);
        canvasContext.fillStyle = '#f00';
    
        for(let i = startIndex; i < startIndex + length; ++i) {
            const height = freqArray[i] * ch / 255;
            canvasContext.fillRect(i * barWidth, ch, barWidth, -height);
        }
    
        canvasContext.fill();
    },

    clearCanvas : () => {
        const cv = canvas.width, ch = canvas.height;
        canvasContext.clearRect(0, 0, cv, ch);
    },

    throwMessage : (msg, duration = 1) => {
        errorText.innerHTML = msg;
        overlay.classList.remove('off');
        errorReport.classList.remove('off');

        setTimeout(() => {
            errorReport.classList.add('off');
            overlay.classList.add('off');
            errorText.innerHTML = '';
        }, duration * 1000);
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
    if(PIANO) PIANO.playNote(keyIndex, 1);
    else throw "No piano available";
}

})();
