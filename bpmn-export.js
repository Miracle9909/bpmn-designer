/* ============================================ */
/* BPMN Export — .bpmn XML & Save JSON           */
/* ============================================ */

function downloadBPMN() {
    const elements = BPMNEngine.getElements();
    const connections = BPMNEngine.getConnections();
    const title = document.getElementById('processTitle')?.value || 'Process';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             targetNamespace="http://bpmn-designer.local"
             id="Definitions_1">
  <process id="Process_1" name="${escXml(title)}" isExecutable="false">
`;

    // Elements
    elements.forEach(el => {
        switch (el.type) {
            case 'startEvent':
                xml += `    <startEvent id="${el.id}" name="${escXml(el.label)}"/>\n`;
                break;
            case 'endEvent':
                xml += `    <endEvent id="${el.id}" name="${escXml(el.label)}"/>\n`;
                break;
            case 'task':
                xml += `    <task id="${el.id}" name="${escXml(el.label)}"/>\n`;
                break;
            case 'xorGateway':
                xml += `    <exclusiveGateway id="${el.id}" name="${escXml(el.label)}"/>\n`;
                break;
            case 'andGateway':
                xml += `    <parallelGateway id="${el.id}" name="${escXml(el.label)}"/>\n`;
                break;
            case 'orGateway':
                xml += `    <inclusiveGateway id="${el.id}" name="${escXml(el.label)}"/>\n`;
                break;
        }
    });

    // Flows
    connections.forEach(conn => {
        xml += `    <sequenceFlow id="${conn.id}" name="${escXml(conn.label)}" sourceRef="${conn.from}" targetRef="${conn.to}"/>\n`;
    });

    xml += `  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
`;

    // Diagram shapes
    elements.forEach(el => {
        if (el.type === 'startEvent' || el.type === 'endEvent') {
            xml += `      <bpmndi:BPMNShape id="${el.id}_di" bpmnElement="${el.id}">
        <dc:Bounds x="${el.x - 18}" y="${el.y - 18}" width="36" height="36"/>
      </bpmndi:BPMNShape>\n`;
        } else if (el.type === 'task') {
            xml += `      <bpmndi:BPMNShape id="${el.id}_di" bpmnElement="${el.id}">
        <dc:Bounds x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}"/>
      </bpmndi:BPMNShape>\n`;
        } else if (el.type.includes('Gateway')) {
            xml += `      <bpmndi:BPMNShape id="${el.id}_di" bpmnElement="${el.id}" isMarkerVisible="true">
        <dc:Bounds x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}"/>
      </bpmndi:BPMNShape>\n`;
        }
    });

    // Diagram edges
    connections.forEach(conn => {
        xml += `      <bpmndi:BPMNEdge id="${conn.id}_di" bpmnElement="${conn.id}"/>\n`;
    });

    xml += `    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

    downloadFile(`${title.replace(/\s+/g, '_')}.bpmn`, xml, 'application/xml');
}

function saveProcess() {
    const title = document.getElementById('processTitle')?.value || 'Process';
    const steps = getLogicSteps();
    const data = {
        title,
        steps,
        elements: BPMNEngine.getElements().map(e => ({ id: e.id, type: e.type, x: e.x, y: e.y, label: e.label })),
        connections: BPMNEngine.getConnections().map(c => ({ id: c.id, from: c.from, to: c.to, label: c.label })),
        savedAt: new Date().toISOString()
    };

    downloadFile(`${title.replace(/\s+/g, '_')}.json`, JSON.stringify(data, null, 2), 'application/json');
    showToast('✅ Process saved successfully!');
}

function startOver() {
    if (!confirm('Start over? This will clear everything.')) return;
    BPMNEngine.clear();
    document.getElementById('processTitle').value = 'Untitled Process';
    document.getElementById('processDesc').value = '';
    document.getElementById('logicBody').innerHTML = '';
    goToStep(1);
}

// ===== Helpers =====
function escXml(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function downloadFile(name, content, type) {
    const blob = new Blob([content], { type: type + ';charset=utf-8' });
    const link = document.createElement('a');
    link.download = name;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function showToast(msg) {
    let toast = document.getElementById('bpmnToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'bpmnToast';
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1E293B;color:#fff;padding:10px 24px;border-radius:10px;font-weight:600;font-size:14px;z-index:9999;transition:opacity 0.4s;font-family:Inter,sans-serif';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

function getLogicSteps() {
    const rows = document.querySelectorAll('#logicBody tr');
    return Array.from(rows).map(row => {
        const inputs = row.querySelectorAll('input');
        return {
            actor: inputs[0]?.value || '',
            action: inputs[1]?.value || '',
            condition: inputs[2]?.value || ''
        };
    }).filter(s => s.actor || s.action);
}
