const exceptions = [
  {
    id: "TIME-10482",
    vendor: "Site 3 - East Warehouse",
    total: "16.0 hrs",
    risk: "High",
    confidence: 94,
    action: "Confirm source record",
    reason:
      "The same employee shift appears once in an XLS time card and once in an emailed correction, creating a likely duplicate before ADP and QuickBooks entry.",
    systemValue: "XLS + email correction",
    aiFinding: "Same employee/date/site repeated",
    poValue: "Hourly labor only",
    poFinding: "16.0 duplicate labor hours",
    approvalValue: "ADP + QuickBooks",
    approvalFinding: "Would overpay and overbill",
    memo:
      "Recommended hold: Site 3 has a likely duplicate 16.0-hour labor entry from an XLS time card and an email correction. Confirm the source of truth before ADP payroll upload or QuickBooks billing.",
  },
  {
    id: "TIME-10501",
    vendor: "Site 1 - North Clinic",
    total: "8.5 hrs",
    risk: "Medium",
    confidence: 89,
    action: "Add missing site code",
    reason:
      "A PDF time sheet includes employee hours and date, but the customer site is blank, which can push labor to the wrong QuickBooks customer invoice.",
    systemValue: "PDF time sheet",
    aiFinding: "Missing customer site",
    poValue: "Hourly labor only",
    poFinding: "8.5 hours need site assignment",
    approvalValue: "QuickBooks customer field",
    approvalFinding: "Cannot invoice accurately",
    memo:
      "Needs review: 8.5 labor hours are readable from the PDF time sheet, but the customer site is missing. Assign the correct site before exporting the ADP sheet and creating the QuickBooks invoice.",
  },
  {
    id: "TIME-10507",
    vendor: "Site 5 - South Distribution",
    total: "24.0 hrs",
    risk: "High",
    confidence: 92,
    action: "Reconcile ADP/QB hours",
    reason:
      "The payroll upload sheet shows 24.0 paid labor hours, but the QuickBooks billing draft only includes 20.0 billable hours for the same employee and site.",
    systemValue: "ADP upload: 24.0 hrs",
    aiFinding: "QuickBooks draft: 20.0 hrs",
    poValue: "Customer-billable labor",
    poFinding: "4.0 hours underbilled",
    approvalValue: "ADP/QB reconciliation",
    approvalFinding: "Payroll and billing mismatch",
    memo:
      "Reconcile before billing: ADP payroll includes 24.0 labor hours for Site 5, while QuickBooks includes 20.0. Confirm whether 4.0 hours should be billed or excluded with a documented reason.",
  },
  {
    id: "TIME-10514",
    vendor: "Site 2 - West Office",
    total: "3.0 hrs",
    risk: "Low",
    confidence: 87,
    action: "Exclude non-labor line",
    reason:
      "An emailed note was manually typed into the billing spreadsheet as labor hours, but the client confirmed only labor service provided gets billed.",
    systemValue: "Email note",
    aiFinding: "Admin follow-up typed as 3.0 labor hours",
    poValue: "Calls/emails/research not billed",
    poFinding: "Non-labor line should be excluded",
    approvalValue: "QuickBooks invoice draft",
    approvalFinding: "Remove before customer billing",
    memo:
      "Remove from billing draft: Site 2 includes 3.0 hours from an email note that appears to be administrative follow-up, not labor service provided. Keep the note as audit context, not a billable line.",
  },
];

const state = {
  activeId: exceptions[0].id,
  resolved: new Set(),
  auditRuns: 0,
};

const exceptionList = document.querySelector("#exceptionList");
const queueStatus = document.querySelector("#queueStatus");
const assistantMemo = document.querySelector("#assistantMemo");
const runAuditButton = document.querySelector("#runAudit");
const resetDemoButton = document.querySelector("#resetDemo");
const approveResolutionButton = document.querySelector("#approveResolution");
const draftNoteButton = document.querySelector("#draftNote");
const assignOwnerButton = document.querySelector("#assignOwner");
const intakeStatus = document.querySelector("#intakeStatus");
const mockUploadButton = document.querySelector("#mockUpload");
const processBatchButton = document.querySelector("#processBatch");
const intakeModeButtons = document.querySelectorAll("[data-intake-mode]");
const intakeContents = {
  upload: document.querySelector("#uploadMode"),
  connect: document.querySelector("#connectMode"),
};
const navItems = document.querySelectorAll(".nav-item");

const fields = {
  invoiceTitle: document.querySelector("#invoiceTitle"),
  confidenceBadge: document.querySelector("#confidenceBadge"),
  vendorName: document.querySelector("#vendorName"),
  invoiceTotal: document.querySelector("#invoiceTotal"),
  recommendedAction: document.querySelector("#recommendedAction"),
  reasonText: document.querySelector("#reasonText"),
  systemValue: document.querySelector("#systemValue"),
  aiFinding: document.querySelector("#aiFinding"),
  poValue: document.querySelector("#poValue"),
  poFinding: document.querySelector("#poFinding"),
  approvalValue: document.querySelector("#approvalValue"),
  approvalFinding: document.querySelector("#approvalFinding"),
  metricReviewed: document.querySelector("#metricReviewed"),
  metricRisk: document.querySelector("#metricRisk"),
  metricTouches: document.querySelector("#metricTouches"),
  metricConfidence: document.querySelector("#metricConfidence"),
};

function getActiveException() {
  return exceptions.find((item) => item.id === state.activeId) || exceptions[0];
}

function riskClass(risk) {
  return risk.toLowerCase();
}

