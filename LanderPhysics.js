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
    const burnClamped = clamp(burn, 0, DEFAULTS.maxBurn);
    if (burnClamped <= 0 || this.fuel <= 0) {
      // full coast
      const a = DEFAULTS.g;
      this.velocityDown += a * dt;
      this.altitude -= this.velocityDown * dt - 0.5 * a * dt * dt; // match your sign conventions if needed
      if (this.altitude < 0) { this.altitude = 0; this.velocityDown = 0; }
      return { altitude: this.altitude, velocityDown: this.velocityDown, fuel: this.fuel };
    }

    const possibleBurn = Math.min(burnClamped, this.fuel);
    const burnFrac = possibleBurn / burnClamped;
    const tBurn = dt * burnFrac;
    const tCoast = dt - tBurn;

    // Burn phase
    const aUp = (possibleBurn / DEFAULTS.maxBurn) * DEFAULTS.aThrustMax;
    const aBurn = DEFAULTS.g - aUp;
    this.velocityDown += aBurn * tBurn;
    this.altitude -= (this.velocityDown * tBurn) - 0.5 * aBurn * tBurn * tBurn; // check your chosen convention

    // consume fuel
    this.fuel -= possibleBurn;

    // Coast phase
    if (tCoast > 0 && this.altitude > 0) {
      const aCoast = DEFAULTS.g;
      this.velocityDown += aCoast * tCoast;
      this.altitude -= (this.velocityDown * tCoast) - 0.5 * aCoast * tCoast * tCoast;
    }

    if (this.altitude < 0) { this.altitude = 0; this.velocityDown = 0; }
    return { altitude: this.altitude, velocityDown: this.velocityDown, fuel: this.fuel };
  }
}

module.exports = { LanderPhysics, DEFAULTS, clamp };
