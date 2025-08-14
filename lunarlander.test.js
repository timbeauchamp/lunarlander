
const { LanderPhysics, DEFAULTS } = require('./LanderPhysics');

describe('LanderPhysics', () => {
  let lander;
  const dt = 1; // seconds
  beforeEach(() => {
    lander = new LanderPhysics({ altitude: 1500, velocityDown: 50, fuel: 1200 });
  });

  test('initial state', () => {
    expect(lander.altitude).toBe(DEFAULTS.altitude0);
    expect(lander.velocityDown).toBe(DEFAULTS.velocity0);
    expect(lander.fuel).toBe(DEFAULTS.fuel0);
  });

  test('gravity increases downward velocity', () => {
    const initialVelocity = lander.velocityDown;
  lander.update(dt, 0);
    expect(lander.velocityDown).toBeGreaterThan(initialVelocity);
  });

  test('thrust decreases fuel and reduces downward velocity', () => {
    const initialFuel = lander.fuel;
    const initialVelocity = lander.velocityDown;
  lander.update(dt, DEFAULTS.maxBurn);
    expect(lander.fuel).toBeLessThan(initialFuel);
    expect(lander.velocityDown).toBeLessThan(initialVelocity);
  });

  test('acceleration calculation is correct', () => {
  lander.velocityDown = 0;
  lander.update(dt, DEFAULTS.maxBurn);
  // With max thrust, netAccel is negative, so velocityDown should decrease
  expect(lander.velocityDown).toBeLessThan(DEFAULTS.g * dt);
  });

  test('lander stops at ground level', () => {
  lander.altitude = 1;
  lander.velocityDown = 5;
  lander.update(dt, 0);
  expect(lander.altitude).toBeGreaterThanOrEqual(0);
  expect(lander.velocityDown).toBeGreaterThanOrEqual(0);
  });
});
