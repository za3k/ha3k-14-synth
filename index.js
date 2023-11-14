
function once(f) {
    return function() {
        if (!f.run) f();
        f.run = true;
    }
}

function main() {
    window.audioContext = new (window.AudioContext || window.webkitAudioContext);

    play(whiteNoise);
}

function whiteNoise(t) {
    return Math.random() * 2 - 1;
}

function play(g) {
    var bufferSize = 4096;
    var whiteNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);
    var loops=0;
    whiteNoise.onaudioprocess = function(e) {
        loops++;
        var output = e.outputBuffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            output[i] = g(loops*bufferSize + i) * 0.02;
        }
    }

    whiteNoise.connect(audioContext.destination);
}

$(document).ready(() => {
    $("body").on("click", once(main));
});
