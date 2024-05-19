const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000; // You can change this port if needed

let clientsData = {};
let lastClientAccess = {};

// Read configuration file
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

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
  lastClientAccess[uuid] = Date.now();
  res.sendStatus(200);
});

// API endpoint to fetch updates for a client
app.get('/fetchUpdates/:uuid', (req, res) => {
  const { uuid } = req.params;
  res.json(clientsData[uuid] || {});
});

// Create folder for new client
app.post('/createClientFolder/:uuid', (req, res) => {
  const { uuid } = req.params;
  const folderPath = path.join('/home/bitnami/game_projects/Tools/ContentSharing/HostedData', uuid);
  fs.mkdir(folderPath, { recursive: true }, (err) => {
    if (err) {
      console.error('Failed to create folder:', err);
      res.sendStatus(500);
    } else {
      console.log(`Folder created: ${folderPath}`);
      res.sendStatus(200);
    }
  });
});

// Delete unused folders
function deleteUnusedFolders() {
  const folderPath = '/home/bitnami/game_projects/Tools/ContentSharing/HostedData';
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('Failed to read directory:', err);
      return;
    }

    const now = Date.now();
    files.forEach(file => {
      const filePath = path.join(folderPath, file);
      const lastAccessTime = lastClientAccess[file];

      if (!lastAccessTime || (now - lastAccessTime) > config.deleteAfter) { // configurable deleteAfter time
        fs.rm(filePath, { recursive: true, force: true }, (err) => {
          if (err) {
            console.error('Failed to delete folder:', err);
          } else {
            console.log(`Deleted folder: ${filePath}`);
            delete lastClientAccess[file];
            delete clientsData[file];
          }
        });
      }
    });
  });
}

// Check and delete unused folders every configurable interval
setInterval(deleteUnusedFolders, config.checkInterval);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
