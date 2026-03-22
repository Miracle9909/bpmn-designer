/* ============================================ */
/* BPMN Process Designer — Main App Logic v3     */
/* Robust NLP: diacritics + non-diacritics       */
/* ============================================ */

let currentStep = 1;

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

function analyzeProcess() {
    const desc = document.getElementById('processDesc').value.trim();
    if (!desc) { alert('Vui lòng nhập mô tả quy trình.'); return; }
    const steps = parseDescription(desc);
    renderLogicTable(steps);
    goToStep(2);
}

// ===== NLP PARSER v3 — Robust diacritic + non-diacritic =====
// Condition prefixes: nếu, neu, if, khi, when, truong hop
const COND_PREFIXES = /^(n[eếê]u|if|khi|when|tr[uưừ][oôờ]ng\s*h[oợ]p|trong\s*tr[uưừ][oôờ]ng\s*h[oợ]p)\s+/i;
const COND_COLON_RE = /^(n[eếê]u|if|khi|when|tr[uưừ][oôờ]ng\s*h[oợ]p)\s+([^:]+):\s*(.+)$/i;

// Known actors — both diacritic and non-diacritic
const KNOWN_ACTORS = [
    'Nhân viên bán hàng', 'Nhan vien ban hang',
    'Đơn vị vận chuyển', 'Don vi van chuyen',
    'Nhà cung cấp', 'Nha cung cap',
    'Bộ phận kế toán', 'Bo phan ke toan',
    'Bộ phận kho', 'Bo phan kho',
    'Phòng nhân sự', 'Phong nhan su',
    'Nhân viên', 'Nhan vien',
    'Khách hàng', 'Khach hang',
    'Quản lý', 'Quan ly',
    'Hệ thống', 'He thong',
    'Kế toán', 'Ke toan',
    'Giám đốc', 'Giam doc',
    'Admin', 'User', 'Manager', 'Customer', 'System',
    'Shipper', 'Kho', 'Bộ phận', 'Bo phan'
].sort((a, b) => b.length - a.length); // Longest first

function parseDescription(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const steps = [];
    let lastActor = 'Hệ thống';

    lines.forEach(line => {
        line = line.replace(/^\d+[\.\)]\s*/, ''); // Remove numbering
        let actor = '', action = '', condition = '';

        // CASE 1: "Nếu/Neu/If xxx: rest" (condition with colon)
        const condMatch = line.match(COND_COLON_RE);
        if (condMatch) {
            condition = condMatch[1] + ' ' + condMatch[2].trim();
            const rest = condMatch[3].trim();
            const aa = extractAA(rest, lastActor);
            actor = aa.actor;
            action = aa.action;
            lastActor = actor;
            steps.push({ actor, action, condition });
            return;
        }

        // CASE 2: Line starts with condition keyword (no colon)
        if (COND_PREFIXES.test(line)) {
            // Check if there's a colon further in
            const colonIdx = line.indexOf(':');
            if (colonIdx > 0) {
                const before = line.substring(0, colonIdx).trim();
                const after = line.substring(colonIdx + 1).trim();
                condition = before;
                const aa = extractAA(after, lastActor);
                actor = aa.actor;
                action = aa.action || after;
            } else {
                condition = line;
                actor = lastActor;
                action = line.replace(COND_PREFIXES, '').trim();
            }
            lastActor = actor;
            steps.push({ actor, action, condition });
            return;
        }

        // CASE 3: "Actor: Action" format
        const colonMatch = line.match(/^([^:]+):(.+)$/);
        if (colonMatch) {
            const prefix = colonMatch[1].trim();
            const rest = colonMatch[2].trim();

            // Check if prefix is a condition keyword, even without diacritics
            if (COND_PREFIXES.test(prefix + ' ')) {
                condition = prefix;
                const aa = extractAA(rest, lastActor);
                actor = aa.actor;
                action = aa.action;
                lastActor = actor;
                steps.push({ actor, action, condition });
                return;
            }

            actor = prefix;
            action = rest;
        } else {
            // CASE 4: Try to match "Actor verb Object" pattern
            const aa = extractAA(line, lastActor);
            actor = aa.actor;
            action = aa.action;
        }

        if (!actor) actor = lastActor;
        lastActor = actor;
        if (action) steps.push({ actor, action, condition });
    });

    return steps;
}

function extractAA(text, fallback) {
    for (const actor of KNOWN_ACTORS) {
        if (text.toLowerCase().startsWith(actor.toLowerCase())) {
            const rest = text.substring(actor.length).trim().replace(/^[\s,.:]+/, '');
            if (rest) return { actor, action: rest };
        }
    }
    return { actor: fallback || 'Hệ thống', action: text };
}

// ===== LOGIC TABLE =====
function renderLogicTable(steps) {
    document.getElementById('logicBody').innerHTML = '';
    steps.forEach((s, i) => addLogicRow(s.actor, s.action, s.condition, i + 1));
}

function addLogicRow(actor = '', action = '', condition = '', num = null) {
    const tbody = document.getElementById('logicBody');
    const n = num || tbody.querySelectorAll('tr').length + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="row-num">${n}</td>
        <td><input type="text" value="${esc(actor)}" placeholder="Actor name"></td>
        <td><input type="text" value="${esc(action)}" placeholder="Action description"></td>
        <td><input type="text" value="${esc(condition)}" placeholder="e.g. If valid"></td>
        <td><button class="del-btn" onclick="deleteRow(this)">🗑️</button></td>
    `;
    tbody.appendChild(tr);
    renumberRows();
}

function deleteRow(btn) { btn.closest('tr').remove(); renumberRows(); }
function renumberRows() { document.querySelectorAll('#logicBody tr').forEach((tr, i) => tr.querySelector('.row-num').textContent = i + 1); }
function esc(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function generateDiagram() {
    const steps = getLogicSteps();
    if (!steps.length) { alert('Vui lòng thêm ít nhất 1 step.'); return; }
    goToStep(3);
    setTimeout(() => BPMNEngine.autoLayout(steps), 100);
}

function getLogicSteps() {
    return Array.from(document.querySelectorAll('#logicBody tr')).map(row => {
        const inp = row.querySelectorAll('input');
        return { actor: inp[0]?.value || '', action: inp[1]?.value || '', condition: inp[2]?.value || '' };
    }).filter(s => s.actor || s.action);
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.step-item').forEach(item => {
        item.addEventListener('click', () => {
            const step = parseInt(item.dataset.step);
            if (step <= currentStep) goToStep(step);
        });
    });
});
