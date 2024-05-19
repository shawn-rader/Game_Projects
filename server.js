const express = require('express');
const path = require('path');
const app = express();
const port = 3000; // You can change this port if needed

let clientsData = {};

app.use(express.json());
app.use(express.static('/home/bitnami/game_projects'));

// Serve the main index.html
app.get('/', (req, res) => {
  res.sendFile(path.join('/home/bitnami/game_projects', 'index.html'));
});

// Serve the host and client pages
app.get('/Tools/ContentSharing/ContentSharingHost.html', (req, res) => {
  res.sendFile(path.join('/home/bitnami/game_projects/Tools/ContentSharing', 'ContentSharingHost.html'));
});

app.get('/Tools/ContentSharing/ContentSharingClient.html', (req, res) => {
  res.sendFile(path.join('/home/bitnami/game_projects/Tools/ContentSharing', 'ContentSharingClient.html'));
});

// API endpoint to update client data
app.post('/updateClient/:uuid', (req, res) => {
  const { uuid } = req.params;
  clientsData[uuid] = req.body;
  res.sendStatus(200);
});

// API endpoint to fetch updates for a client
app.get('/fetchUpdates/:uuid', (req, res) => {
  const { uuid } = req.params;
  res.json(clientsData[uuid] || {});
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
