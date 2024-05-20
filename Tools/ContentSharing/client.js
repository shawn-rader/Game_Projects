document.addEventListener('DOMContentLoaded', async () => {
    const contentArea = document.getElementById('content-area');
    const clientUUID = new URLSearchParams(window.location.search).get('uuid');
    document.getElementById('client-uuid').innerText = `Client UUID: ${clientUUID}`;
    let config = {};
    let zoomLevel = 1;

    async function fetchConfig() {
        const response = await fetch('/config.json');
        config = await response.json();
    }

    async function fetchUpdates() {
        const response = await fetch(`/fetchUpdates/${clientUUID}`);
        const data = await response.json();
        contentArea.innerHTML = data.content;
        zoomLevel = data.zoom || 1;
        contentArea.scrollLeft = data.position?.x || 0;
        contentArea.scrollTop = data.position?.y || 0;
        const zoomableContent = contentArea.querySelector('.zoomable-content');
        if (zoomableContent) {
            zoomableContent.style.transform = `scale(${zoomLevel})`;
        }
    }

    // Fetch configuration
    await fetchConfig();

    // Fetch updates every configurable interval
    setInterval(fetchUpdates, config.updateInterval);

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
        }
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
});
