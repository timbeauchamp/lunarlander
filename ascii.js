// ascii.js - lightweight ASCII renderer for the lunar lander

const DEFAULTS = {
  dt: 10,
  g: 1.62,
  aThrustMax: 6.0,
  altitude0: 1500,
  velocity0: 50,
  fuel0: 1200,
  maxBurn: 200,
  landingSpeedSafe: 2.0,
};

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

let altitude = DEFAULTS.altitude0;
let velocityDown = DEFAULTS.velocity0;
let fuel = DEFAULTS.fuel0;
let time = 0;
let status = 'flying';

const screen = document.getElementById('screen');
const stats = document.getElementById('stats');
const input = document.getElementById('burn');
const commit = document.getElementById('commit');
const hintBtn = document.getElementById('hint');
const resetBtn = document.getElementById('reset');
const autoStep = document.getElementById('autostep');

function formatMeters(m) { if (m >= 1000) return (m/1000).toFixed(2) + ' km'; return Math.max(0,m).toFixed(0) + ' m'; }
function formatSpeed(v){ return Math.abs(v).toFixed(1) + ' m/s ' + (v>=0 ? 'down' : 'up'); }

function reset() {
  altitude = DEFAULTS.altitude0;
  velocityDown = DEFAULTS.velocity0;
  fuel = DEFAULTS.fuel0;
  time = 0;
  status = 'flying';
  input.value = 0;
  render();
}

function quickHint() {
  if (altitude < 200) return Math.ceil(DEFAULTS.maxBurn * 0.9);
  if (altitude < 500) return Math.ceil(DEFAULTS.maxBurn * 0.7);
  if (velocityDown > 40) return Math.ceil(DEFAULTS.maxBurn * 0.6);
  if (velocityDown > 20) return Math.ceil(DEFAULTS.maxBurn * 0.4);
  return Math.ceil(DEFAULTS.maxBurn * 0.2);
}

function stepOnce(burn) {
  if (status !== 'flying' && status !== 'out_of_fuel') return;
  if (altitude <= 0) return;
  let b = clamp(Math.round(burn), 0, DEFAULTS.maxBurn);
  let fuelAfter = Math.max(0, fuel - b);
  let throttle = DEFAULTS.maxBurn > 0 ? b / DEFAULTS.maxBurn : 0;
  let aUp = DEFAULTS.aThrustMax * throttle;
  let a = DEFAULTS.g - aUp; // down-positive
  let dt = DEFAULTS.dt;

  // simplistic touchdown detection: if projected altitude <=0 in dt, clamp
  let v1 = velocityDown + a*dt;
  let h1 = altitude - velocityDown*dt - 0.5*a*dt*dt;

  time += dt;
  if (h1 <= 0) {
    // approximate final velocity
    let tContact = null;
    // linear fallback
    if (Math.abs(a) < 1e-6) {
      if (velocityDown > 1e-6) tContact = altitude/velocityDown;
    } else {
      // quadratic solve
      let A = -0.5*a; // because altitude equation: h + v*t + 0.5*(-a)*t^2 ??? simplified
      // fallback: just set contact at dt
      tContact = dt;
    }
    altitude = 0;
    velocityDown = v1;
    fuel = fuelAfter;
    if (Math.abs(velocityDown) <= DEFAULTS.landingSpeedSafe) status = 'landed'; else status = 'crashed';
  } else {
    altitude = h1;
    velocityDown = v1;
    fuel = fuelAfter;
    if (fuel <= 0 && status === 'flying') status = 'out_of_fuel';
  }
  render();
}

function render() {
  // map altitude to rows (e.g., 20 rows) — higher altitude compresses
  const rows = 20;
  const cols = 60;
  const maxDisplayAlt = Math.max(500, DEFAULTS.altitude0);
  const ratio = altitude / maxDisplayAlt;
  const landerRow = Math.max(0, Math.min(rows-1, Math.floor((1 - ratio) * (rows-1))));

  // build empty screen
  let lines = [];
  for (let r=0;r<rows;r++) {
    lines.push(' '.repeat(cols).split(''));
  }

  // draw a flat landscape at bottom with some peaks
  const groundRow = rows-1;
  for (let c=0;c<cols;c++) lines[groundRow][c] = '_';

  // place lander (3x3)
  const cx = Math.floor(cols/2);
  const r = Math.max(0, Math.min(rows-2, landerRow));
  const L = [' /\\ ', '/__\\','  || '];
  for (let i=0;i<L.length;i++) {
    let line = L[i];
    for (let j=0;j<line.length;j++) {
      const col = cx - 2 + j;
      if (col>=0 && col<cols && (r+i)<rows) lines[r+i][col] = line[j];
    }
  }

  // join lines
  let out = lines.map(l => l.join('')).join('\n');

  // overlay status and stats at top
  let header = `T+${time}s  Alt=${formatMeters(altitude)}  Vel=${formatSpeed(velocityDown)}  Fuel=${fuel}  Status=${status}`;
  out = header.padEnd(cols) + '\n' + out;
  screen.textContent = out;

  stats.textContent = `Altitude: ${formatMeters(altitude)} | Velocity: ${formatSpeed(velocityDown)} | Fuel: ${fuel} | Status: ${status}`;
}

// event wiring
commit.addEventListener('click', () => stepOnce(Number(input.value)));
hintBtn.addEventListener('click', () => { input.value = quickHint(); });
resetBtn.addEventListener('click', reset);
input.addEventListener('keydown', (e) => { if (e.key==='Enter') stepOnce(Number(input.value)); });

let autoTimer = null;
autoStep.addEventListener('change', (e) => {
  if (e.target.checked) {
    autoTimer = setInterval(() => { stepOnce(Number(input.value)); }, 800);
  } else {
    clearInterval(autoTimer); autoTimer = null;
  }
});

render();
