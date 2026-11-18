// FROSTLINE DUEL: two players, one keyboard.
// P1: A/D move, W jump (twice), S drop through, F shoot
// P2: Left/Right move, Up jump (twice), Down drop through, / shoot
// Enter starts a match. First to 3 round wins.

const W = 960, H = 540, GRAV = 0.6, FLOOR = 480;
const held = {};
function isHeld(code) { return !!held[code]; }
const platforms = [
  { x: 90, y: 370, w: 180 }, { x: 690, y: 370, w: 180 },
  { x: 390, y: 300, w: 180 }, { x: 200, y: 215, w: 150 }, { x: 610, y: 215, w: 150 }
];
const pad = { x: 440, w: 80 };
let players = [], bullets = [], sparks = [], flakes = [], ridges = [];
let state = 'ready', wins = [0, 0], banner = '', endFrame = 0;

class Player {
  constructor(i) {
    this.i = i; this.w = 28; this.h = 44;
    this.col = i === 0 ? color(76, 201, 240) : color(255, 159, 28);
    this.keys = i === 0 ? { l: 65, r: 68, d: 83, s: 70 } : { l: 37, r: 39, d: 40, s: 191 };
    this.reset();
  }
  reset() {
    this.x = this.i === 0 ? 110 : W - 140; this.y = FLOOR - this.h;
    this.vx = 0; this.vy = 0; this.face = this.i === 0 ? 1 : -1;
    this.hp = 100; this.cd = 0; this.jumps = 2; this.hit = 0; this.onGround = true;
  }
  jump() {
    if (this.jumps > 0 && state === 'play') { this.vy = -12.5; this.jumps--; }
  }
  update() {
    const k = this.keys, dir = (isHeld(k.r) ? 1 : 0) - (isHeld(k.l) ? 1 : 0);
    if (dir) { this.vx += dir * 0.9; this.face = dir; }
    this.vx *= this.onGround ? 0.8 : 0.93;
    this.vx = constrain(this.vx, -7, 7);
    if (isHeld(k.s) && this.cd <= 0) this.shoot();
    this.cd--; this.hit--;
    const prevBottom = this.y + this.h;
    this.vy += GRAV; this.x += this.vx; this.y += this.vy;
    this.x = constrain(this.x, 0, W - this.w);
    this.onGround = false;
    const bottom = this.y + this.h;
    if (bottom >= FLOOR) { this.y = FLOOR - this.h; this.vy = 0; this.onGround = true; }
    else if (this.vy >= 0 && !isHeld(k.d)) {
      for (const p of platforms) {
        if (this.x + this.w > p.x && this.x < p.x + p.w && prevBottom <= p.y + 1 && bottom >= p.y) {
          this.y = p.y - this.h; this.vy = 0; this.onGround = true;
        }
      }
    }
    if (this.onGround) {
      this.jumps = 2;
      const cx = this.x + this.w / 2;
      if (this.y + this.h >= FLOOR && cx > pad.x && cx < pad.x + pad.w) { this.vy = -20; this.onGround = false; burst(cx, FLOOR, color(255, 240, 150), 12); }
    }
  }
  shoot() {
    this.cd = 18;
    bullets.push({ x: this.x + this.w / 2 + this.face * 20, y: this.y + 22, vx: this.face * 13, o: this.i, c: this.col });
    this.vx -= this.face * 1.2;
  }
  draw() {
    push();
    const flash = this.hit > 0 && frameCount % 4 < 2;
    noStroke();
    fill(flash ? 255 : this.col);
    rect(this.x, this.y + 12, this.w, this.h - 12, 8);
    fill(flash ? 255 : lerpColor(this.col, color(255), 0.5));
    circle(this.x + this.w / 2, this.y + 10, 24);
    fill(20); circle(this.x + this.w / 2 + this.face * 6, this.y + 9, 5);
    fill(240); rect(this.x + this.w / 2 + (this.face > 0 ? 6 : -28), this.y + 24, 22, 6, 2);
    fill(this.col); rect(this.x + (this.face > 0 ? -6 : this.w - 4), this.y + 16, 10, 5, 2);
    pop();
  }
}

function burst(x, y, c, n) {
  for (let i = 0; i < n; i++) sparks.push({ x, y, vx: random(-3, 3), vy: random(-4, 1), life: 25, c });
}

function setup() {
  createCanvas(W, H);
  textFont('Helvetica Neue, Arial, sans-serif');
  players = [new Player(0), new Player(1)];
  for (let i = 0; i < 90; i++) flakes.push({ x: random(W), y: random(H), s: random(1, 3), v: random(0.4, 1.4) });
  randomSeed(7);
  for (let l = 0; l < 3; l++) {
    const pts = []; for (let x = 0; x <= W + 60; x += 60) pts.push(random(0, 1));
    ridges.push(pts);
  }
}

function startRound() { players.forEach(p => p.reset()); bullets = []; state = 'play'; }

function keyPressed() {
  held[keyCode] = true;
  if (keyCode === 87) players[0].jump();
  if (keyCode === 38) players[1].jump();
  if (keyCode === 13 && (state === 'ready' || state === 'matchEnd')) { wins = [0, 0]; startRound(); }
  return false;
}

