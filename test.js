(() => { 'use strict';

// Taken from https://www.compadre.org/osp/pwa/soundanalyzer/

function createAudioCtx() {
    if (!audioStream) return void console.error('Audio stream is not defined.');
    initTimeVec((audioCtx = new (window.AudioContext || window.webkitAudioContext)).sampleRate);
    const analyser = audioCtx.createAnalyser();

    analyser.minDecibels = minDecibels,
    analyser.maxDecibels = maxDecibels,
    analyser.smoothingTimeConstant = 0.85;

    const distortion = audioCtx.createWaveShaper(),
        gainNode = audioCtx.createGain(),
        biquadFilter = audioCtx.createBiquadFilter(),
        convolver = audioCtx.createConvolver(),
        source = audioCtx.createMediaStreamSource(audioStream);

    source.connect(analyser),
    analyser.connect(distortion),
    distortion.connect(biquadFilter),
    biquadFilter.connect(convolver),
    convolver.connect(gainNode),
    gainNode.connect(audioCtx.destination),
    analyser.fftSize = npts,

    initArrays();

    const processor = audioCtx.createScriptProcessor(npts, 1, 1);

    source.connect(processor),
    processor.connect(audioCtx.destination),
    processor.onaudioprocess = function (e) {
        if (_isPaused) return;

        counter++;

        let audioBuffer = e.inputBuffer;
        rate = audioBuffer.sampleRate;
        let audioVec = audioBuffer.getChannelData(0);
        for (
            _view.audioTrace.clear(),
            _view.audioTrace.addPoints(tVec, audioVec),
            counter < 0 && (
                                console.log('CTXC sample rate=' + audioCtx.sampleRate + '  npts=' + npts + '  baseFreq=' + baseFreq),
                                console.log('audioVec: ' + audioVec),
                                console.log('tVec: ' + tVec)
                            ),
            analyser.getByteFrequencyData(dataArray),
            dbArray = Array.from(dataArray),
            i = 0;
            i < dataArray.length;
            i++
        ) {
            dbArray[i] = minDecibels + dbArray[i] / 255 * Math.abs(minDecibels - maxDecibels),
            freqArray[i] = i * baseFreq / 2000;
        }

        _view.fftTrace.clear(),
        _view.fftTrace.addPoints(freqArray, dbArray),
        findPeaks(freqArray, dbArray);
    }
}


function findPeaks(freqArray, dbArray) {
    let dpts = freqArray.length - 2,
        firstDer = new Array(dpts),
        secondtDer = new Array(dpts),
        df = freqArray[1] - freqArray[0],
        df2 = df * df;

    for (let i = 0; i < dpts; i++) {
        firstDer[i] = 10 * (dbArray[i + 1] - dbArray[i - 1]) / df,
        secondtDer[i] = (dbArray[i + 1] + dbArray[i - 1] - 2 * dbArray[i]) / df2;
    }

    peakFreqArray = [],
    peakDBArray = [],
    peakValsArray = [],
    peakValsXArray = [],
    peakValsYArray = [];

    let plus = !1;
    
    for (let i = 1; i < dpts; i++) {
        plus && firstDer[i] < 0 && secondtDer[i] < 100 && (dbArray[i] > dbArray[i - 1] ?
        (peakFreqArray.push(freqArray[i]), peakDBArray.push(80 + dbArray[i]), dbArray[i] > peakThreshold && (peakValsXArray.push(freqArray[i]), peakValsYArray.push(dbArray[i] + 2), peakValsArray.push(freqArray[i].toFixed(2)))) :
        (peakFreqArray.push(freqArray[i - 1]), peakDBArray.push(80 + dbArray[i - 1]), dbArray[i - 1] > peakThreshold && (peakValsXArray.push(freqArray[i - 1]), peakValsYArray.push(dbArray[i - 1] + 2), peakValsArray.push(freqArray[i - 1].toFixed(2))))), plus = firstDer[i] > 0;
    }
}

})();