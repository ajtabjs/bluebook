/**
 * MS Paint Clone - Easter Egg for Bluebook Calculator
 * Triggered by typing "teto" in the expression prompt or graphing "x=miku"
 */

(function() {
    'use strict';

    // State
    let paintWindow = null;
    let canvas = null;
    let ctx = null;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'pencil';
    let currentColor = '#000000';
    let brushSize = 3;
    let history = [];
    let historyIndex = -1;

    // Color palette
    const colors = [
        '#000000', '#808080', '#FF0000', '#00FF00', '#0000FF',
        '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#C0C0C0',
        '#800000', '#808000', '#008000', '#800080', '#008080',
        '#404040', '#FF8000', '#8000FF', '#00FF80', '#FF8080'
    ];

    // Win98-style bevel helpers (raised = button out, sunken = pressed/inset)
    const BEVEL_RAISED = 'border-top:1px solid #FFFFFF;border-left:1px solid #FFFFFF;border-right:1px solid #404040;border-bottom:1px solid #404040;';
    const BEVEL_SUNKEN = 'border-top:1px solid #404040;border-left:1px solid #404040;border-right:1px solid #FFFFFF;border-bottom:1px solid #FFFFFF;';
    const BEVEL_PRESSED = 'border:1px solid #000080;background:#C8D8F0;';

    function createPaintWindow() {
        if (paintWindow) {
            paintWindow.style.display = 'flex';
            paintWindow.focus();
            return;
        }

        paintWindow = document.createElement('div');
        paintWindow.id = 'mspaint-clone';
        paintWindow.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 900px;
            height: 650px;
            background: #D4D0C8;
            border-top: 2px solid #FFFFFF;
            border-left: 2px solid #FFFFFF;
            border-right: 2px solid #404040;
            border-bottom: 2px solid #404040;
            box-shadow: 4px 4px 12px rgba(0,0,0,0.6);
            z-index: 10000;
            font-family: Tahoma, 'MS Sans Serif', sans-serif;
            font-size: 11px;
            color: #000000;
            display: flex;
            flex-direction: column;
            user-select: none;
        `;

        const toolDef = (tool, title, svg) => `
            <button class="mspaint-tool" data-tool="${tool}" title="${title}" style="
                width:26px;height:26px;background:#D4D0C8;${BEVEL_RAISED}
                cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;
            ">${svg}</button>`;

        paintWindow.innerHTML = `
            <!-- Title Bar -->
            <div id="mspaint-titlebar" style="
                height: 24px;
                background: linear-gradient(to right, #000080, #1084D0);
                color: #FFFFFF;
                display: flex;
                align-items: center;
                padding: 0 4px;
                cursor: move;
                font-weight: bold;
                letter-spacing: 0.3px;
            ">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Crect fill='white' width='16' height='16' stroke='black'/%3E%3Ccircle cx='5' cy='5' r='1.5' fill='%23f00'/%3E%3Ccircle cx='11' cy='5' r='1.5' fill='%230a0'/%3E%3Ccircle cx='8' cy='11' r='2' fill='%2300f'/%3E%3C/svg%3E" style="width:16px;height:16px;margin-right:6px;">
                <span style="flex:1;font-size:12px;">untitled - Paint</span>
                <div style="display:flex;gap:3px;">
                    <button id="mspaint-minimize" style="width:18px;height:16px;background:#D4D0C8;${BEVEL_RAISED}font-size:11px;font-weight:bold;cursor:pointer;color:#000;line-height:1;">_</button>
                    <button id="mspaint-maximize" style="width:18px;height:16px;background:#D4D0C8;${BEVEL_RAISED}font-size:10px;font-weight:bold;cursor:pointer;color:#000;line-height:1;">□</button>
                    <button id="mspaint-close" style="width:18px;height:16px;background:#D4D0C8;${BEVEL_RAISED}font-size:11px;font-weight:bold;cursor:pointer;color:#000;line-height:1;">×</button>
                </div>
            </div>

            <!-- Menu Bar -->
            <div id="mspaint-menubar" style="
                height: 22px;
                background: #D4D0C8;
                border-bottom: 1px solid #808080;
                display: flex;
                align-items: center;
                padding: 0 2px;
                color: #000000;
                font-size: 11px;
            ">
                <div class="mspaint-menu" data-menu="file" style="padding:2px 8px;cursor:pointer;">File</div>
                <div class="mspaint-menu" data-menu="edit" style="padding:2px 8px;cursor:pointer;">Edit</div>
                <div class="mspaint-menu" data-menu="view" style="padding:2px 8px;cursor:pointer;">View</div>
                <div class="mspaint-menu" data-menu="image" style="padding:2px 8px;cursor:pointer;">Image</div>
                <div class="mspaint-menu" data-menu="colors" style="padding:2px 8px;cursor:pointer;">Colors</div>
                <div class="mspaint-menu" data-menu="help" style="padding:2px 8px;cursor:pointer;">Help</div>
            </div>

            <!-- Toolbar -->
            <div id="mspaint-toolbar" style="
                height: 64px;
                background: #D4D0C8;
                border-bottom: 1px solid #808080;
                padding: 4px;
                display: flex;
                flex-wrap: wrap;
                gap: 3px;
                align-items: center;
                overflow-x: auto;
            ">
                <div style="display:flex;gap:3px;align-items:center;border-right:2px solid #808080;padding-right:6px;margin-right:4px;">
                    ${toolDef('undo', 'Undo (Ctrl+Z)', '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5.22.7.33 1.44.33 2.2 0 2.65-2.15 4.9-4.83 4.94-2.36.01-4.4-1.97-4.8-4.33l-1.42 1.42C8.27 19.54 10.92 21 14 21c3.68 0 6.94-2.47 8.07-5.88" fill="none" stroke="black" stroke-width="2"/></svg>')}
                    ${toolDef('redo', 'Redo (Ctrl+Y)', '<svg width="16" height="16" viewBox="0 0 24 24" style="transform:scaleX(-1)"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5.22.7.33 1.44.33 2.2 0 2.65-2.15 4.9-4.83 4.94-2.36.01-4.4-1.97-4.8-4.33l-1.42 1.42C8.27 19.54 10.92 21 14 21c3.68 0 6.94-2.47 8.07-5.88" fill="none" stroke="black" stroke-width="2"/></svg>')}
                    ${toolDef('select', 'Rectangle Select', '<svg width="16" height="16" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" fill="none" stroke="black" stroke-width="2" stroke-dasharray="4 2"/></svg>')}
                    ${toolDef('freeform-select', 'Free-form Select', '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M4 4 Q2 12 6 14 Q4 18 10 20 Q14 22 18 18 Q22 14 20 8 Q18 2 12 4 Q8 2 4 4Z" fill="none" stroke="black" stroke-width="2"/></svg>')}
                </div>
                <div style="display:flex;gap:3px;align-items:center;border-right:2px solid #808080;padding-right:6px;margin-right:4px;">
                    ${toolDef('eraser', 'Eraser', '<svg width="16" height="16" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" fill="white" stroke="black" stroke-width="2"/><line x1="8" y1="8" x2="16" y2="16" stroke="black" stroke-width="1"/></svg>')}
                    ${toolDef('fill', 'Fill with color', '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M10 2 L18 10 L10 18 L2 10 Z" fill="black"/><circle cx="18" cy="16" r="3" fill="black"/></svg>')}
                    ${toolDef('picker', 'Pick color', '<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="black" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="black"/></svg>')}
                    ${toolDef('zoom', 'Zoom', '<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" fill="none" stroke="black" stroke-width="2"/><line x1="15" y1="15" x2="21" y2="21" stroke="black" stroke-width="2"/></svg>')}
                </div>
                <div style="display:flex;gap:3px;align-items:center;border-right:2px solid #808080;padding-right:6px;margin-right:4px;">
                    ${toolDef('pencil', 'Pencil', '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="black"/><path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="black"/></svg>')}
                    ${toolDef('brush', 'Brush', '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M7 14c-1.66 0-3 1.34-3 3h16c0-1.66-1.34-3-3-3V3H7v11z" fill="black"/></svg>')}
                    ${toolDef('airbrush', 'Airbrush', '<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="7" cy="7" r="1.5" fill="black"/><circle cx="11" cy="5" r="1" fill="black"/><circle cx="13" cy="9" r="1.2" fill="black"/><circle cx="9" cy="11" r="1" fill="black"/><path d="M14 9 L20 20 L8 20 Z" fill="black"/></svg>')}
                </div>
                <div style="display:flex;gap:3px;align-items:center;border-right:2px solid #808080;padding-right:6px;margin-right:4px;">
                    ${toolDef('text', 'Text', '<svg width="16" height="16" viewBox="0 0 24 24"><text x="4" y="18" font-size="18" font-weight="bold" fill="black">A</text></svg>')}
                    ${toolDef('line', 'Line', '<svg width="16" height="16" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" stroke="black" stroke-width="2.5"/></svg>')}
                    ${toolDef('curve', 'Curve', '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M4 20c0-4 4-8 8-8s8 4 8 8" fill="none" stroke="black" stroke-width="2.5"/></svg>')}
                    ${toolDef('rectangle', 'Rectangle', '<svg width="16" height="16" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="none" stroke="black" stroke-width="2.5"/></svg>')}
                    ${toolDef('rounded-rect', 'Rounded Rectangle', '<svg width="16" height="16" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="black" stroke-width="2.5"/></svg>')}
                    ${toolDef('ellipse', 'Ellipse', '<svg width="16" height="16" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="7" fill="none" stroke="black" stroke-width="2.5"/></svg>')}
                    ${toolDef('polygon', 'Polygon', '<svg width="16" height="16" viewBox="0 0 24 24"><polygon points="12,2 22,8 22,16 12,22 2,16 2,8" fill="none" stroke="black" stroke-width="2"/></svg>')}
                </div>
                <div style="display:flex;gap:4px;align-items:center;">
                    <span style="font-size:11px;color:#000;font-weight:bold;">Size:</span>
                    <select id="mspaint-brush-size" style="width:56px;height:22px;font-size:11px;background:#FFF;color:#000;${BEVEL_SUNKEN}">
                        <option value="1">1 px</option>
                        <option value="2">2 px</option>
                        <option value="3" selected>3 px</option>
                        <option value="4">4 px</option>
                        <option value="5">5 px</option>
                        <option value="8">8 px</option>
                        <option value="12">12 px</option>
                        <option value="16">16 px</option>
                    </select>
                </div>
            </div>

            <!-- Canvas Area -->
            <div id="mspaint-canvas-area" style="
                flex: 1;
                position: relative;
                background: #808080;
                overflow: auto;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <canvas id="mspaint-canvas" style="
                    background: white;
                    cursor: crosshair;
                    box-shadow: 2px 2px 6px rgba(0,0,0,0.5);
                "></canvas>
            </div>

            <!-- Color Palette -->
            <div id="mspaint-palette" style="
                height: 42px;
                background: #D4D0C8;
                border-top: 1px solid #808080;
                display: flex;
                align-items: center;
                padding: 0 8px;
                gap: 6px;
            ">
                <div id="mspaint-current-color-preview" style="
                    width:34px;height:28px;background:#000000;
                    ${BEVEL_SUNKEN}flex-shrink:0;
                "></div>
                <div style="display:grid;grid-template-columns:repeat(10,18px);grid-template-rows:repeat(2,16px);gap:1px;${BEVEL_SUNKEN}padding:2px;">
                    ${colors.map(c => `<button class="mspaint-color" data-color="${c}" style="width:18px;height:16px;background:${c};border:1px solid #808080;cursor:pointer;padding:0;" ${c==='#000000'?'data-active="true"':''}></button>`).join('')}
                </div>
            </div>

            <!-- Status Bar -->
            <div id="mspaint-statusbar" style="
                height: 22px;
                background: #D4D0C8;
                border-top: 1px solid #FFFFFF;
                display: flex;
                align-items: center;
                padding: 0 8px;
                font-size: 11px;
                color: #000000;
            ">
                <span id="mspaint-coords" style="min-width:90px;">X: 0  Y: 0</span>
                <span style="margin:0 10px;color:#808080;">|</span>
                <span id="mspaint-size">800 x 600</span>
                <span style="margin:0 10px;color:#808080;">|</span>
                <span id="mspaint-tool-status">Tool: Pencil</span>
                <div style="flex:1;"></div>
                <span id="mspaint-zoom">100%</span>
            </div>
        `;

        document.body.appendChild(paintWindow);

        canvas = document.getElementById('mspaint-canvas');
        canvas.width = 800;
        canvas.height = 600;
        ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        saveState();
        setupEventListeners();
        setActiveToolStyle('pencil');
        makeDraggable(paintWindow, document.getElementById('mspaint-titlebar'));
    }

    function setActiveToolStyle(tool) {
        document.querySelectorAll('.mspaint-tool').forEach(btn => {
            if (btn.dataset.tool === tool) {
                btn.style.cssText = `width:26px;height:26px;${BEVEL_PRESSED}cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;`;
            } else {
                btn.style.cssText = `width:26px;height:26px;background:#D4D0C8;${BEVEL_RAISED}cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;`;
            }
        });
    }

    function setupEventListeners() {
        document.querySelectorAll('.mspaint-tool').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.tool) setTool(btn.dataset.tool);
            });
        });

        document.querySelectorAll('.mspaint-color').forEach(btn => {
            btn.addEventListener('click', () => setColor(btn.dataset.color));
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                setColor(btn.dataset.color); // right-click = same set for simplicity
            });
        });

        document.getElementById('mspaint-brush-size').addEventListener('change', (e) => {
            brushSize = parseInt(e.target.value);
            ctx.lineWidth = brushSize;
        });

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mouseleave', onMouseUp);
        canvas.addEventListener('contextmenu', e => e.preventDefault());

        document.getElementById('mspaint-close').addEventListener('click', () => {
            paintWindow.style.display = 'none';
        });
        document.getElementById('mspaint-minimize').addEventListener('click', () => {
            paintWindow.style.display = 'none';
        });

        document.addEventListener('keydown', onKeyDown);
    }

    function setTool(tool) {
        currentTool = tool;
        setActiveToolStyle(tool);
        document.getElementById('mspaint-tool-status').textContent = `Tool: ${tool.charAt(0).toUpperCase() + tool.slice(1)}`;

        const cursors = {
            pencil: 'crosshair', brush: 'crosshair', airbrush: 'crosshair',
            eraser: 'cell', fill: 'copy', picker: 'crosshair', zoom: 'zoom-in',
            text: 'text', select: 'default', 'freeform-select': 'crosshair',
            line: 'crosshair', curve: 'crosshair', rectangle: 'crosshair',
            'rounded-rect': 'crosshair', ellipse: 'crosshair', polygon: 'crosshair'
        };
        canvas.style.cursor = cursors[tool] || 'crosshair';
    }

    function setColor(color) {
        currentColor = color;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        document.querySelectorAll('.mspaint-color').forEach(btn => {
            btn.style.border = btn.dataset.color === color ? '2px solid #000080' : '1px solid #808080';
        });
        document.getElementById('mspaint-current-color-preview').style.background = color;
    }

    function onMouseDown(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        isDrawing = true;
        lastX = x;
        lastY = y;

        if (currentTool === 'fill') {
            floodFill(Math.floor(x), Math.floor(y), currentColor);
            saveState();
            return;
        }
        if (currentTool === 'picker') {
            const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
            const color = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
            setColor(color);
            return;
        }
        if (currentTool === 'text') {
            showTextInput(x, y);
            return;
        }

        if (['line', 'curve', 'rectangle', 'rounded-rect', 'ellipse', 'polygon'].includes(currentTool)) {
            saveState();
        }
    }

    function onMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        document.getElementById('mspaint-coords').textContent = `X: ${Math.floor(x)}  Y: ${Math.floor(y)}`;

        if (!isDrawing) return;

        ctx.strokeStyle = currentColor;
        ctx.fillStyle = currentColor;
        ctx.lineWidth = brushSize;

        switch (currentTool) {
            case 'pencil':
                drawLine(lastX, lastY, x, y);
                lastX = x; lastY = y;
                break;
            case 'brush':
                drawBrush(lastX, lastY, x, y);
                lastX = x; lastY = y;
                break;
            case 'airbrush':
                airbrush(x, y);
                break;
            case 'eraser':
                ctx.globalCompositeOperation = 'destination-out';
                drawLine(lastX, lastY, x, y);
                ctx.globalCompositeOperation = 'source-over';
                lastX = x; lastY = y;
                break;
            case 'line':
            case 'curve':
            case 'rectangle':
            case 'rounded-rect':
            case 'ellipse':
                redrawCanvas();
                drawShape(currentTool, lastX, lastY, x, y);
                break;
        }
    }

    function onMouseUp(e) {
        if (!isDrawing) return;
        isDrawing = false;

        if (['line', 'curve', 'rectangle', 'rounded-rect', 'ellipse'].includes(currentTool)) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            drawShape(currentTool, lastX, lastY, x, y);
            saveState();
        }
    }

    function drawLine(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    function drawBrush(x1, y1, x2, y2) {
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(1, Math.ceil(dist / 2));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            const spread = brushSize * 0.5;
            for (let j = 0; j < 3; j++) {
                const ox = x + (Math.random() - 0.5) * spread;
                const oy = y + (Math.random() - 0.5) * spread;
                const r = Math.max(1, brushSize * (0.5 + Math.random() * 0.5));
                ctx.beginPath();
                ctx.arc(ox, oy, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function airbrush(x, y) {
        const density = 15;
        const radius = brushSize * 2;
        for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            const ox = x + Math.cos(angle) * dist;
            const oy = y + Math.sin(angle) * dist;
            const r = Math.max(1, Math.random() * 2);
            ctx.beginPath();
            ctx.arc(ox, oy, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawShape(tool, x1, y1, x2, y2) {
        const w = x2 - x1;
        const h = y2 - y1;

        ctx.beginPath();
        switch (tool) {
            case 'line':
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                break;
            case 'curve':
                const cx = (x1 + x2) / 2;
                const cy = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.3;
                ctx.moveTo(x1, y1);
                ctx.quadraticCurveTo(cx, cy, x2, y2);
                ctx.stroke();
                break;
            case 'rectangle':
                ctx.rect(x1, y1, w, h);
                ctx.stroke();
                break;
            case 'rounded-rect':
                const r = Math.min(Math.abs(w), Math.abs(h)) * 0.2;
                roundRect(ctx, x1, y1, w, h, r);
                ctx.stroke();
                break;
            case 'ellipse':
                ctx.ellipse(x1 + w/2, y1 + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, Math.PI * 2);
                ctx.stroke();
                break;
        }
    }

    function roundRect(ctx, x, y, w, h, r) {
        if (w < 0) { x += w; w = -w; }
        if (h < 0) { y += h; h = -h; }
        r = Math.min(r, w/2, h/2);
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
    }

    function redrawCanvas() {
        ctx.putImageData(history[historyIndex], 0, 0);
    }

    function saveState() {
        history = history.slice(0, historyIndex + 1);
        history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        historyIndex = history.length - 1;
        if (history.length > 50) {
            history.shift();
            historyIndex--;
        }
    }

    function floodFill(x, y, fillColor) {
        const targetData = ctx.getImageData(x, y, 1, 1).data;
        const targetColor = [targetData[0], targetData[1], targetData[2], targetData[3]];
        const fill = hexToRgba(fillColor);

        if (colorsEqual(targetColor, fill)) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const stack = [[x, y]];

        while (stack.length) {
            const [cx, cy] = stack.pop();
            if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;

            const idx = (cy * width + cx) * 4;
            if (!colorsEqual([data[idx], data[idx+1], data[idx+2], data[idx+3]], targetColor)) continue;
            if (colorsEqual([data[idx], data[idx+1], data[idx+2], data[idx+3]], fill)) continue;

            data[idx] = fill[0];
            data[idx+1] = fill[1];
            data[idx+2] = fill[2];
            data[idx+3] = fill[3];

            stack.push([cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    function colorsEqual(a, b) {
        return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
    }

    function hexToRgba(hex) {
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);
        return [r, g, b, 255];
    }

    function showTextInput(x, y) {
        const input = document.createElement('input');
        input.style.cssText = `
            position: absolute;
            left: ${canvas.offsetLeft + x}px;
            top: ${canvas.offsetTop + y}px;
            font: ${brushSize * 4}px Arial;
            color: ${currentColor};
            background: transparent;
            border: 1px dashed #000;
            outline: none;
            z-index: 10001;
        `;
        paintWindow.appendChild(input);
        input.focus();

        const finish = () => {
            const text = input.value;
            if (text) {
                ctx.font = `${brushSize * 4}px Arial`;
                ctx.fillStyle = currentColor;
                ctx.fillText(text, x, y + brushSize * 3);
                saveState();
            }
            input.remove();
        };
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finish();
            if (e.key === 'Escape') { input.value = ''; finish(); }
        });
    }

    function onKeyDown(e) {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            redo();
        }
        if (e.key === '`' && paintWindow && paintWindow.style.display !== 'none') {
            paintWindow.style.display = 'none';
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            if (paintWindow && paintWindow.style.display !== 'none') {
                paintWindow.style.display = 'none';
            } else {
                createPaintWindow();
            }
        }
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const target = e.target;
            if (!(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                e.preventDefault();
                createPaintWindow();
            }
        }
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            ctx.putImageData(history[historyIndex], 0, 0);
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            ctx.putImageData(history[historyIndex], 0, 0);
        }
    }

    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    window.MSPaintClone = {
        show: createPaintWindow,
        hide: () => paintWindow && (paintWindow.style.display = 'none'),
        toggle: () => paintWindow && paintWindow.style.display !== 'none' ?
            (paintWindow.style.display = 'none') : createPaintWindow()
    };

    function onGlobalKeyDown(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            if (paintWindow && paintWindow.style.display !== 'none') {
                paintWindow.style.display = 'none';
            } else {
                createPaintWindow();
            }
            return;
        }
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const target = e.target;
            if (!(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                e.preventDefault();
                createPaintWindow();
            }
            return;
        }
        if (e.key === '`' && paintWindow && paintWindow.style.display !== 'none') {
            paintWindow.style.display = 'none';
            return;
        }
    }
    document.addEventListener('keydown', onGlobalKeyDown);

    function checkDesmos() {
        if (window.Desmos && (window.Desmos.Calculator || window.Desmos.GraphingCalculator)) {
            const CalcClass = window.Desmos.Calculator || window.Desmos.GraphingCalculator;
            const originalGraph = CalcClass.prototype.setExpression;
            if (originalGraph) {
                CalcClass.prototype.setExpression = function(state) {
                    if (state && (state.latex === 'x=miku' || state.latex === 'teto')) {
                        setTimeout(() => createPaintWindow(), 100);
                    }
                    return originalGraph.call(this, state);
                };
            }
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' && e.key === 'Enter') {
                    const val = e.target.value.toLowerCase().trim();
                    if (val === 'teto' || val === 'x=miku') {
                        setTimeout(() => createPaintWindow(), 100);
                    }
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkDesmos);
    } else {
        checkDesmos();
    }

    const desmosInterval = setInterval(() => {
        if (window.Desmos) {
            clearInterval(desmosInterval);
            checkDesmos();
        }
    }, 500);
})();