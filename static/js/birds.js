/* Header animation: a flock of distant birds lifts off from the horizon
   and flies away (climbing 15-30 degrees, angled up to 45 degrees left or
   right of straight-away; from-behind bird model up to 15 degrees, side-on beyond), then (after a pause) the next flock.

   - One flock in flight at a time; 4-10 birds; launch point random along
     the horizon; flight lasts 10-30 s; 2-6 s pause between flocks.
   - Wings are deliberately out of sync at first and are fully in step
     by a third of the flight.
   - Transparency envelope over the flight (t = 0..1): fully see-through
     at the start, solid by t = 0.10, solid until t = 0.60, then a
     gradual fade back to fully see-through at t = 1.
   - Silhouettes only (no colour), drawn on a canvas laid over the banner
     and beneath the header text. Skipped for prefers-reduced-motion. */
(function () {
  "use strict";

  var HORIZON = 0.60;             // horizon line, as a fraction of header height
  var MIN_FLIGHT = 10, MAX_FLIGHT = 30;   // seconds
  var MIN_GAP = 2, MAX_GAP = 6;            // seconds between flocks
  var MIN_BIRDS = 4, MAX_BIRDS = 10;
  var SYNC_START = 0.10, SYNC_END = 1 / 3; // wings drift into step from solid (10%) until fully in sync at a third
  var TAU = Math.PI * 2;
  var DEG = Math.PI / 180;

  // Flight geometry. Left/right angle of the flight path, measured from
  // "straight away from the viewer", is anything from HORIZONTAL_ANGLE0 to HORIZONTAL_ANGLE2.
  // Up to HORIZONTAL_ANGLE1 the birds are drawn with the from-behind model;
  // beyond it they use the side-on model, seen SIDE_VIEW_ANGLE off pure side-on.
  var HORIZONTAL_ANGLE0 = 5 * DEG;
  var HORIZONTAL_ANGLE1 = 15 * DEG;
  var HORIZONTAL_ANGLE2 = 35 * DEG;
  var SIDE_VIEW_ANGLE = 25 * DEG;
  var MIN_CLIMB = 15 * DEG, MAX_CLIMB = 30 * DEG;   // upward angle range
  var CEILING = 0.90;             // a flight ends before reaching this fraction of the image height
  var SPEED = 0.04;               // path length flown per second, as a fraction of header height
  // Launch points are drawn uniformly from the horizon, extended this far
  // (fraction of the width) beyond the left edge: a launch there is out of
  // shot (roughly 3-7% of flocks, depending on the screen shape)...
  var OUT_OF_SHOT_MARGIN = 0.03;
  var FIRST_DELAY = 0.75;         // seconds after page load before the first flock launches
  var GRACE = 10;                 // ...and such a flock is in frame by this many seconds
  var EDGE_ZONE = 0.10;           // a launch this close to a side edge must fly inwards
  var SOLID_END = 0.60;           // a flock is fully solid until this point of its flight

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
  var waitLeft = FIRST_DELAY;   // first flock this long after the page has loaded

  function easeAt(t) { return 1 - Math.pow(1 - t, 1.7); }

  function newFlock() {
    var n = Math.floor(rnd(MIN_BIRDS, MAX_BIRDS + 1));
    var hy = HORIZON * H;
    var climb = rnd(MIN_CLIMB, MAX_CLIMB);
    // Angle and time are linked: the flight (path length = SPEED * time)
    // must end below CEILING of the image height, so a steeper climb
    // gets a shorter maximum flight time.
    var maxRise = hy - (1 - CEILING) * H;
    var maxDur = maxRise / (Math.sin(climb) * SPEED * H);
    var dur = Math.min(rnd(MIN_FLIGHT, MAX_FLIGHT), maxDur);
    var path = SPEED * H * dur;
    var sideways = path * Math.cos(climb);   // ground-plane length of the flight
    // Launch point anywhere along the horizon -- including over the woman
    // and dog: the birds and their silhouettes are both black, so a bird in
    // front of them just reads as flying behind. The range also runs
    // slightly past the left edge (an out-of-shot start).
    var xMax = W;
    var x0 = rnd(-OUT_OF_SHOT_MARGIN * W, xMax);
    // Direction: a launch left of EDGE_ZONE must fly left-to-right (positive
    // angle), one right of 1 - EDGE_ZONE must fly right-to-left (negative);
    // anywhere in between it is a coin toss.
    var sideFor = function (x, fallback) {
      return x < EDGE_ZONE * W ? 1 : x > (1 - EDGE_ZONE) * W ? -1 : fallback;
    };
    var side = sideFor(x0, Math.random() < 0.5 ? -1 : 1);
    var yaw = side * rnd(HORIZONTAL_ANGLE0, HORIZONTAL_ANGLE2);
    if (x0 < 0) {
      // Out of shot: it must drift right, into frame, within GRACE seconds.
      var reach = sideways * easeAt(Math.min(GRACE / dur, 0.5));
      var need = -x0 + 0.03 * W;
      if (reach * Math.sin(HORIZONTAL_ANGLE2) >= need) {
        yaw = rnd(Math.max(HORIZONTAL_ANGLE0, Math.asin(Math.min(1, need / reach))), HORIZONTAL_ANGLE2);
      } else {
        x0 = rnd(0.02 * W, xMax);           // can't get in frame in time: start in shot
        yaw = sideFor(x0, side) * Math.abs(yaw);
      }
    }
    // Every flock must actually cross the screen: at the end of its solid
    // phase it must still be inside the frame, so the drift is eased off
    // until it is (a flock never leaves the frame before it has been seen).
    var xSolid = function (y) { return x0 + sideways * easeAt(SOLID_END) * Math.sin(y); };
    for (var k = 0; k < 20 && Math.abs(yaw) > HORIZONTAL_ANGLE0 &&
         (xSolid(yaw) < 0.03 * W || xSolid(yaw) > 0.97 * W); k++) {
      yaw = (yaw < 0 ? -1 : 1) * Math.max(HORIZONTAL_ANGLE0, Math.abs(yaw) * 0.8);
    }
    var birds = [];
    for (var i = 0; i < n; i++) {
      birds.push({
        dx: rnd(-0.035, 0.035) * W,             // spacing within the flock,
        dy: rnd(0, 0.03) * H,                   // shrinks with distance
        size: rnd(0.5, 1.5),                    // +/-50%
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        pitchJit: rnd(-3, 3) * DEG,
        freq: rnd(2.4, 3.5),                    // flaps per second
        // Fully random wing phase => visibly out of sync at first.
        off: rnd(0, TAU * 2),
        drift: rnd(-2.5, 2.5),                  // slow slip of the phase
        wob: rnd(0, TAU)
      });
    }
    return { t: 0, dur: dur, x0: x0, yaw: yaw, climb: climb, path: path,
             birds: birds, clock: 0 };
  }

  // Centre of the flock at eased progress e (0..1), before per-bird spacing.
  function centre(f, e, hy) {
    return { x: f.x0 + f.path * e * Math.cos(f.climb) * Math.sin(f.yaw),
             y: hy - f.path * e * Math.sin(f.climb) };
  }

  /* 3D-lite bird model. Bird space: x forward, y up, z out to the bird's
     right wing. The bird is seen from behind and below: it flies away at
     `yaw` (left/right of straight away from the viewer) and climbs at
     `pitch`, so the tail is nearest, the nose is raised, and the wings
     spread almost square-on. */
  var cyaw = 0, syaw = 0, cpit = 1, spit = 0;
  function proj(x, y, z) {
    var h = x * cpit - y * spit;             // horizontal forward
    var v = x * spit + y * cpit;             // vertical
    return [h * syaw + z * cyaw, -v];
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
  function disc(x, y, z, r) {
    var q = proj(x, y, z);
    ctx.beginPath();
    ctx.arc(q[0], q[1], r, 0, TAU);
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
  function drawBird(x, y, size, yaw, pitch, flap, lag, alpha, sh) {
    cyaw = Math.cos(yaw); syaw = Math.sin(yaw);
    cpit = Math.cos(pitch); spit = Math.sin(pitch);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#08070c";
    wing(-1, flap, lag, sh);
    wing(1, flap, lag, sh);
    // body: a chain of discs along the axis, tapering at both ends
    for (var k = -4; k <= 4; k++) {
      var u = k / 4.5;
      disc(0.03 + 0.32 * u, 0, 0, 0.085 * sh.body * Math.sqrt(1 - u * u) + 0.01);
    }
    disc(0.36, 0.03, 0, 0.055);             // head
    // tail fan (nearest the viewer)
    poly([[-0.25, 0.0, -0.03 * sh.body], [-sh.tail, -0.02, -0.11 * sh.body],
          [-sh.tail, -0.02, 0.11 * sh.body], [-0.25, 0.0, 0.03 * sh.body]]);
    ctx.restore();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!flock) return;
    var t = flock.t, vis = visibility(t);
    if (vis <= 0) return;
    var hy = HORIZON * H;
    var base = Math.max(6, H * 0.028) * 1.15;   // px per unit at the start
    // Only the sky is drawn: birds rise out from behind the horizon.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, hy + H * 0.012);
    ctx.clip();
    var sync = smooth(SYNC_START, SYNC_END, t);
    var e = easeAt(t);
    var c = centre(flock, e, hy);
    // Perspective: everything shrinks towards the vanishing point --
    // the birds themselves and the gaps between them, so the flock
    // visibly converges as it recedes.
    var persp = 1 - 0.82 * e;
    // Bird model: from behind for shallow angles, else side-on.
    var ay = Math.abs(flock.yaw);
    var viewYaw = ay <= HORIZONTAL_ANGLE1 ? flock.yaw
      : (flock.yaw < 0 ? -1 : 1) * (Math.PI / 2 - SIDE_VIEW_ANGLE);
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
      drawBird(x, y, size, viewYaw, flock.climb + b.pitchJit, flap, lag, vis, b.shape);
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
  // The clock starts once the page has fully loaded.
  if (document.readyState === "complete") window.requestAnimationFrame(frame);
  else window.addEventListener("load", function () { window.requestAnimationFrame(frame); });
})();
