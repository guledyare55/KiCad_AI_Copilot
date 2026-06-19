/**
 * KiCad AI Copilot — UI Application Logic
 * Handles all UI interactions, rendering, and output display.
 */

"use strict";

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
const State = {
  currentMode: "natural",
  currentTab: "overview",
  constraints: { size: "smallest", power: "battery", cost: "commercial" },
  lastOutput: null
};

// ═══════════════════════════════════════════════════════════
// QUICK EXAMPLE TEMPLATES
// ═══════════════════════════════════════════════════════════
const EXAMPLES = {
  "ex-ble": {
    name: "BLE Sensor Node",
    desc: "Ultra-low power BLE 5.0 environmental sensor node using nRF52810 with BME280 temperature/humidity/pressure sensor. CR2032 battery powered, LED status indicator, 1 button for pairing. Smallest possible form factor for commercial production.",
    components: ["nRF52810", "BME280", "CR2032", "LED", "BUTTON"],
    constraints: { size: "smallest", power: "battery", cost: "commercial" }
  },
  "ex-lora": {
    name: "LoRa IoT Node",
    desc: "Long-range IoT sensor node using SX1262 LoRa transceiver with STM32G031K8 microcontroller. USB-C powered with LDO regulation. BME280 sensor, LED, 2 buttons for configuration. JLCPCB basic parts preferred.",
    components: ["STM32G031K8", "SX1262", "BME280", "USB-C-GCT_USB4085", "LED", "BUTTON x2"],
    constraints: { size: "small", power: "usb", cost: "commercial" }
  },
  "ex-motor": {
    name: "Motor Driver Controller",
    desc: "Dual DC motor driver controller based on STM32G031K8 MCU with USB-C for power and programming. 2 buttons for direction control, LED status, UART programming interface. Medium PCB size for easy assembly.",
    components: ["STM32G031K8", "USB-C-GCT_USB4085", "LED x2", "BUTTON x2"],
    constraints: { size: "medium", power: "usb", cost: "low" }
  },
  "ex-usb": {
    name: "USB HID Device",
    desc: "Compact USB HID device using ATmega328P with CH340C USB-UART bridge. USB-C connector for host connection, 3 buttons for input, LED status indicators. Small form factor, low cost prototype.",
    components: ["ATMEGA328P", "CH340C", "USB-C-GCT_USB4085", "LED x2", "BUTTON x3"],
    constraints: { size: "small", power: "usb", cost: "low" }
  }
};

// ═══════════════════════════════════════════════════════════
// INITIALISE
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  initModeToggle();
  initConstraintSelectors();
  initExampleButtons();
  initTabButtons();
  initOutputActions();
  initGenerateButton();
  initFootprintSynthesizer();
  initDNAPanel();
  initBOMOptimizer();
  initDFMScorecard();
  initFirmwareGenerator();
  initBlockEditor();
  initNavLinks();
  initBeginnerToggle();
  initEnclosureGenerator();
});

// ─── Mode Toggle ──────────────────────────────────────────
function initModeToggle() {
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      State.currentMode = mode;
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("natural-mode").classList.toggle("hidden", mode !== "natural");
      document.getElementById("json-mode").classList.toggle("hidden", mode !== "json");
    });
  });
}

// ─── Constraint Selectors ─────────────────────────────────
function initConstraintSelectors() {
  ["size", "power", "cost"].forEach(key => {
    const group = document.getElementById(`${key}-select`);
    if (!group) return;
    group.querySelectorAll(".select-opt").forEach(btn => {
      btn.addEventListener("click", () => {
        group.querySelectorAll(".select-opt").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        State.constraints[key] = btn.dataset.val;
      });
    });
  });
}

// ─── Example Buttons ──────────────────────────────────────
function initExampleButtons() {
  Object.keys(EXAMPLES).forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const ex = EXAMPLES[id];
      // Switch to natural mode
      document.getElementById("mode-natural").click();
      document.getElementById("project-name").value = ex.name;
      document.getElementById("project-desc").value = ex.desc;
      document.getElementById("components-input").value = ex.components.join(", ");
      // Set constraints
      Object.entries(ex.constraints).forEach(([k, v]) => {
        State.constraints[k] = v;
        const group = document.getElementById(`${k}-select`);
        if (group) {
          group.querySelectorAll(".select-opt").forEach(b => {
            b.classList.toggle("active", b.dataset.val === v);
          });
        }
      });
      showToast("Example loaded — click Generate to create design", "success");
    });
  });
}

// ─── Tab Buttons ──────────────────────────────────────────
function initTabButtons() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      State.currentTab = tab;
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-content-${tab}`)?.classList.add("active");
    });
  });
}

// ─── Output Actions ──────────────────────────────────────
function initOutputActions() {
  document.getElementById("btn-copy-json")?.addEventListener("click", () => {
    if (!State.lastOutput) return;
    navigator.clipboard.writeText(JSON.stringify(State.lastOutput, null, 2))
      .then(() => showToast("JSON copied to clipboard ✓", "success"))
      .catch(() => showToast("Copy failed — use Raw JSON tab", "error"));
  });

  document.getElementById("btn-download")?.addEventListener("click", () => {
    if (!State.lastOutput) return;
    const name = (document.getElementById("project-name")?.value || "kicad_design")
      .replace(/[^a-z0-9]/gi, "_").toLowerCase();
    downloadJson(State.lastOutput, `${name}_kicad_copilot.json`);
    showToast("JSON exported ✓", "success");
  });

  document.getElementById("raw-copy-btn")?.addEventListener("click", () => {
    const raw = document.getElementById("json-viewer")?.textContent;
    if (raw) navigator.clipboard.writeText(raw).then(() => showToast("Copied ✓", "success"));
  });
}

// ─── Generate Button ─────────────────────────────────────
function initGenerateButton() {
  document.getElementById("generate-btn")?.addEventListener("click", handleGenerate);
}

async function handleGenerate() {
  const input = buildInput();
  if (!validateInput(input)) return;

  setGenerating(true);
  showLoadingState();

  try {
    await animateLoadingSteps();
    const output = KiCadEngine.generate(input);
    State.lastOutput = output;
    renderOutput(output, input);
    updateStats(output);
    setGenerating(false);
    showOutputContent();
    showToast("Design generated successfully ✓", "success");
  } catch (err) {
    console.error("Generation error:", err);
    setGenerating(false);
    hideLoadingState();
    showToast("Generation error: " + err.message, "error");
  }
}

function buildInput() {
  if (State.currentMode === "json") {
    try {
      return JSON.parse(document.getElementById("json-input")?.value || "{}");
    } catch {
      showToast("Invalid JSON input", "error");
      return null;
    }
  }

  const name = document.getElementById("project-name")?.value?.trim() || "PCB Project";
  const desc = document.getElementById("project-desc")?.value?.trim() || "";
  const compsRaw = document.getElementById("components-input")?.value?.trim() || "";
  const notes = document.getElementById("notes-input")?.value?.trim() || "";

  const components = compsRaw ? compsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

  return {
    project_name: name,
    description: desc,
    constraints: { ...State.constraints, notes },
    components,
    preferences: { footprint_standard: State.constraints.cost === "low" ? "0603" : "0402" }
  };
}

function validateInput(input) {
  if (!input) return false;
  if (!input.description && (!input.components || input.components.length === 0)) {
    showToast("Please describe your project or add components", "error");
    return false;
  }
  return true;
}

// ─── Loading Animation ────────────────────────────────────
async function animateLoadingSteps() {
  const steps = ["lstep-1","lstep-2","lstep-3","lstep-4","lstep-5","lstep-6"];
  const delays = [350, 450, 500, 400, 350, 300];
  for (let i = 0; i < steps.length; i++) {
    await delay(delays[i]);
    const el = document.getElementById(steps[i]);
    if (el) { el.classList.add("active"); }
    if (i > 0) {
      const prev = document.getElementById(steps[i-1]);
      if (prev) { prev.classList.remove("active"); prev.classList.add("done"); }
    }
  }
  await delay(300);
  const last = document.getElementById(steps[steps.length-1]);
  if (last) { last.classList.remove("active"); last.classList.add("done"); }
  await delay(200);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── UI State Transitions ─────────────────────────────────
function setGenerating(on) {
  const btn = document.getElementById("generate-btn");
  const icon = btn?.querySelector(".btn-icon");
  const spinner = document.getElementById("btn-spinner");
  const text = btn?.querySelector(".btn-text");
  if (!btn) return;
  btn.classList.toggle("loading", on);
  icon?.classList.toggle("hidden", on);
  spinner?.classList.toggle("hidden", !on);
  if (text) text.textContent = on ? "Generating..." : "Generate KiCad Design";
}

function showLoadingState() {
  document.getElementById("output-placeholder")?.classList.add("hidden");
  document.getElementById("output-content")?.classList.add("hidden");
  document.getElementById("output-loading")?.classList.remove("hidden");
  // Reset step states
  ["lstep-1","lstep-2","lstep-3","lstep-4","lstep-5","lstep-6"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove("active","done"); }
  });
}

function hideLoadingState() {
  document.getElementById("output-loading")?.classList.add("hidden");
  document.getElementById("output-placeholder")?.classList.remove("hidden");
}

function showOutputContent() {
  document.getElementById("output-loading")?.classList.add("hidden");
  document.getElementById("output-placeholder")?.classList.add("hidden");
  document.getElementById("output-content")?.classList.remove("hidden");
}

// ─── Stats Update ─────────────────────────────────────────
function updateStats(output) {
  const totalComp = output.components.length + output.auto_added_components.length;
  document.getElementById("stat-components").textContent = totalComp;
  document.getElementById("stat-nets").textContent = output.nets.length;
  document.getElementById("stat-rules").textContent = output.pcb_placement_rules.length + output.rf_or_critical_rules.length;
  document.getElementById("stat-checks").textContent = output.validation_checklist.filter(c => c.pass).length + "/" + output.validation_checklist.length;
}

// ═══════════════════════════════════════════════════════════
// RENDER OUTPUT
// ═══════════════════════════════════════════════════════════
function renderOutput(output, input) {
  document.getElementById("output-project-name").textContent = input.project_name || "PCB Design";
  document.getElementById("output-summary").textContent = output.project_summary;

  renderOverview(output);
  renderComponents(output);
  renderNets(output);
  renderPcbRules(output);
  renderRawJson(output);
  renderThermalHeatmap(output);
  renderSIAdvisor(output);
  renderDFMScorecard(output, State.currentDFMFab || "jlcpcb");
  renderSafetyCheck(output);
  renderBatteryLife(output);
  renderAssemblyGuide(output);

  applyJargonTranslation();

  // Reset to overview tab
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.getElementById("tab-overview")?.classList.add("active");
  document.getElementById("tab-content-overview")?.classList.add("active");
}

// ─── Overview Tab ─────────────────────────────────────────
function renderOverview(output) {
  const grid = document.getElementById("overview-grid");
  grid.innerHTML = "";

  // Architecture card
  grid.appendChild(makeCard("System Architecture", "⚡", "oc-icon-blue", `
    <div class="arch-blocks">
      ${output.architecture.blocks.map(b => `
        <div class="arch-block">
          <div class="arch-block-dot"></div>
          ${escHtml(b)}
        </div>
      `).join("")}
    </div>
  `));

  // Power tree card
  grid.appendChild(makeCard("Power System", "🔋", "oc-icon-amber", `
    <div class="power-input-chip">⚡ ${escHtml(output.power_tree.input)}</div>
    <div class="power-rails">
      ${output.power_tree.rails.map(r => `
        <div class="rail-chip">
          <div class="rail-dot" style="background:${r.color}"></div>
          <strong>${escHtml(r.name)}</strong>&nbsp;—&nbsp;${escHtml(r.voltage)}
        </div>
      `).join("")}
    </div>
  `));

  // Component summary card
  const typeGroups = {};
  for (const c of output.components) {
    typeGroups[c.type] = (typeGroups[c.type] || 0) + 1;
  }
  grid.appendChild(makeCard("Component Summary", "📦", "oc-icon-purple", `
    <div class="arch-blocks">
      ${Object.entries(typeGroups).map(([t,n]) => `
        <div class="arch-block">
          <span class="type-badge type-${t.toLowerCase()}">${escHtml(t)}</span>
          ${n} component${n > 1 ? "s" : ""}
        </div>
      `).join("")}
      <div class="arch-block">
        <span class="type-badge type-passive">auto-added</span>
        ${output.auto_added_components.length} support components
      </div>
    </div>
  `));

  // Validation card
  const passCount = output.validation_checklist.filter(c => c.pass).length;
  grid.appendChild(makeCard(`Validation — ${passCount}/${output.validation_checklist.length} Passed`, "✅", "oc-icon-green", `
    <div class="check-list">
      ${output.validation_checklist.slice(0, 5).map(c => `
        <div class="check-item">
          <span class="check-icon ${c.pass ? "check-pass" : "check-fail"}">${c.pass ? "✓" : "✗"}</span>
          <span>${escHtml(c.item)}</span>
        </div>
      `).join("")}
    </div>
  `));

  // Full validation panel
  const valPanel = document.getElementById("validation-panel");
  valPanel.innerHTML = `
    <p class="validation-title">Full Validation Checklist</p>
    <div class="check-list">
      ${output.validation_checklist.map(c => `
        <div class="check-item">
          <span class="check-icon ${c.pass ? "check-pass" : "check-fail"}">${c.pass ? "✓" : "✗"}</span>
          <span style="flex:1">${escHtml(c.item)}</span>
          <span style="font-size:11px;color:var(--text-muted)">${escHtml(c.note || "")}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function makeCard(title, icon, iconClass, content) {
  const card = document.createElement("div");
  card.className = "overview-card";
  card.innerHTML = `
    <div class="oc-header">
      <div class="oc-icon ${iconClass}">${icon}</div>
      <span class="oc-title">${escHtml(title)}</span>
    </div>
    ${content}
  `;
  return card;
}

// ─── Components Tab ───────────────────────────────────────
function renderComponents(output) {
  const tbody = document.getElementById("components-tbody");
  tbody.innerHTML = "";

  for (const c of output.components) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="ref-badge">${escHtml(c.ref)}</span></td>
      <td><span class="comp-name">${escHtml(c.name)}</span></td>
      <td><span class="type-badge type-${(c.type||"").toLowerCase()}">${escHtml(c.type)}</span></td>
      <td>${escHtml(c.value)}</td>
      <td><code class="fp-code">${escHtml(shortenFootprint(c.footprint))}</code></td>
      <td><span class="comp-reason">${escHtml(c.reason?.substring(0, 80))}${c.reason?.length > 80 ? "…" : ""}</span></td>
    `;
    tbody.appendChild(tr);
  }

  // Auto-added grid
  const autoGrid = document.getElementById("auto-added-grid");
  autoGrid.innerHTML = "";
  for (const a of output.auto_added_components) {
    const div = document.createElement("div");
    div.className = "auto-card";
    div.innerHTML = `
      <div class="auto-card-name">${escHtml(a.name)}</div>
      <div class="auto-card-reason">${escHtml(a.reason?.substring(0, 120))}${a.reason?.length > 120 ? "…" : ""}</div>
      <div class="auto-card-connected">
        ${(a.connected_to || []).map(c => `<span class="conn-tag">${escHtml(c)}</span>`).join("")}
      </div>
    `;
    autoGrid.appendChild(div);
  }
}

function shortenFootprint(fp) {
  if (!fp) return "—";
  const parts = fp.split(":");
  return parts[parts.length - 1] || fp;
}

// ─── Nets Tab ─────────────────────────────────────────────
function renderNets(output) {
  // Power tree
  const ptCard = document.getElementById("power-tree-card");
  ptCard.innerHTML = `
    <p class="power-tree-title">Power Hierarchy</p>
    <div class="power-input-chip">⚡ ${escHtml(output.power_tree.input)}</div>
    <div class="power-rails">
      ${output.power_tree.rails.map(r => `
        <div class="rail-chip">
          <div class="rail-dot" style="background:${r.color}"></div>
          <strong>${escHtml(r.name)}</strong>&nbsp;${escHtml(r.voltage)}
          ${r.consumers?.length ? `— <em style="color:var(--text-muted);font-size:11px">${r.consumers.join(", ")}</em>` : ""}
        </div>
      `).join("")}
    </div>
  `;

  // Nets
  const netsList = document.getElementById("nets-list");
  netsList.innerHTML = "";
  for (const net of output.nets) {
    const div = document.createElement("div");
    div.className = "net-item";
    div.innerHTML = `
      <div class="net-name">${escHtml(net.name)}</div>
      <div class="net-connections">
        ${net.connections.map(c => `<span class="net-pin">${escHtml(c)}</span>`).join("")}
      </div>
    `;
    netsList.appendChild(div);
  }
}

// ─── PCB Rules Tab ─────────────────────────────────────────
function renderPcbRules(output) {
  const rulesGrid = document.getElementById("rules-grid");
  rulesGrid.innerHTML = "";
  for (const rule of output.pcb_placement_rules) {
    const div = document.createElement("div");
    div.className = "rule-card";
    div.innerHTML = `
      <div class="rule-name">${escHtml(rule.rule)}</div>
      <div class="rule-desc">${escHtml(rule.description)}</div>
      <div class="rule-applies">
        ${(rule.applies_to || []).map(t => `<span class="rule-tag">${escHtml(t)}</span>`).join("")}
      </div>
    `;
    rulesGrid.appendChild(div);
  }

  const rfSection = document.getElementById("rf-rules-section");
  if (output.rf_or_critical_rules.length > 0) {
    rfSection.innerHTML = `
      <h3 class="section-title" style="margin-bottom:12px">
        <svg viewBox="0 0 20 20" fill="currentColor" style="color:var(--accent-pink)"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
        RF & Critical Signal Rules
      </h3>
      ${output.rf_or_critical_rules.map(r => `
        <div class="rf-rule-card">
          <div class="rf-rule-header">
            <span class="rf-rule-name">${escHtml(r.rule)}</span>
            <span class="rf-importance importance-${r.importance}">${escHtml(r.importance)}</span>
          </div>
          <div class="rf-rule-desc">${escHtml(r.description)}</div>
        </div>
      `).join("")}
    `;
  } else {
    rfSection.innerHTML = "";
  }
}

