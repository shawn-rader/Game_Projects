document.addEventListener('DOMContentLoaded', () => {
    const horizontalSizeInput = document.getElementById('horizontal-size');
    const verticalSizeInput = document.getElementById('vertical-size');
    const mapNameInput = document.getElementById('map-name');
    const fileNameInput = document.getElementById('file-name');
    const saveButton = document.getElementById('save-button');
    const loadFileButton = document.getElementById('load-file-button');
    const loadFileInput = document.getElementById('load-file');
    const mapGrid = document.getElementById('map-grid');
    const mapKeysContainer = document.getElementById('map-keys');
    const usageButton = document.getElementById('usage-button');
    const usageDialog = document.getElementById('usage-dialog');
    const closeDialogButton = document.getElementById('close-dialog');
    const selectedTileTooltip = document.getElementById('selected-tile-tooltip');
    const undoButton = document.getElementById('undo-button');
    const redoButton = document.getElementById('redo-button');
    const resetMapButton = document.getElementById('reset-map-button');
    const confirmResetDialog = document.getElementById('confirm-reset-dialog');
    const confirmResetButton = document.getElementById('confirm-reset');
    const cancelResetButton = document.getElementById('cancel-reset');

    let selectedKey = '';
    let isMouseDown = false;
    let undoStack = [];
    let redoStack = [];
    let mapKeys = {};

    function createMapKeyList() {
        for (const category in mapKeys) {
            const categoryTitle = document.createElement('h4');
            categoryTitle.textContent = category;
            mapKeysContainer.appendChild(categoryTitle);

            for (const key in mapKeys[category]) {
                const button = document.createElement('button');
                button.textContent = `${key}: ${mapKeys[category][key].description}`;
                button.dataset.key = key;
                button.classList.add('map-key-button');
                mapKeysContainer.appendChild(button);
            }
        }
    }

    function fetchMapKeys() {
        fetch('mapKeys.json')
            .then(response => response.json())
            .then(data => {
                mapKeys = data;
                createMapKeyList();
            })
            .catch(error => console.error('Error fetching map keys:', error));
    }

    function createMapGrid(rows, cols) {
        mapGrid.innerHTML = '';
        mapGrid.style.gridTemplateRows = `repeat(${rows}, 20px)`;
        mapGrid.style.gridTemplateColumns = `repeat(${cols}, 20px)`;

        if (rows === 0 || cols === 0) {
            mapGrid.classList.add('empty');
        } else {
            mapGrid.classList.remove('empty');
        }

        for (let i = 0; i < rows * cols; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (e.button === 0) {
                    isMouseDown = true;
                    cell.textContent = selectedKey;
                } else if (e.button === 2) {
                    changeContiguousCells(cell, selectedKey);
                }
            });
            cell.addEventListener('mouseover', () => {
                if (isMouseDown) {
                    cell.textContent = selectedKey;
                }
            });
            cell.addEventListener('mouseenter', () => {
                cell.classList.add('hover');
            });
            cell.addEventListener('mouseleave', () => {
                cell.classList.remove('hover');
            });
            cell.addEventListener('mouseup', () => {
                if (isMouseDown) {
                    isMouseDown = false;
                    saveState();
                }
            });
            mapGrid.appendChild(cell);
        }

        // Prevent default drag selection
        document.addEventListener('mouseup', () => {
            if (isMouseDown) {
                isMouseDown = false;
                saveState();
            }
        });
        document.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    function saveMap() {
        const rows = parseInt(verticalSizeInput.value);
        const cols = parseInt(horizontalSizeInput.value);
        const mapName = mapNameInput.value;
        const fileName = fileNameInput.value || 'map.txt';
        
        let mapContent = `${mapName}\n`;

        for (let i = 0; i < rows; i++) {
            let rowContent = '';
            for (let j = 0; j < cols; j++) {
                const cell = mapGrid.children[i * cols + j];
                rowContent += cell.textContent || ' ';
            }
            mapContent += rowContent + (i < rows - 1 ? '\n' : '');
        }

        const blob = new Blob([mapContent], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
    }

    function loadMap(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const content = event.target.result.split('\n');
            const mapName = content.shift();
            const mapData = content.map(line => line.padEnd(content[0].length, ' '));

            const rows = mapData.length;
            const cols = mapData[0].length;

            mapNameInput.value = mapName;
            fileNameInput.value = file.name;
            horizontalSizeInput.value = cols;
            verticalSizeInput.value = rows;

            createMapGrid(rows, cols);

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const cell = mapGrid.children[i * cols + j];
                    cell.textContent = mapData[i][j];
                }
            }

            saveState();
        };
        reader.readAsText(file);
    }

    function changeContiguousCells(startCell, newType) {
        const rows = parseInt(verticalSizeInput.value);
        const cols = parseInt(horizontalSizeInput.value);
        const cells = Array.from(mapGrid.children);
        const startIdx = cells.indexOf(startCell);
        const startType = startCell.textContent;
        
        if (startType === newType) return;

        const queue = [startIdx];
        const visited = new Set();

        const directions = [-1, 1, -cols, cols];

        while (queue.length > 0) {
            const idx = queue.shift();
            if (visited.has(idx)) continue;

            visited.add(idx);
            const cell = cells[idx];
            if (cell && cell.textContent === startType) {
                cell.textContent = newType;

                directions.forEach(direction => {
                    const neighborIdx = idx + direction;
                    if (
                        neighborIdx >= 0 && neighborIdx < cells.length &&
                        !visited.has(neighborIdx) &&
                        ((direction === -1 && idx % cols !== 0) || 
                        (direction === 1 && (idx + 1) % cols !== 0) ||
                        direction === -cols || direction === cols)
                    ) {
                        queue.push(neighborIdx);
                    }
                });
            }
        }

        saveState();
    }

    function saveState() {
        const state = Array.from(mapGrid.children).map(cell => cell.textContent || ' ');
        undoStack.push(state);
        redoStack = []; // Clear the redo stack on new action
    }

    function restoreState(state) {
        Array.from(mapGrid.children).forEach((cell, idx) => {
            cell.textContent = state[idx];
        });
    }

    function undo() {
        if (undoStack.length > 1) {
            redoStack.push(undoStack.pop());
            restoreState(undoStack[undoStack.length - 1]);
        }
    }

    function redo() {
        if (redoStack.length > 0) {
            const state = redoStack.pop();
            undoStack.push(state);
            restoreState(state);
        }
    }

    function resetMap() {
        horizontalSizeInput.value = 2;
        verticalSizeInput.value = 2;
        mapNameInput.value = '';
        fileNameInput.value = '';
        createMapGrid(2, 2);
        saveState();
    }

    mapKeysContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('map-key-button')) {
            selectedKey = e.target.dataset.key;
            mapKeysContainer.querySelectorAll('.map-key-button').forEach(button => {
                button.classList.remove('selected');
            });
            e.target.classList.add('selected');
        }
    });

    mapKeysContainer.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('map-key-button')) {
            e.target.classList.add('active');
        }
    });

    mapKeysContainer.addEventListener('mouseup', (e) => {
        if (e.target.classList.contains('map-key-button')) {
            e.target.classList.remove('active');
        }
    });

    saveButton.addEventListener('click', saveMap);

    loadFileButton.addEventListener('click', () => {
        loadFileInput.click();
    });

    loadFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'text/plain') {
            loadMap(file);
        }
    });

    loadFileButton.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        loadFileButton.style.backgroundColor = '#444';
    });

    loadFileButton.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        loadFileButton.style.backgroundColor = '';
    });

    loadFileButton.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        loadFileButton.style.backgroundColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'text/plain') {
            loadMap(file);
        }
    });

    horizontalSizeInput.addEventListener('input', () => {
        validateSizeInput(horizontalSizeInput);
        const rows = parseInt(verticalSizeInput.value) || 0;
        const cols = parseInt(horizontalSizeInput.value) || 0;
        createMapGrid(rows, cols);
        saveState();
    });

    verticalSizeInput.addEventListener('input', () => {
        validateSizeInput(verticalSizeInput);
        const rows = parseInt(verticalSizeInput.value) || 0;
        const cols = parseInt(horizontalSizeInput.value) || 0;
        createMapGrid(rows, cols);
        saveState();
    });

    function validateSizeInput(input) {
        if (input.value < 1 || isNaN(input.value)) {
            input.setCustomValidity("Size must be a number greater than or equal to 1");
            input.style.borderColor = "red";
        } else {
            input.setCustomValidity("");
            input.style.borderColor = "";
        }
    }

    usageButton.addEventListener('click', () => {
        usageDialog.style.display = 'flex';
    });

    closeDialogButton.addEventListener('click', () => {
        usageDialog.style.display = 'none';
    });

    usageDialog.addEventListener('click', (e) => {
        if (e.target === usageDialog) {
            usageDialog.style.display = 'none';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (selectedKey) {
            selectedTileTooltip.style.display = 'block';
            selectedTileTooltip.style.left = `${e.pageX + 10}px`;
            selectedTileTooltip.style.top = `${e.pageY + 10}px`;
            selectedTileTooltip.textContent = selectedKey;
        } else {
            selectedTileTooltip.style.display = 'none';
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undo();
        } else if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            redo();
        }
    });

    undoButton.addEventListener('click', undo);
    redoButton.addEventListener('click', redo);

    resetMapButton.addEventListener('click', () => {
        confirmResetDialog.style.display = 'flex';
    });

    confirmResetButton.addEventListener('click', () => {
        confirmResetDialog.style.display = 'none';
        resetMap();
    });

    cancelResetButton.addEventListener('click', () => {
        confirmResetDialog.style.display = 'none';
    });

    confirmResetDialog.addEventListener('click', (e) => {
        if (e.target === confirmResetDialog) {
            confirmResetDialog.style.display = 'none';
        }
    });

    fetchMapKeys();
    createMapGrid(2, 2); // Initial grid matching default sizes
    saveState();
});
