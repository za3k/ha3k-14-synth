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
            output[i] = Math.min(window.activeSynth(loops*output.length + i), 1) * 0.02;
        }
        updateBosch(output);
        loops++;
    }
}

function updateBosch(data) {
    const cvs = document.getElementById('bosch')
        , ctx = cvs.getContext('2d')
        , ww = cvs.width
        , hh = cvs.height

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, ww, hh);
    ctx.strokeStyle = '#f77';
    ctx.beginPath();
    //console.log(data);
    const n = Math.min(data.length, ~~(ww / 2));
    for (let i = 0; i < n; i++) {
        const y = Math.max(0, Math.min(hh, (1 - 10 * data[i]) * hh/2));
        if (isNaN(y)) continue;
        const x = ww * (i + 0.5) / n;
        //if (i % 20 == 0) console.log({x, y, i, d: data[i]});
        if (!i) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
}

function play(g) {
    setupPlay();
    if (g) {
        window.playing = true;
        console.log("Audio started");
        audioProcessor.connect(audioContext.destination);
    } else {
        window.playing = false;
        console.log("Audio stopped");
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
        var arg_value = $("#inputs input[name=" + arg + "]").val();
        var num_value = Number(arg_value);
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
        $("#inputs").append(`<div><label>${arg}</label><input type="range" name="${arg}" min="0" max="100" value="50"></div>`);
        $("#inputs input[name=" + arg + "]").on("input", function() {
            load_inputs();
            recalc();
        });

        // OLD: Text box
        /*
        $("#inputs").append("<div><label>" + arg + "</label><input type=\"text\" name=\"" + arg + "\" value=\"\"></div>");
        $("#inputs input[name=" + arg + "]").on("input", function() {
            load_inputs();
            recalc();
        });
        */
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
});


function synthEury(tune, tempo) {
    var u;
    tempo = 400/tempo;
    return function(t) {
        u=t*((t>>13^t>>tempo)%tune)/4;
        return ((u*4&127)+(u%254*4&127)|!(u&32)-1|128&30000/(t%2048+1))&255 / 255;
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