// ─── Raw JSON Tab ─────────────────────────────────────────
function renderRawJson(output) {
  const viewer = document.getElementById("json-viewer");
  if (viewer) viewer.textContent = JSON.stringify(output, null, 2);
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════
function escHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(msg, type = "") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type === "success" ? "toast-success" : type === "error" ? "toast-error" : ""} show`;
  setTimeout(() => toast.classList.remove("show"), 3500);
}

// ═══════════════════════════════════════════════════════════
// PHASE 5: ZERO-CLICK FOOTPRINT SYNTHESIZER (Feature 3)
// ═══════════════════════════════════════════════════════════

const FP_PRESETS = {
  "SOIC-8":   { name: "SOIC-8",   pins: 8,  pitch: 1.27, padW: 0.6,  padH: 1.55, rowSpacing: 5.4 },
  "SOIC-16":  { name: "SOIC-16",  pins: 16, pitch: 1.27, padW: 0.6,  padH: 1.55, rowSpacing: 5.4 },
  "TSSOP-8":  { name: "TSSOP-8",  pins: 8,  pitch: 0.65, padW: 0.38, padH: 1.1,  rowSpacing: 4.4 },
  "TSSOP-16": { name: "TSSOP-16", pins: 16, pitch: 0.65, padW: 0.38, padH: 1.1,  rowSpacing: 4.4 },
  "QFN-16":   { name: "QFN-16",   pins: 16, pitch: 0.65, padW: 0.35, padH: 0.7,  rowSpacing: 4.0 },
  "Custom":   { name: "Custom",   pins: 8,  pitch: 1.27, padW: 0.6,  padH: 1.55, rowSpacing: 5.4 }
};

let fpCurrentCode = "";

function initFootprintSynthesizer() {
  // FAB
  document.getElementById("fp-fab-btn")?.addEventListener("click", () => {
    document.getElementById("fp-modal-overlay")?.classList.remove("hidden");
    fpRenderPreview();
  });

  // Close modal
  document.getElementById("fp-modal-close")?.addEventListener("click", () => {
    document.getElementById("fp-modal-overlay")?.classList.add("hidden");
  });
  document.getElementById("fp-modal-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "fp-modal-overlay") {
      document.getElementById("fp-modal-overlay").classList.add("hidden");
    }
  });

  // Preset buttons
  document.getElementById("fp-presets")?.querySelectorAll(".fp-preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".fp-preset-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const preset = FP_PRESETS[btn.dataset.preset];
      if (!preset) return;
      document.getElementById("fp-name").value = preset.name;
      document.getElementById("fp-pins").value = preset.pins;
      document.getElementById("fp-pitch").value = preset.pitch;
      document.getElementById("fp-pad-w").value = preset.padW;
      document.getElementById("fp-pad-h").value = preset.padH;
      document.getElementById("fp-row-spacing").value = preset.rowSpacing;
      fpRenderPreview();
    });
  });

  // Generate & Refresh
  document.getElementById("fp-generate-btn")?.addEventListener("click", fpRenderPreview);
  document.getElementById("fp-refresh-btn")?.addEventListener("click", fpRenderPreview);

  // Copy code
  document.getElementById("fp-copy-code-btn")?.addEventListener("click", () => {
    if (!fpCurrentCode) return;
    navigator.clipboard.writeText(fpCurrentCode)
      .then(() => showToast("Footprint code copied ✓", "success"))
      .catch(() => showToast("Copy failed", "error"));
  });

  // Download
  document.getElementById("fp-download-btn")?.addEventListener("click", () => {
    if (!fpCurrentCode) { fpRenderPreview(); }
    const name = document.getElementById("fp-name")?.value?.replace(/[^a-z0-9_\-]/gi, "_") || "footprint";
    const blob = new Blob([fpCurrentCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${name}.kicad_mod`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${name}.kicad_mod ✓`, "success");
  });

  // Auto-refresh on input change
  ["fp-name","fp-pins","fp-pitch","fp-pad-w","fp-pad-h","fp-row-spacing"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", fpRenderPreview);
  });

  // Initial render
  fpRenderPreview();
}

function fpGetParams() {
  return {
    name:       document.getElementById("fp-name")?.value?.trim() || "Custom",
    pins:       Math.max(2, Math.min(256, parseInt(document.getElementById("fp-pins")?.value) || 8)),
    pitch:      parseFloat(document.getElementById("fp-pitch")?.value) || 1.27,
    padW:       parseFloat(document.getElementById("fp-pad-w")?.value) || 0.6,
    padH:       parseFloat(document.getElementById("fp-pad-h")?.value) || 1.55,
    rowSpacing: parseFloat(document.getElementById("fp-row-spacing")?.value) || 5.4
  };
}

function fpGenerateKicadMod(p) {
  const { name, pins, pitch, padW, padH, rowSpacing } = p;
  const halfPins = Math.floor(pins / 2);
  const startX = -((halfPins - 1) * pitch) / 2;
  const topY = -(rowSpacing / 2);
  const botY = rowSpacing / 2;
  const silkW = ((halfPins) * pitch) / 2 + 0.5;
  const silkH = rowSpacing / 2 - padH / 2 - 0.1;

  const uid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };

  let lines = [];
  lines.push(`(footprint "${name}"`);
  lines.push(`  (version 20221018)`);
  lines.push(`  (generator "kicad_ai_copilot")`);
  lines.push(`  (attr smd)`);
  lines.push(`  (fp_text reference "REF**" (at 0 ${(-(rowSpacing/2)-1.5).toFixed(3)}) (layer "F.SilkS") (uuid "${uid()}")`);
  lines.push(`    (effects (font (size 1 1) (thickness 0.15)))`);
  lines.push(`  )`);
  lines.push(`  (fp_text value "${name}" (at 0 ${((rowSpacing/2)+1.5).toFixed(3)}) (layer "F.Fab") (uuid "${uid()}")`);
  lines.push(`    (effects (font (size 1 1) (thickness 0.15)))`);
  lines.push(`  )`);
  // Courtyard
  const crtW = silkW + 0.5;
  const crtH = botY + padH/2 + 0.5;
  lines.push(`  (fp_rect (start ${(-crtW).toFixed(3)} ${(-crtH).toFixed(3)}) (end ${crtW.toFixed(3)} ${crtH.toFixed(3)}) (layer "F.CrtYd") (width 0.05) (uuid "${uid()}"))`);
  // Fab outline
  lines.push(`  (fp_rect (start ${(-silkW+0.1).toFixed(3)} ${(-silkH).toFixed(3)}) (end ${(silkW-0.1).toFixed(3)} ${silkH.toFixed(3)}) (layer "F.Fab") (width 0.1) (uuid "${uid()}"))`);
  // Pin-1 mark
  lines.push(`  (fp_circle (center ${(startX - 0.3).toFixed(3)} ${(topY - 0.5).toFixed(3)}) (end ${(startX - 0.1).toFixed(3)} ${(topY - 0.5).toFixed(3)}) (layer "F.SilkS") (width 0.12) (uuid "${uid()}"))`);
  // Silk lines
  lines.push(`  (fp_line (start ${(-silkW).toFixed(3)} ${(-silkH).toFixed(3)}) (end ${silkW.toFixed(3)} ${(-silkH).toFixed(3)}) (layer "F.SilkS") (width 0.12) (uuid "${uid()}"))`);
  lines.push(`  (fp_line (start ${(-silkW).toFixed(3)} ${silkH.toFixed(3)}) (end ${silkW.toFixed(3)} ${silkH.toFixed(3)}) (layer "F.SilkS") (width 0.12) (uuid "${uid()}"))`);

  // Pads
  for (let i = 0; i < halfPins; i++) {
    const px = startX + i * pitch;
    const pinTop = i + 1;
    const pinBot = pins - i;
    // Top row (pins 1..N/2)
    lines.push(`  (pad "${pinTop}" smd rect (at ${px.toFixed(3)} ${topY.toFixed(3)}) (size ${padW} ${padH}) (layers "F.Cu" "F.Paste" "F.Mask") (uuid "${uid()}"))`);
    // Bottom row (pins N..N/2+1)
    lines.push(`  (pad "${pinBot}" smd rect (at ${px.toFixed(3)} ${botY.toFixed(3)}) (size ${padW} ${padH}) (layers "F.Cu" "F.Paste" "F.Mask") (uuid "${uid()}"))`);
  }
  lines.push(`)`);
  return lines.join("\n");
}

function fpRenderPreview() {
  const p = fpGetParams();
  fpCurrentCode = fpGenerateKicadMod(p);

  // Update code viewer
  const viewer = document.getElementById("fp-code-viewer");
  if (viewer) viewer.textContent = fpCurrentCode;

  // Canvas render
  const canvas = document.getElementById("fp-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Dark background
  ctx.fillStyle = "#0a0e1a";
  ctx.fillRect(0, 0, W, H);

  const { pins, pitch, padW, padH, rowSpacing } = p;
  const halfPins = Math.floor(pins / 2);

  // Scale: fit to canvas with margin
  const bodySilkW = (halfPins * pitch) / 2 + 0.5;
  const totalH = rowSpacing + padH + 2;
  const scaleX = (W * 0.8) / (bodySilkW * 2 + 1);
  const scaleY = (H * 0.8) / totalH;
  const scale = Math.min(scaleX, scaleY, 20);
  const cx = W / 2;
  const cy = H / 2;

  const toX = (mm) => cx + mm * scale;
  const toY = (mm) => cy + mm * scale;
  const sw = (mm) => mm * scale;

  // Courtyard
  const crtW = bodySilkW + 0.5;
  const crtH = rowSpacing / 2 + padH / 2 + 0.5;
  ctx.strokeStyle = "#ffff00";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(toX(-crtW), toY(-crtH), sw(crtW * 2), sw(crtH * 2));
  ctx.setLineDash([]);

  // Fab body
  const fbW = bodySilkW - 0.1;
  const fbH = rowSpacing / 2 - padH / 2 - 0.1;
  ctx.strokeStyle = "#4fc3f766";
  ctx.lineWidth = 1;
  ctx.strokeRect(toX(-fbW), toY(-fbH), sw(fbW * 2), sw(fbH * 2));

  // Silk outline
  ctx.strokeStyle = "#aaffee";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(toX(-bodySilkW), toY(-fbH));
  ctx.lineTo(toX(bodySilkW), toY(-fbH));
  ctx.moveTo(toX(-bodySilkW), toY(fbH));
  ctx.lineTo(toX(bodySilkW), toY(fbH));
  ctx.stroke();

  // Pin 1 indicator
  const startX = -((halfPins - 1) * pitch) / 2;
  ctx.fillStyle = "#7FFFD4";
  ctx.beginPath();
  ctx.arc(toX(startX - 0.3), toY(-rowSpacing / 2 - 0.5), 3, 0, Math.PI * 2);
  ctx.fill();

  // Draw pads
  for (let i = 0; i < halfPins; i++) {
    const px = startX + i * pitch;
    const isPin1 = i === 0;

    // Top pad
    ctx.fillStyle = isPin1 ? "#7FFFD4cc" : "#4fc3f7aa";
    ctx.strokeStyle = isPin1 ? "#7FFFD4" : "#4fc3f7";
    ctx.lineWidth = 1;
    ctx.fillRect(toX(px - padW / 2), toY(-rowSpacing / 2 - padH / 2), sw(padW), sw(padH));
    ctx.strokeRect(toX(px - padW / 2), toY(-rowSpacing / 2 - padH / 2), sw(padW), sw(padH));

    // Bottom pad
    ctx.fillStyle = "#4fc3f7aa";
    ctx.strokeStyle = "#4fc3f7";
    ctx.fillRect(toX(px - padW / 2), toY(rowSpacing / 2 - padH / 2), sw(padW), sw(padH));
    ctx.strokeRect(toX(px - padW / 2), toY(rowSpacing / 2 - padH / 2), sw(padW), sw(padH));

    // Pin numbers
    if (scale > 6) {
      ctx.fillStyle = "#ffffff99";
      ctx.font = `${Math.max(8, scale * 0.4)}px JetBrains Mono, monospace`;
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), toX(px), toY(-rowSpacing / 2 - padH / 2 - 0.2));
      ctx.fillText(String(pins - i), toX(px), toY(rowSpacing / 2 + padH / 2 + 0.5));
    }
  }

  // Package label
  ctx.fillStyle = "#ffffff88";
  ctx.font = "bold 11px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(p.name, cx, cy + 4);
}

// ═══════════════════════════════════════════════════════════
// NAV LINK — Block Editor toggle
// ═══════════════════════════════════════════════════════════
function initNavLinks() {
  document.getElementById("nav-block")?.addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("block-editor-overlay")?.classList.remove("hidden");
    renderBE();
  });
}

// ═══════════════════════════════════════════════════════════
// BEGINNER-FRIENDLY UI LOGIC
// ═══════════════════════════════════════════════════════════

const JARGON_DICT = {
  "Decoupling Capacitor": "Power Filter (Tiny Size)",
  "Pull-up Resistor": "Signal Helper Resistor",
  "LDO Regulator": "Power Converter (Safe Voltage)",
  "I2C": "Communication Wires (Talks to brain)",
  "SPI": "High-Speed Wires",
  "0402": "Microscopic Size",
  "CR2032": "Coin Cell Battery",
  "nRF52810": "Bluetooth Brain Chip",
  "STM32G031K8": "Main Brain Chip",
  "BME280": "Weather Sensor",
  "SHTC3": "Weather Sensor",
  "Impedance Controlled": "High-Speed Tuned Wire",
  "Differential Pair": "Twin Data Wires",
  "Vias": "Through-Hole Tunnels",
  "Net": "Electrical Wire"
};

function initBeginnerToggle() {
  const toggle = document.getElementById("beginner-mode-toggle");
  if (!toggle) return;
  toggle.addEventListener("change", (e) => {
    State.beginnerMode = e.target.checked;
    applyJargonTranslation();
  });
}

function applyJargonTranslation() {
  // Remove existing highlights if turned off
  document.querySelectorAll(".jargon-highlight").forEach(el => {
    el.outerHTML = el.dataset.original;
  });

  if (!State.beginnerMode) return;

  // Simple brute-force text replacement on certain areas
  const areas = [
    document.getElementById("tab-content-overview"),
    document.getElementById("tab-content-components"),
    document.getElementById("tab-content-nets"),
    document.getElementById("tab-content-placement")
  ];

  areas.forEach(area => {
    if (!area) return;
    let html = area.innerHTML;
    for (const [jargon, plain] of Object.entries(JARGON_DICT)) {
      const regex = new RegExp(`(?<!<[^>]*)\\b${jargon}\\b(?![^<]*>)`, "gi");
      html = html.replace(regex, (match) => {
        return `<span class="jargon-highlight" data-original="${match}" title="Engineering term: ${match}">${plain}</span>`;
      });
    }
    area.innerHTML = html;
  });
}

function renderSafetyCheck(output) {
  const container = document.getElementById("safety-warnings-container");
  if (!container) return;
  container.innerHTML = "";

  const { warnings, oks } = Engine.simulateSafety(output);

  warnings.forEach(w => {
    const el = document.createElement("div");
    el.className = "safety-warning";
    el.innerHTML = `
      <div style="font-size:24px">⚠️</div>
      <div>
        <strong style="color:#ff5252;display:block;margin-bottom:4px">${w.title}</strong>
        <span style="color:var(--text-secondary);font-size:13px;line-height:1.4">${w.desc}</span>
      </div>
    `;
    container.appendChild(el);
  });

  oks.forEach(o => {
    const el = document.createElement("div");
    el.className = "safety-ok";
    el.innerHTML = `
      <div style="font-size:24px">✅</div>
      <div>
        <strong style="color:var(--accent-green);display:block;margin-bottom:4px">${o.title}</strong>
        <span style="color:var(--text-secondary);font-size:13px;line-height:1.4">${o.desc}</span>
      </div>
    `;
    container.appendChild(el);
  });
}

function renderBatteryLife(output) {
  const container = document.getElementById("battery-stats-container");
  if (!container) return;
  container.innerHTML = "";

  const stats = Engine.estimateBatteryLife(output);
  if (!stats) {
    container.innerHTML = `<div class="battery-card"><div class="battery-stat-row">No battery detected. Powered by USB or External Source.</div></div>`;
    return;
  }

  container.innerHTML = `
    <div class="battery-card">
      <div class="battery-stat-row"><span>Power Source:</span> <strong>${stats.batteryName}</strong></div>
      <div class="battery-stat-row"><span>Total Capacity:</span> <strong>${stats.capacity}</strong></div>
      <div class="battery-stat-row"><span>Active Draw:</span> <strong>${stats.activeDraw}</strong></div>
      <div class="battery-stat-row"><span>Sleep Draw:</span> <strong>${stats.sleepDraw}</strong></div>
      <div style="margin-top:10px; border-top:1px solid var(--border-subtle); padding-top:10px;">
        <div style="text-align:center; font-size:12px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.1em">Estimated Battery Life</div>
        <div class="battery-life-big">${stats.estimatedLife}</div>
        <div style="text-align:center; font-size:11px; color:var(--text-muted); margin-top:4px">(Assuming 1s active per hour)</div>
      </div>
    </div>
  `;
}

function renderAssemblyGuide(output) {
  const container = document.getElementById("assembly-steps-container");
  if (!container) return;
  container.innerHTML = "";

  const steps = Engine.generateAssemblySteps(output);
  if (steps.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted)">No components to assemble.</div>`;
    return;
  }

  steps.forEach(step => {
    const el = document.createElement("div");
    el.className = "assembly-step";
    el.innerHTML = `
      <div class="assembly-step-num">${step.num}</div>
      <div class="assembly-step-content">
        <div class="assembly-step-title">${step.title}</div>
        <div class="assembly-step-desc">${step.desc}</div>
      </div>
    `;
    container.appendChild(el);
  });
}

function initEnclosureGenerator() {
  const btn = document.getElementById("btn-gen-enclosure");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const viewer = document.getElementById("enclosure-code-viewer");
    viewer.textContent = "Generating 3D Enclosure via python script...";
    
    // In reality this would call the python script via backend IPC
    // For the UI, we simulate it here.
    setTimeout(() => {
      let width = 40;
      let length = 60;
      if (State.constraints.size === "small") { width=30; length=50; }
      if (State.constraints.size === "smallest") { width=20; length=35; }
      
      const scad = `// Auto-generated 3D Enclosure for KiCad AI Copilot
// Use OpenSCAD (openscad.org) to render this to an STL file.

width = ${width};
length = ${length};
height = 15;
wall = 2;

difference() {
  // Main body
  cube([width + wall*2, length + wall*2, height], center=true);
  
  // Hollow interior
  translate([0, 0, wall])
    cube([width, length, height], center=true);
    
  // Cutout for USB / Connectors
  translate([0, length/2, 0])
    cube([12, 10, 8], center=true);
}
`;
      viewer.textContent = scad;
      showToast("3D Enclosure generated!", "success");
    }, 800);
  });
  
  document.getElementById("be-close-btn")?.addEventListener("click", () => {
    document.getElementById("block-editor-overlay")?.classList.add("hidden");
  });
}

// ═══════════════════════════════════════════════════════════
// FEATURE 6: THERMAL HEATMAP RENDERER
// ═══════════════════════════════════════════════════════════
function renderThermalHeatmap(output) {
  if (!window.ThermalEngine) return;
  const data = ThermalEngine.generate(output.components, output.auto_added_components);
  const canvas = document.getElementById("thermal-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#070b14"; ctx.fillRect(0, 0, W, H);

  const { grid, maxTemp, placed, hotspots, recommendations, gridSize } = data;
  const cw = W / gridSize, ch = H / gridSize;

  // Draw heat cells
  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const v = maxTemp > 0 ? grid[gy][gx] / maxTemp : 0;
      ctx.fillStyle = heatColor(v);
      ctx.fillRect(gx * cw, gy * ch, cw, ch);
    }
  }

  // Draw component dots
  for (const comp of placed) {
    const px = (comp.x / data.boardSizeMm) * W;
    const py = (comp.y / data.boardSizeMm) * H;
    const r = Math.max(4, Math.sqrt(comp.mw) / 4);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "9px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((comp.name || comp.ref || "").substring(0, 8), px, py - r - 2);
  }

  // Hotspot list
  const hl = document.getElementById("hotspot-list");
  if (hl) hl.innerHTML = hotspots.map(h => `
    <div class="hotspot-item hotspot-${h.risk.toLowerCase()}">
      <span class="hs-name">${escHtml(h.name)}</span>
      <span class="hs-mw">${h.mw}mW</span>
      <span class="hs-risk">${h.risk}</span>
    </div>`).join("");

  // Recommendations
  const recs = document.getElementById("thermal-recs");
  if (recs) {
    recs.innerHTML = `<h3 class="thermal-rec-title">Recommendations</h3>` +
      recommendations.map(r => `
        <div class="thermal-rec-card thermal-priority-${r.priority}">
          <span class="rec-icon">${r.icon}</span>
          <span>${escHtml(r.text)}</span>
        </div>`).join("");
  }
}

function heatColor(v) {
  const r = Math.round(Math.min(255, v * 2 * 255));
  const g = Math.round(Math.min(255, (1 - Math.abs(v - 0.5) * 2) * 255 * 0.8));
  const b = Math.round(Math.max(0, (1 - v * 2) * 200));
  return `rgba(${r},${g},${b},0.85)`;
}

// ═══════════════════════════════════════════════════════════
// FEATURE 7: BOM OPTIMIZER UI
// ═══════════════════════════════════════════════════════════
function initBOMOptimizer() {
  document.getElementById("bom-optimize-btn")?.addEventListener("click", () => {
    if (!State.lastOutput) { showToast("Generate a design first", "error"); return; }
    const inst = document.getElementById("bom-instruction")?.value || "JLCPCB basic only";
    const result = BOMOptimizer.optimize(State.lastOutput.components, State.lastOutput.auto_added_components, inst);
    renderBOMResult(result);
    showToast(`BOM optimized — saved $${result.savings_usd} (${result.savings_pct}%)`, "success");
  });
}

function renderBOMResult(r) {
  const el = document.getElementById("bom-result");
  if (!el) return;
  el.innerHTML = `
    <div class="bom-summary">
      <div class="bom-stat"><span class="bom-stat-val">$${r.original_cost}</span><span class="bom-stat-lbl">Original Cost</span></div>
      <div class="bom-arrow">→</div>
      <div class="bom-stat"><span class="bom-stat-val bom-green">$${r.optimized_cost}</span><span class="bom-stat-lbl">Optimized Cost</span></div>
      <div class="bom-saving-badge">-$${r.savings_usd} (${r.savings_pct}%)</div>
    </div>
    ${r.warnings.map(w => `<div class="bom-warning">⚠ ${escHtml(w)}</div>`).join("")}
    ${r.substitutions.length > 0 ? `
      <table class="data-table" style="margin-top:12px">
        <thead><tr><th>Ref</th><th>Original</th><th>Replacement</th><th>LCSC</th><th>Saving</th><th>Reason</th></tr></thead>
        <tbody>
          ${r.substitutions.map(s => `
            <tr class="bom-sub-row">
              <td><span class="ref-badge">${escHtml(s.ref)}</span></td>
              <td><span class="bom-old">${escHtml(s.original)}</span></td>
              <td><span class="bom-new">${escHtml(s.replacement)}</span></td>
              <td><code class="fp-code">${escHtml(s.lcsc)}</code></td>
              <td class="bom-green">$${s.saving_usd}</td>
              <td class="comp-reason">${escHtml(s.reason)}</td>
            </tr>`).join("")}
        </tbody>
      </table>` : `<p style="color:var(--text-muted);margin-top:12px">No substitutions made — design already uses optimal parts.</p>`}
  `;
}

// ═══════════════════════════════════════════════════════════
// FEATURE 8: SI ADVISOR RENDERER
// ═══════════════════════════════════════════════════════════
function renderSIAdvisor(output) {
  if (!window.SIAdvisor) return;
  const result = SIAdvisor.analyze(output.components, output.nets, output.constraints || {});

  const gradeColor = { A: "#34d399", B: "#4fc3f7", C: "#fbbf24", D: "#f97316", F: "#ef4444" };
  const gc = gradeColor[result.grade] || "#94a3b8";

  const scoreCard = document.getElementById("si-score-card");
  if (scoreCard) scoreCard.innerHTML = `
    <div class="si-grade-ring" style="--grade-color:${gc}">
      <div class="si-grade-letter">${result.grade}</div>
      <div class="si-grade-score">${result.overall_score}/100</div>
    </div>
    <div class="si-grade-label">Signal Integrity Score</div>`;

  const netsTable = document.getElementById("si-nets-table");
  if (netsTable) netsTable.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Net</th><th>Class</th><th>Trace (mm)</th><th>Impedance</th><th>Target</th><th>Score</th></tr></thead>
      <tbody>${result.nets_scored.map(n => `
        <tr>
          <td>${escHtml(n.name)}</td>
          <td><span class="net-class-badge" style="background:${n.color}22;color:${n.color};border:1px solid ${n.color}44">${n.class}</span></td>
          <td>${n.trace_mm}mm</td>
          <td>${n.impedance ? n.impedance + "Ω" : "—"}</td>
          <td>${n.target_z ? n.target_z + "Ω" : "—"}</td>
          <td><div class="si-score-bar"><div class="si-score-fill" style="width:${n.score}%;background:${n.score>70?"#34d399":n.score>40?"#fbbf24":"#ef4444"}"></div></div></td>
        </tr>`).join("")}
      </tbody>
    </table>`;

  const antChecks = document.getElementById("si-antenna-checks");
  if (antChecks) antChecks.innerHTML = `
    <h3 class="section-title" style="margin:16px 0 10px">Antenna & RF Checks</h3>
    <div class="check-list">
      ${result.antenna_checks.map(c => `
        <div class="check-item">
          <span class="check-icon check-${c.status === "pass" ? "pass" : c.status === "fail" ? "fail" : "warn"}">${c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "⚠"}</span>
          <span style="flex:1">${escHtml(c.check)}</span>
          <span style="font-size:11px;color:var(--text-muted)">${escHtml(c.note)}</span>
        </div>`).join("")}
    </div>`;

  const siWarn = document.getElementById("si-warnings");
  if (siWarn) siWarn.innerHTML = result.warnings.map(w => `
    <div class="si-warning-card si-sev-${w.severity}">
      <span class="si-warn-net">${escHtml(w.net)}</span>: ${escHtml(w.msg)}
    </div>`).join("");
}

// ═══════════════════════════════════════════════════════════
// FEATURE 9: DNA FINGERPRINT UI
// ═══════════════════════════════════════════════════════════
function initDNAPanel() {
  document.getElementById("dna-toggle")?.addEventListener("click", () => {
    const body = document.getElementById("dna-body");
    const btn = document.getElementById("dna-toggle");
    if (body) { body.classList.toggle("hidden"); btn.textContent = body.classList.contains("hidden") ? "▼" : "▲"; }
  });

  document.getElementById("dna-analyze-btn")?.addEventListener("click", () => {
    const raw = document.getElementById("dna-input")?.value || "";
    if (!raw.trim()) {
      // Use current design if available
      if (!State.lastOutput) { showToast("Generate a design first or paste component/net info", "error"); return; }
      const r = DNAEngine.fingerprint(State.lastOutput.components, State.lastOutput.nets);
      renderDNAResult(r);
    } else {
      const parts = raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
      const netsStart = parts.findIndex(p => p.toLowerCase().startsWith("net"));
      const comps = netsStart >= 0 ? parts.slice(0, netsStart) : parts;
      const nets = netsStart >= 0 ? parts.slice(netsStart).map(n => ({ name: n })) : [];
      const r = DNAEngine.fingerprint(comps.map(c => ({ name: c, type: c })), nets);
      renderDNAResult(r);
    }
  });
}

function renderDNAResult(r) {
  const el = document.getElementById("dna-result");
  if (!el) return;
  el.classList.remove("hidden");
  if (!r.match) {
    el.innerHTML = `<div class="dna-no-match">🔍 ${escHtml(r.explanation)}</div>`;
    return;
  }
  el.innerHTML = `
    <div class="dna-match-card">
      <div class="dna-match-header">
        <span class="dna-match-name">${escHtml(r.match)}</span>
        <div class="dna-conf-bar"><div class="dna-conf-fill" style="width:${r.confidence}%"></div></div>
        <span class="dna-conf-val">${r.confidence}%</span>
      </div>
      <p class="dna-explanation">${escHtml(r.explanation)}</p>
      <details class="dna-details">
        <summary>⚡ Common Failure Modes</summary>
        <ul>${r.failure_modes.map(f => `<li>${escHtml(f)}</li>`).join("")}</ul>
      </details>
      <details class="dna-details" open>
        <summary>💡 Optimization Tips</summary>
        <ul>${r.tips.map(t => `<li>${escHtml(t)}</li>`).join("")}</ul>
      </details>
      ${r.alternatives.length > 0 ? `<div class="dna-alts">Also matches: ${r.alternatives.map(a => `<span class="dna-alt-chip">${escHtml(a.name)} (${a.confidence}%)</span>`).join("")}</div>` : ""}
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// FEATURE 10: DFM SCORECARD
// ═══════════════════════════════════════════════════════════
function initDFMScorecard() {
  State.currentDFMFab = "jlcpcb";
  document.getElementById("dfm-fab-selector")?.querySelectorAll(".dfm-fab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".dfm-fab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      State.currentDFMFab = btn.dataset.fab;
      if (State.lastOutput) renderDFMScorecard(State.lastOutput, State.currentDFMFab);
    });
  });
}

