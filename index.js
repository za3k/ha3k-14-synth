function setupPlay() {
    if (window.audioProcessor) return window.audioProcessor;
    window.audioContext = new (window.AudioContext || window.webkitAudioContext);

    return window.audioProcessor = 
        audioContext.createScriptProcessor(4096, 1, 1);
}
function play(g) {
    var loops=0;
    const audioProcessor = setupPlay();
    if (g) {
        console.log("Audio started");
        audioProcessor.onaudioprocess = function(e) {
            var output = e.outputBuffer.getChannelData(0);
            for (var i = 0; i < output.length; i++) {
                output[i] = Math.min(g(loops*output.length + i), 1) * 0.02;
            }
            loops++;
        }
        audioProcessor.connect(audioContext.destination);
    } else {
        console.log("Audio stopped");
        delete audioProcessor.onaudioprocess;
        audioProcessor.disconnect();
    }
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
        var result = f.apply(params, fargs);
    } catch (e) {
        $("#result").text(e);
        return;
    }
    $("#result").text(result);
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
        $("#inputs").append("<div><label>" + arg + "</label><input type=\"text\" name=\"" + arg + "\" value=\"\"></div>");
        $("#inputs input[name=" + arg + "]").on("input", function() {
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

    window.activeSynth = f;
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
        $(".pause").show();
        $(".play").hide();
        play(window.activeSynth);
    });
    $(".pause").on("click", () => {
        $(".pause").hide();
        $(".play").show();
        play(null);
    });
});

function synthWhiteNoise(t) {
    return Math.random() * 2 - 1;
}

function synthMelody(t) {
    return (255 & (t * (t >> 12 & 42))) / 256.0;
}
