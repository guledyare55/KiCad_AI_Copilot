/**
 * KiCad AI Copilot — EDA Design Engine
 * Core design generation logic with full electronics rules enforcement.
 * Implements all PCB design rules, component selection, net generation.
 */

"use strict";

// ═══════════════════════════════════════════════════════════
// COMPONENT DATABASE (LCSC/JLCPCB Standard Parts)
// ═══════════════════════════════════════════════════════════
const COMPONENT_DB = {
  // ── MCUs ──────────────────────────────────────────────
  "nRF52810": {
    ref_prefix: "U", type: "MCU", package: "QFN32",
    footprint: "Package_DFN_QFN:QFN-32-1EP_5x5mm_P0.5mm_EP3.5x3.5mm",
    lcsc: "C205882",
    vcc_pins: ["VDD", "VDDIO"],
    gnd_pins: ["GND", "VSS"],
    prog_iface: "SWD",
    rf: "BLE5", antenna_required: true,
    decoupling_per_pin: "100nF",
    bulk_cap: "10µF",
    reason: "nRF52810: BLE 5.0 SoC, Cortex-M4, ultra-low power, QFN32"
  },
  "nRF52840": {
    ref_prefix: "U", type: "MCU", package: "QFN73",
    footprint: "Package_DFN_QFN:QFN-73-1EP_7x7mm_P0.5mm_EP3.7x3.7mm",
    lcsc: "C190793",
    vcc_pins: ["VDDMAIN", "VDDIO0", "VDDIO1"],
    gnd_pins: ["GND", "VSS"],
    prog_iface: "SWD",
    rf: "BLE5+802.15.4", antenna_required: true,
    decoupling_per_pin: "100nF",
    bulk_cap: "10µF",
    reason: "nRF52840: BLE 5.0 + 802.15.4, Cortex-M4F, USB, QFN73"
  },
  "ESP32-S3": {
    ref_prefix: "U", type: "MCU", package: "QFN56",
    footprint: "RF_Module:ESP32-S3-WROOM-1",
    lcsc: "C2913202",
    vcc_pins: ["VDD3P3", "VDD3P3_RTC", "VDD3P3_CPU"],
    gnd_pins: ["GND"],
    prog_iface: "UART+JTAG",
    rf: "WiFi+BLE", antenna_required: true,
    decoupling_per_pin: "100nF",
    bulk_cap: "10µF",
    reason: "ESP32-S3: dual-core LX7, WiFi+BLE, USB OTG, AI acceleration"
  },
  "STM32G031K8": {
    ref_prefix: "U", type: "MCU", package: "LQFP32",
    footprint: "Package_QFP:LQFP-32_7x7mm_P0.8mm",
    lcsc: "C784026",
    vcc_pins: ["VDD", "VDDA"],
    gnd_pins: ["GND", "VSSA"],
    prog_iface: "SWD",
    rf: null, antenna_required: false,
    decoupling_per_pin: "100nF",
    bulk_cap: "4.7µF",
    reason: "STM32G031K8: Cortex-M0+, 64KB Flash, 8KB RAM, LQFP32"
  },
  "ATMEGA328P": {
    ref_prefix: "U", type: "MCU", package: "TQFP32",
    footprint: "Package_QFP:TQFP-32_7x7mm_P0.8mm",
    lcsc: "C14877",
    vcc_pins: ["VCC", "AVCC"],
    gnd_pins: ["GND", "AGND"],
    prog_iface: "SPI+UART",
    rf: null, antenna_required: false,
    decoupling_per_pin: "100nF",
    bulk_cap: "10µF",
    reason: "ATmega328P: AVR 8-bit, Arduino compatible, TQFP32"
  },
  "RA4M1": {
    ref_prefix: "U", type: "MCU", package: "QFP48",
    footprint: "Package_QFP:LQFP-48_7x7mm_P0.5mm",
    lcsc: null,
    vcc_pins: ["VCC"],
    gnd_pins: ["GND"],
    prog_iface: "SWD",
    rf: null, antenna_required: false,
    decoupling_per_pin: "100nF",
    bulk_cap: "4.7µF",
    reason: "RA4M1: ARM Cortex-M4, used in Arduino UNO R4"
  },

  // ── LoRa ──────────────────────────────────────────────
  "SX1276": {
    ref_prefix: "U", type: "rf", package: "QFN28",
    footprint: "Package_DFN_QFN:QFN-28-1EP_5x5mm_P0.5mm_EP3.7x3.7mm",
    lcsc: "C96549",
    vcc_pins: ["VDD_DCDC_IN", "VDD_ANA", "VDD_DIG"],
    gnd_pins: ["GND"],
    prog_iface: "SPI",
    rf: "LoRa", antenna_required: true,
    decoupling_per_pin: "100nF",
    bulk_cap: "10µF",
    reason: "SX1276: LoRa transceiver, 137-1020 MHz, +20dBm output"
  },
  "SX1262": {
    ref_prefix: "U", type: "rf", package: "QFN24",
    footprint: "Package_DFN_QFN:QFN-24-1EP_4x4mm_P0.5mm_EP2.5x2.5mm",
    lcsc: "C1761638",
    vcc_pins: ["VBAT"],
    gnd_pins: ["GND"],
    prog_iface: "SPI",
    rf: "LoRa+FSK", antenna_required: true,
    decoupling_per_pin: "100nF",
    bulk_cap: "10µF",
    reason: "SX1262: LoRa 2nd gen, +22dBm, ultra-low RX (4.6mA)"
  },

  // ── Power ─────────────────────────────────────────────
  "MIC5219": {
    ref_prefix: "U", type: "power", package: "SOT23-5",
    footprint: "Package_TO_SOT_SMD:SOT-23-5",
    lcsc: "C7690",
    vcc_pins: ["IN"],
    gnd_pins: ["GND"],
    reason: "MIC5219: 3.3V LDO, 500mA, SOT23-5, low dropout"
  },
  "AP2112K-3.3": {
    ref_prefix: "U", type: "power", package: "SOT23-5",
    footprint: "Package_TO_SOT_SMD:SOT-23-5",
    lcsc: "C51118",
    reason: "AP2112K: 3.3V LDO, 600mA, low noise, JLCPCB basic"
  },
  "XC6210B332MR": {
    ref_prefix: "U", type: "power", package: "SOT25",
    footprint: "Package_TO_SOT_SMD:SOT-25",
    lcsc: "C72022",
    reason: "XC6210: 3.3V LDO, 500mA, ultra-low quiescent (1µA), ideal for battery"
  },
  "MCP73831": {
    ref_prefix: "U", type: "power", package: "SOT23-5",
    footprint: "Package_TO_SOT_SMD:SOT-23-5",
    lcsc: "C382139",
    reason: "MCP73831: LiPo charger IC, 500mA max, programmable current"
  },

  // ── USB ───────────────────────────────────────────────
  "CH340C": {
    ref_prefix: "U", type: "MCU", package: "SOP16",
    footprint: "Package_SO:SOP-16_3.9x9.9mm_P1.27mm",
    lcsc: "C84681",
    reason: "CH340C: USB-UART bridge, built-in crystal, SOP-16"
  },
  "USB-C-GCT_USB4085": {
    ref_prefix: "J", type: "connector", package: "USB-C",
    footprint: "Connector_USB:USB_C_Receptacle_GCT_USB4085",
    lcsc: "C2765186",
    reason: "GCT USB4085: USB Type-C receptacle, mid-mount, SMD"
  },

  // ── Sensors ───────────────────────────────────────────
  "BME280": {
    ref_prefix: "U", type: "sensor", package: "LGA8",
    footprint: "Package_LGA:LGA-8_2x2.5mm_P0.65mm",
    lcsc: "C92489",
    reason: "BME280: temperature/humidity/pressure, SPI+I2C, 2x2.5mm"
  },
  "ICM-42688-P": {
    ref_prefix: "U", type: "sensor", package: "LGA14",
    footprint: "Package_LGA:LGA-14_3x3mm_P0.5mm",
    lcsc: "C2843979",
    reason: "ICM-42688-P: 6-axis IMU (gyro+accel), ultra-low noise"
  },

  // ── Generic passives / protection ─────────────────────
  "LED": {
    ref_prefix: "D", type: "passive", package: "0402",
    footprint: "LED_SMD:LED_0402_1005Metric",
    lcsc: "C2290",
    reason: "0402 LED, generic"
  },
  "BUTTON": {
    ref_prefix: "SW", type: "passive", package: "3x4mm",
    footprint: "Button_Switch_SMD:SW_Push_1P1T_NO_Vertical_SMD_3x4mm",
    lcsc: "C92584",
    reason: "SMD tactile push-button, 3x4mm"
  },
  "CR2032": {
    ref_prefix: "BT", type: "power", package: "SMTSOIC-6",
    footprint: "Battery:BatteryHolder_Keystone_3034_1x20mm",
    lcsc: "C70377",
    reason: "CR2032 battery holder, SMD/THT"
  }
};

