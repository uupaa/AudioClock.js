var ModuleTestAudioClock = (function(global) {

var test = new Test(["AudioClock"], { // Add the ModuleName to be tested here (if necessary).
        disable:    false, // disable all tests.
        browser:    true,  // enable browser test.
        worker:     true,  // enable worker test.
        node:       true,  // enable node test.
        nw:         true,  // enable nw.js test.
        el:         true,  // enable electron (render process) test.
        button:     true,  // show button.
        both:       true,  // test the primary and secondary modules.
        ignoreError:false, // ignore error.
        callback:   function() {
        },
        errorback:  function(error) {
            console.error(error.message);
        }
    });

if (IN_BROWSER || IN_NW || IN_EL) {
    test.add([
        testAudioClock,
    ]);
}

// --- test cases ------------------------------------------
function testAudioClock(test, pass, miss) {
    WebAudio.init(function(playableAudioContext) {
        var tickCallbacks = [[tick, 100, 0]];
        var clock = new AudioClock(tickCallbacks, { audioContext: playableAudioContext, start: true });

        function tick(timeStamp,   // @arg Number - current time
                      deltaTime) { // @arg Number - delta time

            // your code here.
            console.log(timeStamp, deltaTime);
        }
    });
}

return test.run();

})(GLOBAL);

