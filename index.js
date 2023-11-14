function setupPlay() {
    if (window.audioProcessor) return window.audioProcessor;
    window.audioContext = new (window.AudioContext || window.webkitAudioContext);

    window.audioProcessor = 
        audioContext.createScriptProcessor(4096, 1, 1);

    var loops=0;
    audioProcessor.onaudioprocess = function(e) {
        if (!window.activeSynth) return;
        var output = e.outputBuffer.getChannelData(0);
        for (var i = 0; i < output.length; i++) {
            output[i] = Math.max(-1, Math.min(window.activeSynth(loops*output.length + i), 1)) * window.volume;
        }
        updateBosch(output);
        loops++;
    }
    window.volume = 0.02;
}

function updateBosch(data) {
    const cvs = document.getElementById('bosch'),
          ctx = cvs.getContext('2d'),
          ww = cvs.offsetWidth,
          hh = cvs.offsetHeight;

    cvs.width = ww;
    cvs.height = hh;

    blackenCanvas(cvs);
    ctx.strokeStyle = '#f77';
    ctx.beginPath();
    const n = Math.min(data.length, ~~(ww / 2));
    for (let i = 0; i < n; i++) {
        const y = Math.max(0, Math.min(hh, (1 - 0.97 * data[i]/volume) * hh/2));
        if (isNaN(y)) continue;
        const x = ww * (i + 0.5) / n;
        if (!i) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
}

function blackenCanvas(cvs) {
    const ctx = cvs.getContext('2d'),
          ww = cvs.offsetWidth,
          hh = cvs.offsetHeight;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, ww, hh);
}

function play(g) {
    setupPlay();
    if (g) {
        window.playing = true;
        audioProcessor.connect(audioContext.destination);
    } else {
        window.playing = false;
        audioProcessor.disconnect();
    }
    updatePlayButton();
}
function updatePlayButton() {
    $(".play").toggle(!playing);
    $(".pause").toggle(playing);
}

function load_inputs() {
    _.each(args, function(arg) {
        var div = $(`#inputs input[name="${arg}"]`);
        var arg_value = div.val();
        var num_value = Number(arg_value);
        div.parent().children(".display").text(num_value);
        if (arg_value === "" || _.isUndefined(arg_value)) {
          arg_value = undefined;
        } else if (!_.isNaN(num_value) && parseFloat(arg_value)==num_value) {
          arg_value = num_value;
        }
        params[arg] = arg_value;
    });
}

function recalc() {
    var fargs = _.map(args, function(arg) {
        return params[arg];
    });
    if (_.contains(fargs, undefined)) {
        $("#result").text(null);
        return;
    }
    try {
        var result = window.activeSynth = f.apply(params, fargs);
        updatePlayButton();
    } catch (e) {
        $("#result").text(e);
        return;
    }
    $("#result").text("Ready to play");
}

function arg_names(f) {
   return _.compact(f.toString ().match (/function\s*\w*\s*\((.*?)\)/)[1].split (/\s*,\s*/));
}

var params = {};
var args = [];
function change_parameters(new_args) {
    var old_args = args;
    var added_args = _.difference(new_args, old_args);
    var removed_args = _.difference(old_args, new_args);
    var same_args = _.intersection(old_args, new_args);
    _.each(removed_args, function(arg) {
        delete params[arg];
        $("#inputs div:has(input[name=" + arg + "])").remove();
    });
    _.each(added_args, function(arg) {
        $("#inputs").append(`<div class="slider"><label>${arg}</label><input type="range" name="${arg}" min="0" max="100" value="50"><div class="display"></div>`);
        $(`#inputs input[name=${arg}]`).on("input", function() {
            load_inputs();
            recalc();
        });
    });
    args = new_args;
}

function redefine(definition) {
   try {
     f = eval("(" + definition + ")");
   } catch (e) {
     $("#error").text(e);
     return;
   }
   $("#error").text(null);
   change_parameters(arg_names(f));
}

function load_function(func_name) {
    const f = window[func_name];
    const source = f.toString();
    HEADER = "// Javascript\n// Edit me and change my arguments!\n"
    $("#formula").text(HEADER + source);
}

$(document).ready(() => {
    // Load synths into the input
    var hash = window.location.hash.substr(1);
    if (hash) {
        $("#premade option[selected]").attr("selected","");
        $("#premade option[value="+hash+"]").attr("selected","selected");
    }

    for (var name in window) {
        const f = window[name];
        if (typeof(f) == "function" && f.name.startsWith("synth")) {
            const name = f.name;
            $("#premade").append(`"<option value="${name}">${name}</option>"`);
        }
        $("#inputs option:first-child").attr("selected", "selected");
    }
    $("#formula").on("input", function() {
        redefine($("#formula").text().trim());
        recalc();
    });
    $("#inputs input").on("input", function() {
        load_inputs();
        recalc();
    });
    $("#premade").on("input", function() {
        load_function($("#premade").val());
        redefine($("#formula").text().trim());
        load_inputs();
        recalc();
    });
    $("input[name=volume]").on("input", function() {
        const volume = $("input[name=volume]").val();
        window.volume = Math.exp(-0.05 * (100-volume));
    });
    
    load_function($("#premade").val());
    redefine($("#formula").text().trim());
    load_inputs();
    recalc();

    $(".play").on("click", () => {
        play(window.activeSynth);
    });
    $(".pause").on("click", () => {
        play(null);
    });
    blackenCanvas(document.getElementById('bosch'));
});


function synthEury(tune, tempo) {
    // Eurybeat is derived from http://canonical.org/~kragen/sw/dev3/sweetdreams
    // but is kind of broken
    return function(t) {
        var u=t*((t>>16^t>>tempo)%tune)/4;
        return (((u*4&127)+(u%254*4&127)|!(u&32)-1|128&30000/(t%32768+1))&255) / 255;
    }
}

function synthWhiteNoise() {
    return function (t) {
        return Math.random() * 2 - 1;
    }
}

function synthMelody() {
    return function (t) {
        return (255 & (t * (t >> 12 & 42))) / 256.0;
    }
}
