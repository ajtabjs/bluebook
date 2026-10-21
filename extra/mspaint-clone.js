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
    let selection = null;
    let isSelecting = false;
    let selectStartX = 0;
    let selectStartY = 0;

    // Color palette
    const colors = [
        '#000000', '#808080', '#FF0000', '#00FF00', '#0000FF',
        '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#C0C0C0',
        '#800000', '#808000', '#008000', '#800080', '#008080',
        '#C0C0C0', '#FF8000', '#8000FF', '#00FF80', '#FF8080'
    ];

    // Create paint window
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
            background: #E0E0E0;
            border: 2px solid #000;
            box-shadow: 4px 4px 8px rgba(0,0,0,0.5);
            z-index: 10000;
            font-family: 'MS Sans Serif', sans-serif;
            font-size: 11px;
            display: flex;
            flex-direction: column;
            user-select: none;
        `;

        paintWindow.innerHTML = `
            <!-- Title Bar -->
            <div id="mspaint-titlebar" style="
                height: 22px;
                background: #000080;
                color: white;
                display: flex;
                align-items: center;
                padding: 0 4px;
                cursor: move;
                -webkit-app-region: drag;
            ">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Crect fill='white' width='16' height='16'/%3E%3Cpath d='M2 2h12v12H2z' fill='%23fff' stroke='%23000'/%3E%3Ccircle cx='5' cy='5' r='1' fill='%23f00'/%3E%3Ccircle cx='11' cy='5' r='1' fill='%230f0'/%3E%3Ccircle cx='8' cy='11' r='2' fill='%2300f'/%3E%3C/svg%3E" style="width:16px;height:16px;margin-right:4px;">
                <span style="flex:1;">untitled - Paint</span>
                <div style="display:flex;gap:2px;">
                    <button id="mspaint-minimize" style="width:16px;height:16px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;font-size:10px;cursor:pointer;">_</button>
                    <button id="mspaint-maximize" style="width:16px;height:16px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;font-size:10px;cursor:pointer;">□</button>
                    <button id="mspaint-close" style="width:16px;height:16px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;font-size:10px;cursor:pointer;">×</button>
                </div>
            </div>

            <!-- Menu Bar -->
            <div id="mspaint-menubar" style="
                height: 20px;
                background: #E0E0E0;
                border-bottom: 1px solid #808080;
                display: flex;
                padding: 0 2px;
            ">
                <div class="mspaint-menu" data-menu="file" style="position:relative;">File ▼</div>
                <div class="mspaint-menu" data-menu="edit" style="position:relative;">Edit ▼</div>
                <div class="mspaint-menu" data-menu="view" style="position:relative;">View ▼</div>
                <div class="mspaint-menu" data-menu="image" style="position:relative;">Image ▼</div>
                <div class="mspaint-menu" data-menu="colors" style="position:relative;">Colors ▼</div>
                <div class="mspaint-menu" data-menu="help" style="position:relative;">Help ▼</div>
            </div>

            <!-- Toolbar -->
            <div id="mspaint-toolbar" style="
                height: 60px;
                background: #E0E0E0;
                border-bottom: 1px solid #808080;
                padding: 4px;
                display: flex;
                flex-wrap: wrap;
                gap: 2px;
                overflow-x: auto;
            ">
                <div style="display:flex;gap:2px;align-items:center;border-right:1px solid #808080;padding-right:4px;margin-right:4px;">
                    <button class="mspaint-tool" data-tool="undo" title="Undo (Ctrl+Z)" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5.22.7.33 1.44.33 2.2 0 2.65-2.15 4.9-4.83 4.94-2.36.01-4.4-1.97-4.8-4.33l-1.42 1.42C8.27 19.54 10.92 21 14 21c3.68 0 6.94-2.47 8.07-5.88l-1.47-1.47c-.64.97-1.5 1.87-2.53 2.71-.95.76-2.02 1.4-3.2 1.89-2.2.02-4.01-1.43-4.74-3.48 0-.68.08-1.34.22-1.96L12 7c-1.91 0-3.65.59-5.02 1.55l-1.43 1.43C8.77 10.54 10.45 9 12.5 9c2.35 0 4.33 1.22 5.36 3.04.21.38.33.8.33 1.27 0 .84-.24 1.63-.64 2.31l1.52 1.52c.49-.72.74-1.56.74-2.74 0-2.5-2.04-4.54-4.54-4.54z" fill="black"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="redo" title="Redo (Ctrl+Y)" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 8.99 14.21 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 12c1.3-2.23 3.45-3.9 5.9-3.9 2.23 0 4.12 1.14 5.1 2.77l1.35-1.35C12.97 8.81 12.3 8.5 11.5 8.5c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5.22.7.33 1.44.33 2.2 0 2.65-2.15 4.9-4.83 4.94-2.36.01-4.4-1.97-4.8-4.33l-1.42 1.42C8.27 19.54 10.92 21 14 21c3.68 0 6.94-2.47 8.07-5.88l-1.47-1.47c-.64.97-1.5 1.87-2.53 2.71-.95.76-2.02 1.4-3.2 1.89-2.2.02-4.01-1.43-4.74-3.48 0-.68.08-1.34.22-1.96L12 7c-1.91 0-3.65.59-5.02 1.55l-1.43 1.43C8.77 10.54 10.45 9 12.5 9c2.35 0 4.33 1.22 5.36 3.04.21.38.33.8.33 1.27 0 .84-.24 1.63-.64 2.31l1.52 1.52c.49-.72.74-1.56.74-2.74 0-2.5-2.04-4.54-4.54-4.54z" fill="black"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="select" title="Select" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 3h6v6H3zM3 15h6v6H3zM15 3h6v6h-6zM15 15h6v6h-6z" fill="none" stroke="black" stroke-width="2"/><path d="M9 9h6v6H9z" fill="none" stroke="black" stroke-width="2" stroke-dasharray="4"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="freeform-select" title="Free-form Select" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 3c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V3zm5 14H5v-4h4v4zm6 0H11v-4h4v4zm6 0h-4v-4h4v4z" fill="none" stroke="black" stroke-width="1.5"/></svg>
                    </button>
                </div>
                <div style="display:flex;gap:2px;align-items:center;border-right:1px solid #808080;padding-right:4px;margin-right:4px;">
                    <button class="mspaint-tool" data-tool="eraser" title="Eraser" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M20 4H4v16h16V4zm-2 14H6V6h12v12z" fill="none" stroke="black" stroke-width="1.5"/><rect x="8" y="8" width="8" height="8" fill="white" stroke="#ccc"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="fill" title="Fill with color" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M18 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM6 8h12v8H8v-8z" fill="none" stroke="black" stroke-width="1.5"/><circle cx="15" cy="11" r="2" fill="black"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="picker" title="Pick color" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="black" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="black"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="zoom" title="Zoom" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="black" stroke-width="1.5"/><path d="M16 16l5 5" stroke="black" stroke-width="1.5"/></svg>
                    </button>
                </div>
                <div style="display:flex;gap:2px;align-items:center;border-right:1px solid #808080;padding-right:4px;margin-right:4px;">
                    <button class="mspaint-tool" data-tool="pencil" title="Pencil" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;" data-active="true">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="black"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="brush" title="Brush" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M7 14c-1.66 0-3 1.34-3 3h16c0-1.66-1.34-3-3-3V7H7v7zm0-4h16c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h10v7H7v7z" fill="black"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="airbrush" title="Airbrush" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M7 5h10v2H7zm0 2h10v2H7zm0 2h10v2H7zm0 2h6v2H7zm0 2h2v2H7z" fill="black"/><path d="M17 7v10c0 1.1-.9 2-2 2h-2v2h-2v-2h-2v-2h2v-2h2v-2h-2v-2h2z" fill="black"/></svg>
                    </button>
                </div>
                <div style="display:flex;gap:2px;align-items:center;border-right:1px solid #808080;padding-right:4px;margin-right:4px;">
                    <button class="mspaint-tool" data-tool="text" title="Text" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 5h16c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1zm0 14h16V6H4v12zm8-10h8v2h-8zm0 3h8v2h-8zm0 3h8v2h-8z" fill="black"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="line" title="Line" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" stroke="black" stroke-width="2"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="curve" title="Curve" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 20c0-4 4-8 8-8s8 4 8 8" fill="none" stroke="black" stroke-width="2"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="rectangle" title="Rectangle" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="none" stroke="black" stroke-width="2"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="rounded-rect" title="Rounded Rectangle" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="black" stroke-width="2"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="ellipse" title="Ellipse" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8" ry="6" fill="none" stroke="black" stroke-width="2"/></svg>
                    </button>
                    <button class="mspaint-tool" data-tool="polygon" title="Polygon" style="width:24px;height:24px;background:#E0E0E0;border:1px solid #FFF 1px solid #808080 1px solid #808080;cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><polygon points="12,2 22,8 22,16 12,22 2,16 2,8" fill="none" stroke="black" stroke-width="1.5"/></svg>
                    </button>
                </div>
                <div style="display:flex;gap:2px;align-items:center;">
                    <span style="font-size:10px;color:#000;margin-right:4px;">Size:</span>
                    <select id="mspaint-brush-size" style="width:50px;height:20px;font-size:10px;background:#FFF;border:1px solid #808080;">
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
                    box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                "></canvas>
            </div>

            <!-- Color Palette -->
            <div id="mspaint-palette" style="
                height: 40px;
                background: #E0E0E0;
                border-top: 1px solid #808080;
                display: flex;
                align-items: center;
                padding: 0 8px;
                gap: 2px;
            ">
                <div style="width:2px;height:30px;background:linear-gradient(to right,#FFF 0%,#808080 50%,#000 100%);"></div>
                <div style="display:flex;gap:1px;flex-wrap:wrap;">
                    ${colors.map(c => `<button class="mspaint-color" data-color="${c}" style="width:18px;height:18px;background:${c};border:1px solid ${c==='#000000'?'#FFF':'#000'};border-right:1px solid #808080;border-bottom:1px solid #808080;cursor:pointer;" ${c==='#000000'?'data-active="true"':''}></button>`).join('')}
                </div>
                <div style="margin-left:8px;padding:0 8px;background:#FFF;border:1px solid #808080;min-width:40px;text-align:center;font-size:10px;color:#000;" id="mspaint-current-color-preview">■</div>
            </div>

            <!-- Status Bar -->
            <div id="mspaint-statusbar" style="
                height: 20px;
                background: #E0E0E0;
                border-top: 1px solid #FFF;
                border-bottom: 1px solid #808080;
                display: flex;
                align-items: center;
                padding: 0 8px;
                font-size: 10px;
                color: #000;
            ">
                <span id="mspaint-coords">X: 0  Y: 0</span>
                <span style="margin:0 16px;">|</span>
                <span id="mspaint-size">800 x 600</span>
                <span style="margin:0 16px;">|</span>
                <span id="mspaint-tool-status">Tool: Pencil</span>
                <div style="flex:1;"></div>
                <span id="mspaint-zoom">100%</span>
            </div>
        `;

        document.body.appendChild(paintWindow);

        // Initialize canvas
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

        // Save initial state
        saveState();

        // Setup event listeners
        setupEventListeners();

        // Make draggable
        makeDraggable(paintWindow, document.getElementById('mspaint-titlebar'));
    }

    function setupEventListeners() {
        // Tool buttons
        document.querySelectorAll('.mspaint-tool').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.tool) {
                    setTool(btn.dataset.tool);
                }
            });
        });

        // Color buttons
        document.querySelectorAll('.mspaint-color').forEach(btn => {
            btn.addEventListener('click', () => {
                setColor(btn.dataset.color);
            });
        });

        // Brush size
        document.getElementById('mspaint-brush-size').addEventListener('change', (e) => {
            brushSize = parseInt(e.target.value);
            ctx.lineWidth = brushSize;
        });

        // Canvas events
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mouseleave', onMouseUp);
        canvas.addEventListener('contextmenu', e => e.preventDefault());

        // Window controls
        document.getElementById('mspaint-close').addEventListener('click', () => {
            paintWindow.style.display = 'none';
        });
        document.getElementById('mspaint-minimize').addEventListener('click', () => {
            paintWindow.style.display = 'none';
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', onKeyDown);

        // Color palette scroll
        const palette = document.getElementById('mspaint-palette');
        palette.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                palette.scrollLeft += e.deltaY;
            }
        });
    }

    function setTool(tool) {
        currentTool = tool;
        document.querySelectorAll('.mspaint-tool').forEach(btn => {
            btn.dataset.active = btn.dataset.tool === tool ? 'true' : 'false';
            btn.style.border = btn.dataset.tool === tool ? '2px solid #000080' : '1px solid #FFF 1px solid #808080 1px solid #808080';
        });
        document.getElementById('mspaint-tool-status').textContent = `Tool: ${tool.charAt(0).toUpperCase() + tool.slice(1)}`;
        
        // Update cursor
        const cursors = {
            pencil: 'crosshair',
            brush: 'crosshair',
            airbrush: 'crosshair',
            eraser: 'cell',
            fill: 'copy',
            picker: 'crosshair',
            zoom: 'zoom-in',
            text: 'text',
            select: 'default',
            'freeform-select': 'crosshair',
            line: 'crosshair',
            curve: 'crosshair',
            rectangle: 'crosshair',
            'rounded-rect': 'crosshair',
            ellipse: 'crosshair',
            polygon: 'crosshair'
        };
        canvas.style.cursor = cursors[tool] || 'crosshair';
    }

    function setColor(color) {
        currentColor = color;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        document.querySelectorAll('.mspaint-color').forEach(btn => {
            btn.dataset.active = btn.dataset.color === color ? 'true' : 'false';
            btn.style.border = btn.dataset.color === color ? '2px solid #000080' : '1px solid #FFF 1px solid #808080 1px solid #808080';
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

        // Save state for shape tools
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
            case 'polygon':
                // Handle on click, not drag
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
                // Quadratic curve with middle control point
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
        // Use backtick (`) key instead of Escape to close window (Escape exits fullscreen)
        if (e.key === '`' && paintWindow && paintWindow.style.display !== 'none') {
            paintWindow.style.display = 'none';
        }
        // Global keybind to toggle paint window: Ctrl+Shift+P
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            if (paintWindow && paintWindow.style.display !== 'none') {
                paintWindow.style.display = 'none';
            } else {
                createPaintWindow();
            }
        }
        // Forward slash (/) to open paint window for testing
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Prevent triggering when typing in inputs
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

    // Export for external triggering
    window.MSPaintClone = {
        show: createPaintWindow,
        hide: () => paintWindow && (paintWindow.style.display = 'none'),
        toggle: () => paintWindow && paintWindow.style.display !== 'none' ? 
            (paintWindow.style.display = 'none') : createPaintWindow()
    };

    // Global keybind to toggle paint window - register immediately on load
    function onGlobalKeyDown(e) {
        // Ctrl+Shift+P to toggle paint window
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            if (paintWindow && paintWindow.style.display !== 'none') {
                paintWindow.style.display = 'none';
            } else {
                createPaintWindow();
            }
            return;
        }
        // Forward slash (/) to open paint window for testing
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Prevent triggering when typing in inputs
            const target = e.target;
            if (!(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                e.preventDefault();
                createPaintWindow();
            }
            return;
        }
        // Backtick (`) to close paint window
        if (e.key === '`' && paintWindow && paintWindow.style.display !== 'none') {
            paintWindow.style.display = 'none';
            return;
        }
    }
    document.addEventListener('keydown', onGlobalKeyDown);

    // Check for Desmos calculator and hook in
    function checkDesmos() {
        console.log('[MSPaint] checkDesmos called, Desmos:', window.Desmos ? Object.keys(window.Desmos) : 'undefined');
        if (window.Desmos && (window.Desmos.Calculator || window.Desmos.GraphingCalculator)) {
            // Hook into Desmos
            const CalcClass = window.Desmos.Calculator || window.Desmos.GraphingCalculator;
            console.log('[MSPaint] Found Calculator class:', CalcClass);
            const originalGraph = CalcClass.prototype.setExpression;
            if (originalGraph) {
                CalcClass.prototype.setExpression = function(state) {
                    if (state && (state.latex === 'x=miku' || state.latex === 'teto')) {
                        console.log('[MSPaint] Easter egg triggered via setExpression:', state.latex);
                        setTimeout(() => createPaintWindow(), 100);
                    }
                    return originalGraph.call(this, state);
                };
                console.log('[MSPaint] Hooked setExpression');
            } else {
                console.log('[MSPaint] setExpression not found on prototype');
            }
            
            // Also watch for expression changes
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' && e.key === 'Enter') {
                    const val = e.target.value.toLowerCase().trim();
                    if (val === 'teto' || val === 'x=miku') {
                        console.log('[MSPaint] Easter egg triggered via input:', val);
                        setTimeout(() => createPaintWindow(), 100);
                    }
                }
            });
            console.log('[MSPaint] Desmos hooks installed');
        } else {
            console.log('[MSPaint] Desmos not ready yet');
        }
    }

    // Auto-initialize when Desmos loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkDesmos);
    } else {
        checkDesmos();
    }

    // Also poll for Desmos
    const desmosInterval = setInterval(() => {
        if (window.Desmos) {
            console.log('[MSPaint] Desmos detected:', Object.keys(window.Desmos));
            clearInterval(desmosInterval);
            checkDesmos();
        }
    }, 500);

    // Also poll for calculator instances in the DOM
    const instanceInterval = setInterval(() => {
        // Check for calculator instances in the DOM
        const calcElements = document.querySelectorAll('.dcg-calc-basic-main, .dcg-calc-basic-main-wrapper, [data-dcg-calculator]');
        if (calcElements.length > 0) {
            console.log('[MSPaint] Found calculator DOM elements:', calcElements.length);
            clearInterval(instanceInterval);
            hookCalculatorInstances();
        }
    }, 500);

    function hookCalculatorInstances() {
        // Try to find calculator controllers in the DOM
        const controllers = document.querySelectorAll('[data-dcg-controller]');
        console.log('[MSPaint] Found controllers:', controllers.length);
        
        // Also try to find Desmos calculator instances
        if (window.Desmos && window.Desmos.Calculator) {
            console.log('[MSPaint] Desmos.Calculator found');
        }
        
        // Try to find calculator instances in the window
        if (window.calculator) {
            console.log('[MSPaint] Found window.calculator');
            hookCalculator(window.calculator);
        }
        
        // Check for Desmos calculator instance in global scope
        if (window.Desmos && window.Desmos.GraphingCalculator) {
            // Try to find instances
            const instances = document.querySelectorAll('.dcg-calc-basic-main');
            console.log('[MSPaint] Found calculator instances:', instances.length);
        }
    }
    
    function hookCalculator(calc) {
        if (calc && calc.controller && calc.controller.model) {
            console.log('[MSPaint] Hooking calculator instance');
            // Hook into the controller's setExpression
            const originalSetExpression = calc.controller.setExpression;
            if (originalSetExpression) {
                calc.controller.setExpression = function(state) {
                    if (state && (state.latex === 'x=miku' || state.latex === 'teto')) {
                        console.log('[MSPaint] Easter egg triggered via setExpression:', state.latex);
                        setTimeout(() => createPaintWindow(), 100);
                    }
                    return originalSetExpression.call(this, state);
                };
            }
        }
    }
})
();