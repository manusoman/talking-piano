(() => { 'use strict';

const overlay = document.getElementById('overlay');
const noSupport = document.getElementById('noSupport');

// Browser support check
(() => {
    const support = (window.webkitAudioContext || window.AudioContext) &&
                    window.navigator.mediaDevices &&
                    window.navigator.mediaDevices.getUserMedia &&
                    window.navigator.mediaDevices.enumerateDevices &&
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
const voicePlayer = document.getElementById('voicePlayer');
const pianoFrame = document.getElementById('piano');
const record_button = document.getElementById('record');
const voiceCheck = document.getElementById('check');
const talk_button = document.getElementById('talk');

const totalNotes = 88;
const keyList = [];

let PIANO = null;

createPianoUI();

window.UI = {
    init : (piano, callbacks) => {
        PIANO = piano;

        const stopRec_procedure = async e => {
            e.preventDefault();
            const isReady = await callbacks.stop_recording();
            isReady && callbacks.talk();
        };

        const voiceCheck_procedure = () => {
            overlay.classList.remove('off');
            voicePlayer.classList.remove('off');

            callbacks.playSound(() => {
                voicePlayer.classList.add('off');
                overlay.classList.add('off');
            })
        };

        grant_permission.addEventListener('click', () => {
            callbacks.initMediaRecorder(() => {
                // Callback for disabling permission request overlay
                permissionRequest.classList.add('off');
                overlay.classList.add('off');
            });
        }, true);

        record_button.addEventListener('mousedown', callbacks.record, true);
        record_button.addEventListener('mouseup', stopRec_procedure, true);

        record_button.addEventListener('touchstart', e => {
            e.preventDefault();
            callbacks.record();
        }, { capture : true, passive : true });

        record_button.addEventListener('touchend', stopRec_procedure,
        { capture : true, passive : true });

        voiceCheck.addEventListener('click', voiceCheck_procedure, true);
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
    const fragment = new DocumentFragment();

    for(let i = 0; i < totalNotes; ++i) {
        const key = document.createElement('div');

        key.classList.add(pattern[i % 12] ? 'white' : 'black');
        fragment.appendChild(key);
        keyList.push(key);

        key.addEventListener('mousedown', function(e) {
            pianoKeyDown(e, this, i);
        }, true);

        key.addEventListener('mouseup', function(e) {
            pianoKeyUp(e, this);
        }, true);

        key.addEventListener('touchstart', function(e) {
            pianoKeyDown(e, this, i);
        }, { capture : true, passive : true });

        key.addEventListener('touchend', function(e) {
            pianoKeyUp(e, this);
        }, { capture : true, passive : true });
    }
    
    pianoFrame.appendChild(fragment);
}

function pianoKeyDown(e, ele, keyIndex) {
    e.preventDefault();
    e.stopPropagation();
    playKey(keyIndex);
    ele.classList.add('keyDown');
}

function pianoKeyUp(e, ele) {
    e.preventDefault();
    e.stopPropagation();
    ele.classList.remove('keyDown');
}

function playKey(keyIndex) {
    if(PIANO) PIANO.playNote(keyIndex, 1);
    else throw "No piano available";
}

})();
