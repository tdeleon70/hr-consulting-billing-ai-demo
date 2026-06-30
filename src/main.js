const exceptions = [
  {
    id: "HRC-10482",
    vendor: "Acme Health - HRIS Advisory",
    total: "$12,840.00",
    risk: "High",
    confidence: 94,
    action: "Hold for scope review",
    reason:
      "The invoice includes senior consultant hours above the weekly cap and repeats a discovery workshop that was billed last week.",
    systemValue: "$225 / senior hour",
    aiFinding: "Invoice uses $275 / hour",
    poValue: "Discovery phase complete",
    poFinding: "Workshop billed twice",
    approvalValue: "Engagement lead + finance",
    approvalFinding: "Lead approval missing",
    memo:
      "Recommended hold: Acme Health's HRIS advisory invoice appears to exceed the agreed senior consultant rate and includes a duplicate discovery workshop. Ask the engagement lead to confirm scope before payment release.",
  },
  {
    id: "HRC-10501",
    vendor: "BrightPath Manufacturing - Recruiting Sprint",
    total: "$8,375.20",
    risk: "Medium",
    confidence: 89,
    action: "Request placement backup",
    reason:
      "The invoice includes a success fee for one candidate, but the acceptance date and guarantee period documentation are missing.",
    systemValue: "18% placement fee",
    aiFinding: "Fee math is correct",
    poValue: "Offer accepted",
    poFinding: "Acceptance proof missing",
    approvalValue: "Talent lead approval",
    approvalFinding: "Ready after backup",
    memo:
      "Request placement backup for BrightPath Manufacturing before approval. Fee math matches the recruiting agreement, but acceptance evidence and guarantee-period start date should be attached.",
  },
  {
    id: "HRC-10507",
    vendor: "Meridian Bank - Compensation Study",
    total: "$22,410.50",
    risk: "High",
    confidence: 92,
    action: "Split and escalate",
    reason:
      "The invoice includes compensation benchmarking and executive leveling work, but the SOW separates those into two departments and only one has approved.",
    systemValue: "HR + executive office",
    aiFinding: "Single department coded",
    poValue: "Milestone 2 reached",
    poFinding: "Cost split mismatch",
    approvalValue: "Two budget owners",
    approvalFinding: "One approval missing",
    memo:
      "Escalate Meridian Bank for budget-owner approval and cost split. Payment can proceed once compensation benchmarking and executive leveling are allocated correctly.",
  },
  {
    id: "HRC-10514",
    vendor: "Lone Star Retail - HR Policy Retainer",
    total: "$4,980.00",
    risk: "Low",
    confidence: 87,
    action: "Approve with note",
    reason:
      "The amount matches the monthly retainer, but the billing period overlaps by three days with the prior invoice.",
    systemValue: "Monthly retainer",
    aiFinding: "3-day date overlap",
    poValue: "Recurring advisory",
    poFinding: "No duplicate amount",
    approvalValue: "Auto-approve under $5k",
    approvalFinding: "Add audit note",
    memo:
      "Lone Star Retail can be approved with an audit note. Retainer amount is correct, but the invoice date range should be normalized in the payment record.",
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
  const reviewed = 184 + state.auditRuns * 12;
  const riskValue = state.resolved.size > 0 ? "$11.2k" : "$18.7k";
  const confidence =
    Math.round(
      exceptions
        .filter((item) => !state.resolved.has(item.id))
        .reduce((total, item) => total + item.confidence, 0) / Math.max(openCount, 1),
    ) || 0;

  fields.metricReviewed.textContent = String(reviewed);
  fields.metricRisk.textContent = riskValue;
  fields.metricTouches.textContent = state.auditRuns > 0 ? "71%" : "63%";
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
  assistantMemo.textContent = `Audit complete: ${exceptions.length} invoices sampled, ${exceptions.length - state.resolved.size} exceptions still open. Next best action is "${item.action}" for ${item.id} because ${item.reason.toLowerCase()}`;
  runAuditButton.textContent = "Audit refreshed";
  renderMetrics();
}

function resetDemo() {
  state.activeId = exceptions[0].id;
  state.resolved.clear();
  state.auditRuns = 0;
  runAuditButton.textContent = "Run AI audit";
  assistantMemo.textContent = "Select an exception or run the audit to generate a concise reviewer note.";
  render();
}

function markResolved() {
  const item = getActiveException();
  state.resolved.add(item.id);
  assistantMemo.textContent = `${item.id} marked resolved. The audit trail now stores the reason, evidence, reviewer action, and owner decision for future AI checks.`;
  render();
}

function draftVendorNote() {
  const item = getActiveException();
  assistantMemo.textContent = `Draft client note: Please review ${item.id}. Our billing audit found: ${item.reason} Can you send a corrected invoice, timesheet backup, or engagement-lead approval so finance can release payment?`;
}

function assignOwner() {
  const item = getActiveException();
  assistantMemo.textContent = `${item.id} assigned to Finance Ops with a same-day SLA. AI attached the invoice, SOW evidence, timesheet context, approval rule, and suggested resolution path.`;
}

runAuditButton.addEventListener("click", runAudit);
resetDemoButton.addEventListener("click", resetDemo);
approveResolutionButton.addEventListener("click", markResolved);
draftNoteButton.addEventListener("click", draftVendorNote);
assignOwnerButton.addEventListener("click", assignOwner);

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
