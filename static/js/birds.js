/* Header animation: a flock of distant birds lifts off from the horizon
   and flies away into the distance, then (after a pause) the next flock.

   - One flock in flight at a time; 4-10 birds; launch point random along
     the horizon; flight lasts 10-30 s; 5-10 s pause between flocks.
   - Wings are deliberately out of sync at first and only lock together
     from 40% of the flight onwards.
   - Transparency envelope over the flight (t = 0..1): fully see-through
     at the start, solid by t = 0.10, solid until t = 0.60, then a
     gradual fade back to fully see-through at t = 1.
   - Silhouettes only (no colour), drawn on a canvas laid over the banner
     and beneath the header text. Skipped for prefers-reduced-motion. */
(function () {
  "use strict";

  var HORIZON = 0.585;            // horizon line, as a fraction of header height
  var MIN_FLIGHT = 10, MAX_FLIGHT = 30;   // seconds
  var MIN_GAP = 5, MAX_GAP = 10;          // seconds between flocks
  var MIN_BIRDS = 4, MAX_BIRDS = 10;
  var SYNC_START = 0.40, SYNC_END = 0.75; // wing sync ramps in over this range
  var TAU = Math.PI * 2;

  // Four variations of the same breed: arm/hand length, wing depth,
  // how far the hand sweeps back, tail length and body plumpness.
  var SHAPES = [
    { L1: 0.48, L2: 0.62, chord: 0.20, sweep: 0.13, tail: 0.42, body: 1.00 }, // typical
    { L1: 0.42, L2: 0.72, chord: 0.16, sweep: 0.18, tail: 0.36, body: 0.90 }, // long, slim wings
    { L1: 0.52, L2: 0.50, chord: 0.26, sweep: 0.09, tail: 0.48, body: 1.12 }, // broad, short wings
    { L1: 0.46, L2: 0.58, chord: 0.22, sweep: 0.22, tail: 0.55, body: 0.95 }  // swept hand, long tail
  ];

  var header = document.querySelector(".area-header");
  if (!header) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.createElement("canvas");
  canvas.className = "tb-birds";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:0";
  header.insertBefore(canvas, header.firstChild);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = header.clientWidth;
    H = header.clientHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(header);
  else window.addEventListener("resize", resize);

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function smooth(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  // 0 (see-through) -> 1 (solid) by 10%, solid to 60%, then back to 0.
  function visibility(t) {
    if (t < 0.10) return t / 0.10;
    if (t <= 0.60) return 1;
    return Math.max(0, 1 - (t - 0.60) / 0.40);
  }

  var flock = null;      // current flock, or null while waiting
  var waitLeft = rnd(1, 3);   // first flock shortly after load

  function newFlock() {
    var n = Math.floor(rnd(MIN_BIRDS, MAX_BIRDS + 1));
    var x0 = rnd(0.08, 0.92) * W;
    // Any upward heading: from nearly-left to nearly-right, never straight down.
    var heading = rnd(-Math.PI * 0.92, -Math.PI * 0.08);
    var reach = rnd(0.45, 0.8) * H;
    var birds = [];
    for (var i = 0; i < n; i++) {
      birds.push({
        dx: rnd(-0.018, 0.018) * W,             // tight group on the horizon
        dy: rnd(0, 0.012) * H,
        speed: rnd(0.96, 1.04),                 // personal pace
        turn: rnd(-0.04, 0.04),                 // personal heading offset
        size: rnd(0.5, 1.5),                    // +/-50%
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        freq: rnd(2.4, 3.5),                    // flaps per second
        // Fully random wing phase => visibly out of sync at first.
        off: rnd(0, TAU * 2),
        drift: rnd(-2.5, 2.5),                  // slow slip of the phase
        wob: rnd(0, TAU)
      });
    }
    return { t: 0, dur: rnd(MIN_FLIGHT, MAX_FLIGHT), x0: x0, heading: heading,
             reach: reach, birds: birds, clock: 0 };
  }

  /* One wing, as seen from behind a bird flying away: shoulder at the
     origin, an arm segment to the wrist and a hand segment to the tip,
     with a trailing edge that has small primary-feather notches. */
  function wing(side, flap, lag, sh) {
    var a1 = flap;                  // arm angle (up positive)
    var a2 = lag * 1.0 + 0.1;       // hand lags behind the arm
    var L1 = sh.L1, L2 = sh.L2;
    var wx = side * L1 * Math.cos(a1), wy = -L1 * Math.sin(a1);
    var tx = wx + side * L2 * Math.cos(a2), ty = wy - L2 * Math.sin(a2);
    var chord = sh.chord;

    ctx.moveTo(side * 0.05, 0.02);
    // leading edge, bowed slightly forward
    ctx.quadraticCurveTo(side * L1 * 0.5, wy * 0.5 - 0.09, wx, wy - 0.02);
    ctx.quadraticCurveTo((wx + tx) / 2, (wy + ty) / 2 - 0.05, tx, ty);
    // primary feathers: three notched fingers back from the tip
    var px = tx - side * 0.07, py = ty + sh.sweep;
    ctx.lineTo(px + side * 0.05, py - 0.02);
    ctx.lineTo(px - side * 0.03, py + 0.05);
    ctx.lineTo(px - side * 0.11, py + 0.02);
    ctx.lineTo(px - side * 0.14, py + 0.09);
    // trailing edge back to the body
    ctx.quadraticCurveTo(wx - side * 0.05, wy + chord + 0.05, side * 0.07, chord * 0.9);
    ctx.lineTo(side * 0.03, 0.2);
  }

  function drawBird(x, y, size, flap, lag, alpha, sh) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#08070c";
    ctx.beginPath();
    wing(-1, flap, lag, sh);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    wing(1, flap, lag, sh);
    ctx.closePath();
    ctx.fill();
    // body, head and tail
    ctx.beginPath();
    ctx.ellipse(0, 0.1, 0.085 * sh.body, 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -0.13, 0.055, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.05, 0.25);
    ctx.lineTo(0.05, 0.25);
    ctx.lineTo(0.035 * sh.body, sh.tail);
    ctx.lineTo(-0.035 * sh.body, sh.tail);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!flock) return;
    var t = flock.t, vis = visibility(t);
    if (vis <= 0) return;
    var hy = HORIZON * H;
    var base = Math.max(4.5, H * 0.025);   // px per unit at the start (wingspan ~ 2.2 units)
    // Only the sky is drawn: birds rise out from behind the horizon.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, hy + H * 0.012);
    ctx.clip();
    var sync = smooth(SYNC_START, SYNC_END, t);
    var ease = 1 - Math.pow(1 - t, 1.7);
    for (var i = 0; i < flock.birds.length; i++) {
      var b = flock.birds[i];
      var e = Math.min(1, ease * b.speed);
      var ang = flock.heading + b.turn * e;
      var d = flock.reach * e;
      var x = flock.x0 + b.dx * (1 + e) + Math.cos(ang) * d;
      var y = hy + b.dy - H * 0.004 + Math.sin(ang) * d
              + Math.sin(flock.clock * 1.3 + b.wob) * 2 * (1 - e);
      // Perspective: shrink as they recede.
      var size = base * b.size * (1 - 0.82 * e);
      // Wing phase: shared beat + personal offset that decays to zero once
      // syncing is allowed to begin (never before SYNC_START).
      var beat = flock.clock * b.freq * TAU;
      var offset = (b.off + b.drift * flock.clock) * (1 - sync);
      var ph = beat + offset;
      var flap = Math.sin(ph) * 0.85 + 0.1;
      var lag = Math.sin(ph - 0.9) * 0.8;
      drawBird(x, y, size, flap, lag, vis, b.shape);
    }
    ctx.restore();
  }

  var last = null;
  function frame(ts) {
    if (last === null) last = ts;
    var dt = Math.min(0.1, (ts - last) / 1000);   // clamp: tab was hidden etc.
    last = ts;
    if (flock) {
      flock.clock += dt;
      flock.t += dt / flock.dur;
      if (flock.t >= 1) {
        flock = null;
        waitLeft = rnd(MIN_GAP, MAX_GAP);
      }
    } else {
      waitLeft -= dt;
      if (waitLeft <= 0 && W > 0) flock = newFlock();
    }
    render();
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
})();