// ═══════════════════════════════════════════════════════════
// FOOTPRINT STANDARDS
// ═══════════════════════════════════════════════════════════
const FOOTPRINT_STANDARD = {
  "commercial": {
    resistor: "Resistor_SMD:R_0402_1005Metric",
    capacitor: "Capacitor_SMD:C_0402_1005Metric",
    inductor: "Inductor_SMD:L_0402_1005Metric"
  },
  "prototype": {
    resistor: "Resistor_SMD:R_0603_1608Metric",
    capacitor: "Capacitor_SMD:C_0603_1608Metric",
    inductor: "Inductor_SMD:L_0603_1608Metric"
  },
  "small": {
    resistor: "Resistor_SMD:R_0402_1005Metric",
    capacitor: "Capacitor_SMD:C_0402_1005Metric",
    inductor: "Inductor_SMD:L_0402_1005Metric"
  }
};

// ═══════════════════════════════════════════════════════════
// DESIGN ENGINE
// ═══════════════════════════════════════════════════════════
class KiCadDesignEngine {

  constructor() {
    this.refCounters = {};
    this.autoComponents = [];
    this.nets = [];
    this.components = [];
    this.fpStandard = "commercial";
  }

  // ── Public entry point ─────────────────────────────────
  generate(input) {
    this.reset();
    const fpKey = this._resolveFpKey(input.constraints);
    this.fpStandard = fpKey;

    const resolvedComponents = this._resolveComponents(input.components, input.description, input.constraints);
    this.components = resolvedComponents;

    const autoAdded = this._addSupportCircuitry(resolvedComponents, input.constraints);
    this.autoComponents = autoAdded;

    const nets = this._generateNets(resolvedComponents, autoAdded, input.constraints);
    this.nets = nets;

    const powerTree = this._buildPowerTree(resolvedComponents, autoAdded, input.constraints);
    const pcbRules = this._generatePcbRules(resolvedComponents, input.constraints);
    const rfRules = this._generateRfRules(resolvedComponents);
    const footprintMap = this._buildFootprintMap(resolvedComponents, autoAdded, fpKey);
    const kicadActions = this._generateKiCadActions(resolvedComponents, autoAdded, nets);
    const validationChecklist = this._runValidation(resolvedComponents, autoAdded, nets, powerTree);
    const architecture = this._deriveArchitecture(resolvedComponents, input.constraints);
    const projectSummary = this._buildSummary(input, resolvedComponents, autoAdded);

    return {
      project_summary: projectSummary,
      architecture,
      components: resolvedComponents,
      auto_added_components: autoAdded,
      nets,
      power_tree: powerTree,
      pcb_placement_rules: pcbRules,
      rf_or_critical_rules: rfRules,
      footprint_map: footprintMap,
      kiCad_actions: kicadActions,
      validation_checklist: validationChecklist
    };
  }

  reset() {
    this.refCounters = {};
    this.autoComponents = [];
    this.nets = [];
    this.components = [];
  }

  // ── Reference Designator ───────────────────────────────
  _nextRef(prefix) {
    if (!this.refCounters[prefix]) this.refCounters[prefix] = 0;
    this.refCounters[prefix]++;
    return `${prefix}${this.refCounters[prefix]}`;
  }

  _resolveFpKey(constraints) {
    const size = (constraints?.size || "commercial").toLowerCase();
    if (size === "smallest" || size === "small") return "commercial";
    if (size === "medium") return "prototype";
    return "commercial";
  }

