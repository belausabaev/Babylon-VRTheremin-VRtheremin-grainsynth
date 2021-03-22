//create instrument, and switchers
var instrument_switcher = {
    "piano": acoustic_grand_piano,
    "harp": orchestral_harp,
    "violin": violin,
    "vibraphone": vibraphone,
    "shamisen": shamisen,
    "panflute": pan_flute,
    "choiraahs": choir_aahs,
    "electricguitar": electric_guitar_clean,
};

//loop start/end values to minimize choppiness
var loopstart_switcher = {
    "piano": 1.5152,
    "harp": 1.5,
    "violin": 1.2,
    "vibraphone": 1.2,
    "shamisen": 1.4913,
    "panflute": 1.4172,
    "choiraahs": 1.5152,
    "electricguitar": 1.1,
};
var loopend_switcher = {
    "piano": 1.8571,
    "harp": 1.85,
    "violin": 1.613,
    "vibraphone": 1.3929,
    "shamisen": 1.8571,
    "panflute": 1.86059,
    "choiraahs": 1.8571,
    "electricguitar": 1.43493,
};


var myin = acoustic_grand_piano;
var myloopstart = loopstart_switcher["piano"];
var myloopend = loopend_switcher["piano"];


//////
//this version will look up the nearest note and play it, then pitch bend by comparing current cents pitch to the note anchor
function centsToNoteName(cents) {
    cents = getAnchorCents(cents);
    return centpitchlookup[cents];
}
function getAnchorCents(cents) {
    cents = Math.min(cents, 8700);
    cents = Math.max(cents, 0);
    cents = Math.round(cents / 100) * 100;
    return cents;
}

var centpitchlookup =
{
    0: "A0",
    100: "Bb0",
    200: "B0",
    300: "C1",
    400: "Db1",
    500: "D1",
    600: "Eb1",
    700: "E1",
    800: "F1",
    900: "Gb1",
    1000: "G1",
    1100: "Ab1",
    1200: "A1",
    1300: "Bb1",
    1400: "B1",
    1500: "C2",
    1600: "Db2",
    1700: "D2",
    1800: "Eb2",
    1900: "E2",
    2000: "F2",
    2100: "Gb2",
    2200: "G2",
    2300: "Ab2",
    2400: "A2",
    2500: "Bb2",
    2600: "B2",
    2700: "C3",
    2800: "Db3",
    2900: "D3",
    3000: "Eb3",
    3100: "E3",
    3200: "F3",
    3300: "Gb3",
    3400: "G3",
    3500: "Ab3",
    3600: "A3",
    3700: "Bb3",
    3800: "B3",
    3900: "C4",
    4000: "Db4",
    4100: "D4",
    4200: "Eb4",
    4300: "E4",
    4400: "F4",
    4500: "Gb4",
    4600: "G4",
    4700: "Ab4",
    4800: "A4",
    4900: "Bb4",
    5000: "B4",
    5100: "C5",
    5200: "Db5",
    5300: "D5",
    5400: "Eb5",
    5500: "E5",
    5600: "F5",
    5700: "Gb5",
    5800: "G5",
    5900: "Ab5",
    6000: "A5",
    6100: "Bb5",
    6200: "B5",
    6300: "C6",
    6400: "Db6",
    6500: "D6",
    6600: "Eb6",
    6700: "E6",
    6800: "F6",
    6900: "Gb6",
    7000: "G6",
    7100: "Ab6",
    7200: "A6",
    7300: "Bb6",
    7400: "B6",
    7500: "C7",
    7600: "Db7",
    7700: "D7",
    7800: "Eb7",
    7900: "E7",
    8000: "F7",
    8100: "Gb7",
    8200: "G7",
    8300: "Ab7",
    8400: "A7",
    8500: "Bb7",
    8600: "B7",
    8700: "C8",
}

var notename = "G7";

var gn;
var abs;