function renderExceptionList() {
  exceptionList.innerHTML = "";

  exceptions.forEach((item) => {
    const button = document.createElement("button");
    const isResolved = state.resolved.has(item.id);
    button.type = "button";
    button.className = [
      "exception-item",
      item.id === state.activeId ? "selected" : "",
      isResolved ? "resolved" : "",
    ]
      .filter(Boolean)
      .join(" ");
    button.innerHTML = `
      <span class="risk-dot ${riskClass(item.risk)}"></span>
      <span class="exception-main">
        <strong>${item.id}</strong>
        <em>${item.vendor}</em>
      </span>
      <span class="exception-meta">
        <strong>${item.total}</strong>
        <em>${isResolved ? "Resolved" : `${item.risk} risk`}</em>
      </span>
    `;
    button.addEventListener("click", () => {
      state.activeId = item.id;
      assistantMemo.textContent = item.memo;
      render();
    });
    exceptionList.appendChild(button);
  });
}

function renderAnalysis() {
  const item = getActiveException();
  fields.invoiceTitle.textContent = `${item.id} analysis`;
  fields.confidenceBadge.textContent = `Confidence ${item.confidence}%`;
  fields.vendorName.textContent = item.vendor;
  fields.invoiceTotal.textContent = item.total;
  fields.recommendedAction.textContent = item.action;
  fields.reasonText.textContent = item.reason;
  fields.systemValue.textContent = item.systemValue;
  fields.aiFinding.textContent = item.aiFinding;
  fields.poValue.textContent = item.poValue;
  fields.poFinding.textContent = item.poFinding;
  fields.approvalValue.textContent = item.approvalValue;
  fields.approvalFinding.textContent = item.approvalFinding;
}

function renderMetrics() {
  const openCount = exceptions.length - state.resolved.size;
  const reviewed = 5;
  const cardsChecked = 42 + state.auditRuns * 8;
  const manualEntriesAvoided = 118 + state.auditRuns * 22;
  const confidence =
    Math.round(
      exceptions
        .filter((item) => !state.resolved.has(item.id))
        .reduce((total, item) => total + item.confidence, 0) / Math.max(openCount, 1),
    ) || 0;

  fields.metricReviewed.textContent = String(reviewed);
  fields.metricRisk.textContent = String(cardsChecked);
  fields.metricTouches.textContent = String(manualEntriesAvoided);
  fields.metricConfidence.textContent = `${confidence}%`;
  queueStatus.textContent = `${openCount} need review`;
}

function render() {
  renderExceptionList();
  renderAnalysis();
  renderMetrics();
  approveResolutionButton.disabled = state.resolved.has(state.activeId);
}

function runAudit() {
  state.auditRuns += 1;
  const item = getActiveException();
  assistantMemo.textContent = `Time audit complete: XLS, PDF, and email time-card sources were normalized for 5 customer sites. ${exceptions.length - state.resolved.size} exceptions still need review. Next best action is "${item.action}" for ${item.id} because ${item.reason.toLowerCase()}`;
  runAuditButton.textContent = "Audit refreshed";
  renderMetrics();
}

function resetDemo() {
  state.activeId = exceptions[0].id;
  state.resolved.clear();
  state.auditRuns = 0;
  runAuditButton.textContent = "Run time audit";
  assistantMemo.textContent = "Select an exception or run the time audit to generate a concise reviewer note.";
  render();
}

function markResolved() {
  const item = getActiveException();
  state.resolved.add(item.id);
  assistantMemo.textContent = `${item.id} marked resolved. The audit trail now stores the source file, extracted hours, reviewer action, and ADP/QuickBooks billing decision for future checks.`;
  render();
}

function draftVendorNote() {
  const item = getActiveException();
  assistantMemo.textContent = `Draft site note: Please review ${item.id}. The time audit found: ${item.reason} Can you confirm the correct labor hours and customer site before we finalize ADP payroll and QuickBooks billing?`;
}

function assignOwner() {
  const item = getActiveException();
  assistantMemo.textContent = `${item.id} assigned to billing review with a same-day SLA. AI attached the original time-card source, extracted hours, customer site, ADP row, QuickBooks draft line, and suggested resolution path.`;
}

function setIntakeMode(mode) {
  intakeModeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.intakeMode === mode);
  });

  Object.entries(intakeContents).forEach(([key, content]) => {
    content.classList.toggle("active", key === mode);
  });

  intakeStatus.textContent =
    mode === "upload"
      ? "Upload mode: the reviewer would drag in XLS, PDF, and email export files for AI extraction."
      : "Direct-connect mode: the system would monitor approved inbox, shared folder, ADP export, and QuickBooks sources.";
}

function mockUpload() {
  setIntakeMode("upload");
  intakeStatus.textContent =
    "Sample files loaded: 1 XLS time-card sheet, 1 signed PDF time sheet, and 1 email correction export are ready for extraction.";
}

function processBatch() {
  state.auditRuns += 1;
  assistantMemo.textContent =
    "Demo batch processed: AI extracted 42 time-card records from XLS, PDF, and email sources, prepared review rows for 5 sites, and surfaced 4 exceptions before ADP payroll and QuickBooks billing.";
  intakeStatus.textContent =
    "Processing complete: extracted fields include employee, date, site, labor hours, source file, and confidence score.";
  runAuditButton.textContent = "Audit refreshed";
  renderMetrics();
}

runAuditButton.addEventListener("click", runAudit);
resetDemoButton.addEventListener("click", resetDemo);
approveResolutionButton.addEventListener("click", markResolved);
draftNoteButton.addEventListener("click", draftVendorNote);
assignOwnerButton.addEventListener("click", assignOwner);
mockUploadButton.addEventListener("click", mockUpload);
processBatchButton.addEventListener("click", processBatch);

intakeModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setIntakeMode(button.dataset.intakeMode);
  });
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navItems.forEach((navItem) => navItem.classList.remove("active"));
    item.classList.add("active");
    const target = document.querySelector(`#${item.dataset.view}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

render();