  // ── Component Resolution ───────────────────────────────
  _resolveComponents(componentList, description, constraints) {
    const resolved = [];
    const descLower = (description || "").toLowerCase();
    const compList = componentList || [];

    // Parse component list strings like ["nRF52810", "CR2032", "LED", "BUTTON x2"]
    const expanded = [];
    for (const comp of compList) {
      const match = comp.match(/^(.+?)\s+x(\d+)$/i);
      if (match) {
        const count = parseInt(match[2]);
        for (let i = 0; i < count; i++) expanded.push(match[1].trim());
      } else {
        expanded.push(comp.trim());
      }
    }

    // Also infer from description if no explicit list
    if (expanded.length === 0) {
      this._inferFromDescription(descLower, expanded);
    }

    for (const name of expanded) {
      const dbEntry = this._lookupComponent(name);
      if (dbEntry) {
        const ref = this._nextRef(dbEntry.ref_prefix);
        resolved.push({
          ref,
          name: dbEntry.canonical || name,
          type: dbEntry.type,
          value: dbEntry.value || name,
          footprint: dbEntry.footprint,
          lcsc: dbEntry.lcsc || null,
          reason: dbEntry.reason,
          _meta: dbEntry
        });
      } else {
        // Generic component
        const prefix = this._guessPrefix(name);
        const ref = this._nextRef(prefix);
        resolved.push({
          ref,
          name,
          type: this._guessType(name),
          value: name,
          footprint: this._guessFootprint(name, constraints),
          lcsc: null,
          reason: `User-specified component: ${name}`,
          _meta: null
        });
      }
    }

    return resolved;
  }

  _inferFromDescription(desc, list) {
    if (desc.includes("nrf52840")) list.push("nRF52840");
    else if (desc.includes("nrf52810")) list.push("nRF52810");
    else if (desc.includes("esp32-s3") || desc.includes("esp32s3")) list.push("ESP32-S3");
    else if (desc.includes("esp32")) list.push("ESP32-S3");
    else if (desc.includes("stm32g0")) list.push("STM32G031K8");
    else if (desc.includes("stm32")) list.push("STM32G031K8");
    else if (desc.includes("atmega")) list.push("ATMEGA328P");
    if (desc.includes("sx1276")) list.push("SX1276");
    else if (desc.includes("sx1262")) list.push("SX1262");
    else if (desc.includes("lora")) list.push("SX1262");
    if (desc.includes("bme280")) list.push("BME280");
    if (desc.includes("imu") || desc.includes("icm")) list.push("ICM-42688-P");
    if (desc.includes("led")) list.push("LED");
    if (desc.includes("button") || desc.includes("switch")) { list.push("BUTTON"); list.push("BUTTON"); }
    if (desc.includes("cr2032")) list.push("CR2032");
    if (desc.includes("usb-c") || desc.includes("usb c") || desc.includes("type-c")) list.push("USB-C-GCT_USB4085");
    if (desc.includes("ch340") || desc.includes("usb-uart")) list.push("CH340C");
    if (desc.includes("lipo") || desc.includes("li-po")) list.push("MCP73831");
  }

  _lookupComponent(name) {
    const normalised = name.replace(/\s+/g,"").toUpperCase();
    for (const [key, val] of Object.entries(COMPONENT_DB)) {
      if (key.replace(/[\s-]/g,"").toUpperCase() === normalised) {
        return { ...val, canonical: key };
      }
    }
    // Fuzzy
    const fz = name.toLowerCase();
    if (fz.includes("nrf52810")) return { ...COMPONENT_DB["nRF52810"], canonical: "nRF52810" };
    if (fz.includes("nrf52840")) return { ...COMPONENT_DB["nRF52840"], canonical: "nRF52840" };
    if (fz.includes("esp32-s3") || fz.includes("esp32s3")) return { ...COMPONENT_DB["ESP32-S3"], canonical: "ESP32-S3" };
    if (fz.includes("esp32")) return { ...COMPONENT_DB["ESP32-S3"], canonical: "ESP32-S3" };
    if (fz.includes("sx1276")) return { ...COMPONENT_DB["SX1276"], canonical: "SX1276" };
    if (fz.includes("sx1262")) return { ...COMPONENT_DB["SX1262"], canonical: "SX1262" };
    if (fz.includes("bme280")) return { ...COMPONENT_DB["BME280"], canonical: "BME280" };
    if (fz.includes("mcp73831")) return { ...COMPONENT_DB["MCP73831"], canonical: "MCP73831" };
    if (fz.includes("cr2032") || fz.includes("coin") || fz.includes("battery")) return { ...COMPONENT_DB["CR2032"], canonical: "CR2032" };
    if (fz.includes("led")) return { ...COMPONENT_DB["LED"], canonical: "LED" };
    if (fz.includes("button") || fz.includes("sw")) return { ...COMPONENT_DB["BUTTON"], canonical: "BUTTON" };
    if (fz.includes("usb-c") || fz.includes("usbc") || fz.includes("type-c")) return { ...COMPONENT_DB["USB-C-GCT_USB4085"], canonical: "USB-C-GCT_USB4085" };
    return null;
  }

  _guessPrefix(name) {
    const n = name.toLowerCase();
    if (n.includes("r") || n.includes("resistor")) return "R";
    if (n.includes("c") || n.includes("cap")) return "C";
    if (n.includes("l") || n.includes("inductor")) return "L";
    if (n.includes("led") || n.includes("diode")) return "D";
    if (n.includes("sw") || n.includes("button")) return "SW";
    if (n.includes("j") || n.includes("conn")) return "J";
    if (n.includes("bt") || n.includes("battery")) return "BT";
    return "U";
  }

  _guessType(name) {
    const n = name.toLowerCase();
    if (n.includes("led") || n.includes("diode")) return "passive";
    if (n.includes("button") || n.includes("sw")) return "passive";
    if (n.includes("battery") || n.includes("cr20") || n.includes("ldo") || n.includes("pmic")) return "power";
    if (n.includes("sensor") || n.includes("bme") || n.includes("imu")) return "sensor";
    if (n.includes("lora") || n.includes("ble") || n.includes("wifi") || n.includes("ant")) return "rf";
    if (n.includes("conn") || n.includes("usb") || n.includes("header")) return "connector";
    return "MCU";
  }

  _guessFootprint(name, constraints) {
    const n = name.toLowerCase();
    const fp = FOOTPRINT_STANDARD[this.fpStandard];
    if (n.includes("resistor") || n.match(/^r\d/)) return fp.resistor;
    if (n.includes("cap") || n.match(/^c\d/)) return fp.capacitor;
    return "Package_SO:SOIC-8_3.9x4.9mm_P1.27mm";
  }

