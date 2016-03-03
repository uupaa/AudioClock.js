// see: http://uupaa.hatenablog.com/entry/2012/02/08/160039

document.getElementById("userAgent").textContent = navigator.userAgent;

var _particles  = 30000;

var _particle   = new Array(_particles * 4);
var _canvas     = document.getElementById("view");
var _ctx        = _canvas.getContext("2d");
var _pixels     = _ctx.getImageData(0, 0, _canvas.width, _canvas.height);
var _width      = _canvas.width;
var _height     = _canvas.height;
var _immediate  = window.setImmediate       ||
                  window.oSetImmediate      ||
                  window.msSetImmediate     ||
                  window.mozSetImmediate    ||
                  window.webkitSetImmediate;
var _stopImmediate =
                  window.clearImmediate       ||
                  window.oClearImmediate      ||
                  window.msClearImmediate     ||
                  window.mozClearImmediate    ||
                  window.webkitClearImmediate;
var _animate    = window.requestAnimationFrame    ||
                  window.oRequestAnimationFrame   ||
                  window.msRequestAnimationFrame  ||
                  window.mozRequestAnimationFrame ||
                  window.webkitRequestAnimationFrame;
var _stopAnimate= window.cancelRequestAnimationFrame    ||
                  window.oCancelRequestAnimationFrame   ||
                  window.msCancelRequestAnimationFrame  ||
                  window.mozCancelRequestAnimationFrame ||
                  window.webkitCancelRequestAnimationFrame;

var _interval_id  = null;
var _immediate_id = null;
var _animate_id   = null;

var _fps = {
        count: 0,
        node: document.getElementById("fps"),
        last: +new Date
    };

var _method = 0,
    _methodNames = {
        0: "stop",
        1: "setTimeout",
        2: "setInterval",
        3: "setImmdiate",
        4: "requestAnimationFrame"
    };



// 【最適化】リンクリストを止めてArrayに(初期化速度と処理速度の向上)
for (var i = 0, iz = _particles * 4; i < iz; i += 4) {
    _particle[i    ] = Math.random() * _canvas.width;
    _particle[i + 1] = Math.random() * _canvas.height;
    _particle[i + 2] = 0;
    _particle[i + 3] = 0;
}

var _mouseOffset = _canvas.getBoundingClientRect();
var _mouse = { x: 0, y: 0 };

// 【最適化】毎回getBoundingClientRectを呼ばずに事前計算(追従性向上)
_canvas.onmousemove = function(evt) {
    _mouse.x = evt.pageX - _mouseOffset.left;
    _mouse.y = evt.pageY - _mouseOffset.top;
};

function tick(timestamp) {
    var particle = _particle,
        height = _height,
        width = _width,
        data = _pixels.data,
        mx = _mouse.x,
        my = _mouse.y,
        i = 3, iz = data.length, j, x, y, vx, vy, dx, dy, acc, dd;

// 【最適化】Alphaを半分にすることで「canvas全体クリア」ステップを省略
// 【最適化】ループ展開でfps +5～10ぐらい稼いでる

    // poormans-effect (alpha effect)
    for (; i < iz; i += 32) {
        data[i     ] >>= 2;
        data[i +  4] >>= 2;
        data[i +  8] >>= 2;
        data[i + 12] >>= 2;
        data[i + 16] >>= 2;
        data[i + 20] >>= 2;
        data[i + 24] >>= 2;
        data[i + 28] >>= 2;
    }

    for (i = 0, iz = particle.length; i < iz; i += 4) {
        x  = particle[i    ];
        y  = particle[i + 1];
        vx = particle[i + 2];
        vy = particle[i + 3];
        dx = mx - (x | 0);
        dy = my - (y | 0);
        dd = dx * dx + dy * dy;
        if (!dd) { // [avoid] division by zero
            dd = 1;
        }
        acc = 50 / dd;
        vx += acc * dx;
        vy += acc * dy;
        x  += vx;
        y  += vy;
        x = x > width  ? 0 : x < 0 ? width  - 1 : x;
        y = y > height ? 0 : y < 0 ? height - 1 : y;

        particle[i    ] = x;
        particle[i + 1] = y;
        particle[i + 2] = vx * 0.96;
        particle[i + 3] = vy * 0.96;

// 【最適化】紫のドットを打つ, alpha=200 は適当
        j = ((x | 0) + (y | 0) * width) * 4;
        data[j] = 230;
        data[j + 2] = 230;
        data[j + 3] = 200;
    }
    _ctx.putImageData(_pixels, 0, 0);

    if (++_fps.count > 60) {
        var now = +new Date;
        var fps = 1000 / ((now - _fps.last) / _fps.count);

        _fps.node.textContent = "FPS " + fps.toFixed(2);
        _fps.last = now;
        _fps.count = 0;
    }

    switch (_method) {
    case 0: break;
    case 1: setTimeout(tick, 4); break;
    case 2: break;
    case 3: _immediate && (_immediate_id = _immediate(tick)); break;
    case 4: _animate   && (_animate_id   = _animate(tick));   break;
    }
}

function action(method) { // @param Number: 0~4
    _method = method;

    if (_interval_id) {
        clearInterval(_interval_id);
        _interval_id = null;
    }
    if (_animate_id) {
        _stopAnimate(_animate_id);
        _animate_id = null;
    }
    if (_immediate_id) {
        _stopImmediate(_immediate_id);
        _immediate_id = null;
    }

    switch (_method) {
    case 0: break;
    case 1: setTimeout(tick, 4); break;
    case 2: _interval_id = setInterval(tick, 16); break;
    case 3: _immediate && (_immediate_id = _immediate(tick)); break;
    case 4: _animate   && (_animate_id   = _animate(tick));   break;
    }
    document.getElementById("methodName").textContent = _methodNames[method];
}

