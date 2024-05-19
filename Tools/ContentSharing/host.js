document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('content-area');
    const generateClientButton = document.getElementById('generate-client-button');
    
    let uuid = generateUUID();
    let clients = [];

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
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

    generateClientButton.addEventListener('click', () => {
        const clientUUID = generateUUID();
        clients.push({ uuid: clientUUID });
        console.log(`Client generated: /Tools/ContentSharing/ContentSharingClient.html?uuid=${clientUUID}`);
    });

    // Simulate content update every second
    setInterval(updateClients, 1000);
});
