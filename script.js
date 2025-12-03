/* script.js
   - small centered heart animation:
     * heart graphic slides in from top to center (origin animation)
     * after arrival, particles emit from heart outline
     * gradient of heart pulses (hue shift) over time
   - left nav icons are keyboard accessible (handled in HTML/CSS)
   - quick arrow button reveals "StartDating..." on hover (CSS)
*/

/* Accessibility: make nav icons keyboard-activatable */
document.querySelectorAll('.nav-icon').forEach(btn => {
  btn.setAttribute('tabindex', '0');
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      btn.click();
    }
  });
});

/* -------------------------
   Particle heart animation
   ------------------------- */

const settings = {
  particles: {
    length: 2200,
    duration: 3.2,
    velocity: 36,
    effect: -1.2,
    size: 10
  },
  gradientCycleSpeed: 18, // degrees per second (faster for visible pulse)
  heartSlideDuration: 1.1 // seconds for heart to slide in
};

/* rAF polyfill (keeps original behavior) */
(function () {
  var last = 0;
  var vendors = ['ms', 'moz', 'webkit', 'o'];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    window.requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[i] + 'CancelAnimationFrame'] ||
      window[vendors[i] + 'CancelRequestAnimationFrame'];
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (cb) {
      var now = new Date().getTime();
      var dt = Math.max(0, 16 - (now - last));
      var id = setTimeout(function () { cb(now + dt); }, dt);
      last = now + dt;
      return id;
    };
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function (id) { clearTimeout(id); };
  }
})();

/* Geometry & particle classes (kept compact) */
function Point(x, y) { this.x = x || 0; this.y = y || 0; }
Point.prototype.clone = function () { return new Point(this.x, this.y); };
Point.prototype.length = function (len) {
  if (typeof len === 'undefined') return Math.sqrt(this.x * this.x + this.y * this.y);
  this.normalize(); this.x *= len; this.y *= len; return this;
};
Point.prototype.normalize = function () {
  var l = Math.sqrt(this.x * this.x + this.y * this.y) || 1;
  this.x /= l; this.y /= l; return this;
};

function Particle() {
  this.position = new Point();
  this.velocity = new Point();
  this.acceleration = new Point();
  this.age = 0;
}
Particle.prototype.initialize = function (x, y, dx, dy) {
  this.position.x = x; this.position.y = y;
  this.velocity.x = dx; this.velocity.y = dy;
  this.acceleration.x = dx * settings.particles.effect;
  this.acceleration.y = dy * settings.particles.effect;
  this.age = 0;
};
Particle.prototype.update = function (dt) {
  this.position.x += this.velocity.x * dt;
  this.position.y += this.velocity.y * dt;
  this.velocity.x += this.acceleration.x * dt;
  this.velocity.y += this.acceleration.y * dt;
  this.age += dt;
};
Particle.prototype.draw = function (ctx, img) {
  function ease(t) { return --t * t * t + 1; }
  var size = img.width * ease(this.age / settings.particles.duration);
  ctx.globalAlpha = Math.max(0, 1 - this.age / settings.particles.duration);
  ctx.drawImage(img, this.position.x - size / 2, this.position.y - size / 2, size, size);
};

function ParticlePool(length) {
  this.particles = new Array(length);
  for (var i = 0; i < length; i++) this.particles[i] = new Particle();
  this.firstActive = 0; this.firstFree = 0; this.duration = settings.particles.duration;
}
ParticlePool.prototype.add = function (x, y, dx, dy) {
  var p = this.particles[this.firstFree];
  p.initialize(x, y, dx, dy);
  this.firstFree++; if (this.firstFree === this.particles.length) this.firstFree = 0;
  if (this.firstActive === this.firstFree) { this.firstActive++; if (this.firstActive === this.particles.length) this.firstActive = 0; }
};
ParticlePool.prototype.update = function (dt) {
  var i;
  if (this.firstActive < this.firstFree) {
    for (i = this.firstActive; i < this.firstFree; i++) this.particles[i].update(dt);
  }
  if (this.firstFree < this.firstActive) {
    for (i = this.firstActive; i < this.particles.length; i++) this.particles[i].update(dt);
    for (i = 0; i < this.firstFree; i++) this.particles[i].update(dt);
  }
  while (this.particles[this.firstActive].age >= this.duration && this.firstActive !== this.firstFree) {
    this.firstActive++; if (this.firstActive === this.particles.length) this.firstActive = 0;
  }
};
ParticlePool.prototype.draw = function (ctx, img) {
  if (this.firstActive < this.firstFree) {
    for (var i = this.firstActive; i < this.firstFree; i++) this.particles[i].draw(ctx, img);
  }
  if (this.firstFree < this.firstActive) {
    for (var j = this.firstActive; j < this.particles.length; j++) this.particles[j].draw(ctx, img);
    for (var k = 0; k < this.firstFree; k++) this.particles[k].draw(ctx, img);
  }
};

