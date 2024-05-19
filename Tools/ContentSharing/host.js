document.addEventListener('DOMContentLoaded', async () => {
    const contentArea = document.getElementById('content-area');
    const generateClientButton = document.getElementById('generate-client-button');
    const copyClientURLButton = document.getElementById('copy-client-url-button');
    const launchClientPageButton = document.getElementById('launch-client-page-button');
    const addContentButton = document.getElementById('add-content-button');
    const addContentDialog = document.getElementById('add-content-dialog');
    const addImageButton = document.getElementById('add-image-button');
    const fileInput = document.getElementById('file-input');
    const closeBtn = document.querySelector('.close');
    const cancelButton = document.getElementById('cancel-button');

    let uuid = null;
    let clients = [];
    let config = {};

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
                    zoom: 1, // add zoom functionality
                    position: { x: 0, y: 0 } // add position functionality
                })
            });
        });
    }

    function enableButtons() {
        copyClientURLButton.disabled = false;
        launchClientPageButton.disabled = false;
        addContentButton.disabled = false;
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
        fileInput.click();
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
    
            console.log('Uploading file with UUID:', uuid);
            console.log('formData file:', formData.get('file'));
    
            try {
                const response = await fetch(`/uploadFile/${uuid}`, {
                    method: 'POST',
                    body: formData
                });
    
                if (response.ok) {
                    const fileURL = await response.text();
                    contentArea.innerHTML = `<img src="${fileURL}" alt="Uploaded Content">`;
                    addContentDialog.style.display = 'none';
                } else {
                    console.error('Failed to upload file');
                }
            } catch (err) {
                console.error('Error during file upload:', err);
            }
        }
    });
    
    closeBtn.addEventListener('click', () => {
        addContentDialog.style.display = 'none';
    });

    cancelButton.addEventListener('click', () => {
        addContentDialog.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === addContentDialog) {
            addContentDialog.style.display = 'none';
        }
    });

    // Fetch configuration
    await fetchConfig();

    // Simulate content update every configurable interval
    setInterval(updateClients, config.updateInterval);
});