function initMidiInstr(ctx) {
    //////
    //default load sound
    var raw = Uint8Array.from(atob(myin.G7.replace("data:audio/mp3;base64,", "")), c => c.charCodeAt(0));
    //var ac = new AudioContext();
    abs = ctx.createBufferSource();
    ctx.decodeAudioData(raw.slice().buffer, function (buffer) {
        abs.buffer = buffer;
    });
    gn = ctx.createGain();
    gn.gain.value = 1;
    //
    abs.connect(gn);
    gn.connect(ctx.destination);
    //
    //abs.loop = true;
    //abs.loopStart = 1.5152;
    //abs.loopEnd = 1.88641;
    abs.start();
    abs.loop = true;
    //bs
    //gn.gain.value = 0;
    //abs.stop();
    //gn.gain.value = 1;
}





//var pitch_hz = 0;
var cent_stretch = 0; //max of +4800, min of -4800? //nah, just do 0 to 8700 for grand piano.
var anchorcents = 3900;
var vol_percent = 100;
var x = 0;
var y = 0;
var x_percent = 1;
var y_percent = 0;
var mouseisdown = 0;
var gainlock = false;
var max_X;
var max_Y;
var cursor;



function getPercents(e) {
    //console.log(mouseisdown);
    if (!mouseisdown)
        return;
    e.preventDefault();
    //tweakPercents(e.pageX, e.pageY, setanchor = false);
    tweakPercents(mousePosition.x, mousePosition.y, setanchor = false);
    return;
}
function tweakPercents(px, py, setanchor = false) {
    x = px - document.getElementById("render-canvas").offsetLeft;
    y = py - document.getElementById("render-canvas").offsetTop;
    max_X = Math.max(window.innerWidth, 1);
    max_Y = Math.max(window.innerHeight, 1);
    x_percent = Math.min(1, Math.max(x, 0) / max_X);
    y_percent = Math.min(1, Math.max(y, 0) / max_Y);
    cursor = "Your Mouse Position Is : " + x_percent + " and " + y_percent;
    console.log(cursor);
    //document.getElementById("theremin").innerHTML=cursor;
    // update hz and % display
    //cent_stretch = -0.5 + x_percent;
    cent_stretch = x_percent;
    if (setanchor) {
        anchorcents = getAnchorCents(cent_stretch * 8700);
        //console.log("exact pitch:", cent_stretch*8700);
        //console.log("anchor pitch:", anchorcents);
    }
    vol_percent = 200 * (1 - y_percent);
    //$("#pitch")[0].innerText = String(Math.round(cent_stretch * 8700));
    //$("#pitch")[0].innerText = String(Math.round(cent_stretch * 8700)) + " " + centsToNoteName(cent_stretch*8700);
    //$("#volume")[0].innerText = String(Math.round(vol_percent)) + "%";
    // now update the sound.
    if (!gainlock)
        gn.gain.value = (1 - y_percent);
    //abs.detune.value = cent_stretch*8700;
    abs.detune.value = (cent_stretch * 8700) - anchorcents;
    //console.log("Detune", abs.detune.value);
    return;
}

function tweakPercentsPitchDistance(px, py, setanchor = false) {
    x_percent = px;
    y_percent = py;
    cursor = "Your Mouse Position Is : " + x_percent + " and " + y_percent;
    console.log(cursor);
    //document.getElementById("theremin").innerHTML=cursor;
    // update hz and % display
    //cent_stretch = -0.5 + x_percent;
    cent_stretch = x_percent;
    if (setanchor) {
        anchorcents = getAnchorCents(cent_stretch * 8700);
        //console.log("exact pitch:", cent_stretch*8700);
        //console.log("anchor pitch:", anchorcents);
    }
    vol_percent = 200 * (1 - y_percent);
    //$("#pitch")[0].innerText = String(Math.round(cent_stretch * 8700));
    //$("#pitch")[0].innerText = String(Math.round(cent_stretch * 8700)) + " " + centsToNoteName(cent_stretch*8700);
    //$("#volume")[0].innerText = String(Math.round(vol_percent)) + "%";
    // now update the sound.
    if (!gainlock)
        gn.gain.value = (1 - y_percent);
    //abs.detune.value = cent_stretch*8700;
    abs.detune.value = (cent_stretch * 8700) - anchorcents;
    //console.log("Detune", abs.detune.value);
    return;
}