function renderDFMScorecard(output, fabKey = "jlcpcb") {
  if (!window.DFMEngine) return;
  const r = DFMEngine.score(output, fabKey);

  const gradeColor = { A: "#34d399", B: "#4fc3f7", C: "#fbbf24", D: "#f97316", F: "#ef4444" };
  const gc = gradeColor[r.grade] || "#94a3b8";

  const gradeRow = document.getElementById("dfm-grade-row");
  if (gradeRow) gradeRow.innerHTML = `
    <div class="dfm-grade-badge" style="border-color:${gc};color:${gc}">${r.grade}</div>
    <div class="dfm-score-info">
      <div class="dfm-score-num" style="color:${gc}">${r.score_pct}%</div>
      <div class="dfm-fab-name">${escHtml(r.fab_name)}</div>
      <div class="dfm-checks-summary">${r.checks.filter(c=>c.status==="pass").length}/${r.checks.length} checks passed</div>
    </div>`;

  const checks = document.getElementById("dfm-checks");
  if (checks) checks.innerHTML = `
    <div class="check-list">
      ${r.checks.map(c => `
        <div class="check-item">
          <span class="check-icon check-${c.status === "pass" ? "pass" : c.status === "fail" ? "fail" : "warn"}">${c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "⚠"}</span>
          <span style="flex:1;font-weight:${c.critical ? 600 : 400}">${escHtml(c.name)}</span>
          <span style="font-size:11px;color:var(--text-muted)">${escHtml(c.note)}</span>
        </div>`).join("")}
    </div>`;

  const recs = document.getElementById("dfm-recommendations");
  if (recs) recs.innerHTML = `
    <h3 class="section-title" style="margin:16px 0 10px">Recommendations</h3>
    ${r.recommendations.map(rec => `<div class="dfm-rec">${escHtml(rec)}</div>`).join("")}`;
}

