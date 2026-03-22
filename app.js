/* ============================================ */
/* BPMN Process Designer — Main App Logic        */
/* Step navigation, text parsing, logic table    */
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

function parseDescription(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const steps = [];

    lines.forEach(line => {
        let actor = '', action = '', condition = '';

        // Try to detect "Actor: Action" or "Actor + verb" patterns
        const colonMatch = line.match(/^([^:]+):(.+)$/);
        const dotMatch = line.match(/^(\d+)\.\s*(.+)$/);

        if (colonMatch) {
            const prefix = colonMatch[1].trim();
            const rest = colonMatch[2].trim();

            // Check if prefix looks like a condition
            if (/^(nếu|if|khi|when)/i.test(prefix)) {
                condition = prefix;
                // Try to parse actor from rest
                const actorAction = extractActorAction(rest);
                actor = actorAction.actor;
                action = actorAction.action;
            } else {
                actor = prefix;
                action = rest;
            }
        } else if (dotMatch) {
            const content = dotMatch[2].trim();
            const actorAction = extractActorAction(content);
            actor = actorAction.actor;
            action = actorAction.action;
        } else {
            // Try to detect condition keywords
            if (/^(nếu|if|khi|when)\s/i.test(line)) {
                const condMatch = line.match(/^(nếu|if|khi|when)\s+(.+?):\s*(.+)$/i);
                if (condMatch) {
                    condition = condMatch[1] + ' ' + condMatch[2];
                    const aa = extractActorAction(condMatch[3]);
                    actor = aa.actor;
                    action = aa.action;
                } else {
                    condition = line;
                    actor = 'Hệ thống';
                    action = line;
                }
            } else {
                const aa = extractActorAction(line);
                actor = aa.actor;
                action = aa.action;
            }
        }

        if (!actor) actor = 'Hệ thống';
        if (action) steps.push({ actor, action, condition });
    });

    return steps;
}

function extractActorAction(text) {
    // Common Vietnamese actors
    const knownActors = [
        'Khách hàng', 'Nhân viên bán hàng', 'Nhân viên', 'Quản lý',
        'Hệ thống', 'Đơn vị vận chuyển', 'Kế toán', 'Giám đốc',
        'Bộ phận', 'Phòng', 'Admin', 'User', 'Manager', 'Customer',
        'System', 'Shipper', 'Kho', 'Nhà cung cấp'
    ];

    for (const actor of knownActors) {
        if (text.toLowerCase().startsWith(actor.toLowerCase())) {
            const rest = text.substring(actor.length).trim().replace(/^[\s,.:]+/, '');
            if (rest) return { actor, action: rest };
        }
    }

    // Try splitting by common verb patterns
    const verbMatch = text.match(/^(.+?)\s+(gửi|nhận|kiểm tra|thông báo|hủy|chuẩn bị|đóng gói|giao|vận chuyển|đánh dấu|xử lý|tạo|cập nhật|xác nhận|phê duyệt|từ chối|send|receive|check|cancel|prepare|deliver|process|create|update|approve|reject)\s+(.+)$/i);
    if (verbMatch) {
        return { actor: verbMatch[1].trim(), action: verbMatch[2] + ' ' + verbMatch[3] };
    }

    return { actor: '', action: text };
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

function deleteRow(btn) {
    btn.closest('tr').remove();
    renumberRows();
}

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

    // Wait for DOM to settle, then auto-layout
    setTimeout(() => {
        BPMNEngine.autoLayout(steps);
    }, 100);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    // Step bar click navigation
    document.querySelectorAll('.step-item').forEach(item => {
        item.addEventListener('click', () => {
            const step = parseInt(item.dataset.step);
            if (step <= currentStep) goToStep(step);
        });
    });
});