function playSound(e) {
    //console.log(e.pageX, e);

    //tweakPercents(e.pageX, e.pageY, setanchor = true);
    tweakPercents(mousePosition.x, mousePosition.y, setanchor = true);
    e.preventDefault();
    notename = centsToNoteName(anchorcents);
    raw = Uint8Array.from(atob(myin[notename].replace("data:audio/mp3;base64,", "")), c => c.charCodeAt(0));
    ac.close();
    ac = new AudioContext();
    abs = ac.createBufferSource();
    ac.decodeAudioData(raw.slice().buffer, function (buffer) {
        abs.buffer = buffer;
    });
    gn = ac.createGain();
    gn.gain.value = (1 - y_percent);
    //abs.detune.value = cent_stretch*8700;
    abs.detune.value = (cent_stretch * 8700) - anchorcents;
    console.log(notename, anchorcents, (cent_stretch * 8700) - anchorcents);
    //console.log("default detune", abs.detune.value);
    //var ab = ac.createBuffer(1, floatsound.length, 44100);
    //abs.buffer = ab;
    abs.connect(gn);
    gn.connect(ac.destination);
    abs.loop = true;
    abs.loopStart = myloopstart;
    abs.loopEnd = myloopend;
    abs.start(0, offset = 0.1);
    gainlock = false;
    return;
}

function playSoundPitchDistance(pitchDistance, volumeDistance)
{
    //console.log(e.pageX, e);
    
    //tweakPercents(e.pageX, e.pageY, setanchor = true);
    tweakPercentsPitchDistance(pitchDistance, volumeDistance, setanchor = true);
    
    notename = centsToNoteName(anchorcents);
    raw = Uint8Array.from(atob(myin[notename].replace("data:audio/mp3;base64,", "")), c => c.charCodeAt(0));
    abs = ctx.createBufferSource();
    ctx.decodeAudioData(raw.slice().buffer, function(buffer) {
        abs.buffer = buffer;
    });
    gn = ctx.createGain();
    gn.gain.value = (1-y_percent);
    abs.detune.value = (cent_stretch*8700) - anchorcents;
     console.log(notename, anchorcents, (cent_stretch*8700) - anchorcents);
    abs.connect(gn);
    gn.connect(ctx.destination);
    //abs.loop = true;
    //abs.loopStart = myloopstart;
    //abs.loopEnd = myloopend;
    abs.start(0, offset = 0.1);
    gainlock = true;
    return;
}


function releaseSound(cTime) {
    //console.log("up");
    gainlock = true;
    var stoptime_ms = 500;
    //smooth stop!
    gn.gain.setValueAtTime(gn.gain.value, cTime);
    gn.gain.exponentialRampToValueAtTime(0.0001, cTime + stoptime_ms / 1000);
    abs.stop(stoptime_ms / 1000);
    //setTimeout(function() {ac.close();}, stoptime_ms);
    //ac.close();
    //gainlock = false;
    return;
}


var mousePosition = { x: 0, y: 0 };



function aPlaySound(key) {
    if (mouseisdown)
        return;
    //console.log(key.keyCode);
    //don't do anything if an input box is active
    var escapetypes = ["text", "textarea", "search"];
    if (escapetypes.indexOf(document.activeElement.type) === -1) {
        //if (key.keyCode == "65")
        if (key.keyCode >= 65 && key.keyCode <= 90)
            triggerMouseEvent($("#theremin")[0], "mousedown");
    }
    return;
}
function aStopSound(key) {
    if (!mouseisdown)
        return;
    //console.log(key.keyCode);
    //don't do anything if an input box is active
    var escapetypes = ["text", "textarea", "search"];
    if (escapetypes.indexOf(document.activeElement.type) === -1) {
        //if (key.keyCode == "65")
        if (key.keyCode >= 65 && key.keyCode <= 90)
            triggerMouseEvent($("#theremin")[0], "mouseup");
    }
    return;
}
function triggerMouseEvent(node, eventType) {
    var clickEvent = document.createEvent('MouseEvents');
    clickEvent.initEvent(eventType, true, true);
    node.dispatchEvent(clickEvent);
}


