document.addEventListener('DOMContentLoaded', async () => {
    const contentArea = document.getElementById('content-area');
    const generateClientButton = document.getElementById('generate-client-button');
    const copyClientURLButton = document.getElementById('copy-client-url-button');
    const launchClientPageButton = document.getElementById('launch-client-page-button');
    const addContentButton = document.getElementById('add-content-button');
    const addContentDialog = document.getElementById('add-content-dialog');
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

    function createClientFolder(uuid) {
        fetch(`/createClientFolder/${uuid}`, { method: 'POST' })
            .then(response => {
                if (response.ok) {
                    console.log(`Folder created for client: ${uuid}`);
                } else {
                    console.error('Failed to create folder for client.');
                }
            });
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

    generateClientButton.addEventListener('click', () => {
        uuid = generateUUID();
        clients.push({ uuid: uuid });
        createClientFolder(uuid);
        enableButtons();

        const clientURL = `${window.location.origin}/Tools/ContentSharing/ContentSharingClient.html?uuid=${uuid}`;
        copyClientURLButton.setAttribute('data-url', clientURL);
        launchClientPageButton.setAttribute('data-url', clientURL);
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