  // ── Support Circuitry ──────────────────────────────────
  _addSupportCircuitry(components, constraints) {
    const auto = [];
    const fp = FOOTPRINT_STANDARD[this.fpStandard];
    const hasRF = components.some(c => c._meta?.antenna_required || c._meta?.rf);
    const hasMCU = components.some(c => c.type === "MCU");
    const hasBattery = components.some(c => c.name.includes("CR2032") || c.name.includes("CR") || (c.type === "power" && c.name.toLowerCase().includes("battery")));
    const hasUSBPower = constraints?.power === "usb" || constraints?.power === "mixed";
    const hasButtons = components.filter(c => c.name === "BUTTON" || c._meta?.canonical === "BUTTON");
    const hasLEDs = components.filter(c => c.name === "LED" || (c.type === "passive" && c.name.toLowerCase().includes("led")));

    // 1. Decoupling caps for every MCU/RF IC
    let dcIdx = 1;
    for (const comp of components) {
      if (comp.type === "MCU" || comp.type === "rf" || comp.type === "sensor") {
        const numPins = comp._meta?.vcc_pins?.length || 1;
        for (let i = 0; i < numPins; i++) {
          const ref = `C${this._nextRef2("C")}`;
          auto.push({
            name: `${ref} — 100nF Decoupling Cap (${comp.ref})`,
            ref,
            value: "100nF",
            footprint: fp.capacitor,
            reason: `Mandatory 100nF decoupling on ${comp.ref} VCC pin ${i+1}. Place within 0.5mm of IC pin.`,
            connected_to: [`${comp.ref}.VCC`, "GND"]
          });
        }
        // Bulk cap
        const bulkRef = `C${this._nextRef2("C")}`;
        auto.push({
          name: `${bulkRef} — ${comp._meta?.bulk_cap || "10µF"} Bulk Bypass Cap (${comp.ref})`,
          ref: bulkRef,
          value: comp._meta?.bulk_cap || "10µF",
          footprint: fp.capacitor,
          reason: `Bulk bypass capacitor for ${comp.ref} supply rail stability. Place within 5mm.`,
          connected_to: [`${comp.ref}.VCC`, "GND"]
        });
      }
    }

    // 2. MCU reset circuit
    const mcus = components.filter(c => c.type === "MCU");
    for (const mcu of mcus) {
      const rstR = `R${this._nextRef2("R")}`;
      auto.push({
        name: `${rstR} — 10kΩ Reset Pull-up (${mcu.ref})`,
        ref: rstR,
        value: "10kΩ",
        footprint: fp.resistor,
        reason: `Pull-up resistor on ${mcu.ref} /RESET pin. Required for stable power-on reset. Connects to VCC.`,
        connected_to: [`${mcu.ref}.RESET`, "VCC"]
      });

      // SWD Header (if SWD interface)
      if (mcu._meta?.prog_iface?.includes("SWD")) {
        const swdRef = `J${this._nextRef2("J")}`;
        auto.push({
          name: `${swdRef} — SWD Debug/Programming Header`,
          ref: swdRef,
          value: "SWD 1.27mm 4-pin",
          footprint: "Connector_PinHeader_1.27mm:PinHeader_1x04_P1.27mm_Vertical_SMD",
          reason: `SWD debug/programming header for ${mcu.ref}. Required for firmware flashing. Pins: SWDIO, SWDCLK, GND, VCC.`,
          connected_to: [`${mcu.ref}.SWDIO`, `${mcu.ref}.SWDCLK`, "GND", "VCC"]
        });
      } else if (mcu._meta?.prog_iface?.includes("UART")) {
        const uartRef = `J${this._nextRef2("J")}`;
        auto.push({
          name: `${uartRef} — UART Programming Header`,
          ref: uartRef,
          value: "UART 2.54mm 4-pin",
          footprint: "Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical",
          reason: `UART programming/debug header for ${mcu.ref}. Pins: TX, RX, GND, VCC.`,
          connected_to: [`${mcu.ref}.TX`, `${mcu.ref}.RX`, "GND", "VCC"]
        });
      }
    }

    // 3. Button pull-ups/downs + debounce
    for (const btn of hasButtons) {
      const prRef = `R${this._nextRef2("R")}`;
      auto.push({
        name: `${prRef} — 10kΩ Pull-up (${btn.ref})`,
        ref: prRef,
        value: "10kΩ",
        footprint: fp.resistor,
        reason: `Pull-up resistor for ${btn.ref}. Prevents floating input state. Active-low: press = GND.`,
        connected_to: [`${btn.ref}.1`, "VCC"]
      });
      const dbR = `R${this._nextRef2("R")}`;
      auto.push({
        name: `${dbR} — 100Ω Debounce Series (${btn.ref})`,
        ref: dbR,
        value: "100Ω",
        footprint: fp.resistor,
        reason: `Series resistor for button debounce / ESD protection on ${btn.ref} to GPIO.`,
        connected_to: [`${btn.ref}.2`, "MCU.GPIO"]
      });
    }

    // 4. LED current limiting resistors
    for (const led of hasLEDs) {
      const rRef = `R${this._nextRef2("R")}`;
      auto.push({
        name: `${rRef} — 330Ω LED Current Limiter (${led.ref})`,
        ref: rRef,
        value: "330Ω",
        footprint: fp.resistor,
        reason: `Current limiting resistor for ${led.ref}. Limits current to ~10mA at 3.3V (Vf≈2.0V). Adjust for brightness.`,
        connected_to: ["MCU.GPIO", `${led.ref}.A`]
      });
    }

    // 5. Battery protection
    if (hasBattery) {
      const pRef = `D${this._nextRef2("D")}`;
      auto.push({
        name: `${pRef} — Reverse Polarity Schottky Diode`,
        ref: pRef,
        value: "BAT60JFILM / PMEG2010 (Schottky)",
        footprint: "Diode_SMD:D_SOD-323",
        reason: "Reverse polarity protection on battery input. Schottky diode (SOD-323) chosen for low Vf (~0.2V) to minimize voltage drop from CR2032.",
        connected_to: ["BT1.+", "VCC"]
      });
      const bRef = `C${this._nextRef2("C")}`;
      auto.push({
        name: `${bRef} — 4.7µF Battery Filtering Cap`,
        ref: bRef,
        value: "4.7µF / 6.3V X5R",
        footprint: fp.capacitor,
        reason: "Bulk capacitor on battery rail to filter inrush/spike currents, especially during BLE TX bursts.",
        connected_to: ["VCC", "GND"]
      });
    }

    // 6. USB power filtering
    if (hasUSBPower) {
      const usbCapRef = `C${this._nextRef2("C")}`;
      auto.push({
        name: `${usbCapRef} — 100nF USB VBUS Decoupling`,
        ref: usbCapRef,
        value: "100nF",
        footprint: fp.capacitor,
        reason: "Decoupling cap on USB VBUS line. Required for stable USB enumeration.",
        connected_to: ["VBUS", "GND"]
      });
      const usbFerrite = `L${this._nextRef2("L")}`;
      auto.push({
        name: `${usbFerrite} — Ferrite Bead USB EMI Filter`,
        ref: usbFerrite,
        value: "600Ω @ 100MHz Ferrite Bead",
        footprint: fp.inductor,
        reason: "Ferrite bead on USB VBUS for common-mode EMI filtering. Required for USB compliance.",
        connected_to: ["VBUS_RAW", "VBUS"]
      });
      // USB CC resistors
      const cc1 = `R${this._nextRef2("R")}`;
      const cc2 = `R${this._nextRef2("R")}`;
      auto.push({
        name: `${cc1} — 5.1kΩ USB-C CC1 Pull-down`,
        ref: cc1,
        value: "5.1kΩ",
        footprint: fp.resistor,
        reason: "USB-C CC1 pin pull-down to GND. Required for USB-C sink identification (500mA/900mA advertisement).",
        connected_to: ["J1.CC1", "GND"]
      });
      auto.push({
        name: `${cc2} — 5.1kΩ USB-C CC2 Pull-down`,
        ref: cc2,
        value: "5.1kΩ",
        footprint: fp.resistor,
        reason: "USB-C CC2 pin pull-down to GND. Required per USB-C spec for proper host detection.",
        connected_to: ["J1.CC2", "GND"]
      });
    }

    // 7. RF antenna matching network
    if (hasRF) {
      const rfC1 = `C${this._nextRef2("C")}`;
      const rfC2 = `C${this._nextRef2("C")}`;
      const rfL = `L${this._nextRef2("L")}`;
      auto.push({
        name: `${rfC1} — RF Shunt Cap (Antenna Match C1)`,
        ref: rfC1,
        value: "1.5pF / C0G",
        footprint: fp.capacitor,
        reason: "Antenna matching network shunt capacitor. Tunes impedance to 50Ω. Value from reference design — may need empirical tuning.",
        connected_to: ["RF_ANT_LINE", "GND"]
      });
      auto.push({
        name: `${rfL} — RF Series Inductor (Antenna Match L)`,
        ref: rfL,
        value: "2.2nH / C0G",
        footprint: fp.inductor,
        reason: "Series inductor in antenna pi-matching network. Part of L-network for 50Ω impedance match.",
        connected_to: ["IC.RF_OUT", "RF_ANT_LINE"]
      });
      auto.push({
        name: `${rfC2} — RF Load Cap (Antenna Match C2)`,
        ref: rfC2,
        value: "1pF / C0G",
        footprint: fp.capacitor,
        reason: "Antenna matching network load capacitor. Final stage of pi-network to antenna feed.",
        connected_to: ["RF_ANT_LINE", "ANT"]
      });
    }

    // 8. LDO if needed
    const hasLDO = components.some(c => c.type === "power" && (c.name.toLowerCase().includes("ldo") || c.name.toLowerCase().includes("ap2112") || c.name.toLowerCase().includes("mic5219")));
    const needsLDO = (hasBattery || hasUSBPower) && !hasLDO && hasMCU;
    if (needsLDO && !hasBattery) {
      // Only add LDO if USB-powered (battery usually direct)
      const ldoRef = `U${this._nextRef2("U")}`;
      auto.push({
        name: `${ldoRef} — AP2112K-3.3 LDO Regulator`,
        ref: ldoRef,
        value: "AP2112K-3.3TRG1",
        footprint: "Package_TO_SOT_SMD:SOT-23-5",
        reason: "3.3V LDO regulator (AP2112K, 600mA, SOT-23-5). Converts USB 5V to 3.3V for MCU/peripherals. JLCPCB Basic Part.",
        connected_to: ["VBUS", "3V3", "GND"]
      });
      const ldoCin = `C${this._nextRef2("C")}`;
      const ldoCout = `C${this._nextRef2("C")}`;
      auto.push({
        name: `${ldoCin} — 1µF LDO Input Cap`,
        ref: ldoCin, value: "1µF / 10V X5R",
        footprint: fp.capacitor,
        reason: "LDO input bypass cap. Minimum 1µF required for stability per datasheet.",
        connected_to: [`${ldoRef}.IN`, "GND"]
      });
      auto.push({
        name: `${ldoCout} — 10µF LDO Output Cap`,
        ref: ldoCout, value: "10µF / 6.3V X5R",
        footprint: fp.capacitor,
        reason: "LDO output bypass cap. 10µF recommended for AP2112K transient response.",
        connected_to: [`${ldoRef}.OUT`, "GND"]
      });
    }

    return auto;
  }

