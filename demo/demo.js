const localAgentPath = '../assets/agents/';
window.CLIPPY_CDN = localAgentPath;

// --- Logging Setup ---
const logContainer = document.getElementById('log-container');
const logContent = document.getElementById('log-content');
function log(message) {
    console.log(message);
    if (logContent) {
        logContent.innerHTML += message + '<br>';
        logContainer.scrollTop = logContainer.scrollHeight;
    } else {
        console.error("Log content area not found!");
    }
}
log('Demo script started.');
// --- End Logging Setup ---

// --- Control Panel Elements ---
const rotateLeftButton = document.getElementById('rotate-left');
const rotateRightButton = document.getElementById('rotate-right');
const agentCarouselDiv = document.getElementById('agent-carousel');
const speakInput = document.getElementById('speak-input');
const speakButton = document.getElementById('speak-button');
const animationListDiv = document.getElementById('animation-list');
const controlPanel = document.getElementById('control-panel');
// --- End Control Panel Elements ---

// --- Adjuster Panel Elements ---
const adjusterPanel = document.getElementById('preview-adjuster');
const adjusterAgentName = document.getElementById('adjuster-agent-name');
const spritePreviewContainer = document.getElementById('sprite-preview-container');
const spriteSheetImg = document.getElementById('sprite-sheet');
const cropBox = document.getElementById('crop-box');
const valX = document.getElementById('val-x');
const valY = document.getElementById('val-y');
const valW = document.getElementById('val-w');
const valH = document.getElementById('val-h');
const adjusterLogButton = document.getElementById('log-adjuster-values');
const saveSettingsButton = document.getElementById('save-settings');
const loadSettingsButton = document.getElementById('load-settings');
const resetSettingsButton = document.getElementById('reset-settings');
// --- End Adjuster Panel Elements ---

// --- Agent Data ---
const availableAgents = ['Bonzi', 'Clippy', 'F1', 'Genie', 'Genius', 'Links', 'Merlin', 'Peedy', 'Rocky', 'Rover'];
const defaultAgentPreviewData = { // Keep defaults for resetting
    'Bonzi':  { x: 0, y: 0, w: 160, h: 120 },
    'Clippy': { x: 0, y: 0, w: 124, h: 93 },
    'F1':     { x: 0, y: 0, w: 100, h: 100 },
    'Genie':  { x: 0, y: 128, w: 128, h: 128 },
    'Genius': { x: 0, y: 0, w: 100, h: 100 },
    'Links':  { x: 0, y: 0, w: 100, h: 100 },
    'Merlin': { x: 0, y: 128, w: 128, h: 128 },
    'Peedy':  { x: 128, y: 0, w: 128, h: 128 },
    'Rocky':  { x: 0, y: 0, w: 100, h: 100 },
    'Rover':  { x: 0, y: 0, w: 100, h: 100 }
};
let agentPreviewData = {}; // Will be loaded/populated

let currentAgent;
let currentAgentName;
let currentAgentIndex = -1;
const visibleSlots = 4;
const slotSize = 100; // Carousel slot size (outer mask)
let selectedSlotElement = null; // Reference to the selected agent's outer slot div

// --- Persistence ---
const PANEL_STATE_PREFIX = 'clippyPanelState_';

function savePanelState(panelId, panelElement) {
    if (!panelElement) return;
    const rect = panelElement.getBoundingClientRect();
    const state = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
    };
    try {
        localStorage.setItem(PANEL_STATE_PREFIX + panelId, JSON.stringify(state));
        // log(`Saved state for ${panelId}`); // Optional: for debugging
    } catch (e) {
        log(`Error saving state for ${panelId}: ${e.message}`);
    }
}

function loadPanelState(panelId, panelElement) {
    if (!panelElement) return;
    const savedState = localStorage.getItem(PANEL_STATE_PREFIX + panelId);
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            panelElement.style.left = `${state.left}px`;
            panelElement.style.top = `${state.top}px`;
            panelElement.style.width = `${state.width}px`;
            panelElement.style.height = `${state.height}px`;
            // Ensure bottom/right are not interfering
            panelElement.style.bottom = 'auto';
            panelElement.style.right = 'auto';
            log(`Loaded state for ${panelId}`);
        } catch (e) {
            log(`Error loading state for ${panelId}: ${e.message}`);
        }
    } else {
        // log(`No saved state found for ${panelId}`); // Optional: for debugging
    }
}

