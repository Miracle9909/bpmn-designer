/* ============================================ */
/* BPMN Editor — Drag-Drop, Toolbar, Zoom        */
/* ============================================ */

const BPMNEditor = (() => {
    let currentTool = 'select';
    let selectedElement = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let panStart = null;
    let zoom = 1;
    let panX = 0, panY = 0;

    function init() {
        setupToolbar();
        setupCanvas();
        setupZoom();
    }

    function setupToolbar() {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTool = btn.dataset.tool;
                updateCursor();
            });
        });
    }

    function updateCursor() {
        const canvas = document.getElementById('canvasContainer');
        if (!canvas) return;
        switch (currentTool) {
            case 'select': canvas.style.cursor = 'default'; break;
            case 'move': canvas.style.cursor = 'grab'; break;
            default: canvas.style.cursor = 'crosshair';
        }
    }

    function setupCanvas() {
        const canvas = document.getElementById('canvasContainer');
        const svg = document.getElementById('bpmnCanvas');
        if (!canvas || !svg) return;

        svg.addEventListener('mousedown', onMouseDown);
        svg.addEventListener('mousemove', onMouseMove);
        svg.addEventListener('mouseup', onMouseUp);
        svg.addEventListener('click', onCanvasClick);
        svg.addEventListener('wheel', onWheel, { passive: false });

        // Touch support
        svg.addEventListener('touchstart', onTouchStart, { passive: false });
        svg.addEventListener('touchmove', onTouchMove, { passive: false });
        svg.addEventListener('touchend', onTouchEnd);
    }

    function getSVGPoint(e) {
        const svg = document.getElementById('bpmnCanvas');
        const rect = svg.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / zoom - panX / zoom,
            y: (e.clientY - rect.top) / zoom - panY / zoom
        };
    }

    function onCanvasClick(e) {
        if (currentTool === 'select' || currentTool === 'move') return;

        const pt = getSVGPoint(e);
        const layer = document.getElementById('bpmnLayer');
        if (!layer) return;

        let el;
        switch (currentTool) {
            case 'startEvent':
                el = BPMNEngine.renderStartEvent(pt.x, pt.y, 'Start');
                break;
            case 'endEvent':
                el = BPMNEngine.renderEndEvent(pt.x, pt.y, 'End');
                break;
            case 'task':
                el = BPMNEngine.renderTask(pt.x, pt.y, 'New Task');
                break;
            case 'subProcess':
                el = BPMNEngine.renderTask(pt.x, pt.y, 'Sub-Process');
                break;
            case 'xorGateway':
                el = BPMNEngine.renderGateway(pt.x, pt.y, 'xor');
                break;
            case 'andGateway':
                el = BPMNEngine.renderGateway(pt.x, pt.y, 'and');
                break;
            case 'orGateway':
                el = BPMNEngine.renderGateway(pt.x, pt.y, 'or');
                break;
            case 'intermediateEvent':
                el = BPMNEngine.renderStartEvent(pt.x, pt.y, 'Intermediate');
                break;
        }

        if (el) {
            const last = BPMNEngine.getElements();
            layer.appendChild(last[last.length - 1].group);
        }
    }

    function onMouseDown(e) {
        if (currentTool === 'move') {
            isDragging = true;
            panStart = { x: e.clientX - panX, y: e.clientY - panY };
            document.getElementById('canvasContainer').style.cursor = 'grabbing';
            return;
        }

        if (currentTool === 'select') {
            const target = e.target.closest('[data-type]');
            if (target) {
                selectElement(target);
                isDragging = true;
                const pt = getSVGPoint(e);
                dragOffset.x = pt.x - parseFloat(target.dataset.x || 0);
                dragOffset.y = pt.y - parseFloat(target.dataset.y || 0);
            } else {
                deselectAll();
            }
        }
    }

    function onMouseMove(e) {
        if (!isDragging) return;

        if (currentTool === 'move' && panStart) {
            panX = e.clientX - panStart.x;
            panY = e.clientY - panStart.y;
            updateTransform();
            return;
        }

        if (currentTool === 'select' && selectedElement) {
            // Simple drag — update element position
            const pt = getSVGPoint(e);
            const newX = pt.x - dragOffset.x;
            const newY = pt.y - dragOffset.y;
            selectedElement.setAttribute('data-x', newX);
            selectedElement.setAttribute('data-y', newY);
            // Move the group by updating transform
            selectedElement.setAttribute('transform', `translate(${newX - parseFloat(selectedElement.dataset.origX || 0)}, ${newY - parseFloat(selectedElement.dataset.origY || 0)})`);
        }
    }

    function onMouseUp() {
        isDragging = false;
        panStart = null;
        if (currentTool === 'move') {
            document.getElementById('canvasContainer').style.cursor = 'grab';
        }
    }

    function onTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            onMouseDown({ clientX: touch.clientX, clientY: touch.clientY, target: document.elementFromPoint(touch.clientX, touch.clientY), preventDefault: () => { } });
        }
    }

    function onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
        }
    }

    function onTouchEnd() { onMouseUp(); }

    function selectElement(el) {
        deselectAll();
        selectedElement = el;
        el.classList.add('bpmn-selected');
        showProperties(el);
    }

    function deselectAll() {
        document.querySelectorAll('.bpmn-selected').forEach(el => el.classList.remove('bpmn-selected'));
        selectedElement = null;
        hideProperties();
    }

    function showProperties(el) {
        const propFields = document.getElementById('propFields');
        const propEmpty = document.getElementById('propEmpty');
        if (!propFields || !propEmpty) return;

        propEmpty.style.display = 'none';
        propFields.style.display = 'block';

        // Find element data
        const elData = BPMNEngine.getElements().find(e => e.id === el.id);
        document.getElementById('propName').value = elData ? elData.label : '';
        document.getElementById('propType').value = el.dataset.type || 'unknown';
        document.getElementById('propDoc').value = '';

        // Update name on change
        document.getElementById('propName').oninput = function () {
            if (elData) {
                elData.label = this.value;
                const texts = el.querySelectorAll('text');
                if (texts.length > 0) texts[0].textContent = this.value;
            }
        };
    }

    function hideProperties() {
        const propFields = document.getElementById('propFields');
        const propEmpty = document.getElementById('propEmpty');
        if (propFields) propFields.style.display = 'none';
        if (propEmpty) propEmpty.style.display = 'block';
    }

    // ===== Zoom =====
    function setupZoom() { }

    function onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoom = Math.max(0.3, Math.min(3, zoom + delta));
        updateTransform();
        updateZoomDisplay();
    }

    function updateTransform() {
        const layer = document.getElementById('bpmnLayer');
        if (layer) layer.setAttribute('transform', `translate(${panX},${panY}) scale(${zoom})`);
    }

    function updateZoomDisplay() {
        const el = document.getElementById('zoomLevel');
        if (el) el.textContent = Math.round(zoom * 100) + '%';
    }

    return { init, zoom: () => zoom };
})();

