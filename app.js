/* ============================================ */
/* BPMN Process Designer — Main App Logic v4     */
/* Bulletproof NLP: string-based condtion detect */
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
    renderLogicTable(parseDescription(desc));
    goToStep(2);
}

// ===== NLP PARSER v4 — Bulletproof condition detection =====
// Simple string startsWith check — works for any encoding
function isConditionPrefix(text) {
    const lower = text.toLowerCase().trim();
    const prefixes = [
        'neu ', 'nếu ', 'nêu ',
        'if ', 'khi ', 'when ',
        'truong hop ', 'trường hợp ',
        'trong truong hop ', 'trong trường hợp '
    ];
    return prefixes.some(p => lower.startsWith(p));
}

function stripCondPrefix(text) {
    const lower = text.toLowerCase().trim();
    const prefixes = [
        'trong truong hop ', 'trong trường hợp ',
        'truong hop ', 'trường hợp ',
        'neu ', 'nếu ', 'nêu ',
        'if ', 'khi ', 'when '
    ];
    for (const p of prefixes) {
        if (lower.startsWith(p)) return text.trim().substring(p.length).trim();
    }
    return text.trim();
}

const KNOWN_ACTORS = [
    'Nhan vien ban hang', 'Nhân viên bán hàng',
    'Don vi van chuyen', 'Đơn vị vận chuyển',
    'Nha cung cap', 'Nhà cung cấp',
    'Bo phan ke toan', 'Bộ phận kế toán',
    'Bo phan kho', 'Bộ phận kho',
    'Phong nhan su', 'Phòng nhân sự',
    'Nhan vien', 'Nhân viên',
    'Khach hang', 'Khách hàng',
    'Quan ly', 'Quản lý',
    'He thong', 'Hệ thống',
    'Ke toan', 'Kế toán',
    'Giam doc', 'Giám đốc',
    'Admin', 'User', 'Manager', 'Customer', 'System',
    'Shipper', 'Kho', 'Bo phan', 'Bộ phận'
].sort((a, b) => b.length - a.length);

function parseDescription(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const steps = [];
    let lastActor = 'Hệ thống';

    lines.forEach(line => {
        line = line.replace(/^\d+[\.\)]\s*/, '');
        let actor = '', action = '', condition = '';

        const colonIdx = line.indexOf(':');

        if (colonIdx > 0) {
            const before = line.substring(0, colonIdx).trim();
            const after = line.substring(colonIdx + 1).trim();

            // CHECK 1: Is the part before colon a condition? (e.g., "Neu het hang: xxx")
            if (isConditionPrefix(before)) {
                condition = before;
                const aa = matchActor(after, lastActor);
                actor = aa.actor;
                action = aa.action;
                lastActor = actor;
                steps.push({ actor, action, condition });
                return;
            }

            // CHECK 2: Normal "Actor: Action" pattern
            actor = before;
            action = after;
        } else {
            // No colon — check if whole line is a condition
            if (isConditionPrefix(line)) {
                condition = line;
                actor = lastActor;
                action = stripCondPrefix(line);
                steps.push({ actor, action, condition });
                return;
            }
            // Try to match actor at start
            const aa = matchActor(line, lastActor);
            actor = aa.actor;
            action = aa.action;
        }

        if (!actor) actor = lastActor;
        lastActor = actor;
        if (action) steps.push({ actor, action, condition });
    });

    return steps;
}

function matchActor(text, fallback) {
    for (const a of KNOWN_ACTORS) {
        if (text.toLowerCase().startsWith(a.toLowerCase())) {
            const rest = text.substring(a.length).trim().replace(/^[\s,.:]+/, '');
            if (rest) return { actor: a, action: rest };
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
