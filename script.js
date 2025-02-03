// Node counter and history
let nodeCounter = 0;
let history = [];
let currentStep = -1;
const maxHistory = 50;

// Color helper
const colorPalette = [
    "#4CAF50", // Root
    "#2196F3", // Level 1
    "#FF9800", // Level 2
    "#E91E63", // Level 3
    "#9C27B0", // Level 4
    "#00BCD4", // Level 5
    "#FFEB3B", // Level 6
    "#795548", // Level 7
];

// SVG element for drawing lines
const svg = document.getElementById('lines');

// Get color based on depth
function getColor(depth) {
    return colorPalette[Math.min(depth, colorPalette.length - 1)] || colorPalette[0];
}

// Create initial nodes
function createInitialNodes() {
    createNode("Root", null, 400, 100, 0);
    createNode("Child 1", "node_0", 200, 200, 1);
    createNode("Child 2", "node_0", 600, 200, 1);
    createNode("Grandchild", "node_1", 300, 300, 2);
}

// Create a new node
function createNode(text, parentId, x, y, depth = 0) {
    const node = document.createElement('div');
    node.className = 'node';
    node.id = `node_${nodeCounter}`;
    node.dataset.parentId = parentId;
    node.dataset.depth = depth;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.textContent = text;

    // Set color based on depth
    node.style.backgroundColor = getColor(depth);

    // Make the node draggable
    makeDraggable(node);

    // Add double-click event to edit node text
    node.addEventListener('dblclick', () => {
        const newText = prompt("Enter new node name:", node.textContent);
        if (newText) {
            addToHistory({ type: "edit", node: node, oldText: node.textContent, newText: newText });
            node.textContent = newText;
        }
    });

    document.querySelector('.container').appendChild(node);
    nodeCounter++;

    // Add to history
    addToHistory({ type: "create", node: node });

    // Redraw lines
    redrawLines();

    return node;
}

// Make a node draggable
function makeDraggable(node) {
    if (!node) {
        console.error('Node is null or undefined');
        return;
    }

    node.draggable = true;

    // Handle the start of a drag event
    node.addEventListener('dragstart', (event) => {
        if (!event || !event.target) {
            console.error('Event or target is null or undefined');
            return;
        }

        try {
            event.dataTransfer.setData('text/plain', event.target.id);
        } catch (error) {
            console.error('Error setting data transfer data', error);
        }
    });

    // Handle the end of a drag event
    node.addEventListener('dragend', (event) => {
        if (!event || !event.target) {
            console.error('Event or target is null or undefined');
            return;
        }

        try {
            const containerRect = document.querySelector('.container').getBoundingClientRect();
            const nodeRect = node.getBoundingClientRect();

            // Calculate the relative position of the node inside the container
            const relativeX = event.clientX - containerRect.left - (nodeRect.width / 2);
            const relativeY = event.clientY - containerRect.top - (nodeRect.height / 2);

            // Set the new position of the node
            node.style.left = `${relativeX}px`;
            node.style.top = `${relativeY}px`;

            // Add to history
            addToHistory({ type: "move", node: node });

            // Redraw all lines
            redrawLines();
        } catch (error) {
            console.error('Error setting node position', error);
        }
    });
}