// Zoom controls
function zoomIn() {
    const layer = document.getElementById('bpmnLayer');
    let z = parseFloat(layer.getAttribute('transform')?.match(/scale\(([^)]+)\)/)?.[1] || 1);
    z = Math.min(3, z + 0.1);
    const t = layer.getAttribute('transform')?.replace(/scale\([^)]+\)/, `scale(${z})`) || `translate(0,0) scale(${z})`;
    layer.setAttribute('transform', t);
    document.getElementById('zoomLevel').textContent = Math.round(z * 100) + '%';
}

function zoomOut() {
    const layer = document.getElementById('bpmnLayer');
    let z = parseFloat(layer.getAttribute('transform')?.match(/scale\(([^)]+)\)/)?.[1] || 1);
    z = Math.max(0.3, z - 0.1);
    const t = layer.getAttribute('transform')?.replace(/scale\([^)]+\)/, `scale(${z})`) || `translate(0,0) scale(${z})`;
    layer.setAttribute('transform', t);
    document.getElementById('zoomLevel').textContent = Math.round(z * 100) + '%';
}

function zoomFit() {
    const layer = document.getElementById('bpmnLayer');
    layer.setAttribute('transform', 'translate(0,0) scale(1)');
    document.getElementById('zoomLevel').textContent = '100%';
}
