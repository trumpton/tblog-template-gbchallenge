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
    { L1: 0.48, L2: 0.62, chord: 0.15, sweep: 0.13, tail: 0.42, body: 1.00 }, // typical
    { L1: 0.42, L2: 0.72, chord: 0.12, sweep: 0.18, tail: 0.36, body: 0.90 }, // long, slim wings
    { L1: 0.52, L2: 0.50, chord: 0.19, sweep: 0.09, tail: 0.48, body: 1.12 }, // broad, short wings
    { L1: 0.46, L2: 0.58, chord: 0.16, sweep: 0.22, tail: 0.55, body: 0.95 }  // swept hand, long tail
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

  // Cruise elevation of the flight path: +/-30 degrees about the horizontal.
  var MAX_ELEV = 30 * Math.PI / 180;
  // The birds are seen from 25 degrees off pure side-on, from behind.
  var VIEW = 25 * Math.PI / 180, VC = Math.cos(VIEW), VS = Math.sin(VIEW);
  var GRACE = 10;        // seconds: a flock that starts out of shot must be in frame by then

  function easeAt(t) { return 1 - Math.pow(1 - t, 1.7); }

  function newFlock() {
    var n = Math.floor(rnd(MIN_BIRDS, MAX_BIRDS + 1));
    var dur = rnd(MIN_FLIGHT, MAX_FLIGHT);
    var dir = Math.random() < 0.5 ? -1 : 1;          // flying right (+1) or left (-1)
    var elev = rnd(-MAX_ELEV, MAX_ELEV);
    var reachX = rnd(0.35, 0.7) * W;
    var x0, off = 0;
    if (Math.random() < 0.4) {
      x0 = rnd(0.1, 0.9) * W;                         // launches in shot
    } else {
      off = rnd(0.02, 0.2) * W;                       // launches out of shot, behind its heading
      x0 = dir > 0 ? -off : W + off;
      // ...and must be back in frame by GRACE seconds into the flight.
      var tIn = Math.min(GRACE / dur, 0.5);
      reachX = Math.max(reachX, (off + 0.08 * W) / easeAt(tIn));
    }
    var birds = [];
    for (var i = 0; i < n; i++) {
      birds.push({
        dx: rnd(-0.035, 0.035) * W,             // spacing within the flock,
        dy: rnd(0, 0.03) * H,                   // shrinks with distance
        size: rnd(0.5, 1.5),                    // +/-50%
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        freq: rnd(2.4, 3.5),                    // flaps per second
        // Fully random wing phase => visibly out of sync at first.
        off: rnd(0, TAU * 2),
        drift: rnd(-2.5, 2.5),                  // slow slip of the phase
        wob: rnd(0, TAU)
      });
    }
    return { t: 0, dur: dur, x0: x0, dir: dir, elev: elev, reachX: reachX,
             climb: rnd(0.10, 0.22) * H, birds: birds, clock: 0 };
  }

  // Centre of the flock at eased progress e (0..1), before per-bird spacing.
  function centre(f, e, hy) {
    var u = Math.min(1, e / 0.25);                    // initial climb-out
    var x = f.x0 + f.dir * f.reachX * e;
    var y = hy - f.climb * (1 - (1 - u) * (1 - u)) - Math.tan(f.elev) * f.reachX * e;
    return { x: x, y: Math.min(y, hy - H * 0.03) };   // stay above the hill
  }

  /* 3D-lite bird model. Bird space: x forward, y up, z out to the "near"
     wing (-z is the far wing). Viewed 25 degrees off side-on, from
     behind, so the wings foreshorten and the tail fans slightly. */
  function proj(x, y, z) {
    return [x * VC + z * VS, -y];
  }
  function poly(pts, smooth) {
    var q = pts.map(function (p) { return proj(p[0], p[1], p[2]); });
    var n = q.length, i;
    ctx.beginPath();
    if (smooth) {
      // Curve through the edge midpoints, using each point as the control.
      ctx.moveTo((q[n - 1][0] + q[0][0]) / 2, (q[n - 1][1] + q[0][1]) / 2);
      for (i = 0; i < n; i++) {
        var nx = q[(i + 1) % n];
        ctx.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + nx[0]) / 2, (q[i][1] + nx[1]) / 2);
      }
    } else {
      for (i = 0; i < n; i++) {
        if (i) ctx.lineTo(q[i][0], q[i][1]); else ctx.moveTo(q[i][0], q[i][1]);
      }
    }
    ctx.closePath();
    ctx.fill();
  }
  function wing(side, flap, lag, sh) {
    var a1 = flap, a2 = lag * 1.0 + 0.1;
    var wx = 0.0, wy = sh.L1 * Math.sin(a1), wz = side * sh.L1 * Math.cos(a1);
    var tx = wx - sh.sweep * 0.8, ty = wy + sh.L2 * Math.sin(a2), tz = wz + side * sh.L2 * Math.cos(a2);
    poly([
      [0.10, 0, 0],
      [0.08, wy * 0.5 + 0.02, wz * 0.5],
      [wx + 0.05, wy + 0.01, wz],                       // wrist (leading edge)
      [(wx + tx) / 2 + 0.02, (wy + ty) / 2 + 0.01, (wz + tz) / 2],
      [tx + 0.01, ty + 0.01, tz],                       // wing tip
      [tx - 0.08, ty - 0.02, tz - side * 0.03],         // primary feather fingers
      [tx - 0.13, ty, tz - side * 0.09],
      [tx - 0.18, ty - 0.02, tz - side * 0.15],
      [wx - sh.chord * 0.75, wy - 0.03, wz * 0.85],     // trailing edge at the wrist
      [-sh.chord * 0.7, -0.02, side * 0.10],
      [-0.10, 0, 0]
    ], true);
  }
  function drawBird(x, y, size, dir, pitch, flap, lag, alpha, sh) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size * dir, size);            // mirror so it faces the way it flies
    ctx.rotate(-pitch * dir * dir);         // nose up when climbing
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#08070c";
    wing(-1, flap, lag, sh);                // far wing
    // body
    ctx.beginPath();
    for (var k = 0; k < 20; k++) {
      var th = k / 20 * TAU;
      var q = proj(0.03 + 0.32 * Math.cos(th), 0.085 * sh.body * Math.sin(th), 0);
      if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
    }
    ctx.closePath();
    ctx.fill();
    // head and beak
    var hd = proj(0.36, 0.03, 0);
    ctx.beginPath();
    ctx.arc(hd[0], hd[1], 0.055, 0, TAU);
    ctx.fill();
    poly([[0.39, 0.05, 0], [0.47, 0.025, 0], [0.39, 0.0, 0]]);
    // tail
    poly([[-0.25, 0.0, -0.03 * sh.body], [-sh.tail, -0.03, -0.11 * sh.body],
          [-sh.tail, -0.03, 0.11 * sh.body], [-0.25, 0.0, 0.03 * sh.body]]);
    wing(1, flap, lag, sh);                 // near wing
    ctx.restore();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!flock) return;
    var t = flock.t, vis = visibility(t);
    if (vis <= 0) return;
    var hy = HORIZON * H;
    var base = Math.max(4.5, H * 0.025);   // px per unit at the start
    // Only the sky is drawn: birds rise out from behind the horizon.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, hy + H * 0.012);
    ctx.clip();
    var sync = smooth(SYNC_START, SYNC_END, t);
    var e = easeAt(t);
    var c = centre(flock, e, hy), c2 = centre(flock, Math.min(1, e + 0.002), hy);
    var pitch = Math.atan2(c.y - c2.y, Math.max(0.001, Math.abs(c2.x - c.x)));
    pitch = Math.max(-0.6, Math.min(0.9, pitch)) * 0.8;
    // Perspective: everything shrinks towards the vanishing point --
    // the birds themselves and the gaps between them, so the flock
    // visibly converges as it recedes.
    var persp = 1 - 0.82 * e;
    for (var i = 0; i < flock.birds.length; i++) {
      var b = flock.birds[i];
      var x = c.x + b.dx * persp;
      var y = c.y + b.dy * persp + Math.sin(flock.clock * 1.3 + b.wob) * 2 * persp * (1 - e);
      var size = base * b.size * persp;
      // Wing phase: shared beat + personal offset that decays to zero once
      // syncing is allowed to begin (never before SYNC_START).
      var ph = flock.clock * b.freq * TAU + (b.off + b.drift * flock.clock) * (1 - sync);
      var flap = Math.sin(ph) * 0.75 + 0.1;
      var lag = Math.sin(ph - 0.9) * 0.7;
      drawBird(x, y, size, flock.dir, pitch, flap, lag, vis, b.shape);
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
