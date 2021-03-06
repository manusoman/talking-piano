(() => { 'use strict';

const overlay = document.getElementById('overlay');
const noSupport = document.getElementById('noSupport');
const infoBox = document.getElementById('infoBox');
const closeInfo = document.getElementById('closeInfo');

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
    showInfoBox();
})();


const showInfo = document.getElementById('showInfo');
const permissionRequest = document.getElementById('permissionRequest');
const grant_permission = document.getElementById('grant_permission');
const rec_acknowledge = document.getElementById('rec_acknowledge');
const errorReport = document.getElementById('errorReport');
const errorText = document.getElementById('errorText');
const voicePlayer = document.getElementById('voicePlayer');
const pianoFrame = document.getElementById('piano');
const record_button = document.getElementById('record');
const talk_button = document.getElementById('talk');
const voiceCheck = document.getElementById('check');
const rec_instruct = document.getElementById('rec_instruct');
const copyright = document.getElementById('copyright');

const totalNotes = 88;
const keyList = [];

let PIANO = null;
let IS_RECORDING = false;

showInfo.addEventListener('click', showInfoBox, true);
closeInfo.addEventListener('click', hideInfoBox, true);

createPianoUI();
putCopyRight();

window.UI = {
    init : (piano, callbacks) => {
        PIANO = piano;

        const manage_recording = e => {
            e.preventDefault();
            e.stopPropagation();

            if(IS_RECORDING) {
                callbacks.stop_recording()
                .then(isReady => {
                    if(!isReady) return;
                    
                    rec_acknowledge.classList.add('off');
                    rec_instruct.innerHTML = 'Click the record button to record your voice';
                    manage_secondary_buttons(true);
                });

                record_button.classList.remove('recording');
                IS_RECORDING = false;
            } else {               
                IS_RECORDING = callbacks.record();
                if(!IS_RECORDING) return;
                
                record_button.classList.add('recording');
                rec_acknowledge.classList.remove('off');
                rec_instruct.innerHTML = 'Click the record button again to stop';
                manage_secondary_buttons(false);
            }
        };

        const voiceCheck_procedure = () => {
            const startSignal = () => {
                overlay.classList.remove('off');
                voicePlayer.classList.remove('off');
            };

            const endSignal = () => {
                voicePlayer.classList.add('off');
                overlay.classList.add('off');
            };

            callbacks.playSound(startSignal, endSignal);
        };

        grant_permission.addEventListener('click', () => {
            callbacks.initMediaRecorder(() => {
                // Callback for disabling permission request overlay
                permissionRequest.classList.add('off');
                overlay.classList.add('off');
            });
        }, true);

        record_button.addEventListener('click', manage_recording, true);
        talk_button.addEventListener('click', callbacks.talk, true);
        voiceCheck.addEventListener('click', voiceCheck_procedure, true);
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

function manage_secondary_buttons(isActivate) {
    const method = isActivate ? 'remove' : 'add';
    
    talk_button.classList[method]('inactive');
    voiceCheck.classList[method]('inactive');
    talk_button.disabled = !isActivate;
    voiceCheck.disabled = !isActivate;
}

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

async function putCopyRight() {
    let year;

    try {
        const data = await fetch('https://manusoman.github.io/MindLogs/settings.json').then(res => res.json());
        year = data.current_year;
    } catch(err) {
        year = new Date().getFullYear();
        console.error(err);
    }

    copyright.innerHTML = `?? ${ year }, Manu Soman`;
}

function showInfoBox() {
    overlay.classList.remove('off');
    infoBox.classList.remove('off');
}

function hideInfoBox() {
    infoBox.classList.add('off');
    overlay.classList.add('off');
}


})();
