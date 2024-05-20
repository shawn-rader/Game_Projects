document.addEventListener('DOMContentLoaded', async () => {
    const contentArea = document.getElementById('content-area');
    const generateClientButton = document.getElementById('generate-client-button');
    const copyClientURLButton = document.getElementById('copy-client-url-button');
    const launchClientPageButton = document.getElementById('launch-client-page-button');
    const addImageButton = document.getElementById('add-image-button');
    const resetContentButton = document.getElementById('reset-content-button');
    const loadingBarDialog = document.getElementById('loading-bar-dialog');
    const fileInputImage = document.getElementById('file-input-image');

    let uuid = null;
    let clients = [];
    let config = {};
    let zoomLevel = 1;

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
        addImageButton.style.display = 'inline';
        resetContentButton.style.display = 'inline';
        copyClientURLButton.disabled = false;
        launchClientPageButton.disabled = false;
        addImageButton.disabled = false;
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

    addImageButton.addEventListener('click', async () => {
        const clipboardItems = await navigator.clipboard.read();
        const imageItem = clipboardItems.find(item => item.types.includes('image/png'));
        if (imageItem) {
            const userConfirmed = confirm('An image is available in the clipboard. Do you want to use it?');
            if (userConfirmed) {
                const blob = await imageItem.getType('image/png');
                const file = new File([blob], 'clipboard_image.png', { type: 'image/png' });
                uploadImage(file);
            } else {
                fileInputImage.click();
            }
        } else {
            fileInputImage.click();
        }
    });

    fileInputImage.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadImage(file);
        }
    });

    async function uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            loadingBarDialog.style.display = 'block';
            const response = await fetch(`/uploadFile/${uuid}`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const fileURL = await response.text();
                contentArea.innerHTML = `<div class="zoomable-content"><img src="${fileURL}" alt="Uploaded Content" style="max-width:100%; max-height:100%; display:block; margin:auto;"></div>`;
            } else {
                console.error('Failed to upload file');
            }
        } catch (err) {
            console.error('Error during file upload:', err);
        } finally {
            loadingBarDialog.style.display = 'none';
        }
    }

    // Zoom functionality
    contentArea.addEventListener('wheel', (event) => {
        if (event.ctrlKey) {
            event.preventDefault();
            const zoomableContent = contentArea.querySelector('.zoomable-content');
            if (zoomableContent) {
                const rect = contentArea.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const offsetX = (centerX + contentArea.scrollLeft) / zoomLevel;
                const offsetY = (centerY + contentArea.scrollTop) / zoomLevel;
                zoomLevel += event.deltaY * -0.01;
                zoomableContent.style.transform = `scale(${zoomLevel})`;
                contentArea.scrollLeft = offsetX * zoomLevel - centerX;
                contentArea.scrollTop = offsetY * zoomLevel - centerY;
            }
            updateClients();
        }
    });

    // Recenter functionality
    contentArea.addEventListener('click', (event) => {
        if (event.ctrlKey && event.button === 0) {
            event.preventDefault();
            const zoomableContent = contentArea.querySelector('.zoomable-content');
            if (zoomableContent) {
                const rect = contentArea.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const clickY = event.clientY - rect.top;
                const offsetX = (clickX + contentArea.scrollLeft) / zoomLevel;
                const offsetY = (clickY + contentArea.scrollTop) / zoomLevel;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                contentArea.scrollLeft = offsetX * zoomLevel - centerX;
                contentArea.scrollTop = offsetY * zoomLevel - centerY;
            }
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
