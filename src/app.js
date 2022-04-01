(() => { 'use strict';

const canvas = document.getElementById('canvas');
const record_button = document.getElementById('record');
const play_button = document.getElementById('play');
const talk_button = document.getElementById('talk');

const canvasContext = canvas.getContext('2d');
const CONTEXT = new (AudioContext || webkitAudioContext)();

canvas.width = 1024;
canvas.height = 500;

let MEDIA_RECORDER = null;
let AUDIO_CHUNKS = [];
let AUDIO_DATA = null;
let PIANO = new Piano(CONTEXT);
window.PIANO = PIANO;

Promise.all([
    initMediaRecorder(),
    initUI()
]).then(() => console.log('App initialized'));


async function initMediaRecorder() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const stream = await navigator.mediaDevices.getUserMedia({
        audio : { deviceId : devices.filter(d => d.kind === 'audioinput')[0].deviceId },
        video : false
    });

    MEDIA_RECORDER = new MediaRecorder(stream, { mimeType : 'audio/webm' });
    MEDIA_RECORDER.addEventListener('dataavailable', e => {
        if(e.data.size > 0) AUDIO_CHUNKS.push(e.data);
    });
}

function initUI() {
    record_button.addEventListener('mousedown', record, true);
    record_button.addEventListener('mouseup', stop_recording, true);
    play_button.addEventListener('click', playSound, true);
    talk_button.addEventListener('click', talk, true);
}

function record() {
    if(!MEDIA_RECORDER) throw 'Media Recorder is unavailable';
    
    AUDIO_DATA = null;
    AUDIO_CHUNKS.length = 0;
    MEDIA_RECORDER.start();
}

function stop_recording() {
    if(!MEDIA_RECORDER) throw 'Media Recorder is unavailable';
    MEDIA_RECORDER.stop();
}

function getAudioBuffer() {
    if(!AUDIO_CHUNKS.length) throw 'No sound is available';

    return new Blob(AUDIO_CHUNKS).arrayBuffer()
    .then(audioData => CONTEXT.decodeAudioData(audioData));
}

async function playSound() {
    const buffer = await getAudioBuffer();
    const analyser = CONTEXT.createAnalyser();
    const source = CONTEXT.createBufferSource();
    let keepPlaying = true;

    analyser.fftSize = 2048;
    source.buffer = buffer;
    source.addEventListener('ended', () => keepPlaying = false);    
    source.connect(analyser);
    analyser.connect(CONTEXT.destination);    
    
    const freqArray = new Uint8Array(analyser.frequencyBinCount);
    const width = canvas.width / freqArray.length;
    const cv = canvas.width, ch = canvas.height;

    const draw = () => {
        analyser.getByteFrequencyData(freqArray);
        plotData(freqArray, width, cv, ch);
        keepPlaying && requestAnimationFrame(draw);
    }

    source.start();
    requestAnimationFrame(draw);
}
 
function plotData(freqArray, width, cv, ch) {
    const peakIndices = findPeaks(freqArray, true);
    let i = freqArray.length;
    let j = peakIndices.length;

    canvasContext.clearRect(0, 0, cv, ch);    
    canvasContext.fillStyle = '#0f0';

    while(j--) {
        const index = peakIndices[j];
        canvasContext.fillRect(index * width, 0, width, 500);
    }

    canvasContext.fill();
    canvasContext.fillStyle = '#f00';

    while(i--) {
        canvasContext.fillRect(i * width, 500, width, -freqArray[i]);
    }

    canvasContext.fill();
}

function findPeaks(freqArray, isIndex) {
    const len = freqArray.length;
    const minimum_strength = 30;
    const cutoff = 0.5;
    const peakData = [];

    let peakIndex = 0;
    let peak = freqArray[peakIndex];

    let valleyIndex = 0;
    let valley = freqArray[valleyIndex];

    let fell = false;
    // flag for checking whether the graph fell
    // below the cutoff when descending

    for(let i = 1; i < len; ++i) {
        const freq = freqArray[i];
        if(freq < minimum_strength) continue;

        if(valley / freq < cutoff) {
            if(fell) {
                fell = false;
                peak = freq;
                peakIndex = i;
            } else if(freq > peak) {
                peak = freq;
                peakIndex = i;
            }
        }

        if(freq / peak < cutoff) {
            if(!fell) {
                fell = true;
                peakData.push(isIndex ? peakIndex : peak);
                valley = freq;
                valleyIndex = i;
            } else if(freq < valley) {
                valley = freq;
                valleyIndex = i;
            }
        }
    }

    return peakData;
}

async function talk() {
    const buffer = await getAudioBuffer();
    const analyser = CONTEXT.createAnalyser();
    const source = CONTEXT.createBufferSource();
    let keepPlaying = true;

    analyser.fftSize = 2048;
    source.buffer = buffer;
    source.addEventListener('ended', () => keepPlaying = false);    
    source.connect(analyser);
    
    const freqArray = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
        analyser.getByteFrequencyData(freqArray);
        const peaks = findPeaks(freqArray, false);
        // const pianoMaps = map_to_piano(peaks);
        // playPiano(pianoMaps);
    }

    source.start();
    loop();
}

function map_to_piano(peaks) {

}

function playPiano(pianoMap) {

}


})();
