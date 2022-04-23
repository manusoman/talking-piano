(() => { 'use strict';

if(!window.appSupport) return;

const UI = window.UI;
const CONTEXT = new (AudioContext || webkitAudioContext)();
const AUDIO_CHUNKS = [];
const PIANO = new Piano(CONTEXT);
const FFT_SIZE = 1024 * 4;

const CUTOFF_LOW = Math.ceil(27.5 * FFT_SIZE / CONTEXT.sampleRate);
const CUTOFF_HIGH = Math.floor(4186 * FFT_SIZE / CONTEXT.sampleRate);
// These two are for limiting the peak search
// within the pitch range of a piano

let MEDIA_RECORDER = null;
let record_finished_cb = null;

UI.init(PIANO, { initMediaRecorder, record, stop_recording, playSound, talk });

async function initMediaRecorder(cb) {
    CONTEXT.resume();
    
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const stream = await navigator.mediaDevices.getUserMedia({
            audio : { deviceId : devices.filter(d => d.kind === 'audioinput')[0].deviceId },
            video : false
        });

        MEDIA_RECORDER = new MediaRecorder(stream, { mimeType : 'audio/webm' });
        MEDIA_RECORDER.addEventListener('dataavailable', e => {
            if(e.data.size > 0) {
                AUDIO_CHUNKS.push(e.data);
                record_finished_cb && record_finished_cb(true);
            }
            record_finished_cb && record_finished_cb(false);
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
    record_finished_cb = null;

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
    return new Promise(res => record_finished_cb = res);
}

async function playSound(cb) {
    const buffer = await getAudioBuffer();
    const chunks = spliceData(buffer.getChannelData(0), FFT_SIZE);
    const { frequencyList, peaksList } = extract_frequencies_and_peaks(chunks);
    const source = CONTEXT.createBufferSource();
    const plotLength = CUTOFF_HIGH - CUTOFF_LOW + 1;
    
    source.buffer = buffer;
    source.connect(CONTEXT.destination);
    
    const interval = FFT_SIZE * 1000 / CONTEXT.sampleRate;
    const flen = frequencyList.length;
    let counter = 0;

    const ID = setInterval(() => {
        UI.plotData(frequencyList[counter], CUTOFF_LOW, plotLength, peaksList[counter]);

        if(++counter === flen) {
            clearInterval(ID);
            cb();
        }
    }, interval);

    source.start();
}

async function talk() {    
    const buffer = await getAudioBuffer();
    if(buffer === null) return;

    const chunks = spliceData(buffer.getChannelData(0), FFT_SIZE);
    const { frequencyList, peaksList } = extract_frequencies_and_peaks(chunks);
    const sampleRate = CONTEXT.sampleRate;
    const pianoFreqs = [];
    const pianoAmps = [];
    
    for(let i = 0, len = chunks.length; i < len; ++i) {
        const peaks = peaksList[i];
        const peakFreqs = peaks.map(peak => sampleRate * peak / FFT_SIZE);
        const peakAmps = peaks.map(peak => frequencyList[i][peak]);

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

function spliceData(data, size) {
    const len = data.length;

    if(len < size) {
        const msg = 'Not enough sound data available';
        UI.throwMessage(msg);
        console.error(msg);
        return;
    }
    
    // Divide into chunks
    const chunks = [];
    let i = 0;

    while(len - i > size) {
        chunks.push(spliceBuffer(data, i, size));
        i += size;
    }

    if(len - i && len - i <= size) {
        const shortPiece = spliceBuffer(data, i);
        const zeroPadded = zeroPadd(shortPiece, size);
        chunks.push(zeroPadded);
    }

    return chunks;
}

function extract_frequencies_and_peaks(chunks) {
    const frequencyList = [];
    const peaksList = [];

    for(let i = 0, len = chunks.length; i < len; ++i) {
        const frequencyData = getFrequencyData(chunks[i]);
        const peaks = findPeaks(frequencyData);

        frequencyList.push(frequencyData);
        peaksList.push(peaks);
    }

    return { frequencyList, peaksList };
}

function getAudioBuffer() {
    if(!AUDIO_CHUNKS.length) {
        const msg = 'No sound is available';
        UI.throwMessage(msg);
        console.error(msg);
        return null;
    }

    return new Blob(AUDIO_CHUNKS).arrayBuffer()
    .then(audioData => CONTEXT.decodeAudioData(audioData));
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

})();
