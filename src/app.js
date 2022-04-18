(() => { 'use strict';

if(!window.appSupport) return;

const UI = window.UI;
const hypot = Math.hypot;
const CONTEXT = new (AudioContext || webkitAudioContext)();
const AUDIO_CHUNKS = [];
const PIANO = new Piano(CONTEXT);
const FFT_SIZE = 1024 * 4;

const CUTOFF_LOW = Math.ceil(27.5 * FFT_SIZE / CONTEXT.sampleRate);
const CUTOFF_HIGH = Math.floor(4186 * FFT_SIZE / CONTEXT.sampleRate);
// These two are for limiting the peak search
// within the pitch range of a piano

const testData = [];
// Delete when peak finding is improved.

let MEDIA_RECORDER = null;

UI.init(PIANO, { initMediaRecorder, record, stop_recording, playSound, talk });

async function initMediaRecorder(cb) {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const stream = await navigator.mediaDevices.getUserMedia({
            audio : { deviceId : devices.filter(d => d.kind === 'audioinput')[0].deviceId },
            video : false
        });

        MEDIA_RECORDER = new MediaRecorder(stream, { mimeType : 'audio/webm' });
        MEDIA_RECORDER.addEventListener('dataavailable', e => {
            e.data.size > 0 && AUDIO_CHUNKS.push(e.data);
        });
    
        cb();

    } catch(err) {
        console.error(err);
        cb();
        UI.throwMessage('Permission denied. Try reloading the app.', 4);
    }
}

function record() {
    if(!MEDIA_RECORDER) {
        UI.ask_microPhone_permission();
        return;
    }
    
    AUDIO_CHUNKS.length = 0;

    try {
        MEDIA_RECORDER.start();
    } catch(err) {
        console.error(err);
        UI.ask_microPhone_permission();
    }
}

function stop_recording() {
    if(!MEDIA_RECORDER) throw 'Media Recorder is unavailable';
    MEDIA_RECORDER.stop();
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
    const plotLength = CUTOFF_HIGH - CUTOFF_LOW + 1;

    testData.length = 0;
    // Delete when testing is over

    const draw = () => {
        analyser.getByteFrequencyData(freqArray);
        testData.push([...freqArray]);
        const peaks = findPeaks(freqArray);
        UI.plotData(freqArray, CUTOFF_LOW, plotLength, peaks);

        keepPlaying ? requestAnimationFrame(draw) : UI.clearCanvas();
    }

    source.start();
    requestAnimationFrame(draw);
}

async function talk() {    
    const buffer = await getAudioBuffer();
    const voiceData = buffer.getChannelData(0);
    const len = voiceData.length;

    if(len < FFT_SIZE) {
        const msg = 'Not enough sound data available';
        UI.throwMessage(msg);
        console.error(msg);
        return;
    }

    const sampleRate = CONTEXT.sampleRate;
    const chunks = [];
    const pianoFreqs = [];
    const pianoAmps = [];

    // Divide into chunks
    let i = 0;

    while(len - i > FFT_SIZE) {
        chunks.push(spliceBuffer(voiceData, i, FFT_SIZE));
        i += FFT_SIZE;
    }

    if(len - i && len - i <= FFT_SIZE) {
        const shortPiece = spliceBuffer(voiceData, i);
        const zeroPadded = zeroPadd(shortPiece, FFT_SIZE);
        chunks.push(zeroPadded);
    }

    // Do FFT on each chunk
    for(let j = 0, len = chunks.length; j < len; ++j) {
        const { real, imag } = fft(chunks[j]);
        const frequencies = getMagnitudes(real, imag);

        // Find peaks
        const peaks = findPeaks(frequencies);
        const peakFreqs = peaks.map(peak => sampleRate * peak / FFT_SIZE);
        const peakAmps = peaks.map(peak => frequencies[peak]);

        pianoFreqs.push(peakFreqs);
        pianoAmps.push(peakAmps);
    }

    // Play piano
    const interval = FFT_SIZE * 1000 / sampleRate;
    const flen = pianoFreqs.length;
    let counter = 0;

    const ID = setInterval(() => {
        PIANO.play(pianoFreqs[counter], pianoAmps[counter]);
        ++counter === flen && clearInterval(ID);
    }, interval);
}

function getAudioBuffer() {
    if(!AUDIO_CHUNKS.length) {
        UI.throwMessage('No sound is available');
        console.error('No sound is available');
        return;
    }

    return new Blob(AUDIO_CHUNKS).arrayBuffer()
    .then(audioData => CONTEXT.decodeAudioData(audioData));
}

function get_lowpass_filter() {
    const bqFilter = CONTEXT.createBiquadFilter();
    bqFilter.frequency.value = 2000;
    bqFilter.type = 'lowpass';
    return bqFilter;
}

function zeroPadd(data, widthNeeded) {
    let len = data.length;
    if(len >= widthNeeded) return data;

    const arr = new Float32Array(widthNeeded);

    while(len--) arr[len] = data[len];
    return arr;
}

function spliceBuffer(buff, start, len) {
    const endIndex = len ? start + len : buff.length - 1;

    if(endIndex >= buff.length) throw 'Splice error: array size is small';

    const res = new Float32Array(len);

    for(let i = start, j = 0; i < endIndex; ++i, ++j) {
        res[j] = buff[i];
    }

    return res;
}

function getMagnitudes(real, imag) {
    let i = real.length;
    const arr = new Float32Array(i);
    while(i--) arr[i] = hypot(real[i], imag[i]);
    return arr;
}

function findPeaks(freqArray) {
    // This is a very naive implementation of a peak detector.
    // Althought it identifies peaks well, I'm not sure if this
    // is the best implementation of it.

    const minimum_strength = 30;
    const trigger = 20;
    const peakData = [];

    let peakIndex = CUTOFF_LOW;
    let peak = freqArray[peakIndex];

    let valleyIndex = CUTOFF_LOW;
    let valley = freqArray[valleyIndex];

    let fell = false;
    // flag for checking whether the graph fell
    // below the cutoff when descending

    for(let i = CUTOFF_LOW + 1; i <= CUTOFF_HIGH; ++i) {
        const freq = freqArray[i];

        if(freq - valley > trigger) {
            if(fell) {
                fell = false;
                peak = freq;
                peakIndex = i;
            } else if(freq > peak) {
                peak = freq;
                peakIndex = i;
            }
        }

        if(peak - freq > trigger) {
            if(!fell) {
                fell = true;
                valley = freq;
                valleyIndex = i;
                (peak >= minimum_strength) && peakData.push(peakIndex);
            } else if(freq < valley) {
                valley = freq;
                valleyIndex = i;
            }
        }
    }

    return peakData;
}




// CODE FOR TESTING ***************************************************************

const anchor = document.getElementById('downloader');
anchor.addEventListener('click', saveData, true);

function saveData() {
    trim_test_data();
    const data = JSON.stringify({ testData, CUTOFF_LOW, CUTOFF_HIGH });
    const blb = new Blob([data], { type : 'application/json' });

    anchor.download = 'testData.json';
    anchor.href = URL.createObjectURL(blb);
}

const isEmpty = arr => {
    for(let i = 0, len = arr.length; i < len; ++i) {
        if(arr[i]) return false;
    }
    return true;
};

function trim_test_data() {
    // This function removes empty arrays
    // from the beginning and end of the testData.

    // Trim beginning
    while(testData.length) {
        if(isEmpty(testData[0])) testData.shift();
        else break;
    }

    // Trim end
    let i = testData.length;

    while(i--) {
        if(isEmpty(testData[i])) testData.pop();
        else return;
    }
}

window.removeData = () => {
    URL.revokeObjectURL(anchor.href);
};


})();
