document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('content-area');
    const clientUUID = new URLSearchParams(window.location.search).get('uuid');
    document.getElementById('client-uuid').innerText = `Client UUID: ${clientUUID}`;

    function fetchUpdates() {
        fetch(`/fetchUpdates/${clientUUID}`)
            .then(response => response.json())
            .then(data => {
                contentArea.innerHTML = data.content;
                // Apply zoom and position changes
            });
    }

    // Fetch updates every second
    setInterval(fetchUpdates, 1000);
});