// Draw curved line between parent and child nodes
function drawCurvedLine(parentNode, childNode) {
    if (!parentNode || !childNode) {
        console.error('Parent or child node is null or undefined');
        return;
    }

    const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
    try {
        // Get coordinates relative to the container
        const parentRect = parentNode.getBoundingClientRect();
        const childRect = childNode.getBoundingClientRect();
        const containerRect = document.querySelector('.container').getBoundingClientRect();

        // Calculate the center of the parent and child nodes
        const parentCenterX = parentRect.left - containerRect.left + parentRect.width / 2;
        const parentCenterY = parentRect.top - containerRect.top + parentRect.height / 2;
        const childCenterX = childRect.left - containerRect.left + childRect.width / 2;
        const childCenterY = childRect.top - containerRect.top + childRect.height / 2;

        // Create Bézier curve with control points
        const controlPointOffset = 100; // Adjust this value for better curve appearance
        const controlPointX = (parentCenterX + childCenterX) / 2;
        const controlPointY = Math.min(parentCenterY, childCenterY) - controlPointOffset;

        const pathData = `M ${parentCenterX} ${parentCenterY} 
                         Q ${controlPointX} ${controlPointY}, 
                         ${childCenterX} ${childCenterY}`;

        pathElement.setAttribute("d", pathData);
        pathElement.setAttribute("stroke", getColor(parseInt(childNode.dataset.depth, 10))); // Use child node's color for the line
        pathElement.setAttribute("fill", "none");
        pathElement.setAttribute("stroke-width", "2");

        svg.appendChild(pathElement);
    } catch (error) {
        console.error('Error drawing curved line', error);
    }
}

// Redraw all lines
function redrawLines() {
    try {
        svg.innerHTML = ''; // Clear old lines

        document.querySelectorAll('.node').forEach(node => {
            const parentId = node.dataset.parentId;
            if (parentId) {
                const parentNode = document.getElementById(parentId);
                if (parentNode) drawCurvedLine(parentNode, node);
            }
        });
    } catch (error) {
        console.error('Error redrawing lines', error);
    }
}

// Undo/Redo functionality
function addToHistory(action) {
    history.push(action);
    if (history.length > maxHistory) {
        history.shift();
    }
    currentStep = history.length - 1;
    updateStatus();
}

function undo() {
    if (currentStep < 0) return;

    const action = history[currentStep];
    switch (action.type) {
        case "create":
            action.node.remove();
            break;
        case "move":
            const rect = document.querySelector('.container').getBoundingClientRect();
            const x = parseFloat(action.node.style.left) || 0;
            const y = parseFloat(action.node.style.top) || 0;
            action.node.style.left = `${x}px`;
            action.node.style.top = `${y}px`;
            break;
        case "edit":
            action.node.textContent = action.oldText;
            break;
    }

    currentStep--;
    updateStatus();
    redrawLines();
}

function redo() {
    if (currentStep >= history.length - 1) return;

    currentStep++;
    const action = history[currentStep];
    switch (action.type) {
        case "create":
            document.querySelector('.container').appendChild(action.node);
            break;
        case "move":
            const rect = document.querySelector('.container').getBoundingClientRect();
            const x = event.clientX - rect.left - (action.node.getBoundingClientRect().width / 2);
            const y = event.clientY - rect.top - (action.node.getBoundingClientRect().height / 2);
            action.node.style.left = `${x}px`;
            action.node.style.top = `${y}px`;
            break;
        case "edit":
            action.node.textContent = action.newText;
            break;
    }

    updateStatus();
    redrawLines();
}

function updateStatus() {
    document.getElementById('status').textContent =
        `Steps: ${currentStep + 1}/${history.length}`;
}

// Initialize the visualization
document.addEventListener('DOMContentLoaded', () => {
    createInitialNodes();

    // Add right-click listener to create new nodes
    document.querySelector('.container').addEventListener('contextmenu', (event) => {
        event.preventDefault(); // Prevent the default context menu

        const node = event.target.closest('.node');
        const containerRect = document.querySelector('.container').getBoundingClientRect();

        // Calculate the position relative to the container
        const x = event.clientX - containerRect.left;
        const y = event.clientY - containerRect.top;

        if (node) {
            // Create a child node with depth = parent depth + 1
            const parentDepth = parseInt(node.dataset.depth, 10);
            createNode(`Node ${nodeCounter}`, node.id, x, y, parentDepth + 1);
        } else {
            // Create a root node if no node is clicked
            createNode(`Node ${nodeCounter}`, null, x, y, 0); // Depth = 0 for root
        }
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();
            undo();
        }
        if (event.ctrlKey && event.key === 'y') {
            event.preventDefault();
            redo();
        }
    });
});