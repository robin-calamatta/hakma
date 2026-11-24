import { registerDeep } from './index.js';
registerDeep('electrical', [
  { // 0 DC fundamentals
    gen: ['elecPower', 'resistors'],
    lessons: [
      ['Voltage, current, resistance', '*Voltage* (V, volts) is electrical "pressure" — energy per charge.\n*Current* (I, amps) is the flow of charge.\n*Resistance* (R, ohms Ω) opposes flow.\n*Ohm\'s law*: V = I × R. Cover the one you want in the V/IR triangle.\n*Power*: P = V × I = I²R = V²/R (watts).'],
      ['Series and parallel', '*Series*: one path — same current everywhere; resistances ADD; voltages divide.\n*Parallel*: several paths — same voltage across each branch; currents add; total resistance is LESS than the smallest branch (1/R = 1/R₁ + 1/R₂ + …).\nHouse outlets are wired in parallel so each device gets full voltage.'],
    ],
    terms: [['Conventional current', 'Defined as flowing from + to −, opposite to electron flow.', 2], ['Short circuit', 'A near-zero resistance path causing very large current.', 1], ['Open circuit', 'A break in the path — no current flows.', 1], ['Internal resistance', 'Resistance inside a source that makes its terminal voltage drop under load.', 3]],
    qs: [[1, '12 V across 4 Ω gives what current?', '3 A', '48 A', '0.33 A', '16 A', 'I = V / R.'], [1, 'Unit of resistance:', 'ohm (Ω)', 'volt', 'amp', 'watt', 'Named after Georg Ohm.'], [2, 'Two 10 Ω resistors in parallel:', '5 Ω', '20 Ω', '10 Ω', '100 Ω', 'Equal resistors: R / n.'], [2, 'In a series circuit, what is the same through every component?', 'Current', 'Voltage', 'Power', 'Resistance', 'One path.'], [3, 'A 60 W bulb on 120 V draws…', '0.5 A', '2 A', '7200 A', '60 A', 'I = P / V.'], [3, 'Doubling the voltage across a fixed resistor changes power by…', '×4', '×2', '×½', 'no change', 'P = V²/R.']],
  },
  { // 1 Circuit analysis
    gen: ['resistors'],
    lessons: [
      ['Kirchhoff\'s laws', '*KCL* (current law): currents into a node = currents out (charge is conserved).\n*KVL* (voltage law): the sum of voltages around any closed loop is zero (energy is conserved).\nTogether with Ohm\'s law they solve any linear circuit.'],
      ['Methods and theorems', '*Nodal analysis*: unknown node voltages + KCL. *Mesh analysis*: loop currents + KVL.\n*Thevenin*: any linear network seen from two terminals = one voltage source V_th in series with R_th. *Norton*: current source in parallel with R_N.\n*Superposition*: in linear circuits, find the effect of each source alone and add.\n*Max power transfer*: load resistance = source (Thevenin) resistance.'],
    ],
    terms: [['Node', 'A point where two or more components connect.', 1], ['Norton equivalent', 'A current source in parallel with a resistance, equivalent to a Thevenin circuit.', 3], ['Dependent source', 'A source whose value depends on another voltage or current in the circuit.', 3], ['Loading effect', 'Connecting a load changes the voltage of a divider or source.', 2]],
    qs: [[1, 'KCL is based on conservation of…', 'charge', 'energy', 'momentum', 'mass', 'What flows in flows out.'], [2, 'Currents into a node: 3 A and 2 A. One current leaves; how big?', '5 A', '1 A', '6 A', '0 A', 'KCL.'], [2, 'To find R_th you…', 'turn off independent sources and look into the terminals', 'short the load only', 'double every resistor', 'measure the power', 'Voltage sources → shorts, current sources → opens.'], [3, 'Max power transfer happens when R_load equals…', 'R_th', '0', 'infinity', '2 × R_th', 'Efficiency is then only 50%.'], [3, 'Superposition works only for…', 'linear circuits', 'AC circuits', 'digital circuits', 'single sources', 'Linearity lets effects add.']],
  },
  { // 2 Capacitors, inductors, transients
    gen: ['rcTau'],
    lessons: [
      ['Storage elements', '*Capacitor*: stores energy in an electric field; i = C dv/dt; resists sudden voltage change; open circuit at DC steady state. E = ½CV².\n*Inductor*: stores energy in a magnetic field; v = L di/dt; resists sudden current change; short circuit at DC steady state. E = ½LI².'],
      ['Transients', 'RC time constant τ = RC; RL: τ = L/R. After one τ a charging capacitor reaches ~63%; after 5τ it is effectively done.\nSwitching off an inductor\'s current makes a large voltage spike — a *flyback diode* across relay coils absorbs it.'],
    ],
    terms: [['Farad', 'Unit of capacitance; practical values are µF, nF, pF.', 1], ['Henry', 'Unit of inductance.', 1], ['Decoupling capacitor', 'Small capacitor near an IC that smooths supply noise.', 2], ['Exponential response', 'v(t) = V(1 − e^(−t/τ)) for a charging capacitor.', 3]],
    qs: [[1, 'At DC steady state a capacitor acts like…', 'an open circuit', 'a short circuit', 'a resistor', 'a battery always', 'No current once charged.'], [2, 'After one time constant, a charging capacitor is at about…', '63%', '50%', '37%', '100%', '1 − e⁻¹.'], [2, 'An inductor resists sudden changes in…', 'current', 'voltage', 'resistance', 'frequency', 'v = L di/dt.'], [3, 'Energy in a 100 µF capacitor at 10 V:', '5 mJ', '1 mJ', '10 mJ', '0.5 J', '½ × 100e-6 × 100.'], [3, 'Why put a diode across a relay coil?', 'To clamp the inductive voltage spike at switch-off', 'To rectify AC', 'To light it up', 'To increase current', 'Protects the driving transistor.']],
  },
  { // 3 AC
    lessons: [
      ['AC basics', 'Sinusoidal voltage: v(t) = Vpeak sin(2πft). North America uses 60 Hz, 120 V RMS.\n*RMS* value gives the same heating as DC: Vrms = Vpeak / √2 (so 120 V RMS ≈ 170 V peak).\n*Impedance* Z combines resistance and *reactance*: X_L = 2πfL (rises with f), X_C = 1/(2πfC) (falls with f).'],
      ['AC power', '*Real power* P (W) does work; *reactive* Q (VAR) sloshes back and forth; *apparent* S (VA) = V × I. S² = P² + Q².\n*Power factor* = P / S = cos φ. Low PF means more current for the same work — utilities penalise it; capacitor banks correct inductive loads.\n*Resonance*: X_L = X_C at f = 1/(2π√LC).\n*Three-phase*: three sines 120° apart — smoother power, smaller conductors, used for motors and distribution.'],
    ],
    terms: [['Phasor', 'A rotating vector (magnitude + angle) representing a sinusoid.', 2], ['Capacitive reactance', 'X_C = 1/(2πfC); decreases as frequency rises.', 2], ['Power factor correction', 'Adding capacitors to offset inductive reactive power.', 3], ['Line vs phase voltage', 'In a wye system, V_line = √3 × V_phase.', 3]],
    qs: [[1, 'Household frequency in North America:', '60 Hz', '50 Hz', '120 Hz', '240 Hz', 'Europe uses 50 Hz.'], [2, 'Peak voltage of 120 V RMS:', '≈170 V', '120 V', '240 V', '85 V', '× √2.'], [2, 'As frequency rises, inductive reactance…', 'increases', 'decreases', 'stays the same', 'becomes negative', 'X_L = 2πfL.'], [3, 'P = 8 kW, S = 10 kVA. Power factor?', '0.8', '1.25', '0.2', '80', 'PF = P / S.'], [3, 'In a wye system with 120 V phase voltage, line voltage is about…', '208 V', '120 V', '240 V', '360 V', '120 × √3.']],
  },
  { // 4 Electronics
    lessons: [
      ['Diodes', 'A *diode* conducts one way (forward drop ≈ 0.7 V for silicon, ~2 V for LEDs). Uses: rectifiers (AC → DC), protection, LEDs (always use a current-limiting resistor: R = (Vs − Vf) / I).\nA bridge rectifier + capacitor + regulator makes a DC supply.'],
      ['Transistors', '*BJT*: base current controls collector current (Ic = β Ib). *MOSFET*: gate VOLTAGE controls drain current — almost no gate current; dominant in digital and power switching.\nAs switches: drive fully on (saturation) or fully off to minimise heat.'],
      ['Op-amps', 'Ideal op-amp rules with negative feedback: no current into inputs; V+ = V−.\nInverting amp gain = −Rf/Rin. Non-inverting gain = 1 + Rf/Rg. Voltage follower = buffer (gain 1).\nComparators, filters and integrators are built from op-amps.'],
    ],
    terms: [['Forward voltage', 'Voltage needed across a diode/LED before it conducts significantly.', 1], ['Zener diode', 'Diode designed to conduct in reverse at a set voltage — simple regulation/protection.', 2], ['Saturation (BJT)', 'Fully-on state used for switching.', 3], ['Linear regulator vs buck converter', 'Linear burns excess voltage as heat; a buck switcher steps down efficiently.', 3]],
    qs: [[1, 'A diode allows current…', 'in one direction', 'in both directions equally', 'only in AC', 'never', 'Like a check valve.'], [2, 'LED: 5 V supply, 2 V forward drop, 20 mA. Resistor?', '150 Ω', '250 Ω', '100 Ω', '50 Ω', '(5 − 2) / 0.02.'], [2, 'Inverting amplifier, Rf = 100 kΩ, Rin = 10 kΩ. Gain?', '−10', '10', '11', '−11', '−Rf / Rin.'], [3, 'Why are MOSFETs preferred for power switching?', 'Voltage-driven gate and very low on-resistance', 'They need large base current', 'They only work at DC', 'They are always cheaper than wire', 'Efficient switches.'], [3, 'Stepping 12 V down to 3.3 V at 2 A efficiently:', 'Buck converter', 'Linear regulator', 'Zener only', 'A resistor', 'A linear regulator would waste ~17 W.']],
  },
  { // 5 Digital & microcontrollers
    gen: ['binary'],
    lessons: [
      ['Logic', 'Gates: AND, OR, NOT, NAND, NOR, XOR. NAND and NOR are *universal* — any logic can be built from them alone.\n*Combinational* logic depends only on current inputs (adders, multiplexers). *Sequential* logic has memory (flip-flops, registers, counters) and uses a clock.\nSimplify with Boolean algebra or *Karnaugh maps*.'],
      ['Number systems and conversion', 'Binary (base 2), hex (base 16, 4 bits per digit). 0xFF = 255.\n*ADC* converts analog to digital: an n-bit ADC has 2ⁿ levels; resolution = Vref / 2ⁿ. *DAC* goes the other way.\n*Microcontrollers* (Arduino, STM32, ESP32): CPU + memory + GPIO + timers + ADC on one chip; communicate via UART, I²C, SPI.'],
    ],
    terms: [['XOR', 'Output 1 when inputs differ.', 1], ['D flip-flop', 'Captures input D on the clock edge — a 1-bit memory.', 2], ['I²C', 'Two-wire (SDA, SCL) bus connecting many sensors with addresses.', 3], ['Pull-up resistor', 'Holds an input high by default so it isn\'t floating.', 2]],
    qs: [[1, 'Output of AND with inputs 1 and 0:', '0', '1', 'undefined', '2', 'Both must be 1.'], [2, 'Which gate is universal?', 'NAND', 'XOR', 'AND', 'NOT', 'Build anything from NANDs.'], [2, 'A 10-bit ADC has how many levels?', '1024', '1000', '512', '10', '2¹⁰.'], [3, 'A 12-bit ADC with 3.3 V reference: resolution ≈', '0.8 mV', '3.3 mV', '0.27 V', '12 mV', '3.3 / 4096.'], [3, 'An input pin with nothing connected reads random values because it is…', 'floating — needs a pull-up/down', 'broken', 'grounded', 'in output mode', 'Define its default state.']],
  },
  { // 6 Signals & control
    lessons: [
      ['Frequency domain', 'Any signal can be built from sine waves (*Fourier*). Filters shape the spectrum: low-pass, high-pass, band-pass. RC low-pass cutoff f_c = 1/(2πRC).\n*Nyquist*: sample at more than TWICE the highest frequency or you get aliasing (CD audio: 44.1 kHz for ~20 kHz).'],
      ['Feedback control', 'Measure the output, compare with the setpoint, correct the error.\n*PID*: P reacts to present error, I removes steady-state error (accumulated past), D damps oscillation (predicts the future).\nToo much gain → overshoot and oscillation; *Bode plots* show gain/phase margins and stability.'],
    ],
    terms: [['Aliasing', 'High frequencies masquerading as low ones when sampling too slowly.', 2], ['Cutoff frequency', 'Where a filter\'s output drops to ~70.7% (−3 dB).', 2], ['Steady-state error', 'Remaining difference from the setpoint after settling; removed by integral action.', 3], ['Decibel', '20·log₁₀(Vout/Vin) for voltage ratios; −3 dB ≈ half power.', 3]],
    qs: [[1, 'A low-pass filter passes…', 'low frequencies', 'high frequencies', 'only DC above 1 kHz', 'nothing', 'Blocks highs.'], [2, 'Minimum sampling rate for a 5 kHz signal:', 'more than 10 kHz', '5 kHz', '2.5 kHz', '1 kHz', 'Nyquist.'], [2, 'RC low-pass with R = 1 kΩ, C = 1 µF: cutoff ≈', '159 Hz', '1 kHz', '1 MHz', '15.9 Hz', '1/(2π × 10⁻³).'], [3, 'The I term in PID mainly…', 'eliminates steady-state error', 'reduces noise', 'predicts the future', 'increases overshoot only', 'Integrates accumulated error.'], [3, '−6 dB in voltage is roughly…', 'half the voltage', 'double', 'a quarter', 'no change', '20 log(0.5) ≈ −6.']],
  },
  { // 7 Power systems
    lessons: [
      ['Transformers and transmission', 'A transformer changes AC voltage by its turns ratio: Vs/Vp = Ns/Np (current changes inversely). Ideal: power in = power out.\nTransmit at HIGH voltage → low current → I²R losses fall with the square of current. Step down near customers.'],
      ['Machines and protection', '*Induction motors* (3-phase) run near synchronous speed minus slip; most industrial motors.\nGenerators convert mechanical to electrical energy by electromagnetic induction (Faraday).\nProtection: fuses/breakers for overcurrent, relays for faults, grounding and bonding to keep exposed metal at safe potential.\n*Maxwell\'s equations* unify electricity, magnetism and light.'],
    ],
    terms: [['Turns ratio', 'Np : Ns — sets the voltage ratio of a transformer.', 2], ['Slip', '(n_sync − n_rotor)/n_sync for an induction motor.', 3], ['Synchronous speed', 'n = 120f / poles (rpm).', 3], ['Faraday\'s law', 'A changing magnetic flux induces a voltage.', 2]],
    qs: [[1, 'Why transmit power at high voltage?', 'Lower current means lower I²R losses', 'It is safer at home', 'Wires are cheaper at high current', 'Higher frequency', 'Losses scale with I².'], [2, 'A 10:1 step-down transformer with 2400 V primary gives…', '240 V', '24000 V', '24 V', '2400 V', 'Divide by the turns ratio.'], [2, 'Synchronous speed of a 4-pole motor at 60 Hz:', '1800 rpm', '3600 rpm', '1200 rpm', '900 rpm', '120 × 60 / 4.'], [3, 'Halving transmission current reduces line losses to…', '25%', '50%', '75%', 'no change', 'I² dependence.'], [3, 'Transformers do not work on DC because…', 'flux must be changing to induce voltage', 'DC is too high', 'copper blocks DC', 'they would explode instantly', 'Faraday\'s law.']],
  },
]);