function loadSettings() {
    const saved = localStorage.getItem('clippyAgentPreviewData');
    if (saved) {
        try {
            agentPreviewData = JSON.parse(saved);
            log("Loaded preview settings from localStorage.");
        } catch (e) {
            log("Error parsing saved settings, using defaults.");
            agentPreviewData = JSON.parse(JSON.stringify(defaultAgentPreviewData)); // Deep copy defaults
        }
    } else {
        log("No saved settings found, using defaults.");
        agentPreviewData = JSON.parse(JSON.stringify(defaultAgentPreviewData)); // Deep copy defaults
    }
    // Ensure all available agents have an entry
    availableAgents.forEach(name => {
        if (!agentPreviewData[name]) {
            agentPreviewData[name] = defaultAgentPreviewData[name] ?
                JSON.parse(JSON.stringify(defaultAgentPreviewData[name])) :
                { x: 0, y: 0, w: slotSize, h: slotSize }; // Fallback if not in defaults
        }
    });
}

function saveSettings() {
    try {
        localStorage.setItem('clippyAgentPreviewData', JSON.stringify(agentPreviewData));
        log("Saved preview settings to localStorage.");
    } catch (e) {
        log("Error saving settings: " + e.message);
    }
}

function resetSettings() {
     if (confirm("Reset all agent preview settings to default?")) {
         agentPreviewData = JSON.parse(JSON.stringify(defaultAgentPreviewData));
         localStorage.removeItem('clippyAgentPreviewData');
         log("Reset settings to default.");
         // Reload current agent to apply defaults visually
         if (currentAgentIndex !== -1) {
             const tempIndex = currentAgentIndex;
             currentAgent = null; // Force reload
             currentAgentIndex = -1;
             loadAgentByIndex(tempIndex);
         } else {
             updateCarouselDisplay(-1); // Update display if no agent loaded
         }
     }
}

// --- Carousel Logic ---

// Helper to apply crop data to a specific slot's inner div AND size the outer slot
function applyCropAndSizeToSlot(outerSlotDiv, innerSpriteCropDiv, agentName) {
    const previewData = agentPreviewData[agentName] || { x: 0, y: 0, w: slotSize, h: slotSize };

    // Size the outer slot
    outerSlotDiv.style.width = `${previewData.w}px`;
    outerSlotDiv.style.height = `${previewData.h}px`;

    // Configure the inner crop div
    innerSpriteCropDiv.style.width = `${previewData.w}px`;
    innerSpriteCropDiv.style.height = `${previewData.h}px`;
    innerSpriteCropDiv.style.backgroundPosition = `-${previewData.x}px -${previewData.y}px`;
}

// Updates the preview in the carousel for the currently selected agent
function updateCarouselSlotPreview(agentName) {
    if (!selectedSlotElement) return;
    const spriteCropDiv = selectedSlotElement.querySelector('.sprite-crop');
    if (spriteCropDiv) {
        // Apply size to outer slot and crop to inner div
        applyCropAndSizeToSlot(selectedSlotElement, spriteCropDiv, agentName);
    }
}

function updateCarouselDisplay(selectedIndex) {
    agentCarouselDiv.innerHTML = '';
    selectedSlotElement = null;
    const numAgents = availableAgents.length;
    if (numAgents === 0) return;

    let start = selectedIndex - Math.floor(visibleSlots / 2);

    for (let i = 0; i < visibleSlots; i++) {
        let agentIdx = (start + i % numAgents + numAgents) % numAgents;
        const agentName = availableAgents[agentIdx];
        const agentMapUrl = `${window.CLIPPY_CDN}${agentName}/map.png`;
        const previewData = agentPreviewData[agentName] || { x: 0, y: 0, w: slotSize, h: slotSize }; // Get data for sizing

        // Create outer slot (mask)
        const slot = document.createElement('div');
        slot.classList.add('agent-slot');
        slot.dataset.agentIndex = agentIdx;
        slot.title = agentName;
        // Set initial size for the outer slot
        slot.style.width = `${previewData.w}px`;
        slot.style.height = `${previewData.h}px`;

        // Create inner sprite crop div
        const spriteCrop = document.createElement('div');
        spriteCrop.classList.add('sprite-crop');
        spriteCrop.style.backgroundImage = `url('${agentMapUrl}')`;

        // Apply initial crop settings AND size to inner div (redundant but ensures consistency)
        applyCropAndSizeToSlot(slot, spriteCrop, agentName); // Use the helper

        slot.appendChild(spriteCrop);

        if (agentIdx === selectedIndex) {
            slot.classList.add('selected');
            selectedSlotElement = slot;
        }

        slot.addEventListener('click', () => {
            loadAgentByIndex(agentIdx);
        });

        agentCarouselDiv.appendChild(slot);
    }
}