  // Simple separate counter for auto-components (doesn't collide with user refs)
  _nextRef2(prefix) {
    if (!this.refCounters[`_auto_${prefix}`]) this.refCounters[`_auto_${prefix}`] = this.refCounters[prefix] || 0;
    this.refCounters[`_auto_${prefix}`]++;
    return this.refCounters[`_auto_${prefix}`];
  }

  // ── Net Generation ─────────────────────────────────────
  _generateNets(components, auto, constraints) {
    const nets = [];
    const power = constraints?.power || "battery";

    // GND net
    const gndConns = ["GND_PLANE"];
    for (const c of [...components, ...auto]) {
      if (c.ref) gndConns.push(`${c.ref}.GND`);
    }
    nets.push({ name: "GND", connections: gndConns.slice(0, 12) });

    // VCC net
    const hasBattery = components.some(c => c.name?.includes("CR2032") || c.name?.toLowerCase().includes("battery"));
    const vccName = hasBattery ? "VCC_BATT" : "VCC";
    const vccConns = [];
    for (const c of components) {
      if (c._meta?.vcc_pins) vccConns.push(...c._meta.vcc_pins.map(p => `${c.ref}.${p}`));
      else if (c.type === "MCU" || c.type === "rf") vccConns.push(`${c.ref}.VCC`);
    }
    nets.push({ name: vccName, connections: vccConns.length ? vccConns : ["BT1.+", "U1.VDD"] });

    // 3V3 rail (if LDO present)
    const hasLDO = [...components, ...auto].some(c => c.value?.includes("AP2112") || c.name?.includes("AP2112"));
    if (hasLDO || power === "usb" || power === "mixed") {
      nets.push({ name: "3V3", connections: ["U_LDO.OUT", "U1.VDD", "D1.A", "SW1.1", "SW2.1"] });
    }

    // VBUS (USB)
    if (power === "usb" || power === "mixed") {
      nets.push({ name: "VBUS", connections: ["J1.VBUS", "L1.1"] });
    }

    // RF nets (if applicable)
    const rfICs = components.filter(c => c._meta?.antenna_required || c._meta?.rf);
    for (const rf of rfICs) {
      nets.push({ name: "RF_ANT", connections: [`${rf.ref}.ANT`, "L_MATCH.2", "ANT1.1"] });
    }

    // SWD nets (if MCU with SWD)
    const swdMCU = components.find(c => c._meta?.prog_iface?.includes("SWD"));
    if (swdMCU) {
      nets.push({ name: "SWDIO", connections: [`${swdMCU.ref}.SWDIO`, "J_SWD.2"] });
      nets.push({ name: "SWDCLK", connections: [`${swdMCU.ref}.SWDCLK`, "J_SWD.3"] });
    }

    // I2C if sensor present
    const hasSensor = components.some(c => c.type === "sensor");
    if (hasSensor) {
      const sensorMCU = components.find(c => c.type === "MCU");
      nets.push({ name: "I2C_SDA", connections: sensorMCU ? [`${sensorMCU.ref}.SDA`, "U_SENSOR.SDA"] : ["MCU.SDA", "SENSOR.SDA"] });
      nets.push({ name: "I2C_SCL", connections: sensorMCU ? [`${sensorMCU.ref}.SCL`, "U_SENSOR.SCL"] : ["MCU.SCL", "SENSOR.SCL"] });
      const fp = FOOTPRINT_STANDARD[this.fpStandard];
      // I2C pull-ups
      const sda_pu = `R${this._nextRef2("R")}`;
      const scl_pu = `R${this._nextRef2("R")}`;
      auto.push({
        name: `${sda_pu} — 4.7kΩ I2C SDA Pull-up`,
        ref: sda_pu, value: "4.7kΩ",
        footprint: fp.resistor,
        reason: "I2C SDA bus pull-up. Required for open-drain I2C operation. 4.7kΩ standard for 400kHz Fast Mode.",
        connected_to: ["I2C_SDA", "VCC"]
      });
      auto.push({
        name: `${scl_pu} — 4.7kΩ I2C SCL Pull-up`,
        ref: scl_pu, value: "4.7kΩ",
        footprint: fp.resistor,
        reason: "I2C SCL bus pull-up. Required for open-drain I2C operation.",
        connected_to: ["I2C_SCL", "VCC"]
      });
    }

    // Button nets
    const buttons = components.filter(c => c.name === "BUTTON" || c._meta?.canonical === "BUTTON");
    buttons.forEach((btn, i) => {
      nets.push({ name: `BTN${i+1}_NET`, connections: [`${btn.ref}.2`, `U1.P${10+i}`] });
    });

    // LED nets
    const leds = components.filter(c => c.name === "LED" || c._meta?.canonical === "LED");
    leds.forEach((led, i) => {
      nets.push({ name: `LED${i+1}_NET`, connections: [`U1.P${6+i}`, `R_LED${i+1}.1`] });
    });

    return nets;
  }

  // ── Power Tree ─────────────────────────────────────────
  _buildPowerTree(components, auto, constraints) {
    const power = constraints?.power || "battery";
    const rails = [];
    const hasBattery = components.some(c => c.name?.includes("CR2032") || c.name?.toLowerCase().includes("battery"));

    if (hasBattery) {
      rails.push({
        name: "VCC_BATT",
        voltage: "3.0V (typ) / 3.6V (fresh) CR2032",
        color: "#fbbf24",
        consumers: components.filter(c => c.type === "MCU" || c.type === "rf" || c.type === "sensor").map(c => c.ref)
      });
    }

    if (power === "usb" || power === "mixed") {
      rails.push({ name: "VBUS", voltage: "5V (USB)", color: "#f472b6",
        consumers: ["U_LDO.IN"] });
      rails.push({ name: "3V3", voltage: "3.3V (LDO regulated)", color: "#4fc3f7",
        consumers: components.filter(c => c.type === "MCU" || c.type === "rf").map(c => c.ref) });
    }

    rails.push({ name: "GND", voltage: "0V reference", color: "#64748b",
      consumers: ["All components"] });

    return {
      input: hasBattery ? "CR2032 (3V Lithium Coin Cell)" : power === "usb" ? "USB VBUS (5V)" : "Mixed: USB + Battery",
      rails
    };
  }

  // ── PCB Placement Rules ────────────────────────────────
  _generatePcbRules(components, constraints) {
    const rules = [];
    const hasRF = components.some(c => c._meta?.antenna_required || c._meta?.rf);
    const hasMCU = components.some(c => c.type === "MCU");
    const hasBattery = components.some(c => c.type === "power" && c.name?.toLowerCase().includes("cr2032"));
    const size = constraints?.size || "commercial";

    rules.push({
      rule: "Decoupling Caps Placement",
      applies_to: components.filter(c => c.type === "MCU" || c.type === "rf").map(c => c.ref),
      description: "100nF decoupling caps MUST be placed within 0.5mm of each VCC/VDDIO pin. Route to GND before going to power plane. Do NOT share vias with other caps."
    });

    rules.push({
      rule: "Ground Plane Stitching",
      applies_to: ["ALL"],
      description: "Use solid ground plane on bottom layer. Stitch ground vias every 5-8mm. Ensure no ground plane islands. Critical for RF and EMI performance."
    });

    if (hasRF) {
      const rfRef = components.find(c => c._meta?.antenna_required)?.ref || "U_RF";
      rules.push({
        rule: "RF Component Placement",
        applies_to: [rfRef],
        description: `Place RF IC (${rfRef}) near PCB edge/corner. Antenna trace must be 50Ω controlled impedance. No ground pour under antenna section. Keep-out zone: 4mm all sides of antenna.`
      });
      rules.push({
        rule: "Antenna Keepout Zone",
        applies_to: ["ANT1"],
        description: "PCB antenna region: no copper on any layer (including ground) for 3mm past antenna tip. No components within 5mm of antenna. No vias in antenna keepout zone."
      });
      rules.push({
        rule: "RF Trace Matching",
        applies_to: [rfRef, "L_MATCH", "C_MATCH"],
        description: "Keep RF trace (IC to antenna) shorter than λ/20. For 2.4GHz: max trace <6.25mm. Route on top layer over solid ground plane. 50Ω microstrip width for 4-layer PCB."
      });
    }

    if (hasMCU) {
      const mcuRef = components.find(c => c.type === "MCU")?.ref || "U1";
      rules.push({
        rule: "MCU Central Placement",
        applies_to: [mcuRef],
        description: `Place MCU (${mcuRef}) in board center. Distribute peripherals evenly. SWD header must be accessible for programming (board edge or test point accessible).`
      });
    }

    if (hasBattery) {
      rules.push({
        rule: "Battery Holder Placement",
        applies_to: ["BT1"],
        description: "Battery holder (BT1) on board edge for replacement accessibility. Orient coin cell holder for easy removal. Reverse polarity diode must be adjacent to battery positive terminal."
      });
    }

    rules.push({
      rule: "Power Trace Width",
      applies_to: ["VCC", "GND", "3V3"],
      description: size === "smallest" ? "Power traces min 0.3mm for compact boards. Increase to 0.5mm for >100mA. Use copper pours for high-current paths." : "Power traces minimum 0.5mm. Main power rails: 1mm+. Use polygon pours for >500mA paths."
    });

    rules.push({
      rule: "Crystal / Oscillator Isolation",
      applies_to: ["X1"],
      description: "If external crystal present: surround with guard ring. No signal traces under crystal. Keep clear of high-speed signals. Minimize trace length to load caps."
    });

    rules.push({
      rule: "Via-in-Pad",
      applies_to: ["QFN", "BGA"],
      description: "For QFN/QFP thermal pads: use via-in-pad with copper fill (no open vias). Thermal vias under exposed pad improve heat dissipation. Check IPC-7711 for specifications."
    });

    return rules;
  }

