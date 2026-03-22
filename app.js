/* ============================================ */
/* BPMN Process Designer — Main App Logic v2     */
/* Fixed NLP parser + in-canvas editing          */
/* ============================================ */

let currentStep = 1;

// ===== STEP NAVIGATION =====
function goToStep(step) {
    currentStep = step;
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    document.querySelectorAll('.step-item').forEach(s => {
        const sn = parseInt(s.dataset.step);
        s.classList.remove('active', 'completed');
        if (sn === step) s.classList.add('active');
        else if (sn < step) s.classList.add('completed');
    });
    if (step === 3) BPMNEditor.init();
}

// ===== STEP 1: ANALYZE PROCESS =====
function analyzeProcess() {
    const desc = document.getElementById('processDesc').value.trim();
    if (!desc) { alert('Vui lòng nhập mô tả quy trình.'); return; }
    const steps = parseDescription(desc);
    renderLogicTable(steps);
    goToStep(2);
}

// ===== NLP PARSER v2 — Fixed condition detection =====
function parseDescription(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const steps = [];
    const condKeywords = /^(nếu|if|khi|when|trường hợp|trong trường hợp)\s+/i;

    // Known actors (sorted by length desc to match longest first)
    const knownActors = [
        'Nhân viên bán hàng', 'Đơn vị vận chuyển', 'Nhà cung cấp',
        'Bộ phận kế toán', 'Bộ phận kho', 'Phòng nhân sự',
        'Nhân viên', 'Khách hàng', 'Quản lý', 'Hệ thống',
        'Kế toán', 'Giám đốc', 'Admin', 'User', 'Manager',
        'Customer', 'System', 'Shipper', 'Kho', 'Bộ phận'
    ];

    let lastActor = 'Hệ thống';

    lines.forEach(line => {
        // Remove line numbers like "1." or "1)"
        line = line.replace(/^\d+[\.\)]\s*/, '');

        let actor = '', action = '', condition = '';

        // CASE 1: "Nếu xxx: Actor verb yyy" or "Nếu xxx: verb yyy"
        const condColonMatch = line.match(/^(nếu|if|khi|when|trường hợp)\s+([^:]+):\s*(.+)$/i);
        if (condColonMatch) {
            condition = condColonMatch[1] + ' ' + condColonMatch[2].trim();
            const rest = condColonMatch[3].trim();
            const aa = extractActorAction(rest, knownActors, lastActor);
            actor = aa.actor;
            action = aa.action;
            if (actor) lastActor = actor;
            steps.push({ actor, action, condition });
            return;
        }

        // CASE 2: "Nếu xxx, verb yyy" (no colon)
        if (condKeywords.test(line)) {
            condition = line;
            actor = lastActor;
            action = line;
            steps.push({ actor, action, condition });
            return;
        }

        // CASE 3: "Actor: Action" format
        const colonMatch = line.match(/^([^:]+):(.+)$/);
        if (colonMatch) {
            const prefix = colonMatch[1].trim();
            const rest = colonMatch[2].trim();
            // Check if prefix is a known actor
            const isActor = knownActors.some(a => a.toLowerCase() === prefix.toLowerCase());
            if (isActor) {
                actor = prefix;
                action = rest;
            } else {
                // prefix might be a condition or unknown actor
                actor = prefix;
                action = rest;
            }
        } else {
            // CASE 4: Try to detect "Actor verb Object"
            const aa = extractActorAction(line, knownActors, lastActor);
            actor = aa.actor;
            action = aa.action;
        }

        if (!actor) actor = lastActor;
        if (actor) lastActor = actor;
        if (action) steps.push({ actor, action, condition });
    });

    return steps;
}

function extractActorAction(text, knownActors, fallback) {
    // Try matching known actors at start of text
    for (const actor of knownActors) {
        if (text.toLowerCase().startsWith(actor.toLowerCase())) {
            const rest = text.substring(actor.length).trim().replace(/^[\s,.:]+/, '');
            if (rest) return { actor, action: rest };
        }
    }
    // Fallback: whole text is the action, use last known actor
    return { actor: fallback || 'Hệ thống', action: text };
}

// ===== STEP 2: LOGIC TABLE =====
function renderLogicTable(steps) {
    const tbody = document.getElementById('logicBody');
    tbody.innerHTML = '';
    steps.forEach((s, i) => addLogicRow(s.actor, s.action, s.condition, i + 1));
}

function addLogicRow(actor = '', action = '', condition = '', num = null) {
    const tbody = document.getElementById('logicBody');
    const rows = tbody.querySelectorAll('tr').length;
    const n = num || rows + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="row-num">${n}</td>
        <td><input type="text" value="${escHtml(actor)}" placeholder="Actor name"></td>
        <td><input type="text" value="${escHtml(action)}" placeholder="Action description"></td>
        <td><input type="text" value="${escHtml(condition)}" placeholder="e.g. If valid"></td>
        <td><button class="del-btn" onclick="deleteRow(this)">🗑️</button></td>
    `;
    tbody.appendChild(tr);
    renumberRows();
}

function deleteRow(btn) { btn.closest('tr').remove(); renumberRows(); }

function renumberRows() {
    document.querySelectorAll('#logicBody tr').forEach((tr, i) => {
        tr.querySelector('.row-num').textContent = i + 1;
    });
}

function escHtml(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ===== STEP 3: GENERATE DIAGRAM =====
function generateDiagram() {
    const steps = getLogicSteps();
    if (steps.length === 0) { alert('Vui lòng thêm ít nhất 1 step.'); return; }
    goToStep(3);
    setTimeout(() => { BPMNEngine.autoLayout(steps); }, 100);
}

function getLogicSteps() {
    return Array.from(document.querySelectorAll('#logicBody tr')).map(row => {
        const inputs = row.querySelectorAll('input');
        return { actor: inputs[0]?.value || '', action: inputs[1]?.value || '', condition: inputs[2]?.value || '' };
    }).filter(s => s.actor || s.action);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.step-item').forEach(item => {
        item.addEventListener('click', () => {
            const step = parseInt(item.dataset.step);
            if (step <= currentStep) goToStep(step);
        });
    });
});