function keyReleased() {
  held[keyCode] = false;
  return false;
}

function mousePressed() {
  if (state === 'ready' || state === 'matchEnd') { wins = [0, 0]; startRound(); }
}

function draw() {
  drawBackdrop();
  drawMap();
  if (state === 'play') {
    players.forEach(p => p.update());
    updateBullets();
    for (const p of players) {
      if (p.hp <= 0) {
        const w = 1 - p.i; wins[w]++;
        banner = 'Player ' + (w + 1) + ' takes the round';
        state = wins[w] >= 3 ? 'matchEnd' : 'roundEnd'; endFrame = frameCount;
        if (state === 'matchEnd') banner = 'Player ' + (w + 1) + ' wins the match';
        break;
      }
    }
  }
  if (state === 'roundEnd' && frameCount - endFrame > 80) startRound();
  players.forEach(p => p.draw());
  bullets.forEach(b => { noStroke(); fill(b.c); ellipse(b.x, b.y, 14, 6); fill(255); ellipse(b.x, b.y, 6, 3); });
  sparks = sparks.filter(s => s.life-- > 0);
  sparks.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.2; fill(red(s.c), green(s.c), blue(s.c), s.life * 10); noStroke(); circle(s.x, s.y, 4); });
  drawHud();
}

function updateBullets() {
  for (const b of bullets) {
    b.x += b.vx;
    const t = players[1 - b.o];
    if (b.x > t.x && b.x < t.x + t.w && b.y > t.y && b.y < t.y + t.h) {
      t.hp -= 12; t.hit = 14; t.vx += Math.sign(b.vx) * 6; t.vy -= 3;
      burst(b.x, b.y, b.c, 10); b.dead = true;
    }
    if (b.x < -20 || b.x > W + 20) b.dead = true;
  }
  bullets = bullets.filter(b => !b.dead);
}

function drawBackdrop() {
  for (let y = 0; y < H; y += 4) { stroke(lerpColor(color(8, 12, 32), color(60, 40, 110), y / H)); line(0, y, W, y + 4); }
  noStroke(); fill(235, 240, 255); circle(780, 90, 70); fill(8, 12, 32, 40); circle(768, 82, 70);
  const cols = [color(40, 50, 100), color(30, 38, 80), color(20, 26, 58)];
  ridges.forEach((pts, l) => {
    fill(cols[l]); beginShape(); vertex(0, H);
    pts.forEach((v, i) => vertex(i * 60, 200 + l * 70 - v * (120 - l * 20)));
    vertex(W + 60, H); endShape(CLOSE);
  });
  fill(255, 255, 255, 160);
  flakes.forEach(f => { f.y += f.v; f.x += sin((f.y + f.s * 40) / 50) * 0.4; if (f.y > H) { f.y = -4; f.x = random(W); } circle(f.x, f.y, f.s); });
}

function drawMap() {
  noStroke();
  fill(190, 225, 245); rect(0, FLOOR, W, H - FLOOR);
  fill(240, 250, 255); rect(0, FLOOR, W, 6);
  fill(255, 220, 90); rect(pad.x, FLOOR - 4, pad.w, 10, 4);
  fill(255, 255, 255, 150); triangle(pad.x + 20, FLOOR - 6, pad.x + 40, FLOOR - 26, pad.x + 60, FLOOR - 6);
  for (const p of platforms) {
    fill(120, 190, 230); rect(p.x, p.y, p.w, 16, 5);
    fill(235, 248, 255); rect(p.x, p.y, p.w, 5, 3);
    fill(200, 235, 255, 200); for (let i = 12; i < p.w - 8; i += 30) triangle(p.x + i, p.y + 16, p.x + i + 8, p.y + 16, p.x + i + 4, p.y + 28);
  }
}

function drawHud() {
  players.forEach((p, i) => {
    const x = i === 0 ? 30 : W - 330;
    noStroke(); fill(0, 0, 0, 120); rect(x, 24, 300, 18, 9);
    fill(p.col); rect(x, 24, 300 * max(p.hp, 0) / 100, 18, 9);
    fill(255); textSize(14); textAlign(i === 0 ? LEFT : RIGHT);
    text('Player ' + (i + 1), i === 0 ? x : x + 300, 62);
    for (let w = 0; w < 3; w++) { fill(w < wins[i] ? p.col : color(255, 255, 255, 50)); circle(i === 0 ? x + 8 + w * 22 : x + 292 - w * 22, 78, 14); }
  });
  textAlign(CENTER); fill(255);
  if (state === 'ready') {
    textSize(56); text('Frostline Duel', W / 2, 190);
    textSize(18); text('Player 1: A and D move, W jump, S drop, F shoot', W / 2, 250);
    text('Player 2: arrow keys move and jump, down drops, / shoots', W / 2, 280);
    text('Land on the yellow pad for a big launch. Click the game first, then press Enter.', W / 2, 320);
  } else if (state === 'roundEnd' || state === 'matchEnd') {
    textSize(40); text(banner, W / 2, 200);
    if (state === 'matchEnd') { textSize(18); text('Press Enter for a rematch', W / 2, 240); }
  }
}