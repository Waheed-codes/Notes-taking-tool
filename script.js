let state = {
    notebooks: [],
    selectedNotebookId: null,
    activeTab: "notes",
};

const el = {
    addNotebookBtn: document.getElementById("addnotebook"),
    sidebarContainer: document.getElementById("subbook"),
    workspace: document.getElementById("workspace"),
    emptyState: document.getElementById("empty-state"),
    titleInput: document.getElementById("notebook-title-input"),
    notesTextarea: document.getElementById("notes-textarea"),
    tabBtns: document.querySelectorAll(".tab-btn"),
    tabPanels: document.querySelectorAll(".tab-panel"),
    newTaskInput: document.getElementById("new-task-input"),
    addTaskBtn: document.getElementById("add-task-btn"),
    incompleteList: document.getElementById("incomplete-tasks-list"),
    completedList: document.getElementById("completed-tasks-list"),
    incompleteCount: document.getElementById("incomplete-count"),
    completedCount: document.getElementById("completed-count"),
    canvas: document.getElementById("draw-canvas"),
    canvasColor: document.getElementById("canvas-color"),
    canvasSize: document.getElementById("canvas-size"),
    canvasClear: document.getElementById("canvas-clear"),
    toolBtns: document.querySelectorAll(".tool-btn"),
};

const ctx = el.canvas.getContext("2d");

const saveState = () =>
    localStorage.setItem("notebook_state", JSON.stringify(state));

const loadState = () => {
    try {
        const saved = localStorage.getItem("notebook_state");
        if (saved) state = JSON.parse(saved);
    } catch (e) {
        console.error("Could not load state from storage", e);
    }
};

