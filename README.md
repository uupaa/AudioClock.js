# AudioClock.js [![Build Status](https://travis-ci.org/uupaa/AudioClock.js.svg)](https://travis-ci.org/uupaa/AudioClock.js)

[![npm](https://nodei.co/npm/uupaa.audioclock.js.svg?downloads=true&stars=true)](https://nodei.co/npm/uupaa.audioclock.js/)

WebAudio based high precision timer.

This module made of [WebModule](https://github.com/uupaa/WebModule).

## Documentation
- [Spec](https://github.com/uupaa/AudioClock.js/wiki/)
- [API Spec](https://github.com/uupaa/AudioClock.js/wiki/AudioClock)

## Browser, NW.js and Electron

```js
<script src="<module-dir>/lib/WebModule.js"></script>
<script src="<module-dir>/lib/AudioClock.js"></script>
<script>
    var tickCallbacks = [tick, 100, 0];
    var clock = new AudioClock(tickCallbacks, { context: PlayableAudioContext, start: true });

    function tick(timeStamp,   // @arg Number - current time
                  deltaTime) { // @arg Number - delta time

        // your code here.

    }
</script>
```

