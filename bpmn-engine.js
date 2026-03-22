/* ============================================ */
/* BPMN Engine — SVG Rendering & Auto-Layout     */
/* ============================================ */

const BPMNEngine = (() => {
    const NS = 'http://www.w3.org/2000/svg';
    let elements = [];
    let connections = [];
    let nextId = 1;

    // BPMN Shape dimensions
    const DIM = {
        TASK_W: 120, TASK_H: 60,
        EVENT_R: 18,
        GATEWAY_S: 40,
        LANE_HEADER: 30,
        POOL_HEADER: 30,
        H_GAP: 60, V_GAP: 20,
        PADDING: 40,
    };

    function createId(prefix) { return `${prefix}_${nextId++}`; }

    // ===== SVG Element Creators =====
    function createSVGElement(tag, attrs) {
        const el = document.createElementNS(NS, tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        return el;
    }

    function createGroup(className, id) {
        const g = createSVGElement('g', { class: className });
        if (id) g.setAttribute('id', id);
        return g;
    }

    // ===== Shape Renderers =====
    function renderStartEvent(x, y, label = 'Start') {
        const id = createId('startEvent');
        const g = createGroup('bpmn-event', id);
        g.setAttribute('data-type', 'startEvent');
        g.setAttribute('data-x', x); g.setAttribute('data-y', y);

        const circle = createSVGElement('circle', { cx: x, cy: y, r: DIM.EVENT_R, fill: '#F0FDF4', stroke: '#22C55E', 'stroke-width': 2 });
        g.appendChild(circle);

        if (label) {
            const text = createSVGElement('text', { x, y: y + DIM.EVENT_R + 14, 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif', 'font-size': 10, fill: '#475569' });
            text.textContent = label;
            g.appendChild(text);
        }

        elements.push({ id, type: 'startEvent', x, y, label, group: g });
        return { id, x, y, cx: x, cy: y };
    }

    function renderEndEvent(x, y, label = 'End') {
        const id = createId('endEvent');
        const g = createGroup('bpmn-event', id);
        g.setAttribute('data-type', 'endEvent');
        g.setAttribute('data-x', x); g.setAttribute('data-y', y);

        const circle = createSVGElement('circle', { cx: x, cy: y, r: DIM.EVENT_R, fill: '#FEF2F2', stroke: '#EF4444', 'stroke-width': 3 });
        g.appendChild(circle);

        if (label) {
            const text = createSVGElement('text', { x, y: y + DIM.EVENT_R + 14, 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif', 'font-size': 10, fill: '#475569' });
            text.textContent = label;
            g.appendChild(text);
        }

        elements.push({ id, type: 'endEvent', x, y, label, group: g });
        return { id, x, y, cx: x, cy: y };
    }

    function renderTask(x, y, label = 'Task') {
        const id = createId('task');
        const g = createGroup('bpmn-task', id);
        g.setAttribute('data-type', 'task');
        g.setAttribute('data-x', x); g.setAttribute('data-y', y);

        const rect = createSVGElement('rect', {
            x, y, width: DIM.TASK_W, height: DIM.TASK_H,
            rx: 8, fill: '#fff', stroke: '#334155', 'stroke-width': 1.5
        });
        g.appendChild(rect);

        // Wrap text
        const lines = wrapText(label, 14);
        lines.forEach((line, i) => {
            const txt = createSVGElement('text', {
                x: x + DIM.TASK_W / 2,
                y: y + DIM.TASK_H / 2 + (i - (lines.length - 1) / 2) * 14,
                'text-anchor': 'middle', 'dominant-baseline': 'central',
                'font-family': 'Inter, sans-serif', 'font-size': 11, fill: '#1E293B'
            });
            txt.textContent = line;
            g.appendChild(txt);
        });

        elements.push({ id, type: 'task', x, y, w: DIM.TASK_W, h: DIM.TASK_H, label, group: g });
        return { id, x, y, cx: x + DIM.TASK_W / 2, cy: y + DIM.TASK_H / 2, right: x + DIM.TASK_W, bottom: y + DIM.TASK_H };
    }

    function renderGateway(x, y, type = 'xor', label = '') {
        const id = createId('gateway');
        const g = createGroup('bpmn-gateway', id);
        g.setAttribute('data-type', type + 'Gateway');
        const s = DIM.GATEWAY_S;
        const cx = x + s / 2, cy = y + s / 2;
        g.setAttribute('data-x', x); g.setAttribute('data-y', y);

        const diamond = createSVGElement('path', {
            d: `M${cx} ${y} L${x + s} ${cy} L${cx} ${y + s} L${x} ${cy} Z`,
            fill: '#fff', stroke: '#334155', 'stroke-width': 1.5
        });
        g.appendChild(diamond);

        if (type === 'xor') {
            g.appendChild(createSVGElement('path', { d: `M${cx - 7} ${cy - 7} L${cx + 7} ${cy + 7}`, stroke: '#334155', 'stroke-width': 2 }));
            g.appendChild(createSVGElement('path', { d: `M${cx + 7} ${cy - 7} L${cx - 7} ${cy + 7}`, stroke: '#334155', 'stroke-width': 2 }));
        } else if (type === 'and') {
            g.appendChild(createSVGElement('path', { d: `M${cx} ${cy - 8} L${cx} ${cy + 8}`, stroke: '#334155', 'stroke-width': 2 }));
            g.appendChild(createSVGElement('path', { d: `M${cx - 8} ${cy} L${cx + 8} ${cy}`, stroke: '#334155', 'stroke-width': 2 }));
        } else {
            g.appendChild(createSVGElement('circle', { cx, cy, r: 7, fill: 'none', stroke: '#334155', 'stroke-width': 2 }));
        }

        if (label) {
            const text = createSVGElement('text', { x: cx, y: y + s + 14, 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif', 'font-size': 9, fill: '#64748B' });
            text.textContent = label;
            g.appendChild(text);
        }

        elements.push({ id, type: type + 'Gateway', x, y, w: s, h: s, label, group: g });
        return { id, x, y, cx, cy, right: x + s, bottom: y + s };
    }

    function renderPool(x, y, w, h, label = 'Pool') {
        const id = createId('pool');
        const g = createGroup('bpmn-pool', id);
        g.setAttribute('data-type', 'pool');

        const rect = createSVGElement('rect', { x, y, width: w, height: h, rx: 0, fill: '#fff', stroke: '#334155', 'stroke-width': 1.5 });
        g.appendChild(rect);

        // Header
        const hdr = createSVGElement('rect', { x, y, width: DIM.POOL_HEADER, height: h, fill: '#F8FAFC', stroke: '#334155', 'stroke-width': 1.5 });
        g.appendChild(hdr);

        // Vertical label
        const text = createSVGElement('text', {
            x: x + DIM.POOL_HEADER / 2, y: y + h / 2,
            'text-anchor': 'middle', 'dominant-baseline': 'central',
            'font-family': 'Inter, sans-serif', 'font-size': 12, 'font-weight': 600,
            fill: '#1E293B',
            transform: `rotate(-90 ${x + DIM.POOL_HEADER / 2} ${y + h / 2})`
        });
        text.textContent = label;
        g.appendChild(text);

        elements.push({ id, type: 'pool', x, y, w, h, label, group: g });
        return { id, g };
    }

    function renderLane(x, y, w, h, label = 'Lane') {
        const id = createId('lane');
        const g = createGroup('bpmn-lane', id);
        g.setAttribute('data-type', 'lane');

        const rect = createSVGElement('rect', { x, y, width: w, height: h, fill: 'rgba(248,250,252,0.3)', stroke: '#CBD5E1', 'stroke-width': 1 });
        g.appendChild(rect);

        // Vertical label in lane header
        const labelG = createSVGElement('rect', { x, y, width: DIM.LANE_HEADER, height: h, fill: 'rgba(241,245,249,0.6)', stroke: '#CBD5E1', 'stroke-width': 1 });
        g.appendChild(labelG);

        const text = createSVGElement('text', {
            x: x + DIM.LANE_HEADER / 2, y: y + h / 2,
            'text-anchor': 'middle', 'dominant-baseline': 'central',
            'font-family': 'Inter, sans-serif', 'font-size': 10, 'font-weight': 600,
            fill: '#64748B',
            transform: `rotate(-90 ${x + DIM.LANE_HEADER / 2} ${y + h / 2})`
        });
        text.textContent = label;
        g.appendChild(text);

        elements.push({ id, type: 'lane', x, y, w, h, label, group: g });
        return { id, g, innerX: x + DIM.LANE_HEADER + 10, cy: y + h / 2 };
    }

    function renderConnection(fromEl, toEl, label = '', type = 'sequence') {
        const id = createId('flow');
        const g = createGroup('bpmn-connection', id);

        // Calculate connection points
        let x1, y1, x2, y2;

        if (fromEl.right !== undefined) { x1 = fromEl.right; y1 = fromEl.cy; }
        else { x1 = fromEl.cx + DIM.EVENT_R; y1 = fromEl.cy; }

        if (toEl.x !== undefined && toEl.cx !== undefined) {
            x2 = toEl.type === 'gateway' ? toEl.x : (toEl.cx !== undefined ? toEl.cx - (toEl.w || DIM.TASK_W) / 2 : toEl.x);
            y2 = toEl.cy;
        } else {
            x2 = toEl.cx - DIM.EVENT_R; y2 = toEl.cy;
        }

        // Build path
        let d;
        if (Math.abs(y1 - y2) < 5) {
            d = `M${x1} ${y1} L${x2} ${y2}`;
        } else {
            const mx = (x1 + x2) / 2;
            d = `M${x1} ${y1} L${mx} ${y1} L${mx} ${y2} L${x2} ${y2}`;
        }

        const path = createSVGElement('path', {
            d,
            fill: 'none',
            stroke: type === 'message' ? '#94A3B8' : '#334155',
            'stroke-width': 1.5,
            'stroke-dasharray': type === 'message' ? '5 3' : 'none',
            'marker-end': type === 'message' ? 'url(#arrowHeadDash)' : 'url(#arrowHead)'
        });
        g.appendChild(path);

        if (label) {
            const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 6;
            const text = createSVGElement('text', {
                x: mx, y: my,
                'text-anchor': 'middle',
                'font-family': 'Inter, sans-serif', 'font-size': 9, fill: '#64748B',
                class: 'bpmn-flow-label'
            });
            text.textContent = label;
            g.appendChild(text);
        }

        connections.push({ id, from: fromEl.id, to: toEl.id, label, group: g });
        return { id, g };
    }

    // Smart connection between any two element refs
    function connect(fromRef, toRef, label = '', direction = 'right') {
        const id = createId('flow');
        const g = createGroup('bpmn-connection', id);

        let x1, y1, x2, y2;

        // From point
        if (fromRef.right !== undefined && direction === 'right') { x1 = fromRef.right; y1 = fromRef.cy; }
        else if (fromRef.bottom !== undefined && direction === 'down') { x1 = fromRef.cx; y1 = fromRef.bottom; }
        else { x1 = (fromRef.cx || fromRef.x) + (DIM.EVENT_R); y1 = fromRef.cy || fromRef.y; }

        // To point
        if (toRef.x !== undefined && toRef.w) { x2 = toRef.x; y2 = toRef.cy; }
        else if (toRef.cy !== undefined) { x2 = (toRef.cx || toRef.x) - DIM.EVENT_R; y2 = toRef.cy; }
        else { x2 = toRef.x; y2 = toRef.y; }

        let d;
        if (Math.abs(y1 - y2) < 5) {
            d = `M${x1} ${y1} L${x2} ${y2}`;
        } else {
            const mx = x1 + 25;
            d = `M${x1} ${y1} L${mx} ${y1} L${mx} ${y2} L${x2} ${y2}`;
        }

        const path = createSVGElement('path', {
            d, fill: 'none', stroke: '#334155', 'stroke-width': 1.5,
            'marker-end': 'url(#arrowHead)'
        });
        g.appendChild(path);

        if (label) {
            const lx = (x1 + x2) / 2, ly = Math.min(y1, y2) - 6;
            const text = createSVGElement('text', {
                x: lx, y: ly,
                'text-anchor': 'middle',
                'font-family': 'Inter, sans-serif', 'font-size': 9, fill: '#64748B',
            });
            text.textContent = label;
            g.appendChild(text);
        }

        connections.push({ id, from: fromRef.id, to: toRef.id, label, group: g });
        return g;
    }

    // ===== Auto-Layout from Logic Steps =====
    function autoLayout(steps) {
        clear();
        const layer = document.getElementById('bpmnLayer');
        if (!layer || !steps.length) return;

        // Group steps by actor → lanes
        const actors = [];
        const actorMap = {};
        steps.forEach(s => {
            if (!actorMap[s.actor]) {
                actorMap[s.actor] = { name: s.actor, steps: [] };
                actors.push(actorMap[s.actor]);
            }
            actorMap[s.actor].steps.push(s);
        });

        // Calculate dimensions
        const laneH = 100;
        const totalLanes = actors.length;
        const poolH = totalLanes * laneH;
        const poolW = Math.max(800, steps.length * (DIM.TASK_W + DIM.H_GAP) + 200);
        const poolX = DIM.PADDING;
        const poolY = DIM.PADDING;

        // Render pool
        const pool = renderPool(poolX, poolY, poolW, poolH, 'Process');
        layer.appendChild(pool.g);

        // Render lanes
        const laneRefs = {};
        actors.forEach((actor, i) => {
            const ly = poolY + i * laneH;
            const lane = renderLane(poolX + DIM.POOL_HEADER, ly, poolW - DIM.POOL_HEADER, laneH, actor.name);
            layer.appendChild(lane.g);
            laneRefs[actor.name] = lane;
        });

        // Place elements along lanes
        const placed = [];
        let curX = poolX + DIM.POOL_HEADER + DIM.LANE_HEADER + DIM.PADDING;
        const firstLane = laneRefs[steps[0].actor];

        // Start event
        const startRef = renderStartEvent(curX, firstLane.cy, 'Bắt đầu');
        layer.appendChild(elements[elements.length - 1].group);
        placed.push(startRef);
        curX += DIM.EVENT_R * 2 + DIM.H_GAP;

        // Process each step
        let prevRef = startRef;
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const lane = laneRefs[step.actor];
            const cy = lane.cy;

            if (step.condition && step.condition.trim()) {
                // Gateway + branches
                const gw = renderGateway(curX, cy - DIM.GATEWAY_S / 2, 'xor', '');
                layer.appendChild(elements[elements.length - 1].group);
                layer.appendChild(connect(prevRef, gw, '', 'right'));
                curX += DIM.GATEWAY_S + DIM.H_GAP;

                // Main branch (condition true) — current task
                const taskRef = renderTask(curX, cy - DIM.TASK_H / 2, step.action);
                layer.appendChild(elements[elements.length - 1].group);
                layer.appendChild(connect(gw, taskRef, step.condition, 'right'));

                prevRef = taskRef;
                curX += DIM.TASK_W + DIM.H_GAP;
            } else {
                // Simple task
                const taskRef = renderTask(curX, cy - DIM.TASK_H / 2, step.action);
                layer.appendChild(elements[elements.length - 1].group);
                layer.appendChild(connect(prevRef, taskRef, '', 'right'));

                prevRef = taskRef;
                curX += DIM.TASK_W + DIM.H_GAP;
            }
        }

        // End event
        const lastLane = laneRefs[steps[steps.length - 1].actor];
        const endRef = renderEndEvent(curX, lastLane.cy, 'Kết thúc');
        layer.appendChild(elements[elements.length - 1].group);
        layer.appendChild(connect(prevRef, endRef, '', 'right'));

        // Update pool width
        const finalW = curX + DIM.EVENT_R * 2 + DIM.PADDING - poolX;
        pool.g.querySelector('rect').setAttribute('width', finalW);
        pool.g.querySelectorAll('rect')[1].setAttribute('width', DIM.POOL_HEADER);
        // Update lane widths
        Object.values(laneRefs).forEach(lr => {
            lr.g.querySelectorAll('rect').forEach(r => {
                if (parseFloat(r.getAttribute('width')) > 100) {
                    r.setAttribute('width', finalW - DIM.POOL_HEADER);
                }
            });
        });
    }

    function wrapText(text, maxChars) {
        if (text.length <= maxChars) return [text];
        const words = text.split(' ');
        const lines = []; let line = '';
        words.forEach(w => {
            if ((line + ' ' + w).trim().length > maxChars && line) {
                lines.push(line.trim());
                line = w;
            } else { line = (line + ' ' + w).trim(); }
        });
        if (line) lines.push(line);
        return lines.slice(0, 3); // Max 3 lines
    }

    function clear() {
        elements = []; connections = []; nextId = 1;
        const layer = document.getElementById('bpmnLayer');
        if (layer) layer.innerHTML = '';
    }

    function getElements() { return elements; }
    function getConnections() { return connections; }

    return { renderStartEvent, renderEndEvent, renderTask, renderGateway, renderPool, renderLane, connect, autoLayout, clear, getElements, getConnections, DIM, createId };
})();
