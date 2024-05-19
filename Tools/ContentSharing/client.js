document.addEventListener('DOMContentLoaded', async () => {
    const contentArea = document.getElementById('content-area');
    const clientUUID = new URLSearchParams(window.location.search).get('uuid');
    document.getElementById('client-uuid').innerText = `Client UUID: ${clientUUID}`;
    let config = {};

    async function fetchConfig() {
        const response = await fetch('/config.json');
        config = await response.json();
    }

    async function fetchUpdates() {
        const response = await fetch(`/fetchUpdates/${clientUUID}`);
        const data = await response.json();
        contentArea.innerHTML = data.content;
        // Apply zoom and position changes
    }

    // Fetch configuration
    await fetchConfig();

    // Fetch updates every configurable interval
    setInterval(fetchUpdates, config.updateInterval);
});