/* Main animation: heart slides in then emits particles */
(function (canvas) {
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var ratio = window.devicePixelRatio || 1;
  var pool = new ParticlePool(settings.particles.length);
  var particleRate = settings.particles.length / settings.particles.duration;
  var last = 0;
  var hue = 330; // start near vidate pink
  var slideStart = null;
  var heartArrived = false;
  var heartImage = null;

  // scaled-down heart parametric
  function pointOnHeart(t) {
    return new Point(
      80 * Math.pow(Math.sin(t), 3),
      65 * Math.cos(t) - 25 * Math.cos(2 * t) - 10 * Math.cos(3 * t) - 5 * Math.cos(4 * t) + 12
    );
  }

  function createHeartImage(h) {
    var c = document.createElement('canvas');
    var s = settings.particles.size;
    c.width = s; c.height = s;
    var cctx = c.getContext('2d');

    function to(t) {
      var p = pointOnHeart(t);
      p.x = s / 2 + (p.x * s) / 220;
      p.y = s / 2 - (p.y * s) / 220;
      return p;
    }

    cctx.beginPath();
    var t = -Math.PI;
    var p = to(t);
    cctx.moveTo(p.x, p.y);
    while (t < Math.PI) {
      t += 0.01;
      p = to(t);
      cctx.lineTo(p.x, p.y);
    }
    cctx.closePath();

    var h1 = (h % 360 + 360) % 360;
    var h2 = (h1 + 40) % 360;
    var col1 = 'hsl(' + h1 + ' 85% 60%)';
    var col2 = 'hsl(' + h2 + ' 75% 55%)';
    var grad = cctx.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, col1);
    grad.addColorStop(1, col2);
    cctx.fillStyle = grad;
    cctx.fill();

    var img = new Image();
    img.src = c.toDataURL();
    return img;
  }

  function onResize() {
    ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(canvas.clientWidth * ratio);
    canvas.height = Math.floor(canvas.clientHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  window.addEventListener('resize', onResize);
  onResize();

  // slide animation: heart starts above canvas and slides to center
  function slideProgress(nowSec) {
    if (!slideStart) slideStart = nowSec;
    var t = Math.min(1, (nowSec - slideStart) / settings.heartSlideDuration);
    // easeOutCubic
    return 1 - Math.pow(1 - t, 3);
  }

  function render(now) {
    requestAnimationFrame(render);
    now = now / 1000;
    var dt = last ? now - last : 0;
    last = now;

    // hue pulse
    hue += settings.gradientCycleSpeed * dt;
    if (hue >= 360) hue -= 360;

    // update heart image occasionally
    if (!heartImage || (render._acc && render._acc > 0.18)) {
      heartImage = createHeartImage(hue);
      render._acc = 0;
    }
    render._acc = (render._acc || 0) + dt;

    // clear
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);

    // center coordinates (CSS pixels)
    var cx = canvas.clientWidth / 2;
    var cy = canvas.clientHeight / 2;

    // slide-in position (y)
    var progress = slideProgress(now);
    var startY = -canvas.clientHeight * 0.35;
    var targetY = cy;
    var currentY = startY + (targetY - startY) * progress;

    // draw a subtle glow behind heart (so it feels listening)
    var glowR = 80 + Math.sin(now * 2) * 6;
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(236,72,153,0.06)';
    ctx.arc(cx, currentY, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // once slide completes, mark arrived and start stronger particle emission
    if (progress >= 1) heartArrived = true;

    // spawn particles: before arrival spawn few, after arrival spawn more intimate ones
    var spawnFactor = heartArrived ? 1.0 : 0.18;
    var amount = particleRate * dt * spawnFactor;
    for (var i = 0; i < amount; i++) {
      var pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
      var dir = pos.clone().length(settings.particles.velocity * (0.5 + Math.random() * 0.8));
      pool.add(
        cx + pos.x,
        currentY - pos.y,
        dir.x * (0.5 + Math.random() * 0.6),
        -dir.y * (0.5 + Math.random() * 0.6)
      );
    }

    pool.update(dt);
    pool.draw(ctx, heartImage);

    // draw a larger heart silhouette sliding in (for the origin animation)
    // draw the heart image scaled up at the currentY center for a short moment
    var silhouetteScale = 1.6 - 0.6 * progress; // shrink to normal as it arrives
    var s = settings.particles.size * silhouetteScale * 2.2;
    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - Math.max(0, progress - 0.9) * 10); // fade out after arrival
    // draw a composite heart using the generated image tiled to form a silhouette
    ctx.drawImage(heartImage, cx - s / 2, currentY - s / 2, s, s);
    ctx.restore();
  }

  requestAnimationFrame(render);
})(document.getElementById('pinkboard'));