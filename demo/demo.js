const localAgentPath = '../assets/agents/'; // Define path once
window.CLIPPY_CDN = localAgentPath; // Set global variable (belt)

// --- Logging Setup ---
const logContainer = document.getElementById('log-container');
function log(message) {
    console.log(message);
    if (logContainer) {
        logContainer.innerHTML += message + '<br>';
        logContainer.scrollTop = logContainer.scrollHeight;
    } else {
        console.error("Log container not found!"); // Add check
    }
}
log('Demo script started.');
// --- End Logging Setup ---

// --- Control Panel Elements ---
const prevAgentButton = document.getElementById('prev-agent');
const nextAgentButton = document.getElementById('next-agent');
const currentAgentNameSpan = document.getElementById('current-agent-name');
const speakInput = document.getElementById('speak-input');
const speakButton = document.getElementById('speak-button');
const animationListDiv = document.getElementById('animation-list');
// --- End Control Panel Elements ---


const availableAgents = ['Bonzi', 'Clippy', 'F1', 'Genie', 'Genius', 'Links', 'Merlin', 'Peedy', 'Rocky', 'Rover'];
let currentAgent;
let currentAgentName;
let currentAgentIndex = -1; // Keep track of the current agent index

function updateAgentDisplay() {
    if (currentAgentIndex !== -1) {
        currentAgentNameSpan.textContent = availableAgents[currentAgentIndex];
    } else {
        currentAgentNameSpan.textContent = 'None';
    }
}

function updateAnimationList(agent) {
    log(`Updating animations for ${agent.path}...`);
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
    } else {
        animationListDiv.innerHTML = '<span>No animations available.</span>';
    }
     log(`Found animations: ${animations.join(', ')}`);
}


function loadAgentByIndex(index) {
    if (index < 0 || index >= availableAgents.length) {
        log(`Invalid agent index: ${index}`);
        return;
    }

    const name = availableAgents[index];
    log(`Attempting to load agent: ${name} (Index: ${index}) from ${localAgentPath}...`);

    // Hide the previous agent immediately if it exists
    if (currentAgent) {
        log(`Hiding previous agent: ${currentAgentName}`);
        currentAgent.hide(true); // Hide fast, no animation
    }

    // Clear animation list while loading
    animationListDiv.innerHTML = '<span>Loading animations...</span>';
    currentAgentNameSpan.textContent = `Loading ${name}...`;


    clippy.load(name, function (agent) {
        log(`Agent "${name}" loaded successfully.`);
        currentAgent = agent;
        currentAgentName = name;
        currentAgentIndex = index; // Update the current index

        updateAgentDisplay(); // Update the name in the panel
        updateAnimationList(agent); // Populate animation list

        log(`Showing agent "${name}"...`);
        agent.show();
        // No automatic actions anymore, user controls via panel
        // setupActions(); // Remove this line

    }, function(error) {
        log(`ERROR loading agent "${name}": ${error || 'Unknown error'}`);
        // If loading fails, revert display
        updateAgentDisplay();
        animationListDiv.innerHTML = '<span>Failed to load agent.</span>';
        // Try loading the previous one if possible? Or just stay blank? For now, stay blank.
        currentAgent = null;
        currentAgentName = null;
        // Keep currentAgentIndex as is, so next/prev works relative to the failed attempt

    }, localAgentPath);
}

// --- Event Listeners ---

nextAgentButton.addEventListener('click', () => {
    let nextIndex = (currentAgentIndex + 1) % availableAgents.length;
    loadAgentByIndex(nextIndex);
});

prevAgentButton.addEventListener('click', () => {
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

// --- Initial Load ---
// Load the first agent (Clippy) initially instead of random
const initialAgentName = 'Clippy';
const initialIndex = availableAgents.indexOf(initialAgentName);
if (initialIndex !== -1) {
     log(`Choosing initial agent: ${initialAgentName}`);
     loadAgentByIndex(initialIndex);
} else {
    log('Clippy not found in available agents, loading the first one.');
    loadAgentByIndex(0); // Load the first agent if Clippy isn't there
}

// Remove the old setupActions function as it's no longer needed
/*
function setupActions() {
    // ... old code removed ...
}
*/

// Remove the old random agent loading
/*
function getRandomAgent() {
    var r = Math.floor(Math.random() * availableAgents.length);
    return availableAgents[r];
}
log('Choosing random agent...');
loadAgent(getRandomAgent());
*/