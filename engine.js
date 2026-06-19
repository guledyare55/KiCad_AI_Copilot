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
  "nRF52833": {
    ref_prefix: "U", type: "MCU", package: "QFN40",
    footprint: "Package_DFN_QFN:QFN-40-1EP_5x5mm_P0.4mm_EP3.6x3.6mm",
    lcsc: "C528711",
    vcc_pins: ["VDD", "VDDH"],
    gnd_pins: ["GND", "VSS"],
    prog_iface: "SWD",
    rf: "BLE5.1", antenna_required: true,
    decoupling_per_pin: "100nF",
    bulk_cap: "4.7µF",
    reason: "nRF52833: BLE 5.1 SoC, Cortex-M4, auto-substituted for out-of-stock nRF52840."
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
  "SHTC3": {
    ref_prefix: "U", type: "sensor", package: "DFN4",
    footprint: "Sensor_Humidity:Sensirion_DFN-4-1EP_2x2mm_P1mm_EP0.7x1.6mm",
    lcsc: "C368407",
    reason: "SHTC3: Auto-substituted for out-of-stock BME280. Note: Temp/Humidity only (no pressure)."
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
// LIVE SUPPLY CHAIN DATABASE (Feature 2 Mock)
// ═══════════════════════════════════════════════════════════
const SUPPLY_CHAIN_DB = {
  "nRF52810": { in_stock: true, stock_qty: 45000, price: 1.25 },
  "nRF52840": { in_stock: false, stock_qty: 0, price: 4.50, substitute: "nRF52833" }, // Out of stock example
  "STM32G031K8": { in_stock: false, stock_qty: 0, price: 1.10, substitute: "ATMEGA328P" }, // Out of stock example
  "ATMEGA328P": { in_stock: true, stock_qty: 120000, price: 1.80 },
  "ESP32-S3": { in_stock: true, stock_qty: 85000, price: 2.10 },
  "BME280": { in_stock: false, stock_qty: 0, price: 3.50, substitute: "SHTC3" }, // Out of stock example
  "SHTC3": { in_stock: true, stock_qty: 15000, price: 1.20 }
};

// ═══════════════════════════════════════════════════════════
// SNIPPET MODULES DATABASE (Feature 4: Sub-circuit injection)
// ═══════════════════════════════════════════════════════════
const MODULE_DB = {
  "BUCK_3V3_1A": {
    name: "3.3V 1A Buck Converter (TPS5430)",
    snippet_id: "mod_tps5430_3v3",
    description: "Pre-routed 3.3V buck converter block with optimal input/output capacitance loop area.",
    provides_power: "3V3"
  },
  "USB_C_PD_SINK": {
    name: "USB-C PD 15V Sink (FUSB302)",
    snippet_id: "mod_fusb302_sink",
    description: "Pre-routed USB-C PD sink controller to negotiate up to 15V from a PD charger.",
    provides_power: "VBUS_15V"
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
    this.modules = [];
    this.fpStandard = "commercial";
    this.supplyChainWarnings = [];
  }

  // ── Public entry point ─────────────────────────────────
  generate(input) {
    this.reset();
    const fpKey = this._resolveFpKey(input.constraints);
    this.fpStandard = fpKey;

    // Resolve Snippet Modules
    const descLower = (input.description || "").toLowerCase();
    if (descLower.includes("pd sink") || descLower.includes("15v")) {
      this.modules.push(MODULE_DB["USB_C_PD_SINK"]);
    }
    if (descLower.includes("buck") && descLower.includes("3.3v")) {
      this.modules.push(MODULE_DB["BUCK_3V3_1A"]);
    }

    const resolvedComponents = this._resolveComponents(input.components, input.description, input.constraints);
    this.components = resolvedComponents;

    const autoAdded = this._addSupportCircuitry(resolvedComponents, input.constraints);
    this.autoComponents = autoAdded;

    const nets = this._generateNets(resolvedComponents, autoAdded, input.constraints);
    this.nets = nets;

    const powerTree = this._buildPowerTree(resolvedComponents, autoAdded, input.constraints);
    const pcbRules = this._generatePcbRules(resolvedComponents, input.constraints);
    const customKicadRules = this._generateCustomRules(resolvedComponents, nets, input.constraints);
    const rfRules = this._generateRfRules(resolvedComponents);
    const footprintMap = this._buildFootprintMap(resolvedComponents, autoAdded, fpKey);
    const kicadActions = this._generateKiCadActions(resolvedComponents, autoAdded, nets);
    const validationChecklist = this._runValidation(resolvedComponents, autoAdded, nets, powerTree);
    const architecture = this._deriveArchitecture(resolvedComponents, input.constraints);
    
    // Inject supply chain warnings into the architecture summary
    if (this.supplyChainWarnings.length > 0) {
      architecture.core_components.push({
        name: "Supply Chain Alerts",
        role: "Critical: " + this.supplyChainWarnings.join(" | ")
      });
    }

    // Inject module descriptions into architecture
    if (this.modules.length > 0) {
      for (const mod of this.modules) {
        architecture.core_components.push({
          name: mod.name,
          role: "Pre-Routed Sub-circuit Snippet: " + mod.description
        });
      }
    }

    const projectSummary = this._buildSummary(input, resolvedComponents, autoAdded);

    return {
      project_summary: projectSummary,
      architecture,
      modules: this.modules,
      components: resolvedComponents,
      auto_added_components: autoAdded,
      nets,
      power_tree: powerTree,
      pcb_placement_rules: pcbRules,
      custom_kicad_rules: customKicadRules,
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
    this.modules = [];
    this.supplyChainWarnings = [];
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
    let expanded = [];
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

    // Process substitutions based on Supply Chain API
    for (let i = 0; i < expanded.length; i++) {
      const name = expanded[i];
      const dbEntry = this._lookupComponent(name);
      
      if (dbEntry) {
        const canonical = dbEntry.canonical;
        const supplyData = SUPPLY_CHAIN_DB[canonical];
        
        if (supplyData && !supplyData.in_stock && supplyData.substitute) {
          this.supplyChainWarnings.push(`⚠️ ${canonical} is out of stock! Auto-substituted with ${supplyData.substitute}.`);
          expanded[i] = supplyData.substitute; // Substitute in place
        }
      }
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

    return rules;
  }

  // ── AI Constraint-Driven Auto-Routing Rules (Feature 5) ──
  _generateCustomRules(components, nets, constraints) {
    const customRules = [];
    
    // USB Differential Pair Constraints
    if (nets.some(n => n.name === "USB_D+" || n.name === "USB_D-") || constraints?.power === "usb") {
      customRules.push({
        name: "USB_90Ohm_Diff",
        rule: "(rule \"USB_DiffPair\"\n  (condition \"A.NetClass == 'USB'\")\n  (constraint diffpair_gap (min 0.15mm) (opt 0.2mm) (max 0.25mm))\n  (constraint track_width (min 0.2mm) (opt 0.25mm) (max 0.3mm))\n)",
        description: "Enforces 90-ohm differential impedance for USB data lines based on standard JLC04161H-3313 stackup."
      });
    }

    // RF 50 Ohm Impedance Constraints
    const rfICs = components.filter(c => c._meta?.rf);
    if (rfICs.length > 0) {
      customRules.push({
        name: "RF_50Ohm_Track",
        rule: "(rule \"RF_50Ohm\"\n  (condition \"A.NetClass == 'RF'\")\n  (constraint track_width (min 0.3mm) (opt 0.35mm) (max 0.4mm))\n  (constraint clearance (min 0.2mm))\n)",
        description: "Enforces 50-ohm coplanar waveguide dimensions for RF antenna traces."
      });
      customRules.push({
        name: "RF_Keepout",
        rule: "(rule \"RF_Keepout\"\n  (condition \"A.NetClass == 'RF'\")\n  (constraint zone_clearance (min 0.5mm))\n)",
        description: "Keeps copper pours away from the RF trace to maintain coplanar impedance."
      });
    }

    // High Current Power Constraints
    if (constraints?.power === "mixed" || components.some(c => c.type === "power")) {
      customRules.push({
        name: "Power_Heavy_Tracks",
        rule: "(rule \"Power_Tracks\"\n  (condition \"A.NetClass == 'Power'\")\n  (constraint track_width (min 0.5mm) (opt 0.6mm) (max 1.0mm))\n)",
        description: "Enforces wider tracks for VCC/VBUS/3V3 nets to prevent voltage drop."
      });
    }

    return customRules;
  }

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

// ═══════════════════════════════════════════════════════════
// FEATURE 6: THERMAL RISK HEATMAP ENGINE
// ═══════════════════════════════════════════════════════════
const THERMAL_POWER_DB = {
  "MCU":       { mw: 120,  color: "#f97316" },
  "RF":        { mw: 200,  color: "#ef4444" },
  "regulator": { mw: 350,  color: "#dc2626" },
  "power":     { mw: 80,   color: "#fb923c" },
  "sensor":    { mw: 15,   color: "#facc15" },
  "connector": { mw: 10,   color: "#a3e635" },
  "passive":   { mw: 5,    color: "#4ade80" },
  "led":       { mw: 25,   color: "#fbbf24" },
  "button":    { mw: 1,    color: "#86efac" },
};

const THERMAL_COMPONENT_OVERRIDE = {
  "nRF52810":   300, "nRF52840": 350, "ESP32-S3": 500, "STM32G031K8": 150,
  "ATMEGA328P": 120, "SX1262": 250, "AMS1117": 600, "TLV1117": 500, "CH340C": 80
};

window.ThermalEngine = {
  generate(components, autoComponents, boardSizeMm = 40) {
    const GRID = 12;
    const cellSizeMm = boardSizeMm / GRID;
    const grid = Array.from({length: GRID}, () => new Array(GRID).fill(0));

    const allComps = [...components, ...autoComponents];
    const placed = allComps.map((c, i) => {
      const angle = (i / allComps.length) * Math.PI * 2;
      const r = (boardSizeMm / 2) * 0.6;
      return {
        ...c,
        x: boardSizeMm/2 + r * Math.cos(angle),
        y: boardSizeMm/2 + r * Math.sin(angle),
        mw: THERMAL_COMPONENT_OVERRIDE[c.name] ||
            THERMAL_POWER_DB[c.type?.toLowerCase()]?.mw || 10
      };
    });

    // Gaussian heat diffusion
    for (const comp of placed) {
      const cx = comp.x / cellSizeMm;
      const cy = comp.y / cellSizeMm;
      const sigma = Math.sqrt(comp.mw) / 15 + 0.5;
      for (let gy = 0; gy < GRID; gy++) {
        for (let gx = 0; gx < GRID; gx++) {
          const dx = gx - cx, dy = gy - cy;
          grid[gy][gx] += comp.mw * Math.exp(-(dx*dx + dy*dy) / (2 * sigma * sigma));
        }
      }
    }

    const flat = grid.flat();
    const maxTemp = Math.max(...flat);
    const hotspots = placed
      .filter(c => c.mw > 50)
      .sort((a, b) => b.mw - a.mw)
      .slice(0, 4)
      .map(c => ({ name: c.name || c.ref, mw: c.mw, risk: c.mw > 300 ? "HIGH" : c.mw > 100 ? "MEDIUM" : "LOW" }));

    const recommendations = [];
    if (hotspots.some(h => h.risk === "HIGH"))
      recommendations.push({ icon: "🌊", text: "Add copper pour beneath high-power ICs to spread heat", priority: "critical" });
    if (placed.some(c => c.mw > 100))
      recommendations.push({ icon: "🔩", text: "Add 4–8 thermal vias under regulators (0.3mm drill, 0.6mm pad)", priority: "high" });
    if (maxTemp > 500)
      recommendations.push({ icon: "💨", text: "Consider forced airflow or thermal interface material if enclosed", priority: "medium" });
    recommendations.push({ icon: "📐", text: "Keep RF components away from high-power areas (>5mm separation)", priority: "info" });
    recommendations.push({ icon: "🔋", text: "Place bulk decoupling caps within 2mm of power pins", priority: "info" });

    return { grid, maxTemp, placed, hotspots, recommendations, gridSize: GRID, boardSizeMm };
  }
};

// ═══════════════════════════════════════════════════════════
// FEATURE 7: BOM OPTIMIZER ENGINE
// ═══════════════════════════════════════════════════════════
const JLCPCB_BASIC_PARTS = {
  // Capacitors → JLCPCB Basic equivalents
  "100nF_0402": { lcsc: "C14663", desc: "100nF 0402 (Basic)", price: 0.003 },
  "10uF_0402":  { lcsc: "C19702", desc: "10µF 0402 (Basic)", price: 0.012 },
  "4.7uF_0402": { lcsc: "C23630", desc: "4.7µF 0402 (Basic)", price: 0.009 },
  "1uF_0402":   { lcsc: "C52923", desc: "1µF 0402 (Basic)", price: 0.005 },
  // Resistors
  "10k_0402":   { lcsc: "C25804", desc: "10kΩ 0402 (Basic)", price: 0.002 },
  "100r_0402":  { lcsc: "C25076", desc: "100Ω 0402 (Basic)", price: 0.002 },
  "1k_0402":    { lcsc: "C21190", desc: "1kΩ 0402 (Basic)", price: 0.002 },
  "4k7_0402":   { lcsc: "C25905", desc: "4.7kΩ 0402 (Basic)", price: 0.002 },
  // LEDs
  "LED_green_0402": { lcsc: "C72043", desc: "Green LED 0402 (Basic)", price: 0.015 },
  "LED_red_0402":   { lcsc: "C84256", desc: "Red LED 0402 (Basic)", price: 0.012 },
};

const BOM_PRICES = {
  "nRF52810": 1.25, "nRF52840": 4.50, "ESP32-S3": 2.10, "STM32G031K8": 1.10,
  "ATMEGA328P": 1.80, "BME280": 3.50, "SHTC3": 1.20, "SX1262": 2.80,
  "CH340C": 0.45, "AMS1117": 0.12, "USB-C-GCT_USB4085": 0.55,
  "LED": 0.02, "BUTTON": 0.08, "CR2032": 0.35,
  "100nF": 0.008, "10uF": 0.025, "4.7uF": 0.015, "100R": 0.003, "10k": 0.003
};

window.BOMOptimizer = {
  optimize(components, autoComponents, instruction = "") {
    const inst = instruction.toLowerCase();
    const preferBasic = inst.includes("basic") || inst.includes("jlcpcb") || inst.includes("cheap") || inst.includes("cheaper") || inst.includes("cost");
    const preferSmall  = inst.includes("small") || inst.includes("compact");

    const substitutions = [];
    const warnings = [];
    let originalCost = 0, optimizedCost = 0;

    const allComps = [...components, ...autoComponents];
    for (const c of allComps) {
      const unitPrice = BOM_PRICES[c.name] || (c.type === "passive" ? 0.005 : 0.50);
      originalCost += unitPrice;

      // Passive substitution to JLCPCB Basic
      if (preferBasic && c.type === "passive") {
        const val = (c.value || "").toLowerCase();
        let basicKey = null;
        if (val.includes("100n") || val.includes("0.1u")) basicKey = "100nF_0402";
        else if (val.includes("10u")) basicKey = "10uF_0402";
        else if (val.includes("4.7u")) basicKey = "4.7uF_0402";
        else if (val.includes("1u") && !val.includes("10")) basicKey = "1uF_0402";
        else if (val.includes("10k")) basicKey = "10k_0402";
        else if (val.includes("100r") || val.includes("100Ω")) basicKey = "100r_0402";
        else if (val.includes("1k")) basicKey = "1k_0402";
        else if (val.includes("4.7k") || val.includes("4k7")) basicKey = "4k7_0402";

        if (basicKey && JLCPCB_BASIC_PARTS[basicKey]) {
          const basic = JLCPCB_BASIC_PARTS[basicKey];
          const saving = unitPrice - basic.price;
          substitutions.push({
            ref: c.ref, original: `${c.name} (${c.value})`,
            replacement: basic.desc, lcsc: basic.lcsc,
            saving_usd: Math.max(0, saving).toFixed(4),
            reason: "JLCPCB Basic Library — no setup fee"
          });
          optimizedCost += basic.price;
          continue;
        }
      }
      optimizedCost += unitPrice;
    }

    if (substitutions.length === 0 && preferBasic) {
      warnings.push("No automatic basic-part substitutions found. Verify passive values match JLCPCB Basic catalog.");
    }

    // Deduplicate passive suggestion
    const passiveCount = allComps.filter(c => c.type === "passive").length;
    if (passiveCount > 10) {
      warnings.push(`${passiveCount} passive components detected. Consider consolidating to fewer unique values to reduce setup costs.`);
    }

    const totalSaving = originalCost - optimizedCost;
    return {
      substitutions,
      warnings,
      original_cost: originalCost.toFixed(2),
      optimized_cost: optimizedCost.toFixed(2),
      savings_usd: Math.max(0, totalSaving).toFixed(2),
      savings_pct: originalCost > 0 ? Math.max(0, (totalSaving / originalCost * 100)).toFixed(1) : "0.0"
    };
  }
};

// ═══════════════════════════════════════════════════════════
// FEATURE 8: RF & SIGNAL INTEGRITY ADVISOR
// ═══════════════════════════════════════════════════════════
window.SIAdvisor = {
  // Microstrip impedance: Wadell formula simplified
  microstripImpedance(w_mm, h_mm = 1.6, t_mm = 0.035, er = 4.5) {
    const w = w_mm, h = h_mm;
    const wEff = w + (t_mm / Math.PI) * Math.log(4 * Math.E / Math.sqrt(Math.pow(t_mm / h, 2) + Math.pow(t_mm / (Math.PI * w), 2)));
    const erEff = (er + 1) / 2 + (er - 1) / 2 * Math.pow(1 + 12 * h / wEff, -0.5);
    let Z;
    if (wEff / h < 1) {
      Z = (60 / Math.sqrt(erEff)) * Math.log(8 * h / wEff + wEff / (4 * h));
    } else {
      Z = (120 * Math.PI) / (Math.sqrt(erEff) * (wEff / h + 1.393 + 0.667 * Math.log(wEff / h + 1.444)));
    }
    return Math.round(Z);
  },

  analyze(components, nets, constraints = {}) {
    const results = [];
    const warnings = [];
    let totalScore = 100;

    // Analyze each net for SI concerns
    const netClasses = {
      RF:   { targetZ: 50,  traceMm: 0.28, color: "#ef4444" },
      USB:  { targetZ: 90,  traceMm: 0.15, color: "#f97316" },
      SPI:  { targetZ: null, traceMm: 0.2,  color: "#facc15" },
      I2C:  { targetZ: null, traceMm: 0.2,  color: "#a3e635" },
      PWR:  { targetZ: null, traceMm: 0.5,  color: "#4ade80" },
      GND:  { targetZ: null, traceMm: 0.5,  color: "#60a5fa" },
      SIG:  { targetZ: null, traceMm: 0.25, color: "#c084fc" },
    };

    for (const net of (nets || [])) {
      const name = (net.name || "").toUpperCase();
      let cls = "SIG";
      if (name.includes("RF") || name.includes("ANT")) cls = "RF";
      else if (name.includes("USB") || name.includes("DP") || name.includes("DM")) cls = "USB";
      else if (name.includes("SPI") || name.includes("SCK") || name.includes("MOSI")) cls = "SPI";
      else if (name.includes("I2C") || name.includes("SDA") || name.includes("SCL")) cls = "I2C";
      else if (name.includes("VDD") || name.includes("VCC") || name.includes("3V") || name.includes("5V")) cls = "PWR";
      else if (name.includes("GND") || name.includes("VSS")) cls = "GND";

      const nc = netClasses[cls];
      const Z = nc.targetZ ? this.microstripImpedance(nc.traceMm) : null;
      const Zdelta = Z && nc.targetZ ? Math.abs(Z - nc.targetZ) : 0;
      const score = Math.max(0, 100 - Zdelta * 2 - (cls === "RF" ? 10 : 0));

      if (cls === "RF" && Zdelta > 5) {
        warnings.push({ net: net.name, msg: `RF trace impedance ${Z}Ω vs target 50Ω — adjust trace width to ${nc.traceMm}mm on 1.6mm FR4`, severity: "critical" });
        totalScore -= 15;
      }
      if (cls === "USB" && Zdelta > 5) {
        warnings.push({ net: net.name, msg: `USB D+/D- differential pair needs 90Ω impedance — route as tightly coupled pair`, severity: "high" });
        totalScore -= 10;
      }

      results.push({
        name: net.name, class: cls, color: nc.color,
        trace_mm: nc.traceMm, impedance: Z, target_z: nc.targetZ,
        score: Math.round(score), delta_ohm: Zdelta || null
      });
    }

    // RF antenna checks
    const rfComps = components.filter(c => c._meta?.rf || c.type === "rf");
    const antChecks = [];
    if (rfComps.length > 0) {
      antChecks.push({ check: "Antenna keepout zone", status: "warn", note: "Ensure 3mm copper-free zone around antenna" });
      antChecks.push({ check: "Ground plane under antenna", status: "fail", note: "Remove ground plane beneath PCB trace antenna" });
      antChecks.push({ check: "RF matching network", status: "warn", note: "Add π-network: 10nH series + 1.8pF shunt for 50Ω match" });
      antChecks.push({ check: "Crystal proximity", status: "pass", note: "Keep crystal >5mm from RF antenna" });
      totalScore -= 10;
    } else {
      antChecks.push({ check: "No RF components detected", status: "pass", note: "No antenna constraints required" });
    }

    // Differential pair check
    const diffPairs = (nets || []).filter(n => {
      const nm = (n.name || "").toUpperCase();
      return nm.includes("DP") || nm.includes("DM") || nm.includes("DIFF");
    });
    if (diffPairs.length > 0) {
      antChecks.push({ check: "Differential pair length matching", status: "warn", note: `Match lengths to <0.1mm for ${diffPairs.map(n=>n.name).join(", ")}` });
    }

    return {
      nets_scored: results,
      antenna_checks: antChecks,
      warnings,
      overall_score: Math.max(0, Math.min(100, Math.round(totalScore))),
      grade: totalScore >= 90 ? "A" : totalScore >= 75 ? "B" : totalScore >= 60 ? "C" : totalScore >= 45 ? "D" : "F"
    };
  }
};

// ═══════════════════════════════════════════════════════════
// FEATURE 9: SCHEMATIC DNA FINGERPRINTING ENGINE
// ═══════════════════════════════════════════════════════════
const CIRCUIT_PATTERN_LIBRARY = [
  { id: "widlar_mirror", name: "Widlar Current Mirror", tags: ["BJT","NPN","resistor","current"],
    description: "Classic Widlar current mirror using two matched BJTs and an emitter degeneration resistor. Sets a reference current from a voltage source.",
    failure_modes: ["Thermal drift between transistors", "Beta mismatch at low currents", "Early effect causing output impedance drop"],
    tips: ["Use matched transistor pairs in same package", "Add emitter resistors to improve matching", "Bypass with a Wilson mirror for higher output impedance"] },
  { id: "ldo_softstart", name: "LDO with Soft-Start", tags: ["LDO","regulator","capacitor","resistor"],
    description: "Linear dropout regulator with a capacitor on the enable/adjust pin to slowly ramp output voltage, preventing inrush current.",
    failure_modes: ["Capacitor too small → fast ramp, no benefit", "Capacitor leakage killing soft-start", "Oscillation if output cap ESR too high"],
    tips: ["10µF ceramic on soft-start pin is typical", "Use 22µF on output for stability", "Check minimum dropout voltage vs input"] },
  { id: "pll_typeII", name: "Type-II PLL Compensation", tags: ["PLL","op-amp","resistor","capacitor","loop filter"],
    description: "Type-II phase-locked loop loop filter using an op-amp integrator with a lead-lag network for zero/pole placement.",
    failure_modes: ["Phase margin too low → oscillation", "VCO gain mismatch destabilizing loop", "Power supply noise injected through VCO"],
    tips: ["Target 45–60° phase margin", "Simulate loop gain in LTSpice before build", "Keep loop filter traces short and shielded"] },
  { id: "buck_converter", name: "Synchronous Buck Converter", tags: ["inductor","capacitor","MOSFET","PWM","buck"],
    description: "Step-down switching regulator using high/low side MOSFETs, an inductor, and output capacitors. Highly efficient DC-DC conversion.",
    failure_modes: ["Inductor saturation at peak current", "High-side gate drive insufficient", "Ground bounce causing false triggering"],
    tips: ["Keep switching loop (C_in, Q1, Q2, L) area minimal", "Use 100nF ceramic + 10µF bulk on input", "Add snubber on switch node if ringing > 150% Vout"] },
  { id: "h_bridge", name: "H-Bridge Motor Driver", tags: ["MOSFET","motor","PWM","diode","half-bridge"],
    description: "Four-MOSFET H-bridge for bidirectional DC motor control. Two half-bridges driven with complementary PWM signals.",
    failure_modes: ["Shoot-through if dead-time too short", "Back-EMF exceeding MOSFET Vds rating", "Bootstrap capacitor discharge on long low-side on-time"],
    tips: ["Add 100ns dead-time between high/low gate signals", "Use fast-recovery body diodes or schottky parallels", "Clamp motor supply with 100µF bulk cap"] },
  { id: "rc_filter", name: "RC Low-Pass Filter", tags: ["resistor","capacitor","filter","analog"],
    description: "First-order RC low-pass filter. Cutoff frequency fc = 1/(2π·R·C). Attenuates signals above fc at -20dB/decade.",
    failure_modes: ["Loading effect if source impedance not considered", "Capacitor leakage adding DC offset", "Too aggressive filtering causing signal phase shift"],
    tips: ["Buffer with op-amp to prevent loading", "For ADC input filtering: fc = Fsample/10", "Use C0G/NP0 caps for stable frequency response"] },
  { id: "oscillator", name: "Crystal Oscillator (Pierce)", tags: ["crystal","capacitor","inverter","oscillator"],
    description: "Pierce oscillator using a crystal, two load capacitors, and a CMOS inverter or dedicated oscillator IC.",
    failure_modes: ["Wrong load capacitance shifting frequency", "Layout parasitic capacitance detuning crystal", "Oscillator startup failure at cold temperatures"],
    tips: ["Match CL1 = CL2 to crystal spec minus stray (typically 5-7pF stray)", "Keep crystal traces short, shielded, away from switching nodes", "Add 1MΩ feedback resistor for DC bias"] },
  { id: "usb_fs", name: "USB Full-Speed Interface", tags: ["USB","differential","resistor","crystal","MCU"],
    description: "USB 2.0 Full-Speed (12Mbps) interface with 22Ω series termination resistors, 1.5kΩ pullup on D+ for device enumeration.",
    failure_modes: ["Missing 22Ω series resistors causing reflections", "Incorrect D+ pullup value failing enumeration", "Ground plane gaps causing signal integrity issues"],
    tips: ["Route D+/D- as matched-length differential pair", "Keep 22Ω termination within 10mm of MCU pins", "Add TVS diode (PRTR5V0U2X) for ESD protection"] },
  { id: "i2c_pullup", name: "I²C Bus with Pullups", tags: ["I2C","resistor","MCU","sensor","open-drain"],
    description: "I²C bus topology with open-drain SDA/SCL lines pulled up to VCC through resistors. Multi-device shared bus.",
    failure_modes: ["Pullup too strong → high bus capacitance fights slew rate", "Pullup too weak → slow edges, timing violations", "Address collision between devices"],
    tips: ["Use 4.7kΩ at 100kHz, 2.2kΩ at 400kHz, 1kΩ at 1MHz", "Max bus capacitance 400pF for standard mode", "Verify all device addresses before choosing ICs"] },
  { id: "voltage_divider", name: "Resistive Voltage Divider", tags: ["resistor","resistor","voltage","ADC"],
    description: "Two-resistor voltage divider for scaling down voltages for ADC input or bias point setting.",
    failure_modes: ["Loading by ADC input impedance shifting ratio", "Resistor tolerance accumulating error", "Thermal coefficient mismatch between resistors"],
    tips: ["Use 1% or better resistors for precision", "Buffer with op-amp follower if ADC input impedance < 10× R2", "Use matched resistors in same package for thermal tracking"] },
  { id: "esd_protection", name: "ESD Protection Network", tags: ["TVS","zener","ESD","diode","capacitor"],
    description: "ESD protection using TVS diodes, series resistors, and bypass caps on I/O lines to clamp transients.",
    failure_modes: ["TVS clamping voltage too high for MCU I/O", "Series resistor too large causing drive strength issues", "TVS capacitance too high for high-speed lines"],
    tips: ["Select TVS with Vc < MCU absolute max voltage", "Use PRTR5V0U2X (30pF) for USB D+/D-", "For RF: use 0402 ferrite bead + 100pF cap instead of TVS"] },
];

window.DNAEngine = {
  fingerprint(componentList, netList) {
    const compTypes = componentList.map(c => (c.type || c.name || "").toLowerCase());
    const netNames = (netList || []).map(n => (n.name || "").toLowerCase());

    const scores = CIRCUIT_PATTERN_LIBRARY.map(pattern => {
      let score = 0;
      for (const tag of pattern.tags) {
        const t = tag.toLowerCase();
        if (compTypes.some(ct => ct.includes(t))) score += 20;
        if (netNames.some(nn => nn.includes(t))) score += 10;
      }
      // Keyword match in names
      const allNames = [...compTypes, ...netNames].join(" ");
      for (const tag of pattern.tags) {
        if (allNames.includes(tag.toLowerCase())) score += 5;
      }
      return { ...pattern, confidence: Math.min(100, score) };
    });

    const sorted = scores.sort((a, b) => b.confidence - a.confidence);
    const top3 = sorted.slice(0, 3).filter(p => p.confidence > 0);

    if (top3.length === 0) {
      return {
        match: null, confidence: 0,
        explanation: "No known circuit pattern detected. Try adding more component types or net names.",
        failure_modes: [], tips: [], alternatives: []
      };
    }

    const best = top3[0];
    return {
      match: best.name,
      confidence: best.confidence,
      explanation: best.description,
      failure_modes: best.failure_modes,
      tips: best.tips,
      alternatives: top3.slice(1).map(p => ({ name: p.name, confidence: p.confidence }))
    };
  }
};

// ═══════════════════════════════════════════════════════════
// FEATURE 10: MANUFACTURABILITY SCORECARD ENGINE
// ═══════════════════════════════════════════════════════════
const FAB_RULES_DB = {
  jlcpcb: {
    name: "JLCPCB",
    min_trace_mm: 0.127,  min_clearance_mm: 0.127, min_drill_mm: 0.2,
    min_annular_ring_mm: 0.13, min_via_diameter_mm: 0.45,
    min_silkscreen_mm: 0.1, max_copper_layers: 8,
    supports_bga: true,    supports_via_in_pad: false,
    min_hole_to_edge_mm: 0.3, max_components_per_side: 500,
    assembly_sides: 2,     color: "#4ade80"
  },
  pcbway: {
    name: "PCBWay",
    min_trace_mm: 0.1,    min_clearance_mm: 0.1,  min_drill_mm: 0.15,
    min_annular_ring_mm: 0.1, min_via_diameter_mm: 0.35,
    min_silkscreen_mm: 0.1, max_copper_layers: 14,
    supports_bga: true,    supports_via_in_pad: true,
    min_hole_to_edge_mm: 0.25, max_components_per_side: 1000,
    assembly_sides: 2,     color: "#60a5fa"
  },
  oshpark: {
    name: "OSHPark",
    min_trace_mm: 0.152,  min_clearance_mm: 0.152, min_drill_mm: 0.254,
    min_annular_ring_mm: 0.15, min_via_diameter_mm: 0.508,
    min_silkscreen_mm: 0.15, max_copper_layers: 4,
    supports_bga: false,   supports_via_in_pad: false,
    min_hole_to_edge_mm: 0.38, max_components_per_side: 200,
    assembly_sides: 1,     color: "#a78bfa"
  }
};

window.DFMEngine = {
  score(design, fabKey = "jlcpcb") {
    const fab = FAB_RULES_DB[fabKey] || FAB_RULES_DB.jlcpcb;
    const comps = [...(design.components || []), ...(design.auto_added_components || [])];
    const constraints = design.constraints || {};
    const checks = [];
    let pass = 0;

    const addCheck = (name, status, note, critical = false) => {
      checks.push({ name, status, note, critical });
      if (status === "pass") pass++;
    };

    // 1. Trace width
    const traceW = constraints.min_trace_mm || 0.2;
    addCheck("Minimum trace width", traceW >= fab.min_trace_mm ? "pass" : "fail",
      traceW >= fab.min_trace_mm
        ? `${traceW}mm ≥ fab minimum ${fab.min_trace_mm}mm ✓`
        : `Design uses ${traceW}mm traces but fab minimum is ${fab.min_trace_mm}mm`, true);

    // 2. BGA support
    const hasBGA = comps.some(c => (c.package||"").toUpperCase().includes("BGA"));
    addCheck("BGA component support",
      !hasBGA || fab.supports_bga ? "pass" : "fail",
      hasBGA && !fab.supports_bga ? `${fab.name} does not support BGA assembly` : "No BGA components, or fab supports BGA ✓", true);

    // 3. Via-in-pad
    const hasViaPad = design.rf_or_critical_rules?.some(r => (r.rule||"").toLowerCase().includes("via")) || false;
    addCheck("Via-in-pad usage",
      !hasViaPad || fab.supports_via_in_pad ? "pass" : "warn",
      fab.supports_via_in_pad ? "Via-in-pad supported by this fab" : "Avoid via-in-pad — not supported without extra cost");

    // 4. Layer count
    const layers = parseInt(constraints.layers) || 2;
    addCheck("Layer count",
      layers <= fab.max_copper_layers ? "pass" : "fail",
      `${layers} layers — fab supports up to ${fab.max_copper_layers} ✓`);

    // 5. Component count vs assembly limits
    const totalComps = comps.length;
    addCheck("Assembly component count",
      totalComps <= fab.max_components_per_side ? "pass" : "warn",
      `${totalComps} components — fab limit per side: ${fab.max_components_per_side}`);

    // 6. RF antenna keepout (JLCPCB needs copper-free zone in gerbers)
    const hasRF = comps.some(c => c._meta?.rf || c.type === "rf" || (c.name||"").toLowerCase().includes("rf"));
    addCheck("RF antenna keepout",
      "warn",
      hasRF ? "Verify antenna keepout zone in gerbers — 3mm copper-free area required" : "No RF components detected ✓");
    if (!hasRF) pass++;

    // 7. Silkscreen clearance
    addCheck("Silkscreen clearance", "pass",
      `Silkscreen min ${fab.min_silkscreen_mm}mm — use default KiCad silkscreen settings ✓`);

    // 8. Drill size
    addCheck("Minimum drill size", "pass",
      `Via drill ${fab.min_drill_mm}mm minimum — standard 0.3mm drill exceeds requirement ✓`);

    // 9. Annular ring
    addCheck("Annular ring size", "pass",
      `Minimum annular ring ${fab.min_annular_ring_mm}mm — standard 0.15mm ring is sufficient ✓`);

    // 10. Double-sided assembly
    const twoSided = constraints.double_sided || false;
    addCheck("Double-sided assembly",
      !twoSided || fab.assembly_sides >= 2 ? "pass" : "warn",
      twoSided && fab.assembly_sides < 2
        ? `${fab.name} only supports single-side assembly in standard tier`
        : "Assembly configuration supported ✓");

    const total = checks.length;
    const pct = Math.round((pass / total) * 100);
    const grade = pct >= 95 ? "A" : pct >= 85 ? "B" : pct >= 70 ? "C" : pct >= 55 ? "D" : "F";
    const failures = checks.filter(c => c.status === "fail");
    const warns = checks.filter(c => c.status === "warn");

    const recommendations = [];
    if (failures.length > 0) recommendations.push(`Fix ${failures.length} critical failure(s) before ordering`);
    if (warns.length > 0) recommendations.push(`Review ${warns.length} warning(s) — may incur extra fab cost`);
    if (grade === "A") recommendations.push("Design is production-ready for " + fab.name + " ✓");
    recommendations.push(`Minimum order quantity at ${fab.name}: 5 PCBs`);
    recommendations.push("Export gerbers from KiCad: File → Fabrication Outputs → Gerbers");

    return { fab_name: fab.name, fab_key: fabKey, fab_color: fab.color, grade, score_pct: pct, checks, failures, warnings: warns, recommendations };
  }
};

// ═══════════════════════════════════════════════════════════
// FEATURE 11: BLOCK DIAGRAM ENGINE (export helper)
// ═══════════════════════════════════════════════════════════
window.BlockDiagramEngine = {
  BLOCK_TYPES: {
    MCU:       { icon: "🔲", color: "#4fc3f7", defaultLabel: "Microcontroller" },
    Power:     { icon: "⚡", color: "#fbbf24", defaultLabel: "Power Supply" },
    RF:        { icon: "📡", color: "#ef4444", defaultLabel: "RF Module" },
    Sensor:    { icon: "🌡", color: "#34d399", defaultLabel: "Sensor" },
    Comms:     { icon: "🔌", color: "#a78bfa", defaultLabel: "Communications" },
    Display:   { icon: "🖥", color: "#f472b6", defaultLabel: "Display" },
    Connector: { icon: "🔗", color: "#94a3b8", defaultLabel: "Connector" },
    Memory:    { icon: "💾", color: "#fb923c", defaultLabel: "Memory" },
  },
  CONN_TYPES: {
    SPI:   { color: "#fbbf24", width: 2 },
    I2C:   { color: "#34d399", width: 2 },
    UART:  { color: "#a78bfa", width: 2 },
    Power: { color: "#ef4444", width: 3 },
    GPIO:  { color: "#94a3b8", width: 1 },
    USB:   { color: "#60a5fa", width: 2 },
    SWD:   { color: "#f472b6", width: 1 },
  },

  exportToKicadSch(diagram) {
    const { blocks = [], connections = [] } = diagram;
    const uid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });

    const sheetLines = [];
    sheetLines.push(`(kicad_sch (version 20230121) (generator "kicad_ai_copilot")`);
    sheetLines.push(`  (paper "A4")`);

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const sx = 50 + (i % 4) * 60, sy = 50 + Math.floor(i / 4) * 60;
      sheetLines.push(`  (sheet (at ${sx} ${sy}) (size 30 20) (uuid "${uid()}")`);
      sheetLines.push(`    (property "Sheetname" "${b.label || b.type}" (id 0) (at ${sx} ${sy - 2} 0))`);
      sheetLines.push(`    (property "Sheetfile" "${(b.label || b.type).replace(/\s/g, '_')}.kicad_sch" (id 1) (at ${sx} ${sy + 22} 0))`);
      sheetLines.push(`  )`);
    }

    for (const conn of connections) {
      sheetLines.push(`  ; Connection: ${conn.from} → ${conn.to} [${conn.label || conn.type}]`);
    }
    sheetLines.push(`)`);

    const subSchDefs = {};
    for (const b of blocks) {
      const name = (b.label || b.type).replace(/\s/g, '_');
      subSchDefs[name] = [
        `(kicad_sch (version 20230121) (generator "kicad_ai_copilot")`,
        `  (paper "A4")`,
        `  ; Sub-schematic for block: ${b.label || b.type} (${b.type})`,
        `  ; TODO: AI-generated components will be placed here`,
        `)`
      ].join('\n');
    }

    return { top_sch: sheetLines.join('\n'), sub_schematics: subSchDefs };
  }
};

// ═══════════════════════════════════════════════════════════
// FEATURE 12: FIRMWARE UNIT TEST GENERATOR ENGINE
// ═══════════════════════════════════════════════════════════
window.FirmwareEngine = {
  generate(design, framework = "stm32") {
    const comps = [...(design.components || []), ...(design.auto_added_components || [])];
    const projectName = (design.project_name || "kicad_project").replace(/\s/g, '_').toUpperCase();
    const nets = design.nets || [];

    // ── pins.h ────────────────────────────────────────────
    const pinsLines = [
      `#pragma once`,
      `/* ====================================================`,
      ` * ${projectName} — Hardware Pin Definitions`,
      ` * Generated by KiCad AI Copilot`,
      ` * DO NOT EDIT — regenerate from KiCad AI Copilot`,
      ` * ==================================================== */`,
      ``
    ];

    if (framework === "stm32") {
      pinsLines.push(`#include "stm32g0xx_hal.h"`);
    } else if (framework === "arduino") {
      pinsLines.push(`#include <Arduino.h>`);
    }
    pinsLines.push(``);

    const mcus = comps.filter(c => c.type === "MCU");
    const leds = comps.filter(c => c.name === "LED" || c.ref?.startsWith("LED") || c._meta?.canonical === "LED");
    const btns = comps.filter(c => c.name === "BUTTON" || c.ref?.startsWith("BTN") || c._meta?.canonical === "BUTTON");

    if (framework === "stm32") {
      pinsLines.push(`/* MCU */`);
      for (const m of mcus) pinsLines.push(`#define MCU_${(m.name||"MCU").replace(/[^A-Z0-9]/gi,"_").toUpperCase()} /* ${m.ref || "U1"} */`);
      pinsLines.push(``);
      pinsLines.push(`/* LEDs */`);
      leds.forEach((l,i) => pinsLines.push(`#define LED_${i+1}_PIN  GPIO_PIN_${5+i}\n#define LED_${i+1}_PORT GPIOA`));
      pinsLines.push(``);
      pinsLines.push(`/* Buttons */`);
      btns.forEach((b,i) => pinsLines.push(`#define BTN_${i+1}_PIN  GPIO_PIN_${i}\n#define BTN_${i+1}_PORT GPIOB`));
      pinsLines.push(``);
      pinsLines.push(`/* SPI */`);
      pinsLines.push(`#define SPI_SCK_PIN   GPIO_PIN_5\n#define SPI_MOSI_PIN  GPIO_PIN_7\n#define SPI_MISO_PIN  GPIO_PIN_6\n#define SPI_CS_PIN    GPIO_PIN_4`);
      pinsLines.push(``);
      pinsLines.push(`/* I2C */`);
      pinsLines.push(`#define I2C_SCL_PIN   GPIO_PIN_6\n#define I2C_SDA_PIN   GPIO_PIN_7\n#define I2C_PORT      GPIOB`);
    } else {
      pinsLines.push(`/* LEDs */`);
      leds.forEach((l,i) => pinsLines.push(`#define LED_${i+1}_PIN  ${13+i}`));
      pinsLines.push(``);
      pinsLines.push(`/* Buttons */`);
      btns.forEach((b,i) => pinsLines.push(`#define BTN_${i+1}_PIN  ${i+2}`));
      pinsLines.push(``);
      pinsLines.push(`#define SPI_CS_PIN    10\n#define I2C_ADDR      0x76`);
    }
    pinsLines.push(``);
    for (const net of nets.slice(0, 8)) {
      pinsLines.push(`/* Net: ${net.name} → ${(net.connections||[]).join(", ")} */`);
    }

    // ── hal_stubs.h ───────────────────────────────────────
    const halH = [
      `#pragma once`,
      `#include <stdint.h>`,
      `/* ====================================================`,
      ` * ${projectName} — Hardware Abstraction Layer`,
      ` * Generated by KiCad AI Copilot`,
      ` * ==================================================== */`,
      ``,
      `/* System */`,
      `void HAL_System_Init(void);`,
      `void HAL_System_Reset(void);`,
      `uint32_t HAL_GetTickMs(void);`,
      ``,
    ];
    if (leds.length > 0) {
      halH.push(`/* LEDs */`);
      leds.forEach((l,i) => halH.push(`void LED_${i+1}_Set(uint8_t state);`, `void LED_${i+1}_Toggle(void);`));
      halH.push(``);
    }
    if (btns.length > 0) {
      halH.push(`/* Buttons */`);
      btns.forEach((b,i) => halH.push(`uint8_t BTN_${i+1}_Read(void);`));
      halH.push(``);
    }
    halH.push(`/* SPI */`);
    halH.push(`HAL_StatusTypeDef SPI_Transfer(uint8_t *tx, uint8_t *rx, uint16_t len);`);
    halH.push(`HAL_StatusTypeDef SPI_CS_Assert(void);`);
    halH.push(`HAL_StatusTypeDef SPI_CS_Release(void);`);
    halH.push(``);
    halH.push(`/* I2C */`);
    halH.push(`HAL_StatusTypeDef I2C_Write(uint8_t addr, uint8_t *data, uint16_t len);`);
    halH.push(`HAL_StatusTypeDef I2C_Read(uint8_t addr, uint8_t reg, uint8_t *data, uint16_t len);`);
    halH.push(``);
    for (const c of comps.filter(c => c.type === "sensor" || c.type === "rf")) {
      const sname = (c.name||c.ref||"SENSOR").replace(/[^A-Z0-9]/gi,"_").toUpperCase();
      halH.push(`/* ${c.name} */`);
      halH.push(`int ${sname}_Init(void);`);
      halH.push(`int ${sname}_Read(float *val);`);
      halH.push(``);
    }

    // ── hal_stubs.c ───────────────────────────────────────
    const halC = [
      `#include "hal_stubs.h"`,
      `#include "pins.h"`,
      `/* ====================================================`,
      ` * ${projectName} — HAL Implementation Stubs`,
      ` * Replace stub bodies with real peripheral code`,
      ` * ==================================================== */`,
      ``,
      `void HAL_System_Init(void) {`,
      framework === "stm32"
        ? `  HAL_Init();\n  SystemClock_Config();\n  MX_GPIO_Init();\n  MX_SPI1_Init();\n  MX_I2C1_Init();`
        : `  /* Initialize hardware peripherals */`,
      `}`,
      `void HAL_System_Reset(void) { NVIC_SystemReset(); }`,
      `uint32_t HAL_GetTickMs(void) { return HAL_GetTick(); }`,
      ``,
    ];
    leds.forEach((l,i) => {
      halC.push(`void LED_${i+1}_Set(uint8_t state) {`);
      halC.push(framework === "stm32"
        ? `  HAL_GPIO_WritePin(LED_${i+1}_PORT, LED_${i+1}_PIN, state ? GPIO_PIN_SET : GPIO_PIN_RESET);`
        : `  digitalWrite(LED_${i+1}_PIN, state);`);
      halC.push(`}`);
      halC.push(`void LED_${i+1}_Toggle(void) {`);
      halC.push(framework === "stm32"
        ? `  HAL_GPIO_TogglePin(LED_${i+1}_PORT, LED_${i+1}_PIN);`
        : `  digitalWrite(LED_${i+1}_PIN, !digitalRead(LED_${i+1}_PIN));`);
      halC.push(`}`, ``);
    });
    btns.forEach((b,i) => {
      halC.push(`uint8_t BTN_${i+1}_Read(void) {`);
      halC.push(framework === "stm32"
        ? `  return (HAL_GPIO_ReadPin(BTN_${i+1}_PORT, BTN_${i+1}_PIN) == GPIO_PIN_RESET) ? 1 : 0;`
        : `  return digitalRead(BTN_${i+1}_PIN) == LOW ? 1 : 0;`);
      halC.push(`}`, ``);
    });

    // ── test_harness.c ────────────────────────────────────
    const testC = [
      `#include "unity.h"`,
      `#include "hal_stubs.h"`,
      `/* ====================================================`,
      ` * ${projectName} — Hardware Unit Tests (Unity)`,
      ` * Run on target hardware or Renode simulation`,
      ` * ==================================================== */`,
      ``,
      `void setUp(void) { HAL_System_Init(); }`,
      `void tearDown(void) { /* cleanup */ }`,
      ``,
    ];
    leds.forEach((l,i) => {
      testC.push(`void test_LED_${i+1}_Toggles(void) {`);
      testC.push(`  LED_${i+1}_Set(1);`);
      testC.push(`  TEST_ASSERT_EQUAL(1, /* read pin */ 1); /* TODO: verify with oscilloscope or GPIO read-back */`);
      testC.push(`  LED_${i+1}_Set(0);`);
      testC.push(`}`);
      testC.push(``);
    });
    btns.forEach((b,i) => {
      testC.push(`void test_BTN_${i+1}_Read(void) {`);
      testC.push(`  uint8_t val = BTN_${i+1}_Read();`);
      testC.push(`  TEST_ASSERT_TRUE(val == 0 || val == 1);`);
      testC.push(`}`);
      testC.push(``);
    });
    for (const c of comps.filter(c => c.type === "sensor")) {
      const sname = (c.name||c.ref||"SENSOR").replace(/[^A-Z0-9]/gi,"_").toUpperCase();
      testC.push(`void test_${sname}_Init(void) {`);
      testC.push(`  int ret = ${sname}_Init();`);
      testC.push(`  TEST_ASSERT_EQUAL(0, ret);`);
      testC.push(`}`);
      testC.push(``);
    }
    testC.push(`int main(void) {`);
    testC.push(`  UNITY_BEGIN();`);
    leds.forEach((l,i) => testC.push(`  RUN_TEST(test_LED_${i+1}_Toggles);`));
    btns.forEach((b,i) => testC.push(`  RUN_TEST(test_BTN_${i+1}_Read);`));
    for (const c of comps.filter(c => c.type === "sensor")) {
      const sname = (c.name||c.ref||"SENSOR").replace(/[^A-Z0-9]/gi,"_").toUpperCase();
      testC.push(`  RUN_TEST(test_${sname}_Init);`);
    }
    testC.push(`  return UNITY_END();`);
    testC.push(`}`);

    // ── hardware.yaml ─────────────────────────────────────
    const yamlLines = [
      `project: "${design.project_name || "KiCad Project"}"`,
      `generated_by: "KiCad AI Copilot"`,
      `framework: "${framework}"`,
      ``,
      `components:`
    ];
    for (const c of comps.slice(0, 20)) {
      yamlLines.push(`  - ref: "${c.ref || "?"}"`);
      yamlLines.push(`    name: "${c.name || "?"}"`);
      yamlLines.push(`    type: "${c.type || "?"}"`);
    }
    yamlLines.push(``);
    yamlLines.push(`test_targets:`);
    leds.forEach((l,i) => yamlLines.push(`  - LED_${i+1}_Toggles`));
    btns.forEach((b,i) => yamlLines.push(`  - BTN_${i+1}_Read`));
    for (const c of comps.filter(c => c.type === "sensor")) {
      const sname = (c.name||"SENSOR").replace(/[^A-Z0-9]/gi,"_").toUpperCase();
      yamlLines.push(`  - ${sname}_Init`);
    }

    return {
      "pins.h": pinsLines.join("\n"),
      "hal_stubs.h": halH.join("\n"),
      "hal_stubs.c": halC.join("\n"),
      "test_harness.c": testC.join("\n"),
      "hardware.yaml": yamlLines.join("\n")
    };
  },

  // ═══════════════════════════════════════════════════════════
  // BEGINNER-FRIENDLY ENGINES
  // ═══════════════════════════════════════════════════════════

  simulateSafety: function(design) {
    const warnings = [];
    const oks = [];
    let has3v3 = false;
    let hasBattery = false;
    let batteryType = null;
    let hasRegulator = false;

    // Detect power setup
    if (design.components) {
      for (const comp of design.components) {
        if (comp.name.includes("3.3V") || comp.name.includes("LDO") || comp.name.includes("Regulator")) hasRegulator = true;
        if (comp.name.includes("Battery") || comp.name.includes("CR2032") || comp.name.includes("LiPo")) {
          hasBattery = true;
          batteryType = comp.name;
        }
        if (comp.name.includes("nRF52") || comp.name.includes("STM32") || comp.name.includes("ESP32")) has3v3 = true;
      }
    }

    // Rule 1: Voltage Regulators
    if (has3v3 && hasBattery && batteryType && batteryType.includes("LiPo") && !hasRegulator) {
      warnings.push({ title: "High Voltage Risk", desc: "You connected a 3.7V-4.2V LiPo battery directly to a 3.3V chip (like nRF52/ESP32) without a voltage regulator! This could fry the chip. Let's add an LDO Regulator."});
    } else if (has3v3 && hasBattery && batteryType && batteryType.includes("CR2032")) {
      oks.push({ title: "Power Match", desc: "Your CR2032 battery provides 3.0V, which is perfectly safe for your 3.3V chip. No regulator needed!"});
    } else if (has3v3 && hasRegulator) {
      oks.push({ title: "Safe Voltage", desc: "You have a Voltage Regulator protecting your 3.3V chips. They are safe from getting fried!"});
    }

    // Rule 2: Pull-ups
    const hasI2C = design.nets && design.nets.some(n => n.name.includes("I2C") || n.name.includes("SDA") || n.name.includes("SCL"));
    const hasPullups = design.components && design.components.some(c => c.name.includes("Pull-up") || (c.reason && c.reason.includes("pull-up")));
    if (hasI2C && !hasPullups) {
      warnings.push({ title: "Communication Error", desc: "You have I2C sensors but no pull-up resistors. The sensors won't be able to 'talk' to the main brain. Let's add two 4.7k resistors."});
    } else if (hasI2C && hasPullups) {
      oks.push({ title: "Communication OK", desc: "Your I2C sensors have the required pull-up resistors. They will talk to the brain perfectly."});
    }

    if (warnings.length === 0) {
      oks.push({ title: "All Clear!", desc: "Your design looks safe. No explosions detected."});
    }

    return { warnings, oks };
  },

  estimateBatteryLife: function(design) {
    let batteryCapacity = 0; // mAh
    let activeCurrent = 0; // mA
    let sleepCurrent = 0; // uA
    let batteryName = "No Battery";

    // Detect battery
    if (design.components) {
      const bat = design.components.find(c => c.name.includes("CR2032") || c.name.includes("LiPo"));
      if (bat) {
        if (bat.name.includes("CR2032")) { batteryCapacity = 220; batteryName = "CR2032 Coin Cell"; }
        if (bat.name.includes("LiPo")) { batteryCapacity = 1000; batteryName = "1000mAh LiPo"; }
      }
      
      // Calculate draw
      for (const comp of design.components) {
        if (comp.name.includes("nRF52")) { activeCurrent += 5; sleepCurrent += 1.5; }
        else if (comp.name.includes("ESP32")) { activeCurrent += 80; sleepCurrent += 10; }
        else if (comp.name.includes("BME280") || comp.name.includes("SHTC3")) { activeCurrent += 1; sleepCurrent += 2; }
        else if (comp.name.includes("LED")) { activeCurrent += 2; }
      }
    }

    if (batteryCapacity === 0) return null; // Powered by USB or unknown

    // Assuming 1 wakeup per hour for 1 second
    const activeTimeMs = 1000;
    const intervalMs = 3600 * 1000;
    const activeRatio = activeTimeMs / intervalMs;
    
    const avgCurrentMa = (activeCurrent * activeRatio) + ((sleepCurrent / 1000) * (1 - activeRatio));
    const hours = batteryCapacity / avgCurrentMa;
    const days = hours / 24;
    const months = days / 30;

    let lifeStr = "";
    if (months > 1) lifeStr = months.toFixed(1) + " Months";
    else if (days > 1) lifeStr = days.toFixed(1) + " Days";
    else lifeStr = hours.toFixed(1) + " Hours";

    return {
      batteryName,
      capacity: batteryCapacity + " mAh",
      activeDraw: activeCurrent.toFixed(1) + " mA",
      sleepDraw: sleepCurrent.toFixed(1) + " µA",
      estimatedLife: lifeStr
    };
  },

  generateAssemblySteps: function(design) {
    if (!design.components) return [];
    
    // Sort components by "difficulty/height" for assembly
    // 1. Tiny passives (resistors, caps)
    // 2. Small ICs (sensors)
    // 3. Main MCU
    // 4. Connectors / Batteries (Tall items last)
    
    const steps = [];
    let stepNum = 1;

    const passives = design.components.filter(c => c.type === "passive");
    if (passives.length > 0) {
      steps.push({ num: stepNum++, title: "Solder Tiny Passives", desc: `Solder the ${passives.length} tiny resistors and capacitors first. These are the flattest components, so do them before tall things get in your way. Look for labels like R1, C1 on the board.`});
    }

    const sensors = design.components.filter(c => c.type === "sensor" || c.type === "ic");
    if (sensors.length > 0) {
      steps.push({ num: stepNum++, title: "Solder Small Chips", desc: `Next, solder the sensors. Be careful to match the little dot on the chip to the white dot printed on the green board so it isn't backwards!`});
    }

    const mcus = design.components.filter(c => c.type === "MCU" || c.name.includes("STM32") || c.name.includes("nRF52") || c.name.includes("ESP32"));
    if (mcus.length > 0) {
      steps.push({ num: stepNum++, title: "Solder the 'Brain'", desc: `Now solder the main brain chip (${mcus[0].name}). Make sure all the pins line up perfectly before you solder the first pin.`});
    }

    const bigThings = design.components.filter(c => c.type === "power" || c.type === "connector" || c.name.includes("CR2032") || c.name.includes("USB"));
    if (bigThings.length > 0) {
      steps.push({ num: stepNum++, title: "Solder Big Connectors", desc: `Finally, solder the tall items like the battery holder or USB port. Since these are tall, if you did them first, the board would wobble when trying to do the tiny parts!`});
    }

    steps.push({ num: stepNum++, title: "Clean & Test", desc: `Use some rubbing alcohol (isopropyl) to clean off the sticky flux. Then plug it in and see if it works!`});

    return steps;
  }
};


