// LunarLander.js — Plain JS (no JSX, no TypeScript), React.createElement only
// Requires: index.html that loads Tailwind (optional styling), and index.js that renders this component.
// Imports React as an ES module so the browser can run it directly.

import React from "https://esm.sh/react@18";

const DEFAULTS = {
  dt: 10, // seconds per turn
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

function formatMeters(m) {
  if (m >= 1000) return (m / 1000).toFixed(2) + " km";
  return m.toFixed(1) + " m";
}

function formatSpeed(vDown) {
  var v = Math.abs(vDown);
  if (v >= 1000) return (v / 1000).toFixed(2) + " km/s";
  return v.toFixed(2) + " m/s " + (vDown >= 0 ? "down" : "up");
}

function formatFuel(f) {
  return Math.max(0, f).toFixed(0) + " u";
}

function interpolateTouchdown(h, vDown, aNet, dt) {
  // Solve 0.5*a*t^2 + v*t - h = 0 for t in (0, dt]
  var A = 0.5 * aNet;
  var B = vDown;
  var C = -h; // <-- key fix

  var tContact = null;

  if (Math.abs(A) < 1e-8) {
    // Linear: h - v*t = 0  =>  t = h / v
    if (B > 1e-8) {
      var t = h / B; // <-- not -h/B
      if (t > 0 && t <= dt) tContact = t;
    }
  } else {

    var disc = B * B - 4 * A * C;
    // Guard against tiny negative due to FP error
    if (disc < 0 && disc > -1e-12) disc = 0;
      if (disc >= 0) {
      var sqrt = Math.sqrt(disc);
      var t1 = (-B + sqrt) / (2 * A);
      var t2 = (-B - sqrt) / (2 * A);
      var candidates = [t1, t2].filter(function (t) { return t > 0 && t <= dt; });
      if (candidates.length) tContact = Math.min.apply(null, candidates);
    }
  }

  if (tContact == null) return null;
  var vAtContact = vDown + aNet * tContact;
  return { tContact: tContact, vAtContact: vAtContact };
}

function StatCard(props) {
  return React.createElement(
    "div",
    { className: "rounded-2xl border border-zinc-200 bg-zinc-50 p-3" },
    React.createElement("div", { className: "text-xs text-zinc-600" }, props.label),
    React.createElement(
      "div",
      { className: "text-lg font-semibold tracking-tight" },
      props.value
    )
  );
}

function Tuner(props) {
  return React.createElement(
    "div",
    { className: "mb-3" },
    React.createElement(
      "div",
      { className: "flex items-center justify-between text-sm mb-1" },
      React.createElement("label", { className: "text-zinc-700" }, props.label),
      React.createElement("div", { className: "font-mono text-zinc-900" }, String(props.value))
    ),
    React.createElement("input", {
      type: "range",
      min: props.min,
      max: props.max,
      step: props.step,
      value: props.value,
      onChange: function (e) { props.onChange(Number(e.target.value)); },
      className: "w-full accent-indigo-600",
    })
  );
}

function StatusBanner(props) {
  var title = "Flight in progress";
  var sub = "Keep your vertical speed under " + props.landingSpeedSafe.toFixed(1) + " m/s at touchdown.";
  var cls = "bg-indigo-50 border-indigo-200 text-indigo-900";
  if (props.status === "landed") {
    title = "Touchdown — Safe!";
    sub = "Nicely done, Commander. The flag awaits.";
    cls = "bg-emerald-50 border-emerald-200 text-emerald-900";
  } else if (props.status === "crashed") {
    title = "Impact detected";
    sub = "Telemetry suggests a rapid lithobraking event.";
    cls = "bg-rose-50 border-rose-200 text-rose-900";
  } else if (props.status === "out_of_fuel") {
    title = "Fuel exhausted";
    sub = "Ballistic descent engaged. Choose your last words wisely.";
    cls = "bg-amber-50 border-amber-200 text-amber-900";
  }
  return React.createElement(
    "div",
    { className: "rounded-2xl border p-4 " + cls },
    React.createElement("div", { className: "text-sm font-semibold" }, title),
    React.createElement("div", { className: "text-xs" }, sub)
  );
}

export default function LunarLander() {
  const ReactHooks = React; // alias to avoid long names
  const useState = React.useState;
  const useMemo = React.useMemo;
  const useRef = React.useRef;
  const useEffect = React.useEffect;

  const _s = useState(DEFAULTS);
  const params = _s[0];
  const setParams = _s[1];

  const _a = useState(DEFAULTS.altitude0);
  const altitude = _a[0];
  const setAltitude = _a[1];

  const _v = useState(DEFAULTS.velocity0);
  const velocityDown = _v[0];
  const setVelocityDown = _v[1];

  const _f = useState(DEFAULTS.fuel0);
  const fuel = _f[0];
  const setFuel = _f[1];

  const _t = useState(0);
  const time = _t[0];
  const setTime = _t[1];

  const _b = useState(0);
  const burn = _b[0];
  const setBurn = _b[1];

  const _st = useState("flying");
  const status = _st[0];
  const setStatus = _st[1];

  const _log = useState([]);
  const log = _log[0];
  const setLog = _log[1];

  const _howToPlayOpen = useState(true);
  const howToPlayOpen = _howToPlayOpen[0];
  const setHowToPlayOpen = _howToPlayOpen[1];

  const _tuningOpen = useState(false);
  const tuningOpen = _tuningOpen[0];
  const setTuningOpen = _tuningOpen[1];

  const inputRef = useRef(null);

  const throttleFraction = useMemo(function () {
    var f = params.maxBurn <= 0 ? 0 : clamp(burn, 0, params.maxBurn) / params.maxBurn;
    return isFinite(f) ? f : 0;
  }, [burn, params.maxBurn]);

  const aNet = useMemo(function () {
    var aUp = params.aThrustMax * throttleFraction;
    return params.g - aUp; // down-positive
  }, [params.g, params.aThrustMax, throttleFraction]);

// Allow steps in free-fall after fuel runs out
  const canSubmit = (status === "flying" || status === "out_of_fuel") && altitude > 0;

  function pushLog(line) {
    setLog(function (prev) { return [line].concat(prev).slice(0, 200); });
  }

  function reset(allDefaults) {
    if (allDefaults === void 0) allDefaults = false;
    var p = allDefaults ? DEFAULTS : params;
    setParams(p);
    setAltitude(p.altitude0);
    setVelocityDown(p.velocity0);
    setFuel(p.fuel0);
    setTime(0);
    setBurn(0);
    setStatus("flying");
    setLog([
      "CONTROL: Lunar Module powered descent initialized.",
      "Starting Altitude: " + formatMeters(p.altitude0) + ", Velocity: " + formatSpeed(p.velocity0) + ", Fuel: " + formatFuel(p.fuel0),
      "Time step: " + p.dt + "s, Max burn/turn: " + p.maxBurn + ", Max upward accel: " + p.aThrustMax.toFixed(2) + " m/s²",
    ]);
    setTimeout(function () { if (inputRef.current) inputRef.current.focus(); }, 50);
  }

  useEffect(function () { reset(true); }, []);

  function stepOnce() {
    if (!canSubmit) return;
    
    // Check if we're already on the ground
    if (altitude <= 0) {
      if (Math.abs(velocityDown) <= params.landingSpeedSafe) {
        setStatus("landed");
        pushLog("TOUCHDOWN — SAFE LANDING! Vertical speed: " + formatSpeed(velocityDown));
      } else {
        setStatus("crashed");
        pushLog("IMPACT — CRASH. Vertical speed: " + formatSpeed(velocityDown));
      }
      return;
    }
    
    var b = clamp(Math.round(burn), 0, params.maxBurn);
    var fuelAfter = Math.max(0, fuel - b);
    var throttle = params.maxBurn > 0 ? b / params.maxBurn : 0;
    var aUp = params.aThrustMax * throttle;
    var a = params.g - aUp; // down-positive
    var dt = params.dt;

    // Log the burn first, before we check for touchdown
    var initialTime = time;
    var burnLogLine = "T+" + (initialTime + dt) + "s | Burn=" + b;
    if (fuel <= 0 && b > 0) burnLogLine += " (No fuel to burn!)";

    if (altitude > 0) {
      var touchdown = interpolateTouchdown(altitude, velocityDown, a, dt);
      if (touchdown) {
        var tContact = touchdown.tContact;
        var vAtContact = touchdown.vAtContact;
        var newTime = time + tContact;
        
        // Log the partial burn for the time until touchdown
        var partialBurnLog = "T+" + newTime.toFixed(1) + "s | Burn=" + b + " (partial) | Contact imminent";
        pushLog(partialBurnLog);
        
        setTime(newTime);
        setAltitude(0);
        setVelocityDown(vAtContact);
        setFuel(fuelAfter);
        if (Math.abs(vAtContact) <= params.landingSpeedSafe) {
          setStatus("landed");
          pushLog("TOUCHDOWN at T+" + newTime.toFixed(1) + "s — SAFE LANDING! Vertical speed: " + formatSpeed(vAtContact));
        } else {
          setStatus("crashed");
          pushLog("IMPACT at T+" + newTime.toFixed(1) + "s — CRASH. Vertical speed: " + formatSpeed(vAtContact));
        }
        return;
      }
    }

    // advance full dt
    var v1 = velocityDown + a * dt;
    var h1 = altitude - velocityDown * dt - 0.5 * a * dt * dt;
    var newTime2 = time + dt;
    setTime(newTime2);
    setAltitude(h1);
    setVelocityDown(v1);
    setFuel(fuelAfter);

    var line = burnLogLine + " | Alt=" + formatMeters(h1) + " | Vel=" + formatSpeed(v1) + " | Fuel=" + formatFuel(fuelAfter);
    if (fuelAfter <= 0 && status === "flying") {
      setStatus("out_of_fuel");
      pushLog("WARNING: Fuel exhausted. You are in ballistic descent.");
    }
    pushLog(line);
  }

  function quickHint() {
    if (altitude < 200) return Math.ceil(params.maxBurn * 0.9);
    if (altitude < 500) return Math.ceil(params.maxBurn * 0.7);
    if (velocityDown > 40) return Math.ceil(params.maxBurn * 0.6);
    if (velocityDown > 20) return Math.ceil(params.maxBurn * 0.4);
    return Math.ceil(params.maxBurn * 0.2);
  }

  var disabled = status !== "flying";

  return React.createElement(
    "div",
    { className: "min-h-screen w-full bg-zinc-50 text-zinc-900 flex items-start justify-center p-6" },
    React.createElement(
      "div",
      { className: "w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6" },
      // Left panel
      React.createElement(
        "div",
        { className: "lg:col-span-2" },
        React.createElement(
          "div",
          { className: "rounded-2xl shadow-sm bg-white border border-zinc-200 p-6" },
          React.createElement(
            "h1",
            { className: "text-2xl font-semibold tracking-tight mb-2" },
            "Text-Based Lunar Lander"
          ),
          React.createElement(
            "p",
            { className: "text-sm text-zinc-600 mb-4" },
            "Channel your inner 1970. Each turn is ", String(params.dt), "s. Enter a burn value between 0 and ", String(params.maxBurn), 
            ". The higher the burn, the more upward acceleration. Land softly!"
          ),
          React.createElement(
            "div",
            { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" },
            React.createElement(StatCard, { label: "Time", value: time.toFixed(1) + " s" }),
            React.createElement(StatCard, { label: "Altitude", value: formatMeters(Math.max(0, altitude)) }),
            React.createElement(StatCard, { label: "Velocity", value: formatSpeed(velocityDown) }),
            React.createElement(StatCard, { label: "Fuel", value: formatFuel(fuel) })
          ),
          // Input controls
          React.createElement(
            "div",
            { className: "flex items-center gap-3 mb-3" },
            React.createElement(
              "label",
              { htmlFor: "burn", className: "text-sm font-medium w-24" },
              "Burn"
            ),
            React.createElement("input", {
              id: "burn",
              type: "number",
              ref: inputRef,
              min: 0,
              max: params.maxBurn,
              step: 1,
              value: burn,
              disabled: disabled,
              onChange: function (e) { setBurn(clamp(parseInt(e.target.value || "0", 10), 0, params.maxBurn)); },
              onKeyDown: function (e) { if (e.key === "Enter") stepOnce(); },
              className: "flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
              placeholder: "0 - " + String(params.maxBurn),
            }),
            React.createElement(
              "button",
              {
                onClick: stepOnce,
                disabled: !canSubmit,
                className: "rounded-2xl px-4 py-2 text-sm font-medium bg-indigo-600 text-white disabled:opacity-40 shadow-sm hover:bg-indigo-500",
              },
              "Commit Turn"
            ),
            React.createElement(
              "button",
              {
                onClick: function () { setBurn(quickHint()); },
                disabled: disabled,
                className: "rounded-2xl px-3 py-2 text-xs font-medium bg-zinc-200 text-zinc-900 disabled:opacity-40 hover:bg-zinc-300",
              },
              "Hint"
            )
          ),
          // Throttle bar
          React.createElement(
            "div",
            { className: "mb-6" },
            React.createElement(
              "div",
              { className: "text-xs text-zinc-600 mb-1" },
              "Throttle: ", Math.round(throttleFraction * 100), "%"
            ),
            React.createElement(
              "div",
              { className: "w-full h-3 bg-zinc-100 rounded-full" },
              React.createElement("div", {
                className: "h-3 rounded-full bg-indigo-500",
                style: { width: clamp(throttleFraction * 100, 0, 100) + "%" },
              })
            )
          ),
          React.createElement(StatusBanner, { status: status, landingSpeedSafe: params.landingSpeedSafe }),
          React.createElement(
            "div",
            { className: "flex flex-wrap items-center gap-3 mt-4" },
            React.createElement(
              "button",
              {
                onClick: function () { reset(false); },
                className: "rounded-2xl px-4 py-2 text-sm font-medium bg-white border border-zinc-300 hover:bg-zinc-50",
              },
              "Reset (keep tuning)"
            ),
            React.createElement(
              "button",
              {
                onClick: function () { reset(true); },
                className: "rounded-2xl px-4 py-2 text-sm font-medium bg-white border border-zinc-300 hover:bg-zinc-50",
              },
              "Reset to defaults"
            )
          )
        ),
        // Mission Log
        React.createElement(
          "div",
          { className: "rounded-2xl shadow-sm bg-white border border-zinc-200 p-4 mt-6" },
          React.createElement(
            "div",
            { className: "flex items-center justify-between mb-2" },
            React.createElement("h2", { className: "text-lg font-semibold" }, "Mission Log"),
            React.createElement("div", { className: "text-xs text-zinc-500" }, "Newest first")
          ),
          React.createElement(
            "div",
            { className: "max-h-72 overflow-auto border border-zinc-100 rounded-xl p-3 bg-zinc-50/50" },
            React.createElement(
              "ul",
              { className: "space-y-2" },
              log.map(function (line, i) {
                return React.createElement(
                  "li",
                  { className: "text-xs font-mono bg-white border border-zinc-200 rounded-lg p-2", key: i },
                  line
                );
              })
            )
          )
        )
      ),
      // Right panel (How to Play + Tuning)
      React.createElement(
        "div",
        { className: "lg:col-span-1" },
        React.createElement(
          "div",
          { className: "rounded-2xl shadow-sm bg-white border border-zinc-200 p-5 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto" },
          // How to Play (collapsible, at top)
          React.createElement(
            "div",
            { className: "mb-6" },
            React.createElement(
              "button",
              {
                onClick: function () { setHowToPlayOpen(!howToPlayOpen); },
                className: "w-full flex items-center justify-between text-lg font-semibold mb-2 hover:text-indigo-600 transition-colors",
              },
              "How to Play",
              React.createElement(
                "span",
                { className: "text-sm" },
                howToPlayOpen ? "−" : "+"
              )
            ),
            howToPlayOpen && React.createElement(
              "ol",
              { className: "list-decimal pl-5 text-sm space-y-1 text-zinc-700" },
              React.createElement("li", null, "Check your altitude, velocity (down is positive), and remaining fuel."),
              React.createElement("li", null, "Enter a ", React.createElement("span", { className: "font-mono" }, "Burn"), " for this ", String(params.dt), "s turn (0–", String(params.maxBurn), ")."),
              React.createElement("li", null, "Higher burn = more upward thrust. You cannot burn more than your remaining fuel."),
              React.createElement("li", null, "Land at ≤ ", params.landingSpeedSafe.toFixed(1), " m/s for a safe touchdown."),
              React.createElement("li", null, "If fuel runs out, you free‑fall (g only). Good luck, Captain."),
            )
          ),
          // Tuning section (collapsible)
          React.createElement(
            "div",
            { className: "border-t border-zinc-200 pt-4" },
            React.createElement(
              "button",
              {
                onClick: function () { setTuningOpen(!tuningOpen); },
                className: "w-full flex items-center justify-between text-lg font-semibold mb-3 hover:text-indigo-600 transition-colors",
              },
              "Tuning",
              React.createElement(
                "span",
                { className: "text-sm" },
                tuningOpen ? "−" : "+"
              )
            ),
            tuningOpen && React.createElement(
              "div",
              null,
              React.createElement(
                "p",
                { className: "text-xs text-zinc-600 mb-4" },
                "Adjust the scenario to taste. Try higher initial altitude, lower fuel, or a meaner Moon."
              ),
              React.createElement(Tuner, {
                label: "Time step (s)",
                value: params.dt,
                min: 1,
                max: 60,
                step: 1,
                onChange: function (v) { setParams(Object.assign({}, params, { dt: v })); },
              }),
              React.createElement(Tuner, {
                label: "Lunar gravity g (m/s²)",
                value: params.g,
                min: 0.5,
                max: 3,
                step: 0.01,
                onChange: function (v) { setParams(Object.assign({}, params, { g: v })); },
              }),
              React.createElement(Tuner, {
                label: "Max upward accel (m/s²)",
                value: params.aThrustMax,
                min: 1,
                max: 15,
                step: 0.1,
                onChange: function (v) { setParams(Object.assign({}, params, { aThrustMax: v })); },
              }),
              React.createElement(Tuner, {
                label: "Start altitude (m)",
                value: params.altitude0,
                min: 100,
                max: 20000,
                step: 50,
                onChange: function (v) { setParams(Object.assign({}, params, { altitude0: v })); },
              }),
              React.createElement(Tuner, {
                label: "Start velocity down (m/s)",
                value: params.velocity0,
                min: -50,
                max: 200,
                step: 1,
                onChange: function (v) { setParams(Object.assign({}, params, { velocity0: v })); },
              }),
              React.createElement(Tuner, {
                label: "Fuel (units)",
                value: params.fuel0,
                min: 0,
                max: 5000,
                step: 10,
                onChange: function (v) { setParams(Object.assign({}, params, { fuel0: v })); },
              }),
              React.createElement(Tuner, {
                label: "Max burn per turn",
                value: params.maxBurn,
                min: 10,
                max: 2000,
                step: 10,
                onChange: function (v) { setParams(Object.assign({}, params, { maxBurn: v })); },
              }),
              React.createElement(Tuner, {
                label: "Safe landing speed (m/s)",
                value: params.landingSpeedSafe,
                min: 0.5,
                max: 10,
                step: 0.1,
                onChange: function (v) { setParams(Object.assign({}, params, { landingSpeedSafe: v })); },
              }),
              React.createElement(
                "div",
                { className: "mt-4 text-xs text-zinc-600" },
                "Tip: For a more \"classic\" feel, try dt=10, altitude=240, velocity=40, fuel=1200, max burn=200, aMax≈6."
              )
            )
          )
        )
      )
    )
  );
}