  // ── RF Rules ───────────────────────────────────────────
  _generateRfRules(components) {
    const rules = [];
    const rfComponents = components.filter(c => c._meta?.rf || c._meta?.antenna_required);
    if (!rfComponents.length) return rules;

    const rfType = rfComponents[0]?._meta?.rf || "RF";
    const is24GHz = rfType.includes("BLE") || rfType.includes("WiFi") || rfType.includes("802.15");
    const isLoRa = rfType.includes("LoRa") || rfType.includes("FSK");

    rules.push({
      rule: "50Ω Trace Impedance",
      importance: "high",
      description: `All RF traces MUST be 50Ω controlled impedance. For standard FR4 (εr=4.4), 2-layer PCB, 1.6mm: trace width ≈ 2.8mm. For 4-layer, inner plane: ≈ 0.15mm. Use Saturn PCB toolkit to calculate.`
    });

    rules.push({
      rule: "Antenna Ground Keepout",
      importance: "high",
      description: `${is24GHz ? "2.4GHz" : isLoRa ? "LoRa sub-GHz" : "RF"} antenna region: remove ALL copper (signal, power, ground) from under and around antenna. Use a dedicated antenna keepout area in KiCad. Check IC datasheet for exact dimensions.`
    });

    if (is24GHz) {
      rules.push({
        rule: "2.4GHz Design Rules",
        importance: "high",
        description: "BLE/WiFi 2.4GHz: keep impedance-matched trace < 15mm. Do not route digital signals parallel to RF trace. Maintain >3mm separation between RF and digital domains. Use solid ground plane under RF IC."
      });
    }

    if (isLoRa) {
      rules.push({
        rule: "LoRa RF Design Rules",
        importance: "high",
        description: "LoRa sub-GHz: RF line from IC to antenna connector must be 50Ω microstrip. Use SMA or U.FL connector for external antenna. Add ESD protection TVS diode on antenna port (RCLAMP0521). π-network matching required."
      });
    }

    rules.push({
      rule: "RF Decoupling Strategy",
      importance: "high",
      description: "RF IC VCC decoupling: use a cascaded network — 100nF + 10nF + 1nF — each with its own via to ground plane. Place in order from IC pin outward. Use C0G/NP0 dielectric for RF-frequency caps."
    });

    rules.push({
      rule: "No Digital Signals Near Antenna",
      importance: "medium",
      description: "Keep all GPIO, SPI, I2C, UART traces away from antenna area. Minimum 5mm separation. Route digital signals on opposite PCB side from RF section. Use ground plane as shield between domains."
    });

    rules.push({
      rule: "ESD Protection on Antenna Port",
      importance: "medium",
      description: "If using external antenna connector (SMA/U.FL): add ESD TVS diode in series. Recommended: RCLAMP0521P (SOT363) or similar. Protects IC from electrostatic discharge during handling."
    });

    return rules;
  }

  // ── Footprint Map ──────────────────────────────────────
  _buildFootprintMap(components, auto, fpKey) {
    const map = [];
    const std = FOOTPRINT_STANDARD[fpKey] || FOOTPRINT_STANDARD.commercial;

    for (const comp of components) {
      map.push({
        component: comp.ref,
        footprint: comp.footprint,
        reason: `${comp.name} — ${comp._meta?.package || "see datasheet"}. ${comp._meta?.lcsc ? `LCSC: ${comp._meta.lcsc}` : ""}`
      });
    }

    // Auto added
    for (const a of auto) {
      if (a.footprint) {
        map.push({
          component: a.ref || a.name,
          footprint: a.footprint,
          reason: `Auto-added support component: ${a.value}`
        });
      }
    }

    return map;
  }

  // ── KiCad Actions ─────────────────────────────────────
  _generateKiCadActions(components, auto, nets) {
    const actions = [];

    // Place components
    for (const comp of components) {
      actions.push({
        action: "place_component",
        target: comp.ref,
        params: {
          symbol: comp.name,
          footprint: comp.footprint,
          value: comp.value,
          reference: comp.ref,
          position: { x: 0, y: 0 }, // to be determined by auto-placer
          properties: { LCSC: comp.lcsc || "" }
        }
      });
      actions.push({
        action: "set_footprint",
        target: comp.ref,
        params: { footprint: comp.footprint }
      });
    }

    // Create nets
    for (const net of nets) {
      actions.push({
        action: "create_net",
        target: net.name,
        params: { connections: net.connections }
      });
    }

    // Route hints for critical paths
    const mcuRef = components.find(c => c.type === "MCU")?.ref;
    const rfRef = components.find(c => c._meta?.antenna_required)?.ref;

    if (rfRef) {
      actions.push({
        action: "route_hint",
        target: "RF_ANT",
        params: {
          from: `${rfRef}.ANT`,
          to: "ANT1.1",
          width: 0.28,
          layer: "F.Cu",
          impedance_ohm: 50,
          max_length_mm: 15,
          note: "50Ω controlled impedance trace. Keep short. No 90° bends — use 45° or curved."
        }
      });
    }

    if (mcuRef) {
      actions.push({
        action: "route_hint",
        target: "SWD_HEADER",
        params: {
          from: `${mcuRef}.SWDIO`,
          to: "J_SWD.2",
          width: 0.15,
          layer: "F.Cu",
          note: "SWD debug lines. Keep under 50mm. No tight serpentines."
        }
      });
    }

    return actions;
  }

  // ── Validation ─────────────────────────────────────────
  _runValidation(components, auto, nets, powerTree) {
    const checks = [];

    const hasDecoupling = auto.some(a => a.value?.includes("100nF") || a.value?.includes("nF"));
    checks.push({
      item: "Decoupling capacitors added",
      pass: hasDecoupling,
      note: hasDecoupling ? `${auto.filter(a => a.value?.includes("nF") || a.value?.includes("µF")).length} bypass caps added` : "Missing decoupling caps — add 100nF per VCC pin"
    });

    const hasGND = nets.some(n => n.name === "GND");
    checks.push({ item: "Ground reference present", pass: hasGND, note: hasGND ? "GND net defined" : "CRITICAL: No GND net found" });

    const hasPowerRail = powerTree.rails.length > 0;
    checks.push({ item: "Power rails validated", pass: hasPowerRail, note: hasPowerRail ? `${powerTree.rails.length} power rails defined` : "No power rails" });

    const allFootprints = components.every(c => c.footprint && c.footprint.length > 0);
    checks.push({ item: "All components have footprints", pass: allFootprints, note: allFootprints ? "All footprints assigned" : "Some components missing footprints" });

    const hasProg = auto.some(a => a.name?.includes("SWD") || a.name?.includes("UART") || a.name?.includes("Program"));
    const hasMCU = components.some(c => c.type === "MCU");
    checks.push({ item: "Programming header included", pass: !hasMCU || hasProg, note: hasProg ? "SWD/UART header added" : hasMCU ? "WARNING: No programming header" : "N/A (no MCU)" });

    const btnPullups = auto.filter(a => a.name?.includes("Pull-up") || a.name?.includes("Pull-down"));
    const btnCount = components.filter(c => c.name === "BUTTON" || c._meta?.canonical === "BUTTON").length;
    checks.push({ item: "Button pull-up resistors present", pass: !btnCount || btnPullups.length > 0, note: btnPullups.length > 0 ? `${btnPullups.length} pull resistors added` : btnCount ? "WARNING: Missing button pull-ups" : "N/A (no buttons)" });

    const ledResistors = auto.filter(a => a.name?.includes("LED") && a.value?.includes("Ω"));
    const ledCount = components.filter(c => c.name === "LED" || c._meta?.canonical === "LED").length;
    checks.push({ item: "LED current limiters present", pass: !ledCount || ledResistors.length > 0, note: ledResistors.length > 0 ? `${ledResistors.length} current limiting resistors added` : ledCount ? "WARNING: Missing LED resistors" : "N/A (no LEDs)" });

    const hasRFComp = components.some(c => c._meta?.antenna_required);
    const hasAntMatchNet = nets.some(n => n.name === "RF_ANT");
    checks.push({ item: "RF antenna matching network", pass: !hasRFComp || hasAntMatchNet, note: hasRFComp && hasAntMatchNet ? "π-matching network added" : hasRFComp ? "WARNING: Check antenna matching" : "N/A (no RF)" });

    const hasBatProtect = auto.some(a => a.name?.includes("Reverse Polarity") || a.name?.includes("Schottky"));
    const hasBattery = components.some(c => c.name?.includes("CR2032"));
    checks.push({ item: "Battery reverse polarity protection", pass: !hasBattery || hasBatProtect, note: hasBatProtect ? "Schottky diode protection added" : hasBattery ? "WARNING: No reverse polarity protection" : "N/A (no battery)" });

    checks.push({ item: "No floating pins", pass: true, note: "Verify in KiCad ERC. Pull unused GPIO to VCC/GND with 10kΩ resistors." });

    return checks;
  }

  // ── Architecture Derivation ────────────────────────────
  _deriveArchitecture(components, constraints) {
    const blocks = [];
    const power = constraints?.power || "battery";

    if (power === "battery") blocks.push("Battery Power Source (CR2032)");
    if (power === "usb") blocks.push("USB Power Input (5V → 3.3V LDO)");
    if (power === "mixed") blocks.push("Mixed Power: USB + Battery Backup");

    const mcus = components.filter(c => c.type === "MCU");
    for (const m of mcus) blocks.push(`Processing Core: ${m.name}`);

    const sensors = components.filter(c => c.type === "sensor");
    for (const s of sensors) blocks.push(`Sensor: ${s.name} (I2C/SPI)`);

    const rfComps = components.filter(c => c.type === "rf" || c._meta?.rf);
    for (const r of rfComps) blocks.push(`RF: ${r.name} (${r._meta?.rf || "wireless"})`);

    const leds = components.filter(c => c.name === "LED" || c._meta?.canonical === "LED");
    if (leds.length) blocks.push(`User Interface: ${leds.length} LED(s)`);

    const btns = components.filter(c => c.name === "BUTTON" || c._meta?.canonical === "BUTTON");
    if (btns.length) blocks.push(`User Input: ${btns.length} Button(s)`);

    const conns = components.filter(c => c.type === "connector");
    for (const c of conns) blocks.push(`Connector: ${c.name}`);

    blocks.push("Debug/Programming Header (SWD/UART)");
    blocks.push("Decoupling & EMI Filtering Network");

    return { blocks };
  }

  // ── Project Summary ────────────────────────────────────
  _buildSummary(input, components, auto) {
    const total = components.length + auto.length;
    const rfIC = components.find(c => c._meta?.rf);
    const mcu = components.find(c => c.type === "MCU");
    return `${input.project_name || "PCB Design"}: ${total} total components (${components.length} user-specified + ${auto.length} auto-added support). MCU: ${mcu?.name || "none"}. ${rfIC ? `RF: ${rfIC._meta?.rf || "wireless"}. ` : ""}Power: ${input.constraints?.power || "battery"}. Footprint standard: ${this.fpStandard === "commercial" ? "0402" : "0603"}.`;
  }
}

// Export engine instance
window.KiCadEngine = new KiCadDesignEngine();
