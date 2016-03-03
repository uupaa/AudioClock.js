(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("AudioClock", function moduleClosure(global) {
"use strict";

/*
```js
    var tickCallbacks = [tick, 100, 0];
    var clock = new AudioClock(tickCallbacks, { context: PlayableAudioContext, start: true });

    function tick(timeStamp,   // @arg Number - current time
                  deltaTime) { // @arg Number - delta time

        // your code here.

    }
```
 */

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
var VERIFY  = global["WebModule"]["verify"]  || false;
var VERBOSE = global["WebModule"]["verbose"] || false;
var AUDIO_BUFFER_SIZE = 2048 * 4; // frames

// --- class / interfaces ----------------------------------
function AudioClock(tickCallbacks, // @arg TickCallbackArray = [] - [[tickCallback, interval, delta], ...]
                    options) {     // @arg Object = {} - { audioContext, bufferSize, pulse, spike, start, offset }
                                   // @options.audioContext AudioContext = null   - AudioContext
                                   // @options.bufferSize   UINT16       = 2048   - 
                                   // @options.pulse        Number       = 0.0    - overwrite delta time(unit: ms)(range of oscillation time).
                                   // @options.spike        Function     = null   - generate an irregular pulse(arrhythmia).
                                   // @options.start        Boolean      = false  - auto start.
                                   // @options.offset       Number       = 0.0    - timeStamp offset.
//{@dev
    if (VERIFY) {
        $valid($type(options, "Object|omit"),              AudioClock, "options");
        $valid($keys(options, "audioContext|bufferSize|pulse|spike|start|offset"), AudioClock, "options");
        if (options) {
            $valid($type(options.pulse,  "Number|omit"),   AudioClock, "options.pulse");
            $valid($type(options.spike,  "Function|omit"), AudioClock, "options.spike");
            $valid($type(options.start,  "Boolean|omit"),  AudioClock, "options.start");
            $valid($type(options.offset, "Number|omit"),   AudioClock, "options.offset");
        }
    }
//}@dev

    options = options || {};

    this._tickCallbacks = [];                               // [ <tickCallback, interval, delta, lastTime>, ... ]
    this._audioContext  = options["audioContext"] || 0.0;   // AudioContext
    this._bufferSize    = options["bufferSize"]   || AUDIO_BUFFER_SIZE;
    this._pulse         = options["pulse"] || 0.0;          // Number   - overwrite delta time(range of oscillation time).
    this._spike         = options["spike"] || null;         // Function - generate an irregular pulse(arrhythmia).
    this._active        = false;                            // Boolean  - active state.
    this._counter       = 0;                                // Integer  - pulse generate counter.
    this._baseTime      = 0;                                // Number   - offset from zero.
    this._offsetTime    = options["offset"] || 0.0;         // Number   - offset time.
    this._enterFrame    = _enterFrame.bind(this);           // Function - _enterFrame.bind(this)
    this._lastTimeStamp = 0;                                // Number   - last time stamp.

    // --- get base time ---
    this._baseTime = this._audioContext["currentTime"] * 1000;     // 基準時刻 = 現在時刻 - audioContext.currentTime

    // --- audio event handler relations ---
    this._oscillator      = null;
    this._scriptProcessor = null;

    _setScriptProcessorHandler.call(this, this._audioContext, this._bufferSize);

    // --- register callbacks ---
    var that = this;

    (tickCallbacks || []).forEach(function(item) {
        var tickCallback = item[0];
        var interval     = item[1] || 0;
        var delta        = item[2] || 0;

        if (tickCallback) {
            that["on"](tickCallback, interval, delta);
        }
    });

    if (options["start"]) {
        this["start"]();
    }
}

AudioClock["prototype"] = Object.create(AudioClock, {
    "constructor":  { "value": AudioClock       }, // new AudioClock(options:Object = {}):AudioClock
    "active":       { "get":   function()  { return this._active; } },
    "start":        { "value": AudioClock_start }, // AudioClock#start():this
    "stop":         { "value": AudioClock_stop  }, // AudioClock#stop():this
    // --- register / unregister tick functions ---
    "on":           { "value": AudioClock_on    }, // AudioClock#on(...):void
    "off":          { "value": AudioClock_off   }, // AudioClock#off(...):void
    "has":          { "value": function(v) { return this._tickCallbacks.indexOf(v) >= 0; } },
    "clear":        { "value": AudioClock_clear }, // AudioClock#clear():void
    // --- utility ---
    "now":          { "value": function()  { return this._audioContext["currentTime"] * 1000 - this._baseTime; } },
    "lastTimeStamp":{ "get":   function()  { return this._lastTimeStamp + this._offsetTime; } },
    "ticks":        { "get":   function()  { return this._ticks; } },
    // --- accessor ---
    "get":          { "value": function(k)    { return this["_" + k];     } }, // AudioClock#get(key:String):Any
    "set":          { "value": function(k, v) {        this["_" + k] = v; } }, // AudioClock#set(key:String, value:Any):void
});

// --- implements ------------------------------------------
function _setScriptProcessorHandler(audioContext, // @arg AudioContext
                                    bufferSize) { // @arg UINT16
                                                  // @fix
    var that = this;

    this._scriptProcessor = audioContext["createScriptProcessor"](bufferSize, 1, 1);
    this._gain            = audioContext["createGain"]();
    this._oscillator      = audioContext["createOscillator"]();

    this._scriptProcessor["onaudioprocess"] = _processHandler;

    function _processHandler(event) { // @arg AudioEvent
        var currentTime   = audioContext["currentTime"] * 1000;
        var inputBuffer0  = event["inputBuffer"]["getChannelData"](0); // Float32Array
        var outputBuffer0 = event["outputBuffer"]["getChannelData"](0); // Float32Array

        outputBuffer0["set"](inputBuffer0, 0); // inputBuffer を outputBuffe にコピーする

        that._enterFrame(currentTime - that._baseTime);
    }

    // --- set sound pattern ---
    this._oscillator["type"] = "sine";
    this._oscillator["frequency"]["value"] = 55 + 22; // 440Hz

    // --- set volume ---
    this._gain["value"] = 0.5;

    // --- set node relations ---
    // oscillator -> gain -> scriptProcessor -> destination
    this._oscillator["connect"](this._gain);
    this._gain["connect"](this._scriptProcessor);
    this._scriptProcessor["connect"](audioContext["destination"]);

    // --- flow sound source to the sink ---
    this._oscillator["start"]();
}

function _enterFrame(highResTimeStamp) { // @arg Number - ms
                                         // @bind this
    if (!this._active) {
        return;
    }
    if (!this._tickCallbacks.length) {
        return;
    }

    // setInterval or setTimeout does not give us the highResTimeStamp.
    var timeStamp = highResTimeStamp - this._baseTime; // current time stamp.
    var deltaTime = 0;     // elapsed time since the last frame.

    if (this._pulse) {
        var pulse = this._pulse;

        if (this._spike) {
            pulse = this._spike(timeStamp, pulse, this._counter);
        }
        // --- adjust timeStamp and deltaTime ---
        if (this._counter++) {
            timeStamp = pulse + this._lastTimeStamp;
        }
        deltaTime = pulse;
    } else {
        deltaTime = timeStamp - this._lastTimeStamp;
    }

    this._lastTimeStamp = timeStamp; // update lastTimeStamp

    timeStamp += this._offsetTime;

    // --- callback tickCallback function ---
    var garbage = false; // functions that are no longer needed.

    for (var i = 0, iz = this._tickCallbacks.length; i < iz; i += 4) {
        var tickCallback = this._tickCallbacks[i    ];
        var interval     = this._tickCallbacks[i + 1];
        var delta        = this._tickCallbacks[i + 2];
        var lastTime     = this._tickCallbacks[i + 3];

        if (!tickCallback) {
            garbage = true;
        } else {
            if (interval === 0) { // 0 = every time callback
                tickCallback(timeStamp, deltaTime);
            } else {
                delta += deltaTime; // 0.1(sec.ms) -> 100(ms)

                if (delta >= interval) {
                    delta -= interval;
                    tickCallback(timeStamp, timeStamp - lastTime);

                    this._tickCallbacks[i + 3] = timeStamp;
                }
                this._tickCallbacks[i + 2] = delta; // write back
            }
        }
    }
    if (garbage) {
        _shrink.call(this);
    }
}

function _shrink() { // @bind this
    var denseArray = [];

    for (var i = 0, iz = this._tickCallbacks.length; i < iz; ++i) {
        if (this._tickCallbacks[i]) {
            denseArray.push(this._tickCallbacks[i]);
        }
    }
    this._tickCallbacks = denseArray; // overwrite
}

function AudioClock_start() {
    if (!this._active) {
        this._active = true;
    }
}

function AudioClock_stop() {
    if (this._active) {
        this._active = false;
    }
}

function AudioClock_on(tickCallback, // @arg Function - tickCallback(timeStamp:Number, deltaTime:Number):void
                       interval,     // @arg Number = 0 - ms, callback interval
                       delta) {      // @arg Number = 0 - ms, delta time.
                                     // @desc register callback.
    if ( !this["has"](tickCallback) ) { // ignore already registered function.
        this._tickCallbacks.push(tickCallback, interval || 0, delta || 0, 0); // [ <tickCallback, interval, delta, lastTime>, ... ]
    }
}

function AudioClock_off(tickCallback) { // @arg Function - registered tick callback function.
                                        // @desc unregister callback.
    var pos = this._tickCallbacks.indexOf(tickCallback);

    if (pos >= 0) {
        this._tickCallbacks[pos    ] = 0; // tickCallback
        this._tickCallbacks[pos + 1] = 0; // interval
        this._tickCallbacks[pos + 2] = 0; // delta
        this._tickCallbacks[pos + 3] = 0; // lastTime
    }
}

function AudioClock_clear() { // @desc clear all ticks.
    for (var i = 0, iz = this._tickCallbacks.length; i < iz; ++i) {
        this._tickCallbacks[i] = 0;
    }
}

return AudioClock; // return entity

});

