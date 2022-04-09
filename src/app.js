(() => { 'use strict';

const UI = window.UI;
const CONTEXT = new (AudioContext || webkitAudioContext)();
const AUDIO_CHUNKS = [];
const PIANO = new Piano(CONTEXT);
const FFT_SIZE = 1024 * 4;
const TIME_PERIOD = 0.1;

let MEDIA_RECORDER = null;

UI.init(PIANO, { record, stop_recording, playSound, talk });
initMediaRecorder().then(() => console.log('App initialized'));


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

function record() {
    if(!MEDIA_RECORDER) throw 'Media Recorder is unavailable';
    
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

function get_lowpass_filter() {
    const bqFilter = CONTEXT.createBiquadFilter();
    bqFilter.frequency.value = 2000;
    bqFilter.type = 'lowpass';
    return bqFilter;
}

async function playSound() {
    const buffer = await getAudioBuffer();
    const analyser = CONTEXT.createAnalyser();
    const source = CONTEXT.createBufferSource();
    const lowPass = get_lowpass_filter();
    let keepPlaying = true;

    analyser.fftSize = FFT_SIZE;
    source.buffer = buffer;
    source.addEventListener('ended', () => keepPlaying = false);    
    source.connect(lowPass);
    lowPass.connect(analyser);
    analyser.connect(CONTEXT.destination);    
    
    const freqArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
        analyser.getByteFrequencyData(freqArray);
        UI.plotData(freqArray);
        keepPlaying ? requestAnimationFrame(draw) : UI.clearCanvas();
    }

    source.start();
    requestAnimationFrame(draw);
}

async function talk() {
    const buffer = await getAudioBuffer();
    const lowPass = get_lowpass_filter();
    const analyser = CONTEXT.createAnalyser();
    const source = CONTEXT.createBufferSource();
    const sampleRate = CONTEXT.sampleRate;
    let keepLooping = true;

    analyser.fftSize = FFT_SIZE;
    source.buffer = buffer;
    source.addEventListener('ended', () => keepLooping = false);
    source.connect(lowPass);
    lowPass.connect(analyser);
    
    const freqArray = new Uint8Array(analyser.frequencyBinCount);
    const setTimeout = window.setTimeout;

    const loop = () => {
        analyser.getByteFrequencyData(freqArray);
        const peaks = findPeaks(freqArray);
        const peakFreqs = peaks.map(peak => sampleRate * peak / FFT_SIZE);
        const peakAmps = peaks.map(peak => freqArray[peak]);
        PIANO.play(peakFreqs, peakAmps);

        keepLooping ? setTimeout(loop, TIME_PERIOD) : UI.clearKeyPresses();
    }

    source.start();
    loop();
}

function findPeaks(freqArray) {
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
                valley = freq;
                valleyIndex = i;
                peakData.push(peakIndex);
            } else if(freq < valley) {
                valley = freq;
                valleyIndex = i;
            }
        }
    }

    return peakData;
}


})();