const escapeHtml = (str) =>
    String(str).replace(
        /[&<>"']/g,
        (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[c],
    );

function findNotebook(id, list = state.notebooks) {
    for (const nb of list) {
        if (nb.id === id) return nb;
        if (nb.children && nb.children.length) {
            const found = findNotebook(id, nb.children);
            if (found) return found;
        }
    }
    return null;
}

function findContainerArray(id, list = state.notebooks) {
    for (const nb of list) {
        if (nb.id === id) return list;
        if (nb.children && nb.children.length) {
            const found = findContainerArray(id, nb.children);
            if (found) return found;
        }
    }
    return null;
}

function getActiveNotebook() {
    return state.selectedNotebookId
        ? findNotebook(state.selectedNotebookId)
        : null;
}

function getFirstNotebookId(list = state.notebooks) {
    if (!list.length) return null;
    return list[0].id;
}

function renderNotebookTree(list, depth = 0) {
    return list
        .map((nb) => {
            const hasChildren = !!(nb.children && nb.children.length);
            const isActive = nb.id === state.selectedNotebookId;
            const expanded = nb.expanded !== false;
            return `
            <div class="notebook-node">
                <div class="notebook-item ${isActive ? "active" : ""}" onclick="openNotebook('${nb.id}')">
                    <span class="expand-toggle ${hasChildren ? "" : "invisible"}" onclick="event.stopPropagation(); toggleExpand('${nb.id}')">${hasChildren ? (expanded ? "▾" : "▸") : ""}</span>
                    <span class="notebook-item-title">${escapeHtml(nb.name) || "Untitled Notebook"}</span>
                    <span class="notebook-actions">
                        <button class="icon-btn" title="Add sub-notebook" onclick="event.stopPropagation(); addChildNotebook('${nb.id}')">+</button>
                        <button class="icon-btn danger" title="Delete notebook" onclick="event.stopPropagation(); deleteNotebook('${nb.id}')">&times;</button>
                    </span>
                </div>
                ${hasChildren && expanded ? `<div class="notebook-children">${renderNotebookTree(nb.children, depth + 1)}</div>` : ""}
            </div>
        `;
        })
        .join("");
}

function renderSidebar() {
    el.sidebarContainer.innerHTML = renderNotebookTree(state.notebooks);
}

function toggleExpand(id) {
    const nb = findNotebook(id);
    if (!nb) return;
    nb.expanded = nb.expanded === false ? true : false;
    saveState();
    renderSidebar();
}

function openNotebook(id) {
    state.selectedNotebookId = id;
    saveState();
    renderSidebar();

    const notebook = getActiveNotebook();
    if (notebook) {
        el.workspace.classList.add("active");
        el.emptyState.classList.add("hidden");

        el.titleInput.value = notebook.name;
        el.notesTextarea.value = notebook.notes || "";

        changeTab(state.activeTab);
        renderTaskList();
        loadCanvasForNotebook(notebook);
    } else {
        el.workspace.classList.remove("active");
        el.emptyState.classList.remove("hidden");
    }
}

function createNotebookObject(name) {
    return {
        id: "notebook_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        name,
        notes: "",
        tasks: [],
        canvas: null,
        children: [],
        expanded: true,
    };
}

function createNewNotebook() {
    const nb = createNotebookObject("Notebook " + (state.notebooks.length + 1));
    state.notebooks.push(nb);
    saveState();
    openNotebook(nb.id);
}

function addChildNotebook(parentId) {
    const parent = findNotebook(parentId);
    if (!parent) return;
    parent.children = parent.children || [];
    const nb = createNotebookObject("Notebook " + (parent.children.length + 1));
    parent.children.push(nb);
    parent.expanded = true;
    saveState();
    openNotebook(nb.id);
}

function deleteNotebook(id) {
    const container = findContainerArray(id);
    if (!container) return;
    const index = container.findIndex((n) => n.id === id);
    if (index !== -1) container.splice(index, 1);

    if (state.selectedNotebookId === id) {
        state.selectedNotebookId = getFirstNotebookId();
    }
    saveState();
    openNotebook(state.selectedNotebookId);
}

el.titleInput.addEventListener("input", (e) => {
    const notebook = getActiveNotebook();
    if (notebook) {
        notebook.name = e.target.value;
        saveState();
        renderSidebar();
    }
});

el.notesTextarea.addEventListener("input", (e) => {
    const notebook = getActiveNotebook();
    if (notebook) {
        notebook.notes = e.target.value;
        saveState();
    }
});

function changeTab(tabName) {
    state.activeTab = tabName;
    saveState();

    el.tabBtns.forEach((btn) =>
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName),
    );
    el.tabPanels.forEach((panel) =>
        panel.classList.toggle("active", panel.id === "tab-" + tabName),
    );

    if (tabName === "canvas") {
        const notebook = getActiveNotebook();
        if (notebook) loadCanvasForNotebook(notebook);
    }
}

el.tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => changeTab(btn.getAttribute("data-tab")));
});

function renderTaskList() {
    const notebook = getActiveNotebook();
    if (!notebook) return;
    notebook.tasks = notebook.tasks || [];

    const createTaskHTML = (task) => `
        <li class="task-item ${task.completed ? "completed" : ""}">
            <div class="task-item-left" onclick="toggleTask('${task.id}')">
                <div class="task-checkbox"></div>
                <span class="task-text">${escapeHtml(task.text)}</span>
            </div>
            <button class="delete-task-btn" title="Delete task" onclick="deleteTask('${task.id}')">&times;</button>
        </li>
    `;

    const incompleteTasks = notebook.tasks.filter((t) => !t.completed);
    const completedTasks = notebook.tasks.filter((t) => t.completed);

    el.incompleteList.innerHTML = incompleteTasks.map(createTaskHTML).join("");
    el.completedList.innerHTML = completedTasks.map(createTaskHTML).join("");

    el.incompleteCount.textContent = incompleteTasks.length;
    el.completedCount.textContent = completedTasks.length;
}

function addNewTask() {
    const text = el.newTaskInput.value.trim();
    const notebook = getActiveNotebook();
    if (!text || !notebook) return;

    notebook.tasks = notebook.tasks || [];
    notebook.tasks.push({
        id: "task_" + Date.now(),
        text,
        completed: false,
    });

    saveState();
    el.newTaskInput.value = "";
    renderTaskList();
}

function toggleTask(taskId) {
    const notebook = getActiveNotebook();
    if (!notebook) return;

    const task = notebook.tasks.find((t) => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveState();
        renderTaskList();
    }
}

function deleteTask(taskId) {
    const notebook = getActiveNotebook();
    if (!notebook) return;

    notebook.tasks = notebook.tasks.filter((t) => t.id !== taskId);
    saveState();
    renderTaskList();
}

el.addTaskBtn.addEventListener("click", addNewTask);
el.newTaskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addNewTask();
});
el.addNotebookBtn.addEventListener("click", createNewNotebook);

function getCanvasPos(e) {
    const rect = el.canvas.getBoundingClientRect();
    const scaleX = el.canvas.width / rect.width;
    const scaleY = el.canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
    };
}

let isDrawing = false;
let lastPos = { x: 0, y: 0 };
let startPos = { x: 0, y: 0 };
let currentTool = "pen";
let snapshot = null;
let strokePoints = [];

el.toolBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        currentTool = btn.getAttribute("data-tool");
        el.toolBtns.forEach((b) => b.classList.toggle("active", b === btn));
        el.canvas.classList.toggle("grid-active", currentTool === "auto");
        el.canvas.classList.toggle("eraser-active", currentTool === "eraser");
    });
});

function startDraw(e) {
    isDrawing = true;
    startPos = getCanvasPos(e);
    lastPos = startPos;

    if (currentTool === "auto") {
        strokePoints = [startPos];
    }
    if (
        currentTool === "line" ||
        currentTool === "rectangle" ||
        currentTool === "circle" ||
        currentTool === "auto"
    ) {
        snapshot = ctx.getImageData(0, 0, el.canvas.width, el.canvas.height);
    }
}

function moveDraw(e) {
    if (!isDrawing) return;
    const pos = getCanvasPos(e);

    ctx.strokeStyle = el.canvasColor.value;
    ctx.lineWidth = el.canvasSize.value;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";

    if (currentTool === "pen") {
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos = pos;
        return;
    }

    if (currentTool === "eraser") {
        ctx.lineWidth = el.canvasSize.value * 3;
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        lastPos = pos;
        return;
    }

    if (currentTool === "auto") {
        strokePoints.push(pos);
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos = pos;
        return;
    }

    ctx.putImageData(snapshot, 0, 0);
    drawShape(currentTool, startPos, pos);
}

function drawShape(tool, from, to) {
    ctx.beginPath();
    if (tool === "line") {
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
    } else if (tool === "rectangle") {
        const x = Math.min(from.x, to.x);
        const y = Math.min(from.y, to.y);
        const w = Math.abs(to.x - from.x);
        const h = Math.abs(to.y - from.y);
        ctx.rect(x, y, w, h);
    } else if (tool === "circle") {
        const cx = (from.x + to.x) / 2;
        const cy = (from.y + to.y) / 2;
        const rx = Math.abs(to.x - from.x) / 2;
        const ry = Math.abs(to.y - from.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    } else if (tool === "triangle") {
        const x = Math.min(from.x, to.x);
        const y = Math.min(from.y, to.y);
        const w = Math.abs(to.x - from.x);
        const h = Math.abs(to.y - from.y);
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
    }
    ctx.stroke();
}

function redrawFreehand(points) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
}

// Classifies a freehand stroke as a line, rectangle, circle, or triangle
// based on its overall straightness, closedness, and how it hugs its
// bounding box. Returns null if nothing matches confidently, in which
// case the original freehand stroke is kept as-is.
function classifyShape(points) {
    if (points.length < 4) return null;

    const first = points[0];
    const last = points[points.length - 1];
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });
    const width = maxX - minX;
    const height = maxY - minY;
    const diag = Math.hypot(width, height) || 1;
    const closingGap = dist(first, last);
    const isClosed = closingGap < Math.max(diag * 0.25, 18);

    if (!isClosed) {
        const lineLen = dist(first, last) || 1;
        let maxDev = 0;
        points.forEach((p) => {
            const d =
                Math.abs(
                    (last.y - first.y) * p.x -
                    (last.x - first.x) * p.y +
                    last.x * first.y -
                    last.y * first.x,
                ) / lineLen;
            maxDev = Math.max(maxDev, d);
        });
        if (maxDev < Math.max(lineLen * 0.08, 6)) {
            return { type: "line", from: first, to: last };
        }
        return null;
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = width / 2 || 1;
    const ry = height / 2 || 1;
    const distances = points.map((p) =>
        Math.hypot((p.x - cx) / rx, (p.y - cy) / ry),
    );
    const avg = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance =
        distances.reduce((a, b) => a + (b - avg) ** 2, 0) / distances.length;

    if (variance < 0.035 && avg > 0.55) {
        return {
            type: "circle",
            from: { x: minX, y: minY },
            to: { x: maxX, y: maxY },
        };
    }

    const edgeThreshold = Math.max(diag * 0.07, 8);
    const edgeHits = points.filter(
        (p) =>
            Math.abs(p.x - minX) < edgeThreshold ||
            Math.abs(p.x - maxX) < edgeThreshold ||
            Math.abs(p.y - minY) < edgeThreshold ||
            Math.abs(p.y - maxY) < edgeThreshold,
    ).length;

    if (edgeHits / points.length > 0.65) {
        return {
            type: "rectangle",
            from: { x: minX, y: minY },
            to: { x: maxX, y: maxY },
        };
    }

    return {
        type: "triangle",
        from: { x: minX, y: minY },
        to: { x: maxX, y: maxY },
    };
}

function endDraw() {
    if (!isDrawing) return;
    isDrawing = false;

    if (currentTool === "auto") {
        const result = classifyShape(strokePoints);
        ctx.putImageData(snapshot, 0, 0);
        ctx.strokeStyle = el.canvasColor.value;
        ctx.lineWidth = el.canvasSize.value;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (result) {
            drawShape(result.type, result.from, result.to);
        } else {
            redrawFreehand(strokePoints);
        }
        strokePoints = [];
    }

    snapshot = null;
    saveCanvasToNotebook();
}

function saveCanvasToNotebook() {
    const notebook = getActiveNotebook();
    if (!notebook) return;
    notebook.canvas = el.canvas.toDataURL();
    saveState();
}

function loadCanvasForNotebook(notebook) {
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    if (notebook && notebook.canvas) {
        const img = new Image();
        img.onload = () =>
            ctx.drawImage(img, 0, 0, el.canvas.width, el.canvas.height);
        img.src = notebook.canvas;
    }
}

el.canvas.addEventListener("pointerdown", startDraw);
el.canvas.addEventListener("pointermove", moveDraw);
window.addEventListener("pointerup", endDraw);
el.canvas.addEventListener("pointerleave", endDraw);

el.canvasClear.addEventListener("click", () => {
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    saveCanvasToNotebook();
});

window.openNotebook = openNotebook;
window.deleteNotebook = deleteNotebook;
window.addChildNotebook = addChildNotebook;
window.toggleExpand = toggleExpand;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;

function init() {
    loadState();
    renderSidebar();

    const activeExists =
        state.selectedNotebookId && findNotebook(state.selectedNotebookId);
    if (activeExists) {
        openNotebook(state.selectedNotebookId);
    } else {
        const firstId = getFirstNotebookId();
        if (firstId) {
            openNotebook(firstId);
        } else {
            el.workspace.classList.remove("active");
            el.emptyState.classList.remove("hidden");
        }
    }
}

init();
