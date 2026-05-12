import React, { useState, useEffect } from 'react';

// ============================================
// PROJECT WORKBOOK v2
// Field-journal aesthetic for nature/conservation/wellbeing charity ops
// Methodology: Root 5 (Tearfund) + SPICE + clarity-to-impact
// ============================================

const KEY = 'workbook-v2';

async function loadAll() {
  try { const r = await window.storage.get(KEY); const items = r ? JSON.parse(r.value) : []; return items.map(migrate); }
  catch { return []; }
}
async function saveAll(items) {
  try { await window.storage.set(KEY, JSON.stringify(items)); } catch(e) {}
}

// Ensure projects loaded from storage have all current fields (additive only â€” never remove)
function migrate(p) {
  const fresh = newProject();
  return {
    ...fresh,
    ...p,
    anchor: { ...fresh.anchor, ...(p.anchor || {}) },
    design: { ...fresh.design, ...(p.design || {}) },
    spice: { ...fresh.spice, ...(p.spice || {}) },
    ops: {
      ...fresh.ops, ...(p.ops || {}),
      checklist: { ...fresh.ops.checklist, ...((p.ops && p.ops.checklist) || {}) },
    },
    close: {
      ...fresh.close, ...(p.close || {}),
      endChecklist: { ...fresh.close.endChecklist, ...((p.close && p.close.endChecklist) || {}) },
    },
    gates: { ...fresh.gates, ...(p.gates || {}) },
    checkIns: p.checkIns || [],
  };
}

// ---- Project shape (slimmed) ----
const newProject = () => ({
  id: `p-${Date.now()}`,
  name: '',
  funder: '',
  createdAt: new Date().toISOString(),
  stage: 'design',
  gates: {
    1: { passed: false, date: '', note: '' },
    2: { passed: false, date: '', note: '' },
    3: [],
    4: { passed: false, date: '', note: '' },
  },
  // Stage 0: anchor (organisational strategic alignment)
  anchor: { strategicAlignment: '' },
  // Stage 1: Design
  // Step 1 â€” Purpose & Scope: problem framing + SPICE as project description
  // Step 2 â€” Theory of Change & Indicators (asked in plain English)
  design: {
    // Step 1 â€” Purpose & Scope
    problemStatement: '',
    scopeBoundary: '',
    // Step 2 â€” Theory of Change (in plain English)
    tocDocExists: '',         // 'yes' | 'no' | ''
    tocDocLink: '',
    expectedChange: '',       // outcomes pathway in plain English
    fragileAssumption: '',    // most fragile assumption + watch signal
    // Step 2 â€” Indicators (in plain English)
    keyIndicators: '',        // 2-3 things that will tell us it's working
    whoMightBeMissed: '',     // disaggregation as a question
  },
  // SPICE â€” kept as the project description spine (Setting, Population, Intervention, Effect)
  // Note: 'C' (Change) is now covered properly in the Theory of Change section above
  spice: {
    s_context: '', s_where: '',
    p_who: '', p_recruitment: '',
    i_what: '', i_model: '',
    c_change: '', c_measure: '',  // legacy â€” kept so existing projects don't break, but UI no longer prompts
    e_effect: '',
    fixedDates: '', fundingAmount: '', fundingType: '',
    reportingDates: '', grantConditions: '',
  },
  // Stage 2: Operationalise (RASCI + 7 essentials)
  ops: {
    projectLead: '', deliveryLead: '', melLead: '', financeLead: '',
    timetable: '', recruitmentRoute: '',
    checklist: {
      leadsConfirmed: false,
      timetableShared: false,
      recruitmentRouteAgreed: false,
      riskAssessmentsDone: false,
      safeguardingBriefed: false,
      budgetLoaded: false,
      spendApprovalSet: false,
    },
    notes: '',
  },
  // Stage 3: Monitor
  checkIns: [],
  // Stage 4: Close
  close: {
    // Numbers â€” kept short, paired against Stage 1 promises in the UI
    sessionsPromised: '', sessionsDelivered: '',
    participantsPromised: '', participantsEngaged: '',
    // Looking back â€” paired with Stage 1 commitments
    problemReflection: '',         // did our framing of the problem hold up?
    changeReflection: '',          // did the change we expected actually happen, for whom?
    indicatorsReflection: '',      // what did the indicators tell us (numbers, observations, stories)?
    fragileAssumptionReflection: '', // did the fragile thing hold? what happened?
    missedReflection: '',          // who got missed / whose experience was different?
    // Lessons forward â€” separate phase
    surprised: '',
    whatToDoDifferently: '',
    bidLessons: '',
    // Budget
    budgetTotal: '', budgetActual: '', budgetVariance: '',
    // Legacy fields kept so old projects don't lose data â€” UI no longer prompts for these by name
    quantHighlights: '', qualThemes: '', quote: '',
    whatWorked: '', whatDidnt: '',
    endChecklist: {
      deliveryComplete: false,
      reportSubmitted: false,
      budgetReconciled: false,
      evidenceFiled: false,
      learningCaptured: false,
    },
  },
});

const todayISO = () => new Date().toISOString().slice(0, 10);

// ============================================
// EXPORT â€” Project Sheet as Word doc
// ============================================
function exportProjectAsDoc(project) {
  const html = buildProjectSheetHTML(project);
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = (project.name || 'project').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  a.href = url;
  a.download = `${slug}-project-sheet.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildProjectSheetHTML(p) {
  const esc = (s) => (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
  const orDash = (s) => (s && s.trim()) ? esc(s) : '<span class="empty">â€”</span>';
  const gate = (g) => g?.passed
    ? `<strong>PASSED</strong> on ${esc(g.date)}${g.note ? ` â€” ${esc(g.note)}` : ''}`
    : '<span class="empty">Not yet passed</span>';

  const stageLabel = (p.stage || 'design');
  const stages = { design: 'Design', operationalise: 'Operationalise', monitor: 'Monitor', close: 'Close & Learn', done: 'Complete' };

  const checkInRows = (p.checkIns || []).map(c => `
    <tr>
      <td>${esc(c.date)}</td>
      <td>${esc(c.ragDelivery)}</td>
      <td>${esc(c.ragFinance)}</td>
      <td>${esc(c.working)}</td>
      <td>${esc(c.notWorking)}</td>
      <td>${esc(c.risks)}</td>
      <td>${esc(c.actions)}</td>
    </tr>`).join('');

  const changeBlocks = (p.gates[3] || []).map(c => `
    <div class="gate-block change">
      <strong>${esc(c.date)}</strong>${c.approvedBy ? ` &middot; approved by ${esc(c.approvedBy)}` : ''}<br/>
      <em>What changed:</em> ${esc(c.what)}<br/>
      ${c.why ? `<em>Why:</em> ${esc(c.why)}<br/>` : ''}
      ${c.impact ? `<em>Impact:</em> ${esc(c.impact)}` : ''}
    </div>`).join('');

  // Stage 1 â†’ Stage 4 mirror pairs
  const mirrorPair = (label, promise, reflection) => `
    <div class="mirror-pair">
      <div class="mirror-label">${label}</div>
      <div class="mirror-promise"><em>Said in design:</em><br/>${orDash(promise)}</div>
      <div class="mirror-reflection"><em>Looking back:</em><br/>${orDash(reflection)}</div>
    </div>`;

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${esc(p.name) || 'Untitled project'} â€” Project Sheet</title>
<style>
  body { font-family: Calibri, sans-serif; font-size: 11pt; color: #1F2419; line-height: 1.5; }
  h1 { font-size: 24pt; color: #3E5A3A; border-bottom: 2px solid #3E5A3A; padding-bottom: 6pt; margin-bottom: 4pt; }
  h2 { font-size: 16pt; color: #3E5A3A; margin-top: 22pt; border-bottom: 1px solid #C9BCA5; padding-bottom: 3pt; }
  h3 { font-size: 13pt; color: #2C2A26; margin-top: 14pt; margin-bottom: 4pt; }
  .subtitle { color: #8A7D6A; font-style: italic; font-size: 11pt; margin-bottom: 14pt; }
  .meta { color: #5A5249; font-size: 10pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  td, th { border: 1px solid #C9BCA5; padding: 6pt 8pt; text-align: left; vertical-align: top; font-size: 10pt; }
  th { background: #E8EDE2; font-weight: bold; }
  .gate-block { padding: 10pt; background: #F5EFE3; border-left: 3px solid #3E5A3A; margin: 8pt 0; }
  .gate-block.change { background: #FAF1DD; border-left-color: #A8763E; }
  .field-label { font-weight: bold; color: #5A5249; font-size: 10pt; }
  .field-value { margin: 2pt 0 10pt; }
  .empty { color: #A39685; font-style: italic; }
  .mirror-pair { margin: 12pt 0; padding: 10pt; background: #FFFCF4; border-left: 3px solid #A8763E; }
  .mirror-label { font-weight: bold; color: #8A7D6A; font-size: 9pt; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4pt; }
  .mirror-promise { font-style: italic; color: #5A5249; padding: 4pt 0; }
  .mirror-reflection { color: #1F2419; padding: 4pt 0; border-top: 1px dotted #C9BCA5; margin-top: 6pt; }
  .anchor { background: #E8EDE2; padding: 10pt; border-radius: 3pt; margin: 8pt 0; }
  .footer { color: #8A7D6A; font-size: 9pt; margin-top: 30pt; padding-top: 10pt; border-top: 1px solid #C9BCA5; font-style: italic; }
  .partner-note { background: #FAF1DD; border: 1px solid #E8D2A6; border-left: 4px solid #A8763E; padding: 12pt 14pt; margin: 18pt 0; }
  .partner-note-label { font-weight: bold; color: #7A5A1E; font-size: 9pt; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6pt; }
</style>
</head>
<body>

<h1>${esc(p.name) || 'Untitled project'}</h1>
<p class="meta">${esc(p.funder) || '<span class="empty">No funder named</span>'} &middot; Current stage: ${stages[stageLabel]} &middot; Generated: ${new Date().toLocaleDateString('en-GB')}</p>

<div class="partner-note">
  <div class="partner-note-label">For partners working on this document</div>
  <p style="margin: 0; font-size: 10pt; color: #5A5249; line-height: 1.5;">
    This is an export from the live Project Workbook. You're welcome to read it, add detail in any of the sections below, leave comments using Word's review tools, or fill in anything that's blank or marked &mdash;. When you're done, email the edited document back to the project lead, who will bring your changes back into the live workbook.
  </p>
  <p style="margin: 6pt 0 0; font-size: 10pt; color: #5A5249; line-height: 1.5;">
    A note on layout: the structured layout (headings, tables, the "Said in design / Looking back" pairs) helps when the document goes back into the workbook. If you can keep that structure as you edit, it makes the round-trip much easier &mdash; but don't let it stop you adding what matters.
  </p>
</div>

<!-- STAGE 0: ANCHOR -->
<h2>Stage 0 â€” Strategic alignment</h2>
<div class="anchor">
  <div class="field-label">Which organisational strategic priorities does this project serve?</div>
  <div class="field-value">${orDash(p.anchor?.strategicAlignment)}</div>
</div>

<!-- STAGE 1: DESIGN -->
<h2>Stage 1 â€” Design</h2>
<p class="subtitle">Step 1 â€” Purpose & Scope Â· Step 2 â€” The change & how we'll know</p>

<h3>The problem statement</h3>
<div class="field-value">${orDash(p.design?.problemStatement)}</div>

<h3>Scope boundary â€” what this project is NOT doing</h3>
<div class="field-value">${orDash(p.design?.scopeBoundary)}</div>

<h3>SPICE â€” describing the project</h3>
<table>
  <tr><th style="width:25%">Setting â€” why it matters</th><td>${orDash(p.spice?.s_context)}</td></tr>
  <tr><th>Setting â€” where it runs</th><td>${orDash(p.spice?.s_where)}</td></tr>
  <tr><th>Population â€” who it's for</th><td>${orDash(p.spice?.p_who)}</td></tr>
  <tr><th>Population â€” how they join</th><td>${orDash(p.spice?.p_recruitment)}</td></tr>
  <tr><th>Intervention â€” what they experience</th><td>${orDash(p.spice?.i_what)}</td></tr>
  <tr><th>Intervention â€” delivery model</th><td>${orDash(p.spice?.i_model)}</td></tr>
  <tr><th>Effect â€” longer-term difference</th><td>${orDash(p.spice?.e_effect)}</td></tr>
</table>

<h3>The change this project should make</h3>
<div class="field-value">${orDash(p.design?.expectedChange)}</div>
${p.design?.tocDocExists === 'yes' && p.design?.tocDocLink ? `<div class="meta">Theory of Change document: ${esc(p.design.tocDocLink)}</div>` : ''}

<h3>Most fragile thing this project depends on</h3>
<div class="field-value">${orDash(p.design?.fragileAssumption)}</div>

<h3>What will tell us it's working (2â€“3 things)</h3>
<div class="field-value">${orDash(p.design?.keyIndicators)}</div>

<h3>Whose experience might these miss</h3>
<div class="field-value">${orDash(p.design?.whoMightBeMissed)}</div>

<h3>Money & reporting</h3>
<table>
  <tr><th style="width:25%">Total funding</th><td>${orDash(p.spice?.fundingAmount)} ${p.spice?.fundingType ? `(${esc(p.spice.fundingType)})` : ''}</td></tr>
  <tr><th>Reporting deadlines</th><td>${orDash(p.spice?.reportingDates)}</td></tr>
  <tr><th>Fixed dates we cannot move</th><td>${orDash(p.spice?.fixedDates)}</td></tr>
  <tr><th>Grant conditions</th><td>${orDash(p.spice?.grantConditions)}</td></tr>
</table>

<div class="gate-block">
  <strong>Gate 1 â€” Design sign-off:</strong> ${gate(p.gates?.[1])}
</div>

<!-- STAGE 2: OPERATIONALISE -->
<h2>Stage 2 â€” Operationalise</h2>
<p class="subtitle">Steps 3â€“4 â€” Data systems & roles</p>

<h3>Roles</h3>
<table>
  <tr><th style="width:25%">Project Lead (Accountable)</th><td>${orDash(p.ops?.projectLead)}</td></tr>
  <tr><th>Delivery Lead</th><td>${orDash(p.ops?.deliveryLead)}</td></tr>
  <tr><th>MEL</th><td>${orDash(p.ops?.melLead)}</td></tr>
  <tr><th>Finance</th><td>${orDash(p.ops?.financeLead)}</td></tr>
</table>

<h3>The plan</h3>
<div class="field-label">Delivery timetable</div>
<div class="field-value">${orDash(p.ops?.timetable)}</div>
<div class="field-label">Recruitment route</div>
<div class="field-value">${orDash(p.ops?.recruitmentRoute)}</div>

<h3>Start-up checklist (Gate 2 essentials)</h3>
<ul>
  <li>${p.ops?.checklist?.leadsConfirmed ? 'â˜‘' : 'â˜'} Project Lead and Delivery Lead confirmed</li>
  <li>${p.ops?.checklist?.timetableShared ? 'â˜‘' : 'â˜'} Delivery timetable confirmed and shared with team</li>
  <li>${p.ops?.checklist?.recruitmentRouteAgreed ? 'â˜‘' : 'â˜'} Recruitment route agreed</li>
  <li>${p.ops?.checklist?.riskAssessmentsDone ? 'â˜‘' : 'â˜'} Risk assessments confirmed</li>
  <li>${p.ops?.checklist?.safeguardingBriefed ? 'â˜‘' : 'â˜'} Safeguarding & incident reporting briefed</li>
  <li>${p.ops?.checklist?.budgetLoaded ? 'â˜‘' : 'â˜'} Budget loaded into tracking</li>
  <li>${p.ops?.checklist?.spendApprovalSet ? 'â˜‘' : 'â˜'} Spend approval route confirmed</li>
</ul>
${p.ops?.notes ? `<div class="field-label">Other notes</div><div class="field-value">${esc(p.ops.notes)}</div>` : ''}

<div class="gate-block">
  <strong>Gate 2 â€” Ready to deliver:</strong> ${gate(p.gates?.[2])}
</div>

<!-- STAGE 3: MONITOR -->
<h2>Stage 3 â€” Monitor</h2>
<p class="subtitle">Step 5 â€” Analyse, report, communicate (lightly, monthly)</p>

${checkInRows ? `
<h3>Monthly check-in log</h3>
<table>
  <tr><th>Date</th><th>Delivery</th><th>Finance</th><th>Working</th><th>Not working</th><th>Risks</th><th>Actions</th></tr>
  ${checkInRows}
</table>
` : '<p><span class="empty">No check-ins recorded.</span></p>'}

${changeBlocks ? `
<h3>Material changes (Gate 3 entries)</h3>
${changeBlocks}
` : '<p><span class="empty">No material changes logged.</span></p>'}

<!-- STAGE 4: CLOSE & LEARN -->
<h2>Stage 4 â€” Close & Learn</h2>
<p class="subtitle">Step 6 â€” Apply learning, adapt</p>

<h3>Delivered vs promised</h3>
<table>
  <tr><th style="width:25%">Sessions</th><td>Promised: ${orDash(p.close?.sessionsPromised)} &nbsp;/&nbsp; Delivered: ${orDash(p.close?.sessionsDelivered)}</td></tr>
  <tr><th>Participants</th><td>Promised: ${orDash(p.close?.participantsPromised)} &nbsp;/&nbsp; Engaged: ${orDash(p.close?.participantsEngaged)}</td></tr>
</table>

<h3>Looking back â€” what was said, what happened</h3>
${mirrorPair('The problem', p.design?.problemStatement, p.close?.problemReflection)}
${mirrorPair('The change', p.design?.expectedChange, p.close?.changeReflection)}
${mirrorPair('What we said we would watch', p.design?.keyIndicators, p.close?.indicatorsReflection)}
${mirrorPair('The fragile thing', p.design?.fragileAssumption, p.close?.fragileAssumptionReflection)}
${mirrorPair('Whose experience', p.design?.whoMightBeMissed, p.close?.missedReflection)}

<h3>Budget headline</h3>
<table>
  <tr><th style="width:25%">Budget total</th><td>${orDash(p.close?.budgetTotal)}</td></tr>
  <tr><th>Actual spend</th><td>${orDash(p.close?.budgetActual)}</td></tr>
  <tr><th>Variance</th><td>${orDash(p.close?.budgetVariance)}</td></tr>
</table>

<h3>Lessons forward</h3>
<div class="field-label">What surprised us?</div>
<div class="field-value">${orDash(p.close?.surprised)}</div>
<div class="field-label">What would we do differently next time?</div>
<div class="field-value">${orDash(p.close?.whatToDoDifferently)}</div>
<div class="field-label">What bid assumptions would we revise?</div>
<div class="field-value">${orDash(p.close?.bidLessons)}</div>

<div class="gate-block">
  <strong>Gate 4 â€” Project complete:</strong> ${gate(p.gates?.[4])}
</div>

<div class="footer">
  Generated from the Project Workbook on ${new Date().toLocaleDateString('en-GB')}.<br/>
  Shaped by Root 5 (Tearfund), SPICE, and Clarity-to-ImpactÂ® (Ann-Murray Brown). Methodology terms preserved as-is for funder reports.
</div>

</body>
</html>`;
}


