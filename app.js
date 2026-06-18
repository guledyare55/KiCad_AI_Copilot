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
