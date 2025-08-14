// LanderPhysics.js
// Pure JS module for lunar lander physics calculations

const DEFAULTS = {
  g: 1.62, // lunar gravity (m/s^2)
  aThrustMax: 6.0, // max upward accel at full burn (m/s^2)
  altitude0: 1500, // meters
  velocity0: 50, // m/s downward (down-positive)
  fuel0: 1200, // arbitrary units
  maxBurn: 200, // max burn units per turn
  landingSpeedSafe: 2.0, // m/s threshold for safe landing
};

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

class LanderPhysics {
  constructor({ altitude, velocityDown, fuel } = {}) {
    this.altitude = altitude ?? DEFAULTS.altitude0;
    this.velocityDown = velocityDown ?? DEFAULTS.velocity0;
    this.fuel = fuel ?? DEFAULTS.fuel0;
  }

  applyThrust(burn) {
    const burnClamped = clamp(burn, 0, DEFAULTS.maxBurn);
    const thrustAccel = (burnClamped / DEFAULTS.maxBurn) * DEFAULTS.aThrustMax;
    if (this.fuel >= burnClamped) {
      this.fuel -= burnClamped;
      return thrustAccel;
    }
    return 0;
  }

  update(dt, burn) {
    // dt: time step in seconds
    // burn: units of fuel to burn
    const thrustAccel = this.applyThrust(burn);
    const netAccel = DEFAULTS.g - thrustAccel;
    this.velocityDown += netAccel * dt;
    this.altitude -= this.velocityDown * dt;
    if (this.altitude < 0) {
      this.altitude = 0;
      this.velocityDown = 0;
    }
    return {
      altitude: this.altitude,
      velocityDown: this.velocityDown,
      fuel: this.fuel,
    };
  }
}

module.exports = { LanderPhysics, DEFAULTS, clamp };