// --- Agent Loading ---

function updateAnimationList(agent) {
    animationListDiv.innerHTML = ''; // Clear previous list
    const animations = agent.animations();
    if (animations && animations.length > 0) {
        animations.forEach(animName => {
            const button = document.createElement('button');
            button.textContent = animName;
            button.onclick = () => {
                log(`Playing animation: ${animName}`);
                agent.play(animName);
            };
            animationListDiv.appendChild(button);
        });
         log(`Agent ${currentAgentName} animations loaded.`);
    } else {
        animationListDiv.innerHTML = '<span>No animations available.</span>';
    }
}

function loadAgentByIndex(index) {
    if (index < 0 || index >= availableAgents.length) {
        log(`Invalid agent index: ${index}`);
        return;
    }
    if (index === currentAgentIndex && currentAgent) {
        log(`Agent ${availableAgents[index]} is already loaded.`);
        return;
    }

    const name = availableAgents[index];
    log(`Attempting to load agent: ${name} (Index: ${index})...`);

    if (currentAgent) {
        log(`Hiding previous agent: ${currentAgentName}`);
        currentAgent.hide(true, () => {
             currentAgent = null;
             currentAgentName = null;
             loadAgentInternal(name, index);
        });
    } else {
         loadAgentInternal(name, index);
    }
}

function loadAgentInternal(name, index) {
    animationListDiv.innerHTML = '<span>Loading animations...</span>';
    updateCarouselDisplay(index); // Update carousel immediately

    clippy.load(name, function (agent) {
        log(`Agent "${name}" loaded successfully.`);
        currentAgent = agent;
        currentAgentName = name;
        currentAgentIndex = index;

        updateCarouselDisplay(index); // Update carousel again to confirm selection & set selectedSlotElement
        updateAnimationList(agent);
        agent.show();

        // --- Update Adjuster Panel ---
        adjusterAgentName.textContent = `Adjusting: ${name}`;
        const agentMapUrl = `${window.CLIPPY_CDN}${name}/map.png`;
        spriteSheetImg.src = agentMapUrl; // Load full sprite sheet

        // Set initial crop box from loaded/default data
        const currentPreviewData = agentPreviewData[name] || { x: 0, y: 0, w: slotSize, h: slotSize };
        cropBox.style.left = `${currentPreviewData.x}px`;
        cropBox.style.top = `${currentPreviewData.y}px`;
        cropBox.style.width = `${currentPreviewData.w}px`;
        cropBox.style.height = `${currentPreviewData.h}px`;
        updateAdjusterDisplays(currentPreviewData.x, currentPreviewData.y, currentPreviewData.w, currentPreviewData.h);

    }, function(error) {
        log(`ERROR loading agent "${name}": ${error || 'Unknown error'}`);
        animationListDiv.innerHTML = '<span>Failed to load agent.</span>';
        if (currentAgentIndex === index) {
             currentAgent = null;
             currentAgentName = null;
             currentAgentIndex = -1;
        }
        updateCarouselDisplay(currentAgentIndex);
        adjusterAgentName.textContent = 'Load Failed';
        spriteSheetImg.src = ''; // Clear image
        updateAdjusterDisplays(0,0,0,0);
    });
}

// --- Adjuster Logic ---

function updateAdjusterDisplays(x, y, w, h) {
    valX.textContent = Math.round(x);
    valY.textContent = Math.round(y);
    valW.textContent = Math.round(w);
    valH.textContent = Math.round(h);
}

function handleCropChange(x, y, w, h) {
    if (!currentAgentName) return;

    // Clamp values
    x = Math.max(0, x);
    y = Math.max(0, y);
    w = Math.max(10, w); // Ensure minimum practical size
    h = Math.max(10, h);

    // Update data object
    agentPreviewData[currentAgentName] = { x, y, w, h };

    // Update numerical displays
    updateAdjusterDisplays(x, y, w, h);

    // Update the live preview (size and crop) in the carousel
    updateCarouselSlotPreview(currentAgentName); // This now handles outer size too
}

// Dragging Logic
let isDraggingCropBox = false;
let dragStartX, dragStartY, cropStartLeft, cropStartTop;

cropBox.addEventListener('mousedown', (e) => {
    // Prevent drag if clicking on resize handles (usually bottom-right)
    // A simple check: if click is near bottom-right corner, assume resize
    const rect = cropBox.getBoundingClientRect();
    const handleSize = 15; // px tolerance for resize handle area
    if (e.clientX > rect.right - handleSize && e.clientY > rect.bottom - handleSize) {
        // Likely resize, let the browser handle it via CSS `resize`
        // We'll capture the result via ResizeObserver or mouseup
        return;
    }

    isDraggingCropBox = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    cropStartLeft = cropBox.offsetLeft;
    cropStartTop = cropBox.offsetTop;
    cropBox.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none'; // Prevent text selection

    // Add listeners to window for movement outside the box
    window.addEventListener('mousemove', handleCropDrag);
    window.addEventListener('mouseup', stopCropDrag);
});

function handleCropDrag(e) {
    if (!isDraggingCropBox) return;
    e.preventDefault(); // Prevent text selection, etc.

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    let newLeft = cropStartLeft + dx;
    let newTop = cropStartTop + dy;

    // Basic boundary check within the preview container (optional)
    // newLeft = Math.max(0, Math.min(newLeft, spritePreviewContainer.clientWidth - cropBox.offsetWidth));
    // newTop = Math.max(0, Math.min(newTop, spritePreviewContainer.clientHeight - cropBox.offsetHeight));

    cropBox.style.left = `${newLeft}px`;
    cropBox.style.top = `${newTop}px`;

    // Update data and preview
    handleCropChange(newLeft, newTop, cropBox.offsetWidth, cropBox.offsetHeight);
}

function stopCropDrag() {
    if (isDraggingCropBox) {
        isDraggingCropBox = false;
        cropBox.style.cursor = 'move';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleCropDrag);
        window.removeEventListener('mouseup', stopCropDrag);
        // Final update after drag ends
        handleCropChange(cropBox.offsetLeft, cropBox.offsetTop, cropBox.offsetWidth, cropBox.offsetHeight);
    }
}

// Resize Logic using ResizeObserver
const resizeObserver = new ResizeObserver(entries => {
    if (!isDraggingCropBox && currentAgentName) { // Only react to resize, not drag updates
        for (let entry of entries) {
            // Use contentRect for size excluding border/padding if needed, offsetWidth/Height includes border
            const newWidth = entry.target.offsetWidth;
            const newHeight = entry.target.offsetHeight;
            const currentLeft = entry.target.offsetLeft;
            const currentTop = entry.target.offsetTop;

            // Update data and preview
            handleCropChange(currentLeft, currentTop, newWidth, newHeight);
        }
    }
});

resizeObserver.observe(cropBox);

// --- Event Listeners ---

rotateRightButton.addEventListener('click', () => {
    let nextIndex = (currentAgentIndex + 1 + availableAgents.length) % availableAgents.length;
    loadAgentByIndex(nextIndex);
});

rotateLeftButton.addEventListener('click', () => {
    let prevIndex = (currentAgentIndex - 1 + availableAgents.length) % availableAgents.length;
    loadAgentByIndex(prevIndex);
});

speakButton.addEventListener('click', () => {
    const text = speakInput.value.trim();
    if (text && currentAgent) {
        log(`Agent ${currentAgentName} speaking: "${text}"`);
        currentAgent.speak(text);
        speakInput.value = ''; // Clear input after speaking
    } else if (!currentAgent) {
         log('Cannot speak, no agent loaded.');
    } else {
         log('Speak input is empty.');
    }
});

// Allow speaking by pressing Enter in the input field
speakInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        speakButton.click(); // Trigger the speak button's click event
    }
});

// Adjuster Buttons (Keep the correct log listener)
adjusterLogButton.addEventListener('click', () => {
    if (!currentAgentName) {
        log("No agent selected to log values for.");
        return;
    }
    const data = agentPreviewData[currentAgentName];
    log(`// Values for '${currentAgentName}':`);
    log(`'${currentAgentName}': { x: ${Math.round(data.x)}, y: ${Math.round(data.y)}, w: ${Math.round(data.w)}, h: ${Math.round(data.h)} },`);
});

saveSettingsButton.addEventListener('click', saveSettings);
loadSettingsButton.addEventListener('click', () => {
    loadSettings();
    // Reload current agent to apply loaded settings visually
    if (currentAgentIndex !== -1) {
        const tempIndex = currentAgentIndex;
        currentAgent = null; // Force reload
        currentAgentIndex = -1;
        loadAgentByIndex(tempIndex);
    } else {
         updateCarouselDisplay(-1); // Update display if no agent loaded
    }
});
resetSettingsButton.addEventListener('click', resetSettings);

// --- Drag and Drop for Panels ---
function makeDraggable(panelElement, headerElement, panelId) { // Added panelId
    let offsetX, offsetY, isDragging = false;

    headerElement.addEventListener('mousedown', (e) => {
        // Prevent starting drag if clicking on resize handle (simple check)
        const rect = panelElement.getBoundingClientRect();
        const handleSize = 15;
        if (e.clientX > rect.right - handleSize && e.clientY > rect.bottom - handleSize) {
            return; // Let native resize handle it
        }

        isDragging = true;
        // const rect = panelElement.getBoundingClientRect(); // Already got rect
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        document.body.style.userSelect = 'none';
        headerElement.style.cursor = 'grabbing';

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;

        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        // Boundary check (optional but recommended)
        const panelWidth = panelElement.offsetWidth;
        const panelHeight = panelElement.offsetHeight;
        newX = Math.max(0, Math.min(newX, window.innerWidth - panelWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - panelHeight));

        panelElement.style.left = `${newX}px`;
        panelElement.style.top = `${newY}px`;
        panelElement.style.bottom = 'auto';
        panelElement.style.right = 'auto';
    }

    function onMouseUp() {
        if (isDragging) {
            isDragging = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            document.body.style.userSelect = '';
            headerElement.style.cursor = 'move';

            // Save position after drag ends
            savePanelState(panelId, panelElement);
        }
        // Note: Size changes from native resize handle might need ResizeObserver
    }
}

// --- Panel Resize Observer ---
const panelResizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
        const panelElement = entry.target;
        // Find the panelId - assumes panelElement has an id matching the keys used
        const panelId = panelElement.id;
        if (panelId) {
            // Debounce saving? For now, save directly.
            // console.log(`Resized ${panelId}`); // Debugging
            savePanelState(panelId, panelElement);
        }
    }
});

// --- Initial Load ---
loadSettings(); // Load agent preview settings first

// Load panel states AFTER defining the elements
loadPanelState('log-container', logContainer);
loadPanelState('control-panel', controlPanel);
loadPanelState('preview-adjuster', adjusterPanel);

// Make panels draggable AND pass their IDs
makeDraggable(logContainer, document.getElementById('log-header'), 'log-container');
makeDraggable(controlPanel, document.getElementById('control-panel-header'), 'control-panel');
makeDraggable(adjusterPanel, document.getElementById('adjuster-header'), 'preview-adjuster');

// Observe panels for resize changes
panelResizeObserver.observe(logContainer);
panelResizeObserver.observe(controlPanel);
panelResizeObserver.observe(adjusterPanel);


// Load initial agent
const initialAgentName = 'Clippy';
let initialIndex = availableAgents.indexOf(initialAgentName);
if (initialIndex === -1 && availableAgents.length > 0) {
    initialIndex = 0;
}

if (initialIndex !== -1) {
    log(`Choosing initial agent: ${availableAgents[initialIndex]}`);
    loadAgentByIndex(initialIndex);
} else {
    log("No available agents defined.");
    updateCarouselDisplay(-1);
    animationListDiv.innerHTML = '<span>No agents available.</span>';
    adjusterAgentName.textContent = 'No agents available';
}