// ═══════════════════════════════════════════════════════════
// FEATURE 12: FIRMWARE GENERATOR UI
// ═══════════════════════════════════════════════════════════
function initFirmwareGenerator() {
  State.currentFWFramework = "stm32";
  State.fwFiles = null;
  State.currentFWTab = "pins";

  document.getElementById("fw-framework-select")?.querySelectorAll(".fw-fw-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".fw-fw-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      State.currentFWFramework = btn.dataset.fw;
    });
  });

  document.querySelectorAll(".fw-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".fw-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      State.currentFWTab = tab.dataset.fwtab;
      showFWTab();
    });
  });

  document.getElementById("fw-generate-btn")?.addEventListener("click", () => {
    if (!State.lastOutput) { showToast("Generate a design first", "error"); return; }
    State.fwFiles = FirmwareEngine.generate(State.lastOutput, State.currentFWFramework);
    showFWTab();
    showToast("Firmware stubs generated ✓", "success");
  });

  document.getElementById("fw-download-btn")?.addEventListener("click", () => {
    if (!State.fwFiles) { showToast("Click Generate Stubs first", "error"); return; }
    // Download each file individually
    const name = (State.lastOutput?.project_name || "project").replace(/\s/g, "_").toLowerCase();
    Object.entries(State.fwFiles).forEach(([fname, content]) => {
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${name}_${fname}`;
      a.click(); URL.revokeObjectURL(url);
    });
    showToast(`Downloaded ${Object.keys(State.fwFiles).length} firmware files ✓`, "success");
  });
}

function showFWTab() {
  const tabMap = { pins: "pins.h", hal_h: "hal_stubs.h", hal_c: "hal_stubs.c", test: "test_harness.c", yaml: "hardware.yaml" };
  const key = tabMap[State.currentFWTab] || "pins.h";
  const viewer = document.getElementById("fw-code-viewer");
  if (viewer && State.fwFiles) {
    viewer.textContent = State.fwFiles[key] || "// File not available";
  }
}

// ═══════════════════════════════════════════════════════════
// FEATURE 11: BLOCK DIAGRAM EDITOR
// ═══════════════════════════════════════════════════════════
function initBlockEditor() {
  const BE = {
    blocks: [], connections: [], selectedId: null,
    mode: "select", connFrom: null, idCounter: 0,
    svgNS: "http://www.w3.org/2000/svg"
  };
  window._BE = BE;

  const svg = document.getElementById("be-canvas");
  const blocksLayer = document.getElementById("be-blocks-layer");
  const connsLayer = document.getElementById("be-connections-layer");
  const status = document.getElementById("be-status");
  if (!svg) return;

  const setMode = (m) => {
    BE.mode = m; BE.connFrom = null;
    document.querySelectorAll(".be-tool-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(`be-tool-${m}`)?.classList.add("active");
    svg.style.cursor = m === "connect" ? "crosshair" : m === "delete" ? "no-drop" : "default";
    status.textContent = m === "connect" ? "Click a block to start a connection, then click another to finish." :
                         m === "delete" ? "Click a block or connection to delete it." :
                         "Drag blocks to position. Use toolbar to connect or delete.";
  };

  document.getElementById("be-tool-select")?.addEventListener("click", () => setMode("select"));
  document.getElementById("be-tool-connect")?.addEventListener("click", () => setMode("connect"));
  document.getElementById("be-tool-delete")?.addEventListener("click", () => setMode("delete"));

  document.querySelectorAll(".be-palette-btn[data-type]").forEach(btn => {
    btn.addEventListener("click", () => addBlock(btn.dataset.type));
  });

  document.getElementById("be-clear-btn")?.addEventListener("click", () => {
    BE.blocks = []; BE.connections = []; BE.selectedId = null;
    renderBE();
  });

  document.getElementById("be-auto-layout-btn")?.addEventListener("click", () => {
    const cols = Math.ceil(Math.sqrt(BE.blocks.length));
    BE.blocks.forEach((b, i) => {
      b.x = 80 + (i % cols) * 160;
      b.y = 80 + Math.floor(i / cols) * 130;
    });
    renderBE();
  });

  document.getElementById("be-expand-btn")?.addEventListener("click", () => {
    const b = BE.blocks.find(bl => bl.id === BE.selectedId);
    if (!b) { showToast("Select a block first", "error"); return; }
    showToast(`Expanding ${b.label}... generating sub-design`, "success");
    // Close editor and auto-fill the main form
    document.getElementById("block-editor-overlay").classList.add("hidden");
    document.getElementById("mode-natural").click();
    document.getElementById("project-desc").value = `${b.type} block: ${b.label}. Generate complete sub-circuit with all required components.`;
    document.getElementById("project-name").value = b.label;
  });

  document.getElementById("be-export-btn")?.addEventListener("click", () => {
    if (BE.blocks.length === 0) { showToast("Add blocks first", "error"); return; }
    const diagram = { blocks: BE.blocks, connections: BE.connections };
    const result = BlockDiagramEngine.exportToKicadSch(diagram);
    const blob = new Blob([result.top_sch], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "top.kicad_sch";
    a.click(); URL.revokeObjectURL(url);
    showToast("Exported top.kicad_sch ✓", "success");
  });

  function addBlock(type) {
    const bt = BlockDiagramEngine.BLOCK_TYPES[type] || { icon: "📦", color: "#94a3b8", defaultLabel: type };
    const id = `b${++BE.idCounter}`;
    const svgRect = svg.getBoundingClientRect();
    BE.blocks.push({ id, type, label: bt.defaultLabel, icon: bt.icon, color: bt.color, x: 60 + Math.random() * (svgRect.width - 200), y: 60 + Math.random() * (svgRect.height - 180) });
    setMode("select");
    renderBE();
  }

  function selectBlock(id) {
    BE.selectedId = id;
    renderBE();
    const b = BE.blocks.find(bl => bl.id === id);
    if (b) {
      const side = document.getElementById("be-side-content");
      if (side) side.innerHTML = `
        <div class="be-prop-group">
          <label class="form-label">Label</label>
          <input class="form-input" id="be-prop-label" value="${escHtml(b.label)}" />
        </div>
        <div class="be-prop-group">
          <label class="form-label">Type</label>
          <div style="color:var(--accent-cyan);font-weight:600">${b.type}</div>
        </div>
        <div class="be-prop-group" style="margin-top:8px">
          <button class="action-btn" id="be-prop-expand-btn" style="width:100%">⚡ Generate Sub-Circuit</button>
        </div>`;
      document.getElementById("be-prop-label")?.addEventListener("input", e => {
        b.label = e.target.value; renderBE();
      });
      document.getElementById("be-prop-expand-btn")?.addEventListener("click", () => {
        document.getElementById("be-expand-btn").click();
      });
    }
  }

  function renderBE() {
    // Clear layers
    while (blocksLayer.firstChild) blocksLayer.removeChild(blocksLayer.firstChild);
    while (connsLayer.firstChild) connsLayer.removeChild(connsLayer.firstChild);

    // Draw connections
    const connType = document.getElementById("be-conn-type")?.value || "SPI";
    const ct = BlockDiagramEngine.CONN_TYPES[connType] || { color: "#4fc3f7", width: 2 };
    for (const conn of BE.connections) {
      const fromB = BE.blocks.find(b => b.id === conn.from);
      const toB = BE.blocks.find(b => b.id === conn.to);
      if (!fromB || !toB) continue;
      const cc = BlockDiagramEngine.CONN_TYPES[conn.type] || ct;
      const line = document.createElementNS(BE.svgNS, "path");
      const mx = (fromB.x + 80 + toB.x + 80) / 2;
      line.setAttribute("d", `M${fromB.x+80},${fromB.y+40} C${mx},${fromB.y+40} ${mx},${toB.y+40} ${toB.x+80},${toB.y+40}`);
      line.setAttribute("stroke", cc.color);
      line.setAttribute("stroke-width", cc.width);
      line.setAttribute("fill", "none");
      line.setAttribute("marker-end", "url(#arrowhead)");
      line.setAttribute("opacity", "0.8");
      connsLayer.appendChild(line);
      // Label
      const txt = document.createElementNS(BE.svgNS, "text");
      txt.setAttribute("x", mx); txt.setAttribute("y", (fromB.y + 40 + toB.y + 40)/2 - 6);
      txt.setAttribute("text-anchor", "middle"); txt.setAttribute("fill", cc.color);
      txt.setAttribute("font-size", "10"); txt.setAttribute("font-family", "Inter, sans-serif");
      txt.textContent = conn.type || connType;
      connsLayer.appendChild(txt);
    }

    // Draw blocks
    for (const b of BE.blocks) {
      const g = document.createElementNS(BE.svgNS, "g");
      g.setAttribute("transform", `translate(${b.x},${b.y})`);
      g.setAttribute("cursor", "grab");
      g.style.userSelect = "none";

      const rect = document.createElementNS(BE.svgNS, "rect");
      rect.setAttribute("width", "160"); rect.setAttribute("height", "80");
      rect.setAttribute("rx", "12"); rect.setAttribute("ry", "12");
      rect.setAttribute("fill", b.color + "18");
      rect.setAttribute("stroke", b.id === BE.selectedId ? "#fff" : b.color);
      rect.setAttribute("stroke-width", b.id === BE.selectedId ? "2.5" : "1.5");
      g.appendChild(rect);

      const icon = document.createElementNS(BE.svgNS, "text");
      icon.setAttribute("x", "80"); icon.setAttribute("y", "34");
      icon.setAttribute("text-anchor", "middle"); icon.setAttribute("font-size", "20");
      icon.textContent = b.icon;
      g.appendChild(icon);

      const label = document.createElementNS(BE.svgNS, "text");
      label.setAttribute("x", "80"); label.setAttribute("y", "60");
      label.setAttribute("text-anchor", "middle"); label.setAttribute("fill", "#e2e8f0");
      label.setAttribute("font-size", "11"); label.setAttribute("font-family", "Inter, sans-serif");
      label.setAttribute("font-weight", "600");
      label.textContent = b.label.substring(0, 18);
      g.appendChild(label);

      const typeBadge = document.createElementNS(BE.svgNS, "text");
      typeBadge.setAttribute("x", "80"); typeBadge.setAttribute("y", "73");
      typeBadge.setAttribute("text-anchor", "middle"); typeBadge.setAttribute("fill", b.color);
      typeBadge.setAttribute("font-size", "9"); typeBadge.setAttribute("font-family", "Inter, sans-serif");
      typeBadge.textContent = b.type;
      g.appendChild(typeBadge);

      // Events
      let dragging = false, ox = 0, oy = 0;
      g.addEventListener("mousedown", e => {
        if (BE.mode === "delete") {
          BE.blocks = BE.blocks.filter(bl => bl.id !== b.id);
          BE.connections = BE.connections.filter(c => c.from !== b.id && c.to !== b.id);
          renderBE(); return;
        }
        if (BE.mode === "connect") {
          if (!BE.connFrom) {
            BE.connFrom = b.id;
            status.textContent = `Connected from ${b.label} — now click another block`;
          } else if (BE.connFrom !== b.id) {
            BE.connections.push({ from: BE.connFrom, to: b.id, type: document.getElementById("be-conn-type")?.value || "SPI" });
            BE.connFrom = null;
            setMode("select");
            renderBE();
          }
          return;
        }
        dragging = true;
        ox = e.clientX - b.x; oy = e.clientY - b.y;
        selectBlock(b.id);
        e.stopPropagation();
      });
      svg.addEventListener("mousemove", e => {
        if (!dragging) return;
        const svgRect = svg.getBoundingClientRect();
        b.x = Math.max(0, Math.min(svgRect.width - 160, e.clientX - ox));
        b.y = Math.max(0, Math.min(svgRect.height - 80, e.clientY - oy));
        renderBE();
      });
      svg.addEventListener("mouseup", () => { dragging = false; });

      blocksLayer.appendChild(g);
    }
  }

  // Click on empty canvas deselects
  svg.addEventListener("click", e => {
    if (e.target === svg || e.target.tagName === "svg") { BE.selectedId = null; renderBE(); }
  });
}
