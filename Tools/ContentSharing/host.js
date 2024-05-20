document.addEventListener('DOMContentLoaded', async () => {
    const contentArea = document.getElementById('content-area');
    const generateClientButton = document.getElementById('generate-client-button');
    const copyClientURLButton = document.getElementById('copy-client-url-button');
    const launchClientPageButton = document.getElementById('launch-client-page-button');
    const addContentButton = document.getElementById('add-content-button');
    const resetContentButton = document.getElementById('reset-content-button');
    const addContentDialog = document.getElementById('add-content-dialog');
    const addImageButton = document.getElementById('add-image-button');
    const addTextButton = document.getElementById('add-text-button');
    const addCSVButton = document.getElementById('add-csv-button');
    const addWebpageButton = document.getElementById('add-webpage-button');
    const fileInputImage = document.getElementById('file-input-image');
    const fileInputText = document.getElementById('file-input-text');
    const fileInputCSV = document.getElementById('file-input-csv');
    const webpageDialog = document.getElementById('webpage-dialog');
    const webpageURLInput = document.getElementById('webpage-url-input');
    const addWebpageConfirmButton = document.getElementById('add-webpage-confirm-button');
    const closeBtn = document.querySelector('.close');
    const cancelButton = document.getElementById('cancel-button');

    let uuid = null;
    let clients = [];
    let config = {};
    let zoomLevel = 1;
    let isPanning = false;
    let startX, startY, scrollLeft, scrollTop;

    async function fetchConfig() {
        const response = await fetch('/config.json');
        config = await response.json();
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async function createClientFolder(uuid) {
        const response = await fetch(`/createClientFolder/${uuid}`, { method: 'POST' });
        if (!response.ok) {
            throw new Error('Failed to create client folder');
        }
        return response.ok;
    }

    async function folderExists(uuid) {
        const response = await fetch(`/folderExists/${uuid}`);
        if (!response.ok && response.status !== 404) {
            throw new Error('Error checking if folder exists');
        }
        return response.ok;
    }

    async function generateClientUUID() {
        let newUUID;
        do {
            newUUID = generateUUID();
            const exists = await folderExists(newUUID);
            console.log(`Checking folder existence for UUID ${newUUID}: ${exists}`);
        } while (await folderExists(newUUID));
        return newUUID;
    }

    function updateClients() {
        clients.forEach(client => {
            fetch(`/updateClient/${client.uuid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: contentArea.innerHTML,
                    zoom: zoomLevel,
                    position: { x: contentArea.scrollLeft, y: contentArea.scrollTop }
                })
            });
        });
    }

    function enableButtons() {
        copyClientURLButton.style.display = 'inline';
        launchClientPageButton.style.display = 'inline';
        addContentButton.style.display = 'inline';
        copyClientURLButton.disabled = false;
        launchClientPageButton.disabled = false;
        addContentButton.disabled = false;
        resetContentButton.disabled = false;
    }

    generateClientButton.addEventListener('click', async () => {
        if (!uuid) {
            try {
                uuid = await generateClientUUID();
                console.log('Generated UUID:', uuid);
                const folderCreated = await createClientFolder(uuid);
                if (folderCreated) {
                    clients.push({ uuid: uuid });
                    enableButtons();

                    const clientURL = `${window.location.origin}/Tools/ContentSharing/ContentSharingClient.html?uuid=${uuid}`;
                    copyClientURLButton.setAttribute('data-url', clientURL);
                    launchClientPageButton.setAttribute('data-url', clientURL);

                    generateClientButton.disabled = true;
                    generateClientButton.style.display = 'none';
                }
            } catch (error) {
                console.error('Error generating client folder:', error);
            }
        }
    });

    copyClientURLButton.addEventListener('click', () => {
        const url = copyClientURLButton.getAttribute('data-url');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                alert('Client URL copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        } else {
            const tempInput = document.createElement('input');
            tempInput.style.position = 'absolute';
            tempInput.style.left = '-9999px';
            tempInput.value = url;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            alert('Client URL copied to clipboard');
        }
    });

    launchClientPageButton.addEventListener('click', () => {
        const url = launchClientPageButton.getAttribute('data-url');
        window.open(url, '_blank');
    });

    addContentButton.addEventListener('click', () => {
        addContentDialog.style.display = 'block';
    });

    addImageButton.addEventListener('click', () => {
        fileInputImage.click();
    });

    addTextButton.addEventListener('click', () => {
        fileInputText.click();
    });

    addCSVButton.addEventListener('click', () => {
        fileInputCSV.click();
    });

    addWebpageButton.addEventListener('click', () => {
        webpageDialog.style.display = 'block';
    });

    fileInputImage.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
    
            try {
                const response = await fetch(`/uploadFile/${uuid}`, {
                    method: 'POST',
                    body: formData
                });
    
                if (response.ok) {
                    const fileURL = await response.text();
                    contentArea.innerHTML = `<div class="zoomable-content"><img src="${fileURL}" alt="Uploaded Content" style="max-width:100%; max-height:100%; display:block; margin:auto;"></div>`;
                    addContentDialog.style.display = 'none';
                } else {
                    console.error('Failed to upload file');
                }
            } catch (err) {
                console.error('Error during file upload:', err);
            }
        }
    });

    fileInputText.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`/uploadFile/${uuid}`, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const fileURL = await response.text();
                    const responseText = await fetch(fileURL);
                    const textContent = await responseText.text();
                    contentArea.innerHTML = `<div class="zoomable-content"><pre style="white-space: pre-wrap; word-wrap: break-word; text-align: left;">${textContent}</pre></div>`;
                    addContentDialog.style.display = 'none';
                } else {
                    console.error('Failed to upload file');
                }
            } catch (err) {
                console.error('Error during file upload:', err);
            }
        }
    });

    fileInputCSV.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`/uploadFile/${uuid}`, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const fileURL = await response.text();
                    const responseCSV = await fetch(fileURL);
                    const csvContent = await responseCSV.text();
                    const rows = csvContent.split('\n').map(row => row.split(','));

                    let tableHTML = '<div class="zoomable-content"><table style="width: 100%; border-collapse: collapse;">';
                    rows.forEach(row => {
                        tableHTML += '<tr>';
                        row.forEach(cell => {
                            tableHTML += `<td style="border: 1px solid black; padding: 8px;">${cell}</td>`;
                        });
                        tableHTML += '</tr>';
                    });
                    tableHTML += '</table></div>';

                    contentArea.innerHTML = tableHTML;
                    addContentDialog.style.display = 'none';
                } else {
                    console.error('Failed to upload file');
                }
            } catch (err) {
                console.error('Error during file upload:', err);
            }
        }
    });

    addWebpageConfirmButton.addEventListener('click', () => {
        const url = webpageURLInput.value;
        if (url) {
            contentArea.innerHTML = `<div class="zoomable-content"><iframe src="${url}" style="width:100%; height:100%; border:none;"></iframe></div>`;
            webpageDialog.style.display = 'none';
            addContentDialog.style.display = 'none';
        }
    });

    closeBtn.addEventListener('click', () => {
        addContentDialog.style.display = 'none';
        webpageDialog.style.display = 'none';
    });

    cancelButton.addEventListener('click', () => {
        addContentDialog.style.display = 'none';
        webpageDialog.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === addContentDialog) {
            addContentDialog.style.display = 'none';
        }
        if (event.target === webpageDialog) {
            webpageDialog.style.display = 'none';
        }
    });

    // Zoom functionality
    contentArea.addEventListener('wheel', (event) => {
        if (event.ctrlKey) {
            event.preventDefault();
            zoomLevel += event.deltaY * -0.01;
            zoomLevel = Math.min(Math.max(0.5, zoomLevel), 3);
            const zoomableContent = contentArea.querySelector('.zoomable-content');
            if (zoomableContent) {
                zoomableContent.style.transform = `scale(${zoomLevel})`;
                zoomableContent.style.transformOrigin = '0 0';
            }
            updateClients();
        }
    });

    // Panning functionality
    contentArea.addEventListener('mousedown', (event) => {
        if (zoomLevel > 1) {
            isPanning = true;
            startX = event.pageX - contentArea.offsetLeft;
            startY = event.pageY - contentArea.offsetTop;
            scrollLeft = contentArea.scrollLeft;
            scrollTop = contentArea.scrollTop;
        }
    });

    contentArea.addEventListener('mouseleave', () => {
        isPanning = false;
    });

    contentArea.addEventListener('mouseup', () => {
        isPanning = false;
    });

    contentArea.addEventListener('mousemove', (event) => {
        if (isPanning) {
            event.preventDefault();
            const x = event.pageX - contentArea.offsetLeft;
            const y = event.pageY - contentArea.offsetTop;
            const walkX = (x - startX) * 1; // multiply by speed factor if needed
            const walkY = (y - startY) * 1; // multiply by speed factor if needed
            contentArea.scrollLeft = scrollLeft - walkX;
            contentArea.scrollTop = scrollTop - walkY;
            updateClients();
        }
    });

    resetContentButton.addEventListener('click', () => {
        zoomLevel = 1;
        contentArea.scrollLeft = 0;
        contentArea.scrollTop = 0;
        const zoomableContent = contentArea.querySelector('.zoomable-content');
        if (zoomableContent) {
            zoomableContent.style.transform = 'scale(1)';
        }
        updateClients();
    });

    // Ensure the content area is responsive
    function adjustContentAreaSize() {
        const newWidth = window.innerWidth * 0.8; // Adjust as needed
        const newHeight = window.innerHeight * 0.8; // Adjust as needed
        contentArea.style.width = `${newWidth}px`;
        contentArea.style.height = `${newHeight}px`;
    }

    window.addEventListener('resize', adjustContentAreaSize);
    adjustContentAreaSize();

    // Fetch configuration
    await fetchConfig();

    // Simulate content update every configurable interval
    setInterval(updateClients, config.updateInterval);
});
