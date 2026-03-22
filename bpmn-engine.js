/* ============================================ */
/* BPMN Engine v2 — Fixed Auto-Layout            */
/* Conditions → XOR gateway branches in same lane*/
/* Double-click to edit labels                   */
/* ============================================ */

const BPMNEngine = (() => {
    const NS = 'http://www.w3.org/2000/svg';
    let elements = [];
    let connections = [];
    let nextId = 1;

    const DIM = { TASK_W: 130, TASK_H: 55, EVENT_R: 18, GATEWAY_S: 36, LANE_HDR: 28, POOL_HDR: 28, H_GAP: 50, V_GAP: 20, PAD: 30 };

    function cid(p) { return `${p}_${nextId++}`; }

    function cel(tag, a) {
        const el = document.createElementNS(NS, tag);
        for (const [k, v] of Object.entries(a)) el.setAttribute(k, v);
        return el;
    }

    function cg(cls, id) { const g = cel('g', { class: cls }); if (id) g.id = id; return g; }

    function wrapText(text, max) {
        if (text.length <= max) return [text];
        const words = text.split(' '); const lines = []; let line = '';
        words.forEach(w => {
            if ((line + ' ' + w).trim().length > max && line) { lines.push(line.trim()); line = w; }
            else line = (line + ' ' + w).trim();
        });
        if (line) lines.push(line);
        return lines.slice(0, 3);
    }

    function addTextLines(g, x, y, text, fontSize = 11) {
        const lines = wrapText(text, 16);
        lines.forEach((line, i) => {
            const t = cel('text', {
                x, y: y + (i - (lines.length - 1) / 2) * (fontSize + 2),
                'text-anchor': 'middle', 'dominant-baseline': 'central',
                'font-family': 'Inter, sans-serif', 'font-size': fontSize, fill: '#1E293B'
            });
            t.textContent = line;
            g.appendChild(t);
        });
    }

    // ===== SHAPE RENDERERS =====
    function renderStartEvent(x, y, label = 'Bắt đầu') {
        const id = cid('se');
        const g = cg('bpmn-event bpmn-el', id);
        g.dataset.type = 'startEvent'; g.dataset.label = label;
        g.appendChild(cel('circle', { cx: x, cy: y, r: DIM.EVENT_R, fill: '#F0FDF4', stroke: '#16A34A', 'stroke-width': 2 }));
        const t = cel('text', { x, y: y + DIM.EVENT_R + 14, 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif', 'font-size': 10, fill: '#475569' });
        t.textContent = label; g.appendChild(t);
        elements.push({ id, type: 'startEvent', x, y, label, group: g });
        return { id, cx: x, cy: y, right: x + DIM.EVENT_R, left: x - DIM.EVENT_R };
    }

    function renderEndEvent(x, y, label = 'Kết thúc') {
        const id = cid('ee');
        const g = cg('bpmn-event bpmn-el', id);
        g.dataset.type = 'endEvent'; g.dataset.label = label;
        g.appendChild(cel('circle', { cx: x, cy: y, r: DIM.EVENT_R, fill: '#FEF2F2', stroke: '#DC2626', 'stroke-width': 3 }));
        const t = cel('text', { x, y: y + DIM.EVENT_R + 14, 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif', 'font-size': 10, fill: '#475569' });
        t.textContent = label; g.appendChild(t);
        elements.push({ id, type: 'endEvent', x, y, label, group: g });
        return { id, cx: x, cy: y, left: x - DIM.EVENT_R };
    }

    function renderTask(x, y, label = 'Task') {
        const id = cid('t');
        const g = cg('bpmn-task bpmn-el', id);
        g.dataset.type = 'task'; g.dataset.label = label;
        g.appendChild(cel('rect', { x, y, width: DIM.TASK_W, height: DIM.TASK_H, rx: 8, fill: '#fff', stroke: '#334155', 'stroke-width': 1.5 }));
        addTextLines(g, x + DIM.TASK_W / 2, y + DIM.TASK_H / 2, label);
        elements.push({ id, type: 'task', x, y, w: DIM.TASK_W, h: DIM.TASK_H, label, group: g });
        return { id, cx: x + DIM.TASK_W / 2, cy: y + DIM.TASK_H / 2, right: x + DIM.TASK_W, left: x, top: y, bottom: y + DIM.TASK_H };
    }

    function renderGateway(x, y, type = 'xor', label = '') {
        const id = cid('gw');
        const g = cg('bpmn-gateway bpmn-el', id);
        const s = DIM.GATEWAY_S, cx = x + s / 2, cy = y + s / 2;
        g.dataset.type = type + 'Gateway'; g.dataset.label = label || '';
        g.appendChild(cel('path', { d: `M${cx} ${y}L${x + s} ${cy}L${cx} ${y + s}L${x} ${cy}Z`, fill: '#fff', stroke: '#334155', 'stroke-width': 1.5 }));
        if (type === 'xor') {
            g.appendChild(cel('path', { d: `M${cx - 6} ${cy - 6}L${cx + 6} ${cy + 6}`, stroke: '#334155', 'stroke-width': 2 }));
            g.appendChild(cel('path', { d: `M${cx + 6} ${cy - 6}L${cx - 6} ${cy + 6}`, stroke: '#334155', 'stroke-width': 2 }));
        } else if (type === 'and') {
            g.appendChild(cel('path', { d: `M${cx} ${cy - 7}L${cx} ${cy + 7}`, stroke: '#334155', 'stroke-width': 2 }));
            g.appendChild(cel('path', { d: `M${cx - 7} ${cy}L${cx + 7} ${cy}`, stroke: '#334155', 'stroke-width': 2 }));
        } else {
            g.appendChild(cel('circle', { cx, cy, r: 6, fill: 'none', stroke: '#334155', 'stroke-width': 2 }));
        }
        if (label) {
            const t = cel('text', { x: cx, y: y - 8, 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif', 'font-size': 9, fill: '#6366F1', 'font-weight': '600' });
            t.textContent = label; g.appendChild(t);
        }
        elements.push({ id, type: type + 'Gateway', x, y, w: s, h: s, label, group: g });
        return { id, cx, cy, right: x + s, left: x, top: y, bottom: y + s };
    }

    function renderPool(x, y, w, h, label) {
        const id = cid('pool');
        const g = cg('bpmn-pool', id);
        g.appendChild(cel('rect', { x, y, width: w, height: h, fill: '#fff', stroke: '#1E293B', 'stroke-width': 1.5 }));
        g.appendChild(cel('rect', { x, y, width: DIM.POOL_HDR, height: h, fill: '#F1F5F9', stroke: '#1E293B', 'stroke-width': 1.5 }));
        const t = cel('text', { x: x + DIM.POOL_HDR / 2, y: y + h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Inter, sans-serif', 'font-size': 12, 'font-weight': '700', fill: '#1E293B', transform: `rotate(-90 ${x + DIM.POOL_HDR / 2} ${y + h / 2})` });
        t.textContent = label; g.appendChild(t);
        elements.push({ id, type: 'pool', x, y, w, h, label, group: g });
        return { id, g };
    }

    function renderLane(x, y, w, h, label) {
        const id = cid('lane');
        const g = cg('bpmn-lane', id);
        g.appendChild(cel('rect', { x, y, width: w, height: h, fill: 'rgba(248,250,252,0.3)', stroke: '#CBD5E1', 'stroke-width': 1 }));
        g.appendChild(cel('rect', { x, y, width: DIM.LANE_HDR, height: h, fill: 'rgba(241,245,249,0.5)', stroke: '#CBD5E1', 'stroke-width': 1 }));
        const t = cel('text', { x: x + DIM.LANE_HDR / 2, y: y + h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Inter, sans-serif', 'font-size': 10, 'font-weight': '600', fill: '#64748B', transform: `rotate(-90 ${x + DIM.LANE_HDR / 2} ${y + h / 2})` });
        t.textContent = label; g.appendChild(t);
        elements.push({ id, type: 'lane', x, y, w, h, label, group: g });
        return { id, g, innerX: x + DIM.LANE_HDR + 10, cy: y + h / 2, top: y, bottom: y + h };
    }

    // ===== CONNECTIONS with proper orthogonal routing =====
    function connect(from, to, label = '') {
        const g = cg('bpmn-connection', cid('f'));
        let x1 = from.right || from.cx + DIM.EVENT_R;
        let y1 = from.cy;
        let x2 = to.left || to.cx - DIM.EVENT_R;
        let y2 = to.cy;

        let d;
        if (Math.abs(y1 - y2) < 3) {
            d = `M${x1} ${y1} L${x2} ${y2}`;
        } else {
            const mx = x1 + (x2 - x1) * 0.4;
            d = `M${x1} ${y1} L${mx} ${y1} L${mx} ${y2} L${x2} ${y2}`;
        }

        g.appendChild(cel('path', { d, fill: 'none', stroke: '#334155', 'stroke-width': 1.5, 'marker-end': 'url(#arrowHead)' }));
        if (label) {
            const lx = (x1 + x2) / 2;
            const ly = Math.abs(y1 - y2) < 3 ? y1 - 10 : (y1 < y2 ? y1 + (y2 - y1) * 0.3 - 10 : y2 + (y1 - y2) * 0.3 - 10);
            const bg = cel('rect', { x: lx - 30, y: ly - 8, width: 60, height: 14, rx: 3, fill: '#fff', stroke: 'none' });
            g.appendChild(bg);
            const t = cel('text', { x: lx, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Inter, sans-serif', 'font-size': 9, fill: '#6366F1', 'font-weight': '500' });
            t.textContent = label; g.appendChild(t);
        }
        connections.push({ id: g.id, from: from.id, to: to.id, label, group: g });
        return g;
    }

    // ===== FIXED AUTO-LAYOUT v2 =====
    // Key fix: conditions create XOR gateway branches WITHIN the same actor lane
    function autoLayout(steps) {
        clear();
        const layer = document.getElementById('bpmnLayer');
        if (!layer || !steps.length) return;

        // 1) Identify unique ACTORS (skip conditions as actors)
        const actorOrder = [];
        const actorSet = new Set();
        steps.forEach(s => {
            if (s.actor && !actorSet.has(s.actor)) {
                actorSet.add(s.actor);
                actorOrder.push(s.actor);
            }
        });

        // 2) Group consecutive conditions together
        const processedSteps = [];
        let i = 0;
        while (i < steps.length) {
            const step = steps[i];
            if (step.condition && step.condition.trim()) {
                // Collect all consecutive conditional steps
                const branches = [];
                while (i < steps.length && steps[i].condition && steps[i].condition.trim()) {
                    branches.push(steps[i]);
                    i++;
                }
                processedSteps.push({ type: 'gateway', branches });
            } else {
                processedSteps.push({ type: 'task', ...step });
                i++;
            }
        }

        // 3) Calculate layout
        const laneH = 90;
        const poolX = DIM.PAD;
        const poolY = DIM.PAD;
        const laneContentX = poolX + DIM.POOL_HDR + DIM.LANE_HDR + 15;

        // Map actor → lane index and Y position
        const laneMap = {};
        actorOrder.forEach((actor, idx) => {
            laneMap[actor] = { idx, cy: poolY + idx * laneH + laneH / 2, top: poolY + idx * laneH };
        });

        // 4) Place elements
        let curX = laneContentX;
        const allGroups = []; // to append in order

        // Start event — in first actor's lane
        const firstActor = steps[0].actor;
        const startRef = renderStartEvent(curX, laneMap[firstActor].cy, 'Bắt đầu');
        allGroups.push(elements[elements.length - 1].group);
        curX += DIM.EVENT_R * 2 + DIM.H_GAP;

        let prevRef = startRef;

        processedSteps.forEach(ps => {
            if (ps.type === 'task') {
                const lane = laneMap[ps.actor];
                const taskRef = renderTask(curX, lane.cy - DIM.TASK_H / 2, ps.action);
                allGroups.push(elements[elements.length - 1].group);
                allGroups.push(connect(prevRef, taskRef));
                prevRef = taskRef;
                curX += DIM.TASK_W + DIM.H_GAP;
            } else if (ps.type === 'gateway') {
                const branches = ps.branches;
                // Gateway placed in the lane of the previous step or first branch actor
                const gwActor = branches[0].actor;
                const gwLane = laneMap[gwActor];
                const gwRef = renderGateway(curX, gwLane.cy - DIM.GATEWAY_S / 2, 'xor');
                allGroups.push(elements[elements.length - 1].group);
                allGroups.push(connect(prevRef, gwRef));
                curX += DIM.GATEWAY_S + DIM.H_GAP;

                const branchStartX = curX;
                let maxBranchEndX = curX;
                const branchEnds = [];

                branches.forEach((branch, bIdx) => {
                    const bLane = laneMap[branch.actor];
                    const bx = branchStartX;
                    const by = bLane.cy - DIM.TASK_H / 2;
                    const taskRef = renderTask(bx, by, branch.action);
                    allGroups.push(elements[elements.length - 1].group);

                    // Condition label on the connection
                    const condLabel = branch.condition.replace(/^(nếu|if|khi|when)\s*/i, '').trim();
                    allGroups.push(connect(gwRef, taskRef, condLabel));

                    branchEnds.push(taskRef);
                    maxBranchEndX = Math.max(maxBranchEndX, bx + DIM.TASK_W);
                });

                curX = maxBranchEndX + DIM.H_GAP;

                // If multiple branches, add merge gateway
                if (branches.length > 1) {
                    const mergeRef = renderGateway(curX, gwLane.cy - DIM.GATEWAY_S / 2, 'xor');
                    allGroups.push(elements[elements.length - 1].group);
                    branchEnds.forEach(be => {
                        allGroups.push(connect(be, mergeRef));
                    });
                    prevRef = mergeRef;
                    curX += DIM.GATEWAY_S + DIM.H_GAP;
                } else {
                    prevRef = branchEnds[0];
                    curX += DIM.H_GAP;
                }
            }
        });

        // End event
        const lastActor = steps[steps.length - 1].actor;
        const endLane = laneMap[lastActor] || laneMap[actorOrder[actorOrder.length - 1]];
        const endRef = renderEndEvent(curX, endLane.cy, 'Kết thúc');
        allGroups.push(elements[elements.length - 1].group);
        allGroups.push(connect(prevRef, endRef));

        // 5) Calculate final pool size
        const poolW = curX + DIM.EVENT_R * 2 + DIM.PAD * 2 - poolX;
        const poolH = actorOrder.length * laneH;

        // Render pool & lanes first (behind everything)
        const pool = renderPool(poolX, poolY, poolW, poolH, document.getElementById('processTitle')?.value || 'Process');
        layer.appendChild(pool.g);

        actorOrder.forEach((actor, idx) => {
            const ly = poolY + idx * laneH;
            const lane = renderLane(poolX + DIM.POOL_HDR, ly, poolW - DIM.POOL_HDR, laneH, actor);
            layer.appendChild(lane.g);
        });

        // Then append all shapes & connections on top
        allGroups.forEach(g => layer.appendChild(g));

        // 6) Setup double-click editing
        setupDoubleClickEdit();
    }

    // ===== DOUBLE-CLICK TO EDIT =====
    function setupDoubleClickEdit() {
        document.querySelectorAll('.bpmn-el').forEach(el => {
            el.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const elData = elements.find(ed => ed.id === el.id);
                if (!elData) return;

                const newLabel = prompt('Nhập tên mới:', elData.label);
                if (newLabel !== null && newLabel.trim()) {
                    elData.label = newLabel.trim();
                    // Update text elements
                    const texts = el.querySelectorAll('text');
                    if (elData.type === 'task') {
                        // Remove old texts and re-add
                        texts.forEach(t => t.remove());
                        addTextLines(el, elData.x + DIM.TASK_W / 2, elData.y + DIM.TASK_H / 2, newLabel.trim());
                    } else {
                        if (texts[0]) texts[0].textContent = newLabel.trim();
                    }
                    el.dataset.label = newLabel.trim();
                }
            });
        });
    }

    function clear() {
        elements = []; connections = []; nextId = 1;
        const layer = document.getElementById('bpmnLayer');
        if (layer) layer.innerHTML = '';
    }

    function getElements() { return elements; }
    function getConnections() { return connections; }

    return { renderStartEvent, renderEndEvent, renderTask, renderGateway, renderPool, renderLane, connect, autoLayout, clear, getElements, getConnections, DIM, cid, setupDoubleClickEdit };
})();