// ---- SPICE field config ----
const SPICE_SECTIONS = [
  {
    letter: 'S', name: 'Setting', tagline: 'Where & why',
    fields: [
      { key: 's_context', label: 'Why does this project matter?', placeholder: 'A short paragraph giving the team the "why" and the realities on the ground' },
      { key: 's_where', label: 'Where will it run?', placeholder: 'Sites, constraints, seasonality' },
    ],
  },
  {
    letter: 'P', name: 'Population', tagline: 'Who & how they join',
    fields: [
      { key: 'p_who', label: 'Who is it for?', placeholder: 'Target group, inclusion, adjustments' },
      { key: 'p_recruitment', label: 'How will they join?', placeholder: 'Referral, open sign-up, mixed â€” and the pipeline partners' },
    ],
  },
  {
    letter: 'I', name: 'Intervention', tagline: 'What we deliver',
    fields: [
      { key: 'i_what', label: 'What will participants experience?', placeholder: 'In plain English' },
      { key: 'i_model', label: 'Delivery model', placeholder: 'Frequency, duration, ratios, key partners' },
    ],
  },
  // C (Change) is now covered properly by the Theory of Change & Indicators section
  // â€” kept out of SPICE here so we don't ask the same question twice
  {
    letter: 'E', name: 'Effect', tagline: 'So what â€” long-term',
    fields: [
      { key: 'e_effect', label: 'What's the longer-term difference?', placeholder: 'Why it matters beyond the project â€” the impact-level change' },
    ],
  },
];

// ---- Questions for the Project Lead (auto-generated from gaps) ----
function gapQuestions(p) {
  const q = [];
  if (!p.anchor.strategicAlignment?.trim()) q.push('Which of our organisational strategic priorities does this project serve?');
  // Step 1 â€” Purpose & Scope
  if (!p.design.problemStatement?.trim()) q.push('What's the problem we're trying to address?');
  if (!p.spice.s_context?.trim()) q.push('What's the context â€” why does this project matter and what realities are on the ground?');
  if (!p.spice.s_where?.trim()) q.push('Where exactly will it run, and are sites confirmed?');
  if (!p.spice.p_who?.trim()) q.push('Who is the target group?');
  if (!p.spice.p_recruitment?.trim()) q.push('How will participants join â€” referral, open sign-up, or mixed? Who are the pipeline partners?');
  if (!p.spice.i_what?.trim()) q.push('In plain English, what will participants actually experience?');
  if (!p.spice.i_model?.trim()) q.push('What's the delivery model â€” frequency, duration, ratios?');
  if (!p.spice.e_effect?.trim()) q.push('What's the longer-term difference this should make?');
  // Step 2 â€” Theory of Change & Indicators (in plain English)
  if (!p.design.expectedChange?.trim()) q.push('What change should this project make, and for whom?');
  if (!p.design.fragileAssumption?.trim()) q.push('What's the most fragile thing this project depends on \u2014 something that could derail it if it doesn't hold?');
  if (!p.design.keyIndicators?.trim()) q.push('What 2\u20133 things will tell us this is working?');
  // Money & reporting
  if (!p.spice.fundingAmount?.trim()) q.push('Total funding, and is it restricted, unrestricted, or mixed?');
  if (!p.spice.reportingDates?.trim()) q.push('What are the reporting deadlines?');
  if (!p.spice.fixedDates?.trim()) q.push('Are there any fixed dates we cannot move?');
  return q;
}

// Gate 1 essentials â€” the minimum needed to honestly say the project's design is realistic enough to commit to
const gate1Ready = (p) => {
  return !!(
    p.design.problemStatement?.trim() &&
    p.spice.s_context?.trim() &&
    p.spice.p_who?.trim() &&
    p.spice.i_what?.trim() &&
    p.design.expectedChange?.trim() &&
    p.design.keyIndicators?.trim() &&
    p.spice.fundingAmount?.trim() &&
    p.spice.reportingDates?.trim()
  );
};

const gate2Ready = (p) => Object.values(p.ops.checklist).every(Boolean);
const gate4Ready = (p) => Object.values(p.close.endChecklist).every(Boolean);

const stageMeta = {
  design:         { label: 'Design',          n: 1, color: '#7C5C3B', root: 'Purpose'   },
  operationalise: { label: 'Operationalise',  n: 2, color: '#A8763E', root: 'People & Plan' },
  monitor:        { label: 'Monitor',         n: 3, color: '#3E5A3A', root: 'Progress'  },
  close:          { label: 'Close & Learn',   n: 4, color: '#5A4A3D', root: 'Performance' },
  done:           { label: 'Complete',        n: 5, color: '#2C2A26', root: ''          },
};

const ragMeta = {
  G: { label: 'On track',    color: '#3E5A3A', bg: '#DCE5D2' },
  A: { label: 'Watching',    color: '#A8763E', bg: '#F0E1C9' },
  R: { label: 'Intervening', color: '#9C3D2C', bg: '#EBCBC1' },
};

// ============================================
// ROOT
// ============================================
export default function App() {
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState('home'); // home | project | methodology
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll().then(p => { setProjects(p); setLoading(false); }); }, []);

  const persist = (next) => { setProjects(next); saveAll(next); };
  const update = (id, fn) => persist(projects.map(p => p.id === id ? fn(p) : p));
  const add = () => {
    const p = newProject();
    persist([...projects, p]);
    setActiveId(p.id);
    setView('project');
  };
  const remove = (id) => {
    if (!confirm('Delete this project?')) return;
    persist(projects.filter(p => p.id !== id));
    if (activeId === id) { setView('home'); setActiveId(null); }
  };

  const active = projects.find(p => p.id === activeId);

  return (
    <>
      <Styles />
      <div className="wb">
        {loading ? (
          <Loading />
        ) : view === 'methodology' ? (
          <Methodology onBack={() => setView('home')} />
        ) : view === 'home' || !active ? (
          <Home projects={projects} onOpen={(id) => { setActiveId(id); setView('project'); }} onAdd={add} onDelete={remove} onMethodology={() => setView('methodology')} />
        ) : (
          <ProjectView project={active} update={(fn) => update(active.id, fn)} onBack={() => setView('home')} onDelete={() => remove(active.id)} onMethodology={() => setView('methodology')} />
        )}
      </div>
    </>
  );
}

// ============================================
// STYLES (field journal aesthetic)
// ============================================
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500&display=swap');

      * { box-sizing: border-box; }
      body { margin: 0; }

      .wb {
        font-family: 'Inter', system-ui, sans-serif;
        color: #2C2A26;
        background: #F5EFE3;
        background-image:
          radial-gradient(circle at 20% 30%, rgba(168, 118, 62, 0.04) 0%, transparent 40%),
          radial-gradient(circle at 80% 70%, rgba(62, 90, 58, 0.04) 0%, transparent 40%),
          repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(124, 92, 59, 0.03) 28px, rgba(124, 92, 59, 0.03) 29px);
        min-height: 100vh;
        font-size: 15px;
        line-height: 1.55;
      }

      .wb h1, .wb h2, .wb h3, .wb h4, .display {
        font-family: 'Fraunces', Georgia, serif;
        font-weight: 400;
        font-variation-settings: "opsz" 144, "SOFT" 50;
        letter-spacing: -0.02em;
        color: #2C2A26;
      }
      .wb h1 { font-weight: 300; }

      .hand {
        font-family: 'Caveat', cursive;
        font-weight: 400;
      }

      .wb input[type="text"], .wb input[type="date"], .wb textarea, .wb select {
        width: 100%;
        background: rgba(255, 252, 244, 0.6);
        border: none;
        border-bottom: 1px solid #C9BCA5;
        border-radius: 0;
        padding: 8px 0;
        font-family: 'Inter', sans-serif;
        font-size: 15px;
        color: #2C2A26;
        transition: all 0.2s;
      }
      .wb textarea {
        border: 1px solid #D9CDB5;
        background: rgba(255, 252, 244, 0.5);
        border-radius: 2px;
        padding: 12px 14px;
        resize: vertical;
        min-height: 70px;
        line-height: 1.55;
      }
      .wb input:focus, .wb textarea:focus, .wb select:focus {
        outline: none;
        border-color: #3E5A3A;
        background: rgba(255, 252, 244, 1);
      }
      .wb textarea:focus {
        box-shadow: 0 0 0 3px rgba(62, 90, 58, 0.08);
      }
      .wb label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 6px;
        color: #5A5249;
        letter-spacing: 0.02em;
      }
      .wb .field { margin-bottom: 22px; }

      .wb .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        border-radius: 2px;
        border: 1px solid transparent;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        letter-spacing: 0.01em;
      }
      .wb .btn-primary {
        background: #3E5A3A;
        color: #F5EFE3;
      }
      .wb .btn-primary:hover { background: #2D4429; transform: translateY(-1px); }
      .wb .btn-primary:disabled { background: #B8B0A0; cursor: not-allowed; transform: none; }

      .wb .btn-secondary {
        background: transparent;
        color: #2C2A26;
        border-color: #2C2A26;
      }
      .wb .btn-secondary:hover { background: #2C2A26; color: #F5EFE3; }

      .wb .btn-ghost {
        background: transparent;
        color: #5A5249;
        padding: 8px 12px;
      }
      .wb .btn-ghost:hover { color: #2C2A26; }

      .wb .card {
        background: #FFFCF4;
        border: 1px solid #E8DDC4;
        border-radius: 3px;
        padding: 28px;
        position: relative;
      }
      .wb .card::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image:
          repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(168, 118, 62, 0.04) 28px, rgba(168, 118, 62, 0.04) 29px);
        pointer-events: none;
        border-radius: 3px;
      }
      .wb .card > * { position: relative; z-index: 1; }

      .wb .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
      @media (max-width: 720px) { .wb .grid-2 { grid-template-columns: 1fr; } }

      .wb .check-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 9px 0;
        cursor: pointer;
        user-select: none;
        font-size: 14px;
      }
      .wb .check-row input { margin-top: 3px; accent-color: #3E5A3A; cursor: pointer; }
      .wb .check-row:hover { color: #3E5A3A; }

      .wb .pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 11px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .wb .divider {
        height: 1px;
        background: linear-gradient(to right, transparent, #C9BCA5 20%, #C9BCA5 80%, transparent);
        margin: 32px 0;
      }

      @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .wb .fade-up { animation: fadeUp 0.4s ease-out both; }

      @keyframes drawIn { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }

      /* Cycle hub */
      .cycle-hub {
        position: relative;
        width: 100%;
        max-width: 540px;
        margin: 0 auto;
        aspect-ratio: 1;
      }
      .cycle-svg { width: 100%; height: 100%; overflow: visible; }
      .cycle-stage-btn {
        cursor: pointer;
        transition: all 0.3s;
      }
      .cycle-stage-btn:hover circle { filter: brightness(1.05); }
      .cycle-stage-btn:hover .cycle-stage-label { font-weight: 500; }

      /* Print styles - for the project sheet */
      @media print {
        .wb { background: white !important; background-image: none !important; }
        .no-print { display: none !important; }
        .card { border: 1px solid #ddd !important; box-shadow: none !important; page-break-inside: avoid; }
        .card::before { display: none !important; }
      }
    `}</style>
  );
}

function Loading() {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A5249', fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>opening the workbookâ€¦</div>;
}

// ============================================
// HOME / DASHBOARD
// ============================================
function Home({ projects, onOpen, onAdd, onDelete, onMethodology }) {
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '56px 32px 80px' }}>

      {/* Masthead */}
      <header style={{ marginBottom: 64 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <BotanicalMark />
              <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5A5249', fontWeight: 500 }}>The Project Workbook</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(42px, 6vw, 64px)', lineHeight: 1.0, maxWidth: 720 }}>
              A practical workbook<br/>
              <span style={{ fontStyle: 'italic', fontWeight: 300 }}>for running projects well.</span>
            </h1>
            <p style={{ marginTop: 18, fontSize: 17, color: '#5A5249', maxWidth: 560, lineHeight: 1.5 }}>
              From first idea to final learning â€” helping small teams design clearly, stay on track, and learn as they go.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onMethodology} style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            About this approach â†’
          </button>
        </div>
      </header>

      {/* Action area */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>
          {projects.length === 0 ? 'No projects yet' : `${projects.length} project${projects.length === 1 ? '' : 's'}`}
        </h2>
        <button className="btn btn-primary" onClick={onAdd}>+ Begin a new project</button>
      </div>

      {projects.length === 0 ? (
        <EmptyHome onAdd={onAdd} />
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {projects.map((p, i) => (
            <ProjectRow key={p.id} project={p} onOpen={() => onOpen(p.id)} onDelete={() => onDelete(p.id)} delay={i * 50} />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid #C9BCA5', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#8A7D6A', letterSpacing: '0.05em' }}>
        <span>Developed by Stephanie Sanderson</span>
      </div>
    </div>
  );
}

function EmptyHome({ onAdd }) {
  return (
    <div className="card fade-up" style={{ textAlign: 'center', padding: '72px 32px' }}>
      <div style={{ fontSize: 64, fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: '#A8763E', lineHeight: 1, marginBottom: 16 }}>â€”</div>
      <p style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 300, color: '#2C2A26', maxWidth: 480, margin: '0 auto 8px' }}>
        Every project begins with a brief landing somewhere.
      </p>
      <p style={{ color: '#5A5249', maxWidth: 460, margin: '0 auto 28px', fontSize: 14 }}>
        When that happens, start a project here. Capture what you know, list what you don't, and keep the cycle visible.
      </p>
      <button className="btn btn-primary" onClick={onAdd}>+ Begin your first project</button>
    </div>
  );
}

function ProjectRow({ project, onOpen, onDelete, delay = 0 }) {
  const meta = stageMeta[project.stage];
  const last = project.checkIns.length ? project.checkIns[project.checkIns.length - 1] : null;
  const passedGates = [1, 2, 4].filter(g => project.gates[g]?.passed).length;
  const totalGates = 3;

  return (
    <div
      className="card fade-up"
      style={{ display: 'flex', gap: 20, padding: 22, cursor: 'pointer', alignItems: 'center', animationDelay: `${delay}ms` }}
      onClick={onOpen}
    >
      <div style={{ flexShrink: 0 }}>
        <StageGlyph stage={project.stage} size={56} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>{project.name || <span style={{ color: '#A39685', fontStyle: 'italic' }}>Untitled project</span>}</h3>
          {project.funder && <span style={{ fontSize: 13, color: '#8A7D6A' }}>Â· {project.funder}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 7, fontSize: 12, color: '#5A5249', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color }} />
            <strong style={{ fontWeight: 500, color: '#2C2A26' }}>{meta.label}</strong>
            <span style={{ color: '#A39685', fontSize: 11 }}>Â· {meta.root}</span>
          </span>
          <span>{passedGates}/{totalGates} gates</span>
          {last && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: ragMeta[last.ragDelivery]?.color }} />
              {ragMeta[last.ragDelivery]?.label} Â· {last.date}
            </span>
          )}
        </div>
      </div>
      <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ fontSize: 12, color: '#A39685' }}>Remove</button>
      <div style={{ fontSize: 28, color: '#C9BCA5', fontFamily: 'Fraunces, serif', marginLeft: -8 }}>â†’</div>
    </div>
  );
}

// ============================================
// CYCLE HUB & STAGE GLYPHS
// ============================================

// Map stage keys to gate numbers (3 is conditional, doesn't count for stage status)
const stageGateMap = { design: 1, operationalise: 2, monitor: null, close: 4 };

// Has the user touched this stage at all? (for "in progress" detection)
function hasContent(project, stageKey) {
  if (stageKey === 'design') {
    const s = project.spice;
    const d = project.design;
    return !!(
      project.anchor.strategicAlignment?.trim() ||
      d.problemStatement?.trim() || d.expectedChange?.trim() || d.fragileAssumption?.trim() || d.keyIndicators?.trim() ||
      s.s_context?.trim() || s.p_who?.trim() || s.i_what?.trim() || s.e_effect?.trim() || s.fundingAmount?.trim()
    );
  }
  if (stageKey === 'operationalise') {
    const o = project.ops;
    return !!(o.projectLead?.trim() || o.deliveryLead?.trim() || o.timetable?.trim() || Object.values(o.checklist).some(Boolean));
  }
  if (stageKey === 'monitor') {
    return project.checkIns.length > 0 || project.gates[3].length > 0;
  }
  if (stageKey === 'close') {
    const c = project.close;
    return !!(c.sessionsDelivered?.trim() || c.whatWorked?.trim() || c.whatDidnt?.trim() || Object.values(c.endChecklist).some(Boolean));
  }
  return false;
}

// Status: 'passed' | 'inProgress' | 'open'
function stageStatus(project, stageKey) {
  const gateN = stageGateMap[stageKey];
  if (gateN && project.gates[gateN]?.passed) return 'passed';
  if (hasContent(project, stageKey)) return 'inProgress';
  return 'open';
}

function CycleHub({ project, onSelectStage, currentStage }) {
  const stages = [
    { key: 'design',         angle: -90, label: 'Design',         n: '01', root: 'Purpose',         color: '#7C5C3B', mel: 'Steps 1â€“2 Â· Purpose, ToC, indicators' },
    { key: 'operationalise', angle: 0,   label: 'Operationalise', n: '02', root: 'People & Plan',  color: '#A8763E', mel: 'Steps 3â€“4 Â· Data systems, roles' },
    { key: 'monitor',        angle: 90,  label: 'Monitor',        n: '03', root: 'Progress',       color: '#3E5A3A', mel: 'Step 5 Â· Analyse, report, communicate' },
    { key: 'close',          angle: 180, label: 'Close & Learn',  n: '04', root: 'Performance',    color: '#5A4A3D', mel: 'Step 6 Â· Apply learning, adapt' },
  ];

  const cx = 270, cy = 270, r = 175;
  const NODE_R = 38;
  const ARROW_INSET = 0.32; // radians padding around each node so arrows don't overlap

  return (
    <div className="cycle-hub">
      <svg className="cycle-svg" viewBox="0 0 540 540">
        <defs>
          {/* Big chunky arrowhead â€” passed (green) */}
          <marker id="arrowPassed" viewBox="0 0 14 14" refX="6" refY="7" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
            <path d="M 1 1 L 12 7 L 1 13 z" fill="#3E5A3A" />
          </marker>
          {/* Big chunky arrowhead â€” pending (warm grey/brown) */}
          <marker id="arrowPending" viewBox="0 0 14 14" refX="6" refY="7" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
            <path d="M 1 1 L 12 7 L 1 13 z" fill="#A8763E" opacity="0.7" />
          </marker>
        </defs>

        {/* Outer pencil ring â€” keeps the field-journal feel */}
        <circle cx={cx} cy={cy} r={r + 56} fill="none" stroke="#C9BCA5" strokeWidth="0.6" strokeDasharray="0.5 5" opacity="0.45" />

        {/* THE FOUR ARROWS â€” one per stage transition */}
        {stages.map((s, i) => {
          const next = stages[(i + 1) % stages.length];
          const a1 = (s.angle * Math.PI) / 180;
          const a2 = (next.angle * Math.PI) / 180;

          // Inset from each node so arrow starts/ends outside the circle
          const startA = a1 + ARROW_INSET;
          const endA = a2 - ARROW_INSET;

          const x1 = cx + r * Math.cos(startA);
          const y1 = cy + r * Math.sin(startA);
          const x2 = cx + r * Math.cos(endA);
          const y2 = cy + r * Math.sin(endA);

          const fromStatus = stageStatus(project, s.key);
          const isPassed = fromStatus === 'passed';

          return (
            <path
              key={`arrow-${i}`}
              d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
              fill="none"
              stroke={isPassed ? '#3E5A3A' : '#A8763E'}
              strokeWidth={isPassed ? 4 : 3}
              strokeLinecap="round"
              opacity={isPassed ? 0.9 : 0.65}
              markerEnd={isPassed ? 'url(#arrowPassed)' : 'url(#arrowPending)'}
            />
          );
        })}

        {/* Centre â€” Strategy / Anchor */}
        <g>
          <circle cx={cx} cy={cy} r="72" fill="#FFFCF4" stroke="#C9BCA5" strokeWidth="1" />
          <circle cx={cx} cy={cy} r="58" fill="none" stroke="#3E5A3A" strokeWidth="0.7" opacity="0.3" />
          <text x={cx} y={cy - 22} textAnchor="middle" style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fill: '#8A7D6A', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500 }}>The anchor</text>
          <text x={cx} y={cy} textAnchor="middle" style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', fontStyle: 'italic', fill: '#2C2A26', fontWeight: 400 }}>Strategic</text>
          <text x={cx} y={cy + 22} textAnchor="middle" style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', fontStyle: 'italic', fill: '#2C2A26', fontWeight: 400 }}>alignment</text>
          <text x={cx} y={cy + 42} textAnchor="middle" style={{ fontFamily: 'Inter, sans-serif', fontSize: '9.5px', fill: '#8A7D6A', letterSpacing: '0.04em' }}>holds it all</text>
        </g>

        {/* Stage nodes */}
        {stages.map((s) => {
          const a = (s.angle * Math.PI) / 180;
          const x = cx + r * Math.cos(a);
          const y = cy + r * Math.sin(a);
          const status = stageStatus(project, s.key);
          const isCurrent = currentStage === s.key;
          const isPassed = status === 'passed';
          const isInProgress = status === 'inProgress';

          // Label position
          const labelDist = 86;
          const lx = cx + (r + labelDist) * Math.cos(a);
          const ly = cy + (r + labelDist) * Math.sin(a);

          return (
            <g
              key={s.key}
              className="cycle-stage-btn"
              onClick={() => onSelectStage(s.key)}
              style={{ cursor: 'pointer' }}
            >
              {/* Generous hit target covering circle + label area */}
              <circle cx={x} cy={y} r="58" fill="transparent" />
              <rect x={lx - 95} y={ly - 26} width="190" height="52" fill="transparent" />

              {/* Halo for current stage */}
              {isCurrent && (
                <>
                  <circle cx={x} cy={y} r="54" fill={s.color} opacity="0.08" />
                  <circle cx={x} cy={y} r="48" fill="none" stroke={s.color} strokeWidth="0.6" opacity="0.4" />
                </>
              )}

              {/* Outer node ring */}
              <circle
                cx={x} cy={y} r={NODE_R}
                fill={isPassed ? s.color : '#FFFCF4'}
                stroke={s.color}
                strokeWidth={isCurrent ? 2.5 : (isInProgress ? 1.8 : 1.3)}
              />

              {/* In-progress: half-fill */}
              {isInProgress && !isPassed && (
                <path
                  d={`M ${x} ${y - NODE_R} A ${NODE_R} ${NODE_R} 0 0 1 ${x} ${y + NODE_R} Z`}
                  fill={s.color}
                  opacity="0.28"
                />
              )}

              {/* Stage number */}
              <text
                x={x} y={y - 4}
                textAnchor="middle"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '10px',
                  fill: isPassed ? '#F5EFE3' : '#8A7D6A',
                  letterSpacing: '0.2em',
                  fontWeight: 500,
                }}
              >{s.n}</text>

              {/* Status mark */}
              <text
                x={x} y={y + 14}
                textAnchor="middle"
                style={{
                  fontFamily: 'Fraunces, serif',
                  fontSize: '20px',
                  fill: isPassed ? '#F5EFE3' : s.color,
                  fontWeight: 400,
                }}
              >{isPassed ? 'âœ“' : (isInProgress ? 'â—' : 'â—‹')}</text>

              {/* External label */}
              <text
                x={lx} y={ly - 10}
                textAnchor="middle"
                className="cycle-stage-label"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fill: '#2C2A26',
                  fontWeight: isCurrent ? 600 : 500,
                }}
              >{s.label}</text>
              <text
                x={lx} y={ly + 6}
                textAnchor="middle"
                style={{
                  fontFamily: 'Fraunces, serif',
                  fontSize: '11px',
                  fontStyle: 'italic',
                  fill: '#8A7D6A',
                }}
              >{s.root}</text>
              <text
                x={lx} y={ly + 22}
                textAnchor="middle"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '10px',
                  fill: '#A8763E',
                  letterSpacing: '0.04em',
                }}
              >{s.mel}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CycleKey() {
  const items = [
    { mark: 'â—‹', label: 'open' },
    { mark: 'â—', label: 'in progress' },
    { mark: 'âœ“', label: 'gate passed' },
  ];
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8, flexWrap: 'wrap' }}>
      {items.map(it => (
        <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8A7D6A', letterSpacing: '0.06em' }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: '#3E5A3A' }}>{it.mark}</span>
          {it.label}
        </span>
      ))}
    </div>
  );
}

function StageGlyph({ stage, size = 40 }) {
  const meta = stageMeta[stage] || stageMeta.design;
  const stages = ['design', 'operationalise', 'monitor', 'close', 'done'];
  const idx = stages.indexOf(stage);

  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="none" stroke="#D9CDB5" strokeWidth="0.8" strokeDasharray="2 3" />
      {stages.slice(0, 4).map((s, i) => {
        const angle = (i * 90 - 90) * Math.PI / 180;
        const x = 20 + 14 * Math.cos(angle);
        const y = 20 + 14 * Math.sin(angle);
        const isPast = i < idx;
        const isCurrent = i === idx;
        return (
          <circle
            key={s}
            cx={x} cy={y}
            r={isCurrent ? 4 : 3}
            fill={isCurrent ? meta.color : (isPast ? meta.color : '#FFFCF4')}
            stroke={meta.color}
            strokeWidth="0.8"
            opacity={isPast || isCurrent ? 1 : 0.4}
          />
        );
      })}
      <circle cx="20" cy="20" r="2" fill="#3E5A3A" />
    </svg>
  );
}

function BotanicalMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32">
      {/* simple stem with leaves */}
      <path d="M 16 28 Q 16 20 16 8" stroke="#3E5A3A" strokeWidth="1.2" fill="none" />
      <path d="M 16 22 Q 22 20 24 14" stroke="#3E5A3A" strokeWidth="1" fill="none" />
      <path d="M 16 18 Q 10 16 8 10" stroke="#3E5A3A" strokeWidth="1" fill="none" />
      <ellipse cx="23" cy="15" rx="5" ry="2" fill="#3E5A3A" opacity="0.85" transform="rotate(-30 23 15)" />
      <ellipse cx="9" cy="11" rx="5" ry="2" fill="#3E5A3A" opacity="0.85" transform="rotate(30 9 11)" />
      <circle cx="16" cy="6" r="2.5" fill="#A8763E" />
    </svg>
  );
}

// ============================================
// PROJECT VIEW
// ============================================
function ProjectView({ project, update, onBack, onDelete, onMethodology }) {
  const [stage, setStage] = useState(project.stage === 'done' ? 'close' : project.stage);

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 32px 80px' }}>
      {/* Top nav */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ marginLeft: -12 }}>â† All projects</button>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost" onClick={() => exportProjectAsDoc(project)} style={{ fontSize: 12 }}>â†“ Export Project Sheet</button>
          <button className="btn btn-ghost" onClick={onMethodology} style={{ fontSize: 12 }}>About this approach</button>
          <button className="btn btn-ghost" onClick={onDelete} style={{ fontSize: 12, color: '#9C3D2C' }}>Delete</button>
        </div>
      </div>

      {/* Project title */}
      <header style={{ marginBottom: 40 }}>
        <input
          type="text"
          value={project.name}
          onChange={(e) => update(p => ({ ...p, name: e.target.value }))}
          placeholder="Name this projectâ€¦"
          className="display"
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            fontSize: 'clamp(36px, 5.5vw, 56px)',
            lineHeight: 1.05,
            fontWeight: 300,
            padding: 0,
            color: '#2C2A26',
            fontFamily: 'Fraunces, serif',
            fontVariationSettings: '"opsz" 144, "SOFT" 50',
          }}
        />
        <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={project.funder}
            onChange={(e) => update(p => ({ ...p, funder: e.target.value }))}
            placeholder="Funder or programme"
            style={{ maxWidth: 320, fontSize: 14, color: '#5A5249' }}
          />
        </div>
      </header>

      {/* Cycle hub */}
      <div className="no-print" style={{ marginBottom: 56, padding: '12px 0' }}>
        <CycleHub project={project} onSelectStage={(s) => setStage(s)} currentStage={stage} />
        <CycleKey />
      </div>

      {/* Stage content */}
      <div className="fade-up" key={stage}>
        {stage === 'design' && <DesignStage project={project} update={update} onAdvance={() => setStage('operationalise')} />}
        {stage === 'operationalise' && <OperationaliseStage project={project} update={update} onAdvance={() => setStage('monitor')} />}
        {stage === 'monitor' && <MonitorStage project={project} update={update} onAdvance={() => setStage('close')} />}
        {stage === 'close' && <CloseStage project={project} update={update} />}
      </div>
    </div>
  );
}

// ============================================
// STAGE 1: DESIGN
// ============================================
function DesignStage({ project, update, onAdvance }) {
  const setSpice = (patch) => update(p => ({ ...p, spice: { ...p.spice, ...patch } }));
  const setAnchor = (patch) => update(p => ({ ...p, anchor: { ...p.anchor, ...patch } }));
  const setDesign = (patch) => update(p => ({ ...p, design: { ...p.design, ...patch } }));
  const ready = gate1Ready(project);
  const questions = gapQuestions(project);
  const gate = project.gates[1];

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <StageHeader n="01" name="Design" root="Purpose" intent="The brief in plain English. The problem we're responding to, the change we expect, and how we'll know." />

      {/* Stage 0 anchor */}
      <div className="card">
        <SectionLabel>Stage 0 Â· the anchor</SectionLabel>
        <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 400 }}>Strategic alignment</h3>
        <p style={{ marginTop: 0, fontSize: 14, color: '#5A5249', lineHeight: 1.55, marginBottom: 18 }}>
          Before any design work, name how this project sits within the wider organisational strategy. If you can't say which priorities it serves, that's the first question worth answering â€” for the project, and possibly for the strategy.
        </p>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Which organisational strategic priorities does this project serve?</label>
          <textarea
            value={project.anchor.strategicAlignment}
            onChange={(e) => setAnchor({ strategicAlignment: e.target.value })}
            placeholder="e.g. Strand 2 â€” nature-connected youth provision Â· Strand 4 â€” building practitioner network in the East"
          />
        </div>
      </div>

      <StepDivider n="01" title="Purpose & Scope" subtitle="What problem are we actually responding to, and what is this project doing about it?" />

      {/* Problem statement â€” opens Step 1 */}
      <div className="card">
        <SectionLabel>Problem framing</SectionLabel>
        <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 400 }}>The problem statement</h3>
        <p style={{ marginTop: 0, fontSize: 14, color: '#5A5249', lineHeight: 1.55, marginBottom: 18 }}>
          Get the problem framing right and the rest of the design follows. Get it wrong and the whole project drifts toward fixing the wrong thing. Be specific about who experiences it, where, and why current responses fall short.
        </p>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>What problem is this project responding to?</label>
          <textarea
            value={project.design.problemStatement}
            onChange={(e) => setDesign({ problemStatement: e.target.value })}
            placeholder="e.g. Some young people's SEND and regulation needs aren't well met by mainstream classrooms, leading to distress, disrupted learning and exclusion risk. Existing alternatives are limited, costly, or stigmatising."
            style={{ minHeight: 110 }}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>What is this project explicitly NOT doing? (scope boundary)</label>
          <textarea
            value={project.design.scopeBoundary}
            onChange={(e) => setDesign({ scopeBoundary: e.target.value })}
            placeholder="What we might get asked to add but won't â€” keeps us honest"
          />
        </div>
      </div>

      {/* SPICE â€” the project description spine (S, P, I, E) */}
      {SPICE_SECTIONS.map((section) => (
        <div className="card" key={section.letter}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 6 }}>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 56, fontWeight: 300, color: '#A8763E', lineHeight: 1, fontStyle: 'italic' }}>{section.letter}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>{section.name}</h3>
              <span className="hand" style={{ fontSize: 16, color: '#8A7D6A' }}>{section.tagline}</span>
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'grid', gap: 18 }}>
            {section.fields.map(f => (
              <div className="field" key={f.key} style={{ marginBottom: 0 }}>
                <label>{f.label}</label>
                <textarea
                  value={project.spice[f.key] || ''}
                  onChange={(e) => setSpice({ [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <StepDivider n="02" title="The change & how we&rsquo;ll know" subtitle="What change should this project make, what are we assuming, and what will tell us it&rsquo;s working?" />

      {/* The change â€” plain-English Theory of Change */}
      <div className="card">
        <SectionLabel>The change</SectionLabel>
        <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 400 }}>What should this project change?</h3>
        <p style={{ marginTop: 0, fontSize: 14, color: '#5A5249', lineHeight: 1.55, marginBottom: 18 }}>
          The project exists to change something for someone. Be specific about who, and what's different by the end. Plain English is fine â€” short sentences, no jargon.
        </p>

        <div className="field" style={{ marginBottom: 16 }}>
          <label>Is there a Theory of Change document for this project?</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {[{v: 'yes', l: 'Yes'}, {v: 'no', l: 'Not yet'}, {v: 'na', l: 'Not sure / not relevant'}].map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setDesign({ tocDocExists: opt.v })}
                style={{
                  padding: '8px 16px',
                  borderRadius: 2,
                  border: `1px solid ${project.design.tocDocExists === opt.v ? '#3E5A3A' : '#C9BCA5'}`,
                  background: project.design.tocDocExists === opt.v ? '#3E5A3A' : 'transparent',
                  color: project.design.tocDocExists === opt.v ? '#F5EFE3' : '#5A5249',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.15s',
                }}
              >{opt.l}</button>
            ))}
          </div>
        </div>

        {project.design.tocDocExists === 'yes' && (
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Where does it live? (link or location)</label>
            <input
              type="text"
              value={project.design.tocDocLink}
              onChange={(e) => setDesign({ tocDocLink: e.target.value })}
              placeholder="e.g. SharePoint / Strategy folder / Bid document section 3"
            />
          </div>
        )}

        <div className="field" style={{ marginBottom: 16 }}>
          <label>What change should this project make, and for whom?</label>
          <textarea
            value={project.design.expectedChange}
            onChange={(e) => setDesign({ expectedChange: e.target.value })}
            placeholder="e.g. Young people at risk of school exclusion become more able to manage their feelings, feel more part of a group, and have a clearer sense of what they could do next. By the end, more of them are still engaged with education or training six months later."
            style={{ minHeight: 110 }}
          />
          <WhyExpander label="Why this matters">
            This is the project's outcomes pathway in plain English. A Theory of Change describes how activities lead to outputs (what's produced), outcomes (what shifts for people), and impact (longer-term difference). Capturing it here without the jargon means anyone can read it and picture what the project is for.
          </WhyExpander>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>What's the most fragile thing this project depends on?</label>
          <p style={{ fontSize: 12, color: '#8A7D6A', margin: '0 0 8px', lineHeight: 1.5 }}>
            Something that, if it doesn't hold, would derail the project. And how would we spot early that it's breaking?
          </p>
          <textarea
            value={project.design.fragileAssumption}
            onChange={(e) => setDesign({ fragileAssumption: e.target.value })}
            placeholder="e.g. We&rsquo;re relying on one teacher at one school to refer most participants. Watch signal: if referrals slow in week 2, escalate."
            style={{ minHeight: 90 }}
          />
          <WhyExpander label="Why this matters">
            Most projects rest on assumptions that nobody names. Naming the most fragile one â€” and saying what would tell us it's breaking â€” is the assumption-audit move from MEL practice. It turns a hidden risk into something the team can actually watch for.
          </WhyExpander>
        </div>
      </div>

      {/* What will tell us it's working â€” plain-English indicators */}
      <div className="card">
        <SectionLabel>How we&rsquo;ll know</SectionLabel>
        <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 400 }}>What will tell us it&rsquo;s working?</h3>
        <p style={{ marginTop: 0, fontSize: 14, color: '#5A5249', lineHeight: 1.55, marginBottom: 18 }}>
          Pick a small number of things that genuinely matter. A mix of easy-to-count and harder-to-see is best. Two or three is plenty â€” resist the urge to measure everything.
        </p>

        <div className="field" style={{ marginBottom: 16 }}>
          <label>2&ndash;3 things that will tell us this is working</label>
          <textarea
            value={project.design.keyIndicators}
            onChange={(e) => setDesign({ keyIndicators: e.target.value })}
            placeholder={"e.g.\n\u2022 Participants attending more than 8 of 12 sessions\n\u2022 SWEMWBS wellbeing score going up between start and end\n\u2022 Stories from participants and staff about specific moments of change"}
            style={{ minHeight: 130 }}
          />
          <WhyExpander label="Why this matters">
            These are your indicators. Mixing countable indicators (attendance, completion) with harder-to-see evidence (validated tools, observation, stories) gives a fuller picture of change than numbers alone. Keeping the list small means the team will actually look at the data.
          </WhyExpander>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Whose experience might these miss, and how will we check?</label>
          <p style={{ fontSize: 12, color: '#8A7D6A', margin: '0 0 8px', lineHeight: 1.5 }}>
            Group averages can hide who&rsquo;s falling behind, opting out, or staying invisible. Worth naming up front who you&rsquo;ll watch for separately.
          </p>
          <textarea
            value={project.design.whoMightBeMissed}
            onChange={(e) => setDesign({ whoMightBeMissed: e.target.value })}
            placeholder="e.g. Girls and gender-diverse young people are usually under-represented &mdash; will check whether they&rsquo;re being referred and whether their scores move differently. Quieter participants whose distress doesn&rsquo;t show up in behaviour."
            style={{ minHeight: 90 }}
          />
          <WhyExpander label="Why this matters">
            This is the disaggregation question. The point isn&rsquo;t to slice every metric every which way &mdash; it&rsquo;s to pre-commit to checking whose experience the headline numbers might hide. Often that&rsquo;s the most important learning.
          </WhyExpander>
        </div>
      </div>

      {/* Money & reporting */}
      <div className="card">
        <SectionLabel>Money & reporting</SectionLabel>
        <h3 style={{ margin: '0 0 18px', fontSize: 22, fontWeight: 400 }}>The fixed commitments</h3>
        <div className="grid-2">
          <div className="field">
            <label>Total funding</label>
            <input type="text" value={project.spice.fundingAmount} onChange={(e) => setSpice({ fundingAmount: e.target.value })} placeholder="e.g. Â£24,000" />
          </div>
          <div className="field">
            <label>Restricted, unrestricted, or mixed?</label>
            <select value={project.spice.fundingType} onChange={(e) => setSpice({ fundingType: e.target.value })}>
              <option value=""></option>
              <option>Restricted</option>
              <option>Unrestricted</option>
              <option>Mixed</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Reporting deadlines</label>
          <input type="text" value={project.spice.reportingDates} onChange={(e) => setSpice({ reportingDates: e.target.value })} placeholder="e.g. Interim 28 Feb Â· Final 15 May" />
        </div>
        <div className="field">
          <label>Fixed dates we cannot move</label>
          <input type="text" value={project.spice.fixedDates} onChange={(e) => setSpice({ fixedDates: e.target.value })} placeholder="e.g. Must start by 15 Jan" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Grant conditions worth flagging</label>
          <textarea value={project.spice.grantConditions} onChange={(e) => setSpice({ grantConditions: e.target.value })} placeholder="Anything affecting how we deliver or spend" />
        </div>
      </div>

      {questions.length > 0 && (
        <QuestionsForLead questions={questions} />
      )}

      <GatePanel
        n={1}
        title="Gate 1 â€” Design sign-off"
        intent="Is this realistic enough to submit, or to accept?"
        ready={ready}
        gate={gate}
        readyMsg="Problem named, change described, indicators chosen. Sign off and move to Operationalise."
        notReadyMsg="Need: problem Â· S, P, I from SPICE Â· what change Â· what will tell us it&rsquo;s working Â· funding amount Â· reporting dates."
        onPass={() => update(p => ({ ...p, gates: { ...p.gates, 1: { passed: true, date: todayISO(), note: gate.note || 'Approved' } }, stage: p.stage === 'design' ? 'operationalise' : p.stage }))}
        onUpdateNote={(note) => update(p => ({ ...p, gates: { ...p.gates, 1: { ...p.gates[1], note } } }))}
        onAdvance={onAdvance}
      />
    </div>
  );
}

// Expandable "why this matters" â€” quietly reveals the methodology behind a plain-English question
function WhyExpander({ label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
          fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#8A7D6A',
          letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 5,
        }}
      >
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, lineHeight: 1, transform: open ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'inline-block' }}>+</span>
        <span style={{ fontStyle: 'italic' }}>{label || 'why this matters'}</span>
      </button>
      {open && (
        <p className="fade-up" style={{ margin: '6px 0 0', fontSize: 12, color: '#5A5249', lineHeight: 1.6, paddingLeft: 18, borderLeft: '1.5px solid #D9CDB5', fontStyle: 'italic' }}>
          {children}
        </p>
      )}
    </div>
  );
}

// Visual divider marking a Clarity-to-Impact step within a stage
function StepDivider({ n, title, subtitle }) {
  return (
    <div style={{ marginTop: 8, marginBottom: -8, paddingLeft: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 6 }}>
        <span className="hand" style={{ fontSize: 22, color: '#A8763E', fontWeight: 500 }}>Step {n}</span>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontStyle: 'italic', color: '#2C2A26', fontWeight: 400 }}>{title}</span>
      </div>
      {subtitle && <p style={{ margin: 0, fontSize: 13, color: '#8A7D6A', lineHeight: 1.5, maxWidth: 640 }}>{subtitle}</p>}
      <div style={{ height: 1, background: 'linear-gradient(to right, #C9BCA5 0%, #C9BCA5 30%, transparent 100%)', marginTop: 14 }} />
    </div>
  );
}

function QuestionsForLead({ questions }) {
  const [copied, setCopied] = useState(false);
  const text = `These came up while working through the project sheet:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nWould help to lock these down before signing off the design.`;

  return (
    <div className="card" style={{ background: '#FAF1DD', borderColor: '#E8D2A6' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10 }}>
        <span className="hand" style={{ fontSize: 28, color: '#A8763E', lineHeight: 1 }}>?</span>
        <div>
          <SectionLabel style={{ color: '#7A5A1E' }}>Gaps in the brief</SectionLabel>
          <h3 style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 400 }}>Questions for the Project Lead</h3>
        </div>
      </div>
      <p style={{ fontSize: 13, color: '#7A5A1E', marginBottom: 14, lineHeight: 1.5 }}>
        These are pulled from gaps you haven't filled in yet. As you fill the sections above, they disappear. Send these back before signing off Gate 1.
      </p>
      <ol style={{ margin: '0 0 16px', paddingLeft: 22, fontSize: 14, lineHeight: 1.7 }}>
        {questions.map((q, i) => <li key={i} style={{ marginBottom: 4 }}>{q}</li>)}
      </ol>
      <button
        className="btn btn-secondary"
        onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
        style={{ fontSize: 12 }}
      >
        {copied ? 'Copied âœ“' : 'Copy as message'}
      </button>
    </div>
  );
}

// ============================================
// STAGE 2: OPERATIONALISE
// ============================================
function OperationaliseStage({ project, update, onAdvance }) {
  const setOps = (patch) => update(p => ({ ...p, ops: { ...p.ops, ...patch } }));
  const setCheck = (k, v) => update(p => ({ ...p, ops: { ...p.ops, checklist: { ...p.ops.checklist, [k]: v } } }));
  const ready = gate2Ready(project);
  const gate = project.gates[2];
  const priorGatePassed = project.gates[1].passed;

  const items = [
    { key: 'leadsConfirmed',         label: 'Project Lead and Delivery Lead confirmed' },
    { key: 'timetableShared',        label: 'Delivery timetable confirmed and shared with team' },
    { key: 'recruitmentRouteAgreed', label: 'Recruitment route agreed (referral / open / mixed)' },
    { key: 'riskAssessmentsDone',    label: 'Risk assessments confirmed' },
    { key: 'safeguardingBriefed',    label: 'Safeguarding & incident reporting briefed' },
    { key: 'budgetLoaded',           label: 'Budget loaded into tracking' },
    { key: 'spendApprovalSet',       label: 'Spend approval route confirmed' },
  ];
  const done = Object.values(project.ops.checklist).filter(Boolean).length;

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <StageHeader n="02" name="Operationalise" root="People & Plan" intent="Naming names, locking dates, getting ready to begin." />

      <div className="card">
        <SectionLabel>Roles</SectionLabel>
        <h3 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 400 }}>One Accountable</h3>
        <p style={{ marginTop: 0, fontSize: 14, color: '#5A5249', marginBottom: 20 }}>
          Every project needs one person on the hook. Everyone else supports.
        </p>
        <div className="grid-2">
          <div className="field"><label>Project Lead (Accountable)</label><input type="text" value={project.ops.projectLead} onChange={(e) => setOps({ projectLead: e.target.value })} placeholder="Name" /></div>
          <div className="field"><label>Delivery Lead</label><input type="text" value={project.ops.deliveryLead} onChange={(e) => setOps({ deliveryLead: e.target.value })} placeholder="Name" /></div>
          <div className="field"><label>MEL</label><input type="text" value={project.ops.melLead} onChange={(e) => setOps({ melLead: e.target.value })} placeholder="Name" /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Finance</label><input type="text" value={project.ops.financeLead} onChange={(e) => setOps({ financeLead: e.target.value })} placeholder="Name" /></div>
        </div>
      </div>

      <div className="card">
        <SectionLabel>The plan</SectionLabel>
        <h3 style={{ margin: '0 0 18px', fontSize: 22, fontWeight: 400 }}>Schedule & recruitment</h3>
        <div className="field">
          <label>Delivery timetable</label>
          <textarea value={project.ops.timetable} onChange={(e) => setOps({ timetable: e.target.value })} placeholder="Dates, sites, times" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Recruitment route</label>
          <textarea value={project.ops.recruitmentRoute} onChange={(e) => setOps({ recruitmentRoute: e.target.value })} placeholder="Pipeline partners (named, with contact owner)" />
        </div>
      </div>

      <div className="card">
        <SectionLabel>Start-up checklist</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>The non-negotiables</h3>
          <span className="hand" style={{ fontSize: 18, color: '#A8763E' }}>{done} of {items.length}</span>
        </div>
        <p style={{ marginTop: 4, fontSize: 14, color: '#5A5249', marginBottom: 18 }}>All seven needed before delivery starts.</p>
        {items.map(item => (
          <label key={item.key} className="check-row">
            <input type="checkbox" checked={project.ops.checklist[item.key]} onChange={(e) => setCheck(item.key, e.target.checked)} />
            <span>{item.label}</span>
          </label>
        ))}
        <div className="field" style={{ marginTop: 22, marginBottom: 0 }}>
          <label>Anything else specific to this project</label>
          <textarea value={project.ops.notes} onChange={(e) => setOps({ notes: e.target.value })} placeholder="Comms, screening calls, transport, systems setup, etc." />
        </div>
      </div>

      <GatePanel
        n={2}
        title="Gate 2 â€” Ready to deliver"
        intent="Are we genuinely ready to start?"
        ready={ready}
        gate={gate}
        priorGatePassed={priorGatePassed}
        priorGateName="Gate 1 (Design sign-off)"
        readyMsg="All seven essentials ticked. Sign off and begin."
        notReadyMsg="Tick all seven essentials above."
        onPass={() => update(p => ({ ...p, gates: { ...p.gates, 2: { passed: true, date: todayISO(), note: gate.note || 'Ready' } }, stage: p.stage === 'operationalise' ? 'monitor' : p.stage }))}
        onUpdateNote={(note) => update(p => ({ ...p, gates: { ...p.gates, 2: { ...p.gates[2], note } } }))}
        onAdvance={onAdvance}
      />
    </div>
  );
}

// ============================================
// STAGE 3: MONITOR
// ============================================
function MonitorStage({ project, update, onAdvance }) {
  const [adding, setAdding] = useState(false);
  const [addingChange, setAddingChange] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const addCheckIn = (entry) => {
    update(p => ({ ...p, checkIns: [...p.checkIns, { id: `c-${Date.now()}`, ...entry }] }));
    setAdding(false);
  };
  const saveEditedCheckIn = (id, entry) => {
    update(p => ({ ...p, checkIns: p.checkIns.map(c => c.id === id ? { ...c, ...entry } : c) }));
    setEditingId(null);
  };
  const deleteCheckIn = (id) => {
    if (!confirm('Delete this check-in?')) return;
    update(p => ({ ...p, checkIns: p.checkIns.filter(c => c.id !== id) }));
  };
  const addChange = (entry) => {
    update(p => ({ ...p, gates: { ...p.gates, 3: [...p.gates[3], { id: `g3-${Date.now()}`, ...entry }] } }));
    setAddingChange(false);
  };

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <StageHeader n="03" name="Monitor" root="Progress" intent="A light monthly heartbeat. Honest RAG. Actions, not theatre." />

      <div className="card">
        <SectionLabel>Heartbeat</SectionLabel>
        <h3 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 400 }}>Monthly check-ins</h3>
        <p style={{ marginTop: 0, fontSize: 14, color: '#5A5249', marginBottom: 18 }}>
          Ten minutes a month. Not a status report â€” a chance to be honest about what's working and what isn't.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add check-in</button>
          <button className="btn btn-secondary" onClick={() => setAddingChange(true)}>Log a material change</button>
        </div>
        <p style={{ fontSize: 12, color: '#8A7D6A', marginTop: 14, lineHeight: 1.55, marginBottom: 0 }}>
          Material change = anything affecting time, cost, scope, safeguarding, or reporting. Most months you won't need this. That's fine â€” that's the point.
        </p>
      </div>

      {adding && <CheckInForm onSave={addCheckIn} onCancel={() => setAdding(false)} />}
      {addingChange && <ChangeForm onSave={addChange} onCancel={() => setAddingChange(false)} />}

      {project.checkIns.length > 0 && (
        <div>
          <SectionLabel style={{ marginLeft: 4, marginBottom: 14 }}>Log</SectionLabel>
          <div style={{ display: 'grid', gap: 12 }}>
            {[...project.checkIns].reverse().map(ci =>
              editingId === ci.id
                ? <CheckInForm key={ci.id} initial={ci} onSave={(entry) => saveEditedCheckIn(ci.id, entry)} onCancel={() => setEditingId(null)} />
                : <CheckInCard key={ci.id} ci={ci} onEdit={() => setEditingId(ci.id)} onDelete={() => deleteCheckIn(ci.id)} />
            )}
          </div>
        </div>
      )}

      {project.gates[3].length > 0 && (
        <div>
          <SectionLabel style={{ marginLeft: 4, marginBottom: 14, color: '#A8763E' }}>Material changes</SectionLabel>
          <div style={{ display: 'grid', gap: 12 }}>
            {[...project.gates[3]].reverse().map(c => <ChangeCard key={c.id} change={c} />)}
          </div>
        </div>
      )}

      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 500 }}>Delivery wrapping up?</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#5A5249' }}>Move to Close & Learn when sessions are done.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { update(p => ({ ...p, stage: 'close' })); onAdvance(); }}>Move to Close & Learn â†’</button>
      </div>
    </div>
  );
}

function CheckInForm({ onSave, onCancel, initial }) {
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [ragDelivery, setRagDelivery] = useState(initial?.ragDelivery ?? 'G');
  const [ragFinance, setRagFinance] = useState(initial?.ragFinance ?? 'G');
  const [working, setWorking] = useState(initial?.working ?? '');
  const [notWorking, setNotWorking] = useState(initial?.notWorking ?? '');
  const [risks, setRisks] = useState(initial?.risks ?? '');
  const [actions, setActions] = useState(initial?.actions ?? '');

  return (
    <div className="card fade-up" style={{ borderColor: '#3E5A3A', borderWidth: 1 }}>
      <SectionLabel>{initial ? 'Edit check-in' : 'New check-in'}</SectionLabel>
      <div className="grid-2">
        <div className="field"><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div />
        <RAGControl label="Delivery" value={ragDelivery} onChange={setRagDelivery} />
        <RAGControl label="Finance" value={ragFinance} onChange={setRagFinance} />
      </div>
      <div className="field"><label>What's working</label><textarea value={working} onChange={(e) => setWorking(e.target.value)} /></div>
      <div className="field"><label>What's not</label><textarea value={notWorking} onChange={(e) => setNotWorking(e.target.value)} /></div>
      <div className="field"><label>Key risks (top 2-3)</label><textarea value={risks} onChange={(e) => setRisks(e.target.value)} /></div>
      <div className="field" style={{ marginBottom: 18 }}><label>Actions for next month</label><textarea value={actions} onChange={(e) => setActions(e.target.value)} placeholder="One per line â€” owner + due date" /></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={() => onSave({ date, ragDelivery, ragFinance, working, notWorking, risks, actions })}>{initial ? 'Save changes' : 'Save check-in'}</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function RAGControl({ label, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        {['G', 'A', 'R'].map(r => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            style={{
              flex: 1,
              padding: '11px 10px',
              border: 'none',
              borderRadius: 2,
              cursor: 'pointer',
              fontFamily: 'Fraunces, serif',
              fontSize: 14,
              fontStyle: 'italic',
              background: value === r ? ragMeta[r].color : ragMeta[r].bg,
              color: value === r ? '#F5EFE3' : ragMeta[r].color,
              transition: 'all 0.15s',
            }}
          >
            {ragMeta[r].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckInCard({ ci, onEdit, onDelete }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
        <strong style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 400 }}>{ci.date}</strong>
        <span className="pill" style={{ background: ragMeta[ci.ragDelivery]?.bg, color: ragMeta[ci.ragDelivery]?.color }}>
          Delivery · {ragMeta[ci.ragDelivery]?.label}
        </span>
        <span className="pill" style={{ background: ragMeta[ci.ragFinance]?.bg, color: ragMeta[ci.ragFinance]?.color }}>
          Finance · {ragMeta[ci.ragFinance]?.label}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onEdit} style={{ fontSize: 12, padding: '4px 10px' }}>Edit</button>
          <button className="btn btn-ghost" onClick={onDelete} style={{ fontSize: 12, padding: '4px 10px', color: '#9C3D2C' }}>Delete</button>
        </div>
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.6, display: 'grid', gap: 8 }}>
        {ci.working && <Detail label="Working" tone="green">{ci.working}</Detail>}
        {ci.notWorking && <Detail label="Not working" tone="rust">{ci.notWorking}</Detail>}
        {ci.risks && <Detail label="Risks">{ci.risks}</Detail>}
        {ci.actions && <Detail label="Actions">{ci.actions}</Detail>}
      </div>
    </div>
  );
}

function Detail({ label, tone, children }) {
  const colors = { green: '#3E5A3A', rust: '#9C3D2C', default: '#5A5249' };
  return (
    <div>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors[tone] || colors.default, marginRight: 8 }}>{label}</span>
      <span style={{ whiteSpace: 'pre-wrap' }}>{children}</span>
    </div>
  );
}

function ChangeForm({ onSave, onCancel }) {
  const [date, setDate] = useState(todayISO());
  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');
  const [impact, setImpact] = useState('');
  const [approvedBy, setApprovedBy] = useState('');

  return (
    <div className="card fade-up" style={{ borderColor: '#A8763E', background: '#FAF1DD' }}>
      <SectionLabel style={{ color: '#7A5A1E' }}>Material change Â· Gate 3</SectionLabel>
      <h3 style={{ margin: '4px 0 12px', fontSize: 22, fontWeight: 400 }}>Something has shifted</h3>
      <p style={{ marginTop: 0, fontSize: 14, color: '#7A5A1E', marginBottom: 18 }}>
        Used only for changes affecting time, cost, scope, safeguarding, or reporting. The point is to make drift visible, not punishable.
      </p>
      <div className="grid-2">
        <div className="field"><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field"><label>Approved by</label><input type="text" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="e.g. Programme Director" /></div>
      </div>
      <div className="field"><label>What changed</label><textarea value={what} onChange={(e) => setWhat(e.target.value)} /></div>
      <div className="field"><label>Why</label><textarea value={why} onChange={(e) => setWhy(e.target.value)} /></div>
      <div className="field" style={{ marginBottom: 18 }}><label>Impact on time, cost, scope</label><textarea value={impact} onChange={(e) => setImpact(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" disabled={!what.trim()} onClick={() => onSave({ date, what, why, impact, approvedBy })}>Log change</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ChangeCard({ change }) {
  return (
    <div className="card" style={{ padding: 20, background: '#FAF1DD', borderColor: '#E8D2A6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <strong style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 400 }}>{change.date}</strong>
        {change.approvedBy && <span style={{ fontSize: 12, color: '#7A5A1E' }}>Â· approved by {change.approvedBy}</span>}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.6, display: 'grid', gap: 7 }}>
        <Detail label="Changed" tone="rust">{change.what}</Detail>
        {change.why && <Detail label="Why">{change.why}</Detail>}
        {change.impact && <Detail label="Impact">{change.impact}</Detail>}
      </div>
    </div>
  );
}

// ============================================
// STAGE 4: CLOSE & LEARN
// ============================================
function CloseStage({ project, update }) {
  const setClose = (patch) => update(p => ({ ...p, close: { ...p.close, ...patch } }));
  const setEC = (k, v) => update(p => ({ ...p, close: { ...p.close, endChecklist: { ...p.close.endChecklist, [k]: v } } }));
  const ready = gate4Ready(project);
  const gate = project.gates[4];

  const items = [
    { key: 'deliveryComplete',  label: 'Delivery complete (or exceptions documented)' },
    { key: 'reportSubmitted',   label: 'Funder report(s) submitted' },
    { key: 'budgetReconciled',  label: 'Budget reconciled, restricted funds compliant' },
    { key: 'evidenceFiled',     label: 'Evidence filed (data, photos with consent, feedback)' },
    { key: 'learningCaptured',  label: 'Honest learning captured below' },
  ];

  // Pull what was said in Stage 1, so the user is reflecting against actual commitments
  const stage1 = {
    problem: project.design.problemStatement,
    change: project.design.expectedChange,
    indicators: project.design.keyIndicators,
    fragile: project.design.fragileAssumption,
    missed: project.design.whoMightBeMissed,
  };

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <StageHeader n="04" name="Close & Learn" root="Performance" intent="Look back honestly at what you said you'd do, then carry the learning forward." />

      {/* PHASE 1 â€” LOOKING BACK */}
      <StepDivider n="A" title="Looking back" subtitle="For each thing you committed to in Stage 1, what actually happened? Be honest â€” the workbook only earns its keep if this section does." />

      {/* The numbers â€” paired against Stage 1 commitments */}
      <div className="card">
        <SectionLabel>The numbers</SectionLabel>
        <h3 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 400 }}>Delivered vs promised</h3>
        <p style={{ marginTop: 0, fontSize: 14, color: '#5A5249', marginBottom: 20 }}>
          The headline figures. Variance is fine â€” what matters is the honest number with a brief explanation later.
        </p>
        <div className="grid-2">
          <div className="field"><label>Sessions promised</label><input type="text" value={project.close.sessionsPromised} onChange={(e) => setClose({ sessionsPromised: e.target.value })} /></div>
          <div className="field"><label>Sessions delivered</label><input type="text" value={project.close.sessionsDelivered} onChange={(e) => setClose({ sessionsDelivered: e.target.value })} /></div>
          <div className="field"><label>Participants promised</label><input type="text" value={project.close.participantsPromised} onChange={(e) => setClose({ participantsPromised: e.target.value })} /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Participants engaged</label><input type="text" value={project.close.participantsEngaged} onChange={(e) => setClose({ participantsEngaged: e.target.value })} /></div>
        </div>
      </div>

      {/* Mirror â€” the problem */}
      <MirrorBlock
        label="The problem"
        promiseLabel="The problem we said we were responding to"
        promise={stage1.problem}
        question="Did our framing of the problem hold up?"
        hint="Once we got into delivery, did the problem look like we thought it did? Or did the real picture turn out to be different?"
        value={project.close.problemReflection}
        onChange={(v) => setClose({ problemReflection: v })}
        placeholder="e.g. The problem was sharper than we expected. The young people we worked with didn't just struggle in mainstream &mdash; many had already disengaged completely. The pitch needed adjusting on day one."
      />

      {/* Mirror â€” the change */}
      <MirrorBlock
        label="The change"
        promiseLabel="The change we said we'd make"
        promise={stage1.change}
        question="Did that change actually happen? For whom?"
        hint="Be honest about what shifted, what didn't, and for which people. Different participants often have very different journeys &mdash; that's worth naming."
        value={project.close.changeReflection}
        onChange={(v) => setClose({ changeReflection: v })}
        placeholder="e.g. Most participants showed real shifts in confidence and group belonging. The 'still in education at 6 months' outcome held for 7 of 10. For two young people, the change was much smaller &mdash; both had situations outside our control going on at home."
      />

      {/* Mirror â€” the indicators */}
      <MirrorBlock
        label="What we said we'd watch"
        promiseLabel="The 2&ndash;3 things we said would tell us it's working"
        promise={stage1.indicators}
        question="What did the numbers, observations and stories actually tell us?"
        hint="Bring in all three kinds of evidence you have &mdash; the easy-to-count stuff, the observations from delivery, and any specific stories or quotes worth holding onto."
        value={project.close.indicatorsReflection}
        onChange={(v) => setClose({ indicatorsReflection: v })}
        placeholder={"e.g.\n\u2022 Attendance: 8 of 10 completed >8 sessions (better than expected given the cohort)\n\u2022 SWEMWBS: 6 of 8 who completed both pre & post showed score increase, 2 declined\n\u2022 Story: J. asked to bring her younger brother in week 5 \u2014 said it was the first place she'd felt like she could relax enough to share something good"}
        moreLines
      />

      {/* Mirror â€” the fragile assumption */}
      <MirrorBlock
        label="The fragile thing"
        promiseLabel="The most fragile thing we said this project depended on"
        promise={stage1.fragile}
        question="Did it hold? What actually happened?"
        hint="This is the one to be especially honest about &mdash; whether the worry came true tells us a lot about how to design the next one."
        value={project.close.fragileAssumptionReflection}
        onChange={(v) => setClose({ fragileAssumptionReflection: v })}
        placeholder="e.g. It half-held. Referrals from the named teacher came through fine for cohort 1, but when she went on sick leave in October we couldn't fill cohort 2. Lesson: never let referrals depend on one named person."
      />

      {/* Mirror â€” who might have been missed */}
      <MirrorBlock
        label="Whose experience"
        promiseLabel="Who we said we'd watch wasn't getting missed"
        promise={stage1.missed}
        question="What did we find when we checked?"
        hint="Did the people we worried might get missed actually get reached? Did anyone else get missed that we hadn't thought of?"
        value={project.close.missedReflection}
        onChange={(v) => setClose({ missedReflection: v })}
        placeholder="e.g. Girls were under-referred as predicted (only 2 of 10). The two we did have showed slightly smaller score gains &mdash; worth checking with them what would have made it better. Surprise: an older sibling pattern we hadn't seen coming."
      />

      {/* Budget */}
      <div className="card">
        <SectionLabel>Money</SectionLabel>
        <h3 style={{ margin: '0 0 18px', fontSize: 22, fontWeight: 400 }}>Budget headline</h3>
        <div className="grid-2">
          <div className="field"><label>Budget total</label><input type="text" value={project.close.budgetTotal} onChange={(e) => setClose({ budgetTotal: e.target.value })} placeholder="Â£" /></div>
          <div className="field"><label>Actual spend</label><input type="text" value={project.close.budgetActual} onChange={(e) => setClose({ budgetActual: e.target.value })} placeholder="Â£" /></div>
        </div>
        <div className="field" style={{ marginBottom: 0 }}><label>Variance &mdash; one or two lines</label><textarea value={project.close.budgetVariance} onChange={(e) => setClose({ budgetVariance: e.target.value })} placeholder="e.g. Underspend of \u00a31,200 \u2014 lower transport costs as fewer cohort-2 sessions ran." /></div>
      </div>

      {/* PHASE 2 â€” LESSONS FORWARD */}
      <StepDivider n="B" title="Lessons forward" subtitle="Now lift up &mdash; what does this whole project tell us about how to do the next one better?" />

      <div className="card" style={{ background: '#F0E8D5' }}>
        <SectionLabel>Honest learning</SectionLabel>
        <h3 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 400 }}>Fifteen minutes for next time</h3>
        <p style={{ marginTop: 0, fontSize: 14, color: '#5A5249', marginBottom: 22, lineHeight: 1.55 }}>
          The point is not to look good. The point is to make the next bid stronger and the next delivery sharper. Brief is better than blank.
        </p>

        <div className="field">
          <label>What surprised us?</label>
          <p style={{ fontSize: 12, color: '#8A7D6A', margin: '0 0 8px', lineHeight: 1.5 }}>
            The stuff we genuinely didn't see coming &mdash; for better or worse. Often the most useful part of the whole project.
          </p>
          <textarea
            value={project.close.surprised}
            onChange={(e) => setClose({ surprised: e.target.value })}
            placeholder="e.g. The unexpected mid-week visit from past participants who wanted to drop in. Suggests we should plan for an alumni link in the next round."
            style={{ minHeight: 90 }}
          />
        </div>

        <div className="field">
          <label>What would we do differently next time?</label>
          <p style={{ fontSize: 12, color: '#8A7D6A', margin: '0 0 8px', lineHeight: 1.5 }}>
            Specific, actionable changes &mdash; not "communicate better" but "set up the WhatsApp group in week 1, not week 4".
          </p>
          <textarea
            value={project.close.whatToDoDifferently}
            onChange={(e) => setClose({ whatToDoDifferently: e.target.value })}
            placeholder={"e.g.\n\u2022 Spread referral relationships across 3 schools, not 1\n\u2022 Build in alumni drop-in sessions from week 4 onwards\n\u2022 Do a baseline conversation, not just a baseline form"}
            style={{ minHeight: 110 }}
          />
          <WhyExpander label="Why this matters">
            This is the difference between single-loop learning (we did the same thing better) and double-loop learning (we questioned what we were doing). Both are valuable. Naming specific changes turns reflection into something the next bid or delivery cycle can actually use.
          </WhyExpander>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>What assumptions in the original bid would we revise?</label>
          <p style={{ fontSize: 12, color: '#8A7D6A', margin: '0 0 8px', lineHeight: 1.5 }}>
            Things we said in the bid that turned out to be wrong, optimistic, or based on a different reality. Naming them now makes the next bid sharper.
          </p>
          <textarea
            value={project.close.bidLessons}
            onChange={(e) => setClose({ bidLessons: e.target.value })}
            placeholder="e.g. We costed 1 staff member per session; we needed 2 for safety with this cohort. Sessions took 30 minutes longer than scheduled. Recruitment lead time was understated by about 6 weeks."
            style={{ minHeight: 90 }}
          />
        </div>
      </div>

      {/* End checklist */}
      <div className="card">
        <SectionLabel>End checklist</SectionLabel>
        <h3 style={{ margin: '0 0 18px', fontSize: 22, fontWeight: 400 }}>Five things needed to close</h3>
        {items.map(item => (
          <label key={item.key} className="check-row">
            <input type="checkbox" checked={project.close.endChecklist[item.key]} onChange={(e) => setEC(item.key, e.target.checked)} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <GatePanel
        n={4}
        title="Gate 4 &mdash; Project complete"
        intent="Reports submitted, finance reconciled, learning captured."
        ready={ready}
        gate={gate}
        priorGatePassed={project.gates[2].passed}
        priorGateName="Gate 2 (Ready to deliver)"
        readyMsg="All five items checked. Sign off and archive."
        notReadyMsg="Tick all five end-checklist items above."
        finalGate
        onPass={() => update(p => ({ ...p, gates: { ...p.gates, 4: { passed: true, date: todayISO(), note: gate.note || 'Complete' } }, stage: 'done' }))}
        onUpdateNote={(note) => update(p => ({ ...p, gates: { ...p.gates, 4: { ...p.gates[4], note } } }))}
      />
    </div>
  );
}

// MirrorBlock â€” pairs a Stage 1 commitment with a "what happened" reflection
function MirrorBlock({ label, promiseLabel, promise, question, hint, value, onChange, placeholder, moreLines }) {
  const hasPromise = promise && promise.trim();
  return (
    <div className="card">
      <SectionLabel>{label}</SectionLabel>

      {/* What was said in Stage 1 â€” pulled forward, shown but not editable here */}
      <div style={{
        background: '#F5EFE3',
        border: '1px solid #D9CDB5',
        borderRadius: 3,
        padding: '14px 18px',
        marginBottom: 18,
        borderLeft: '3px solid #A8763E',
      }}>
        <div style={{ fontSize: 10, color: '#8A7D6A', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 500 }}>
          {promiseLabel}
        </div>
        {hasPromise ? (
          <div style={{ fontSize: 14, color: '#3D3933', lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
            "{promise}"
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#A39685', fontStyle: 'italic' }}>
            Nothing was captured for this in Stage 1.
          </div>
        )}
      </div>

      {/* What happened */}
      <div className="field" style={{ marginBottom: 0 }}>
        <label>{question}</label>
        <p style={{ fontSize: 12, color: '#8A7D6A', margin: '0 0 8px', lineHeight: 1.5 }}>
          {hint}
        </p>
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ minHeight: moreLines ? 140 : 100 }}
        />
      </div>
    </div>
  );
}

// ============================================
// SHARED
// ============================================
function StageHeader({ n, name, root, intent }) {
  return (
    <div className="fade-up">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginBottom: 8 }}>
        <span className="hand" style={{ fontSize: 28, color: '#A8763E' }}>{n}</span>
        <h2 style={{ margin: 0, fontSize: 36, fontWeight: 300, fontStyle: 'italic' }}>{name}</h2>
        <span style={{ fontSize: 12, color: '#8A7D6A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{root}</span>
      </div>
      <p style={{ margin: 0, fontSize: 17, color: '#5A5249', maxWidth: 640, lineHeight: 1.5 }}>{intent}</p>
      <div className="divider" />
    </div>
  );
}

function SectionLabel({ children, style }) {
  return <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#A8763E', marginBottom: 6, ...style }}>{children}</div>;
}

function GatePanel({ n, title, intent, ready, gate, priorGatePassed, priorGateName, readyMsg, notReadyMsg, onPass, onUpdateNote, onAdvance, finalGate }) {
  const passed = gate.passed;
  const [confirmOverride, setConfirmOverride] = useState(false);
  // priorGatePassed defaults to true if not provided (Gate 1 has no prior)
  const priorOk = priorGatePassed === undefined ? true : priorGatePassed;
  const wantsToPass = ready && !passed;
  const blocked = wantsToPass && !priorOk;

  const bg = passed ? '#DCE5D2' : ready ? (blocked ? '#FAF1DD' : '#E5EBD8') : '#F0E8D5';
  const border = passed ? '#3E5A3A' : ready ? (blocked ? '#A8763E' : '#7A9A6E') : '#D9CDB5';

  return (
    <div className="card" style={{ background: bg, borderColor: border, borderWidth: 1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span className="hand" style={{ fontSize: 32, color: passed ? '#3E5A3A' : (blocked ? '#A8763E' : '#A8763E'), lineHeight: 1 }}>
          {passed ? 'âœ“' : (blocked ? '!' : (ready ? 'â—‹' : 'â—Œ'))}
        </span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>{title}</h3>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#5A5249' }}>{intent}</p>
        </div>
        {passed && <span className="pill" style={{ background: '#3E5A3A', color: '#F5EFE3' }}>Passed Â· {gate.date}</span>}
      </div>

      <div style={{ marginTop: 16 }}>
        {passed ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="text" value={gate.note} onChange={(e) => onUpdateNote(e.target.value)} placeholder="Sign-off note" style={{ flex: 1, minWidth: 220, background: '#FFFCF4' }} />
            {onAdvance && !finalGate && <button className="btn btn-secondary" onClick={onAdvance}>Continue â†’</button>}
          </div>
        ) : blocked && !confirmOverride ? (
          <div>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#7A5A1E', lineHeight: 1.55 }}>
              <strong style={{ fontWeight: 500 }}>{priorGateName} hasn't been passed yet.</strong> The methodology asks you to sign that off first â€” it's the discipline that stops projects moving forward before they're ready. You can pass anyway if you have a good reason (e.g. back-filling documentation), but consider going back first.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmOverride(true)}>Pass anyway</button>
            </div>
          </div>
        ) : ready ? (
          <div>
            {blocked && confirmOverride && (
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#7A5A1E', fontStyle: 'italic' }}>
                Overriding â€” {priorGateName} not passed. Add a note explaining why.
              </p>
            )}
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#3E5A3A', fontStyle: 'italic' }}>{readyMsg}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={gate.note}
                onChange={(e) => onUpdateNote(e.target.value)}
                placeholder={blocked ? "Why are you skipping the prior gate?" : "Sign-off note (e.g. 'Approved by Programme Director')"}
                style={{ flex: 1, minWidth: 240, background: '#FFFCF4' }}
              />
              <button className="btn btn-primary" onClick={onPass}>Pass Gate {n}</button>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: '#5A5249', fontStyle: 'italic' }}>{notReadyMsg}</p>
        )}
      </div>
    </div>
  );
}

function LockedStage({ stage, requires }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '64px 32px' }}>
      <div className="hand" style={{ fontSize: 48, color: '#C9BCA5', marginBottom: 12 }}>â€”</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 400, fontStyle: 'italic' }}>{stage} is closed for now</h3>
      <p style={{ margin: 0, fontSize: 14, color: '#5A5249' }}>Pass {requires} first to open this stage.</p>
    </div>
  );
}

// ============================================
// METHODOLOGY PAGE
// ============================================
function Methodology({ onBack }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 32px 80px' }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginLeft: -12, marginBottom: 24 }}>â† Back</button>

      <div style={{ marginBottom: 8 }}>
        <SectionLabel>The thinking behind it</SectionLabel>
      </div>
      <h1 style={{ fontSize: 'clamp(40px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 300, margin: '0 0 24px' }}>
        About this approach
      </h1>
      <p style={{ fontSize: 18, color: '#5A5249', lineHeight: 1.6, marginBottom: 12 }}>
        This workbook isn't a methodology â€” it's a practical project structure shaped by three strands of thinking:
      </p>
      <p style={{ fontSize: 16, color: '#5A5249', lineHeight: 1.65, marginBottom: 40, fontStyle: 'italic' }}>
        Project management discipline. Outcome-thinking. And a structure that makes both useable for small teams running real work in the real world.
      </p>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 26, fontWeight: 400, fontStyle: 'italic', margin: '0 0 12px' }}>Root 5 <span style={{ fontSize: 14, color: '#8A7D6A', fontStyle: 'normal' }}>â€” Tearfund</span></h2>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65 }}>
          Five ideas every project needs to hold together â€” <em>Purpose, People, Plan, Progress, Performance.</em> Tearfund developed Root 5 as a way of giving charity teams without dedicated project managers a shared language for their work. The four stages of this workbook map onto the last four. Stage 0 â€” Strategy â€” anchors the whole cycle, holding Purpose.
        </p>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 26, fontWeight: 400, fontStyle: 'italic', margin: '0 0 12px' }}>SPICE <span style={{ fontSize: 14, color: '#8A7D6A', fontStyle: 'normal' }}>â€” a way of describing a project</span></h2>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65, marginBottom: 12 }}>
          A simple frame for describing a project so that anyone picking up the brief can picture what it actually is. Five letters, five answers:
        </p>
        <ul style={{ fontSize: 15, lineHeight: 1.85, color: '#3D3933', paddingLeft: 24 }}>
          <li><strong>Setting</strong> â€” where it runs and why it matters</li>
          <li><strong>Population</strong> â€” who it's for and how they join</li>
          <li><strong>Intervention</strong> â€” what we deliver</li>
          <li><strong>Change</strong> â€” what should improve, and how we'll know</li>
          <li><strong>Effect</strong> â€” the longer-term difference</li>
        </ul>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65, marginTop: 12 }}>
          SPICE forms the spine of Stage 1 (Design). If you can't fill in SPICE, you don't yet have a project â€” you have an idea.
        </p>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 26, fontWeight: 400, fontStyle: 'italic', margin: '0 0 12px' }}>
          Clarity-to-ImpactÂ® <span style={{ fontSize: 14, color: '#8A7D6A', fontStyle: 'normal' }}>â€” Ann-Murray Brown</span>
        </h2>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65, marginBottom: 12 }}>
          Clarity-to-ImpactÂ® is a registered MEL methodology developed by Ann-Murray Brown, used by practitioners across UN agencies, INGOs and foundations. It moves teams from <em>activity tracking</em> ("we ran 12 sessions") to <em>showing evidence of change</em> ("here's what shifted, for whom, and how we know").
        </p>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65, marginBottom: 12 }}>
          I trained in this programme and the tool you're using here reflects what I took from it â€” particularly:
        </p>
        <ul style={{ fontSize: 15, lineHeight: 1.85, color: '#3D3933', paddingLeft: 24 }}>
          <li>getting the problem statement right before designing the response</li>
          <li>using a Theory of Change to name assumptions, not just outcomes</li>
          <li>choosing indicators that show who is benefiting â€” not just how many people attended</li>
          <li>using complexity-aware methods (like Most Significant Change) alongside metrics, to capture what didn't fit the plan</li>
          <li>distinguishing single-loop learning (process improvements) from double-loop learning (questioning the assumption underneath)</li>
        </ul>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65, marginTop: 12 }}>
          This workbook is not Clarity-to-ImpactÂ®. It's a project management shell shaped <em>by</em> that training, designed for teams that don't yet have a dedicated MEL system but want their work to lead somewhere they can describe honestly.
        </p>
        <p style={{ fontSize: 13, color: '#8A7D6A', lineHeight: 1.6, marginTop: 18 }}>
          Clarity-to-ImpactÂ® is a registered trademark of Ann-Murray Brown. More about the programme at <a href="https://www.annmurraybrown.com/claritytoimpact" target="_blank" rel="noreferrer" style={{ color: '#3E5A3A' }}>annmurraybrown.com/claritytoimpact</a>.
        </p>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 26, fontWeight: 400, fontStyle: 'italic', margin: '0 0 12px' }}>Why gates</h2>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65 }}>
          Charity projects fail quietly. Funding gets accepted before anyone checks delivery is realistic. Delivery starts before the team is ready. Reports go in late because nobody owns them. Gates aren't bureaucracy â€” they're the moments to honestly answer one question and not move on until you can. Four gates. Three forced (1, 2, 4). One that only fires if something material shifts (Gate 3). If nothing material changes during delivery, you never see Gate 3, and that's exactly right.
        </p>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 26, fontWeight: 400, fontStyle: 'italic', margin: '0 0 12px' }}>Why MEL is everywhere, not just at the end</h2>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65, marginBottom: 12 }}>
          Most charity tools treat monitoring and evaluation as something that happens after delivery â€” a panicked scramble to assemble evidence in time for the funder report. That's a structural mistake. By then the data isn't there to gather; it was there to design <em>for</em>, six months earlier.
        </p>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65, marginBottom: 12 }}>
          So this workbook puts MEL into every stage:
        </p>
        <ul style={{ fontSize: 15, lineHeight: 1.85, color: '#3D3933', paddingLeft: 24 }}>
          <li>Stage 1 â€” outcome thinking and assumptions, not just activities</li>
          <li>Stage 2 â€” indicators, baselines, and who collects what</li>
          <li>Stage 3 â€” evidence and surprise, not just status</li>
          <li>Stage 4 â€” single-loop and double-loop learning that actually feeds into the next bid</li>
        </ul>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65, marginTop: 12, fontStyle: 'italic' }}>
          A well-designed MEL framework only works if the wider organisational system around it works. The discipline of project management â€” gates, ownership, honest check-ins, learning loops â€” is what makes MEL practical for small teams. That's what this is.
        </p>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 26, fontWeight: 400, fontStyle: 'italic', margin: '0 0 12px' }}>Where this is heading</h2>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65, marginBottom: 12 }}>
          This version is intentionally lightweight and designed for single-user testing.
        </p>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65, marginBottom: 12 }}>
          Future versions could include:
        </p>
        <ul style={{ fontSize: 15, lineHeight: 1.85, color: '#3D3933', paddingLeft: 24 }}>
          <li>shared team projects,</li>
          <li>partner collaboration,</li>
          <li>document upload and auto-fill,</li>
          <li>and stronger reporting/export tools.</li>
        </ul>
        <p style={{ fontSize: 15, color: '#3D3933', lineHeight: 1.65, marginTop: 12 }}>
          The aim is not to create a heavy system, but to reduce duplication and make good project information easier to carry through the whole lifecycle.
        </p>
      </section>

      <div className="divider" />

      <p style={{ fontSize: 13, color: '#8A7D6A', fontStyle: 'italic' }}>
        The system serves the team, not the other way round. Edit it if it doesn't fit.
      </p>
    </div>
  );
}

