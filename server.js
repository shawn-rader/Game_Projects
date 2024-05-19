const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { exec } = require('child_process');
const app = express();
const port = 3000; // You can change this port if needed

let clientsData = {};
let lastClientAccess = {};

// Read configuration file
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Utility function to log messages with timestamp
function logWithTimestamp(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

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

// Check if folder exists
app.get('/folderExists/:uuid', (req, res) => {
  const { uuid } = req.params;
  const folderPath = path.join('/home/bitnami/game_projects/Tools/ContentSharing/HostedData', uuid);
  if (fs.existsSync(folderPath)) {
    logWithTimestamp(`Folder exists: ${folderPath}`);
    res.sendStatus(200);
  } else {
    logWithTimestamp(`Folder does not exist: ${folderPath}`);
    res.sendStatus(404);
  }
});

// Create folder for new client
app.post('/createClientFolder/:uuid', (req, res) => {
  const { uuid } = req.params;
  const folderPath = path.join('/home/bitnami/game_projects/Tools/ContentSharing/HostedData', uuid);
  fs.mkdir(folderPath, { recursive: true }, (err) => {
    if (err) {
      logWithTimestamp(`Failed to create folder: ${err}`);
      res.sendStatus(500);
    } else {
      logWithTimestamp(`Folder created: ${folderPath}`);
      res.sendStatus(200);
    }
  });
});

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uuid = req.body.uuid;
    const folderPath = path.join('/home/bitnami/game_projects/Tools/ContentSharing/HostedData', uuid);
    if (!fs.existsSync(folderPath)) {
      logWithTimestamp(`UUID folder does not exist: ${folderPath}`);
      return cb(new Error('UUID folder does not exist'), false);
    }

    // Clear the folder before saving the new file
    try {
      fs.rmSync(folderPath, { recursive: true, force: true });
      fs.mkdirSync(folderPath, { recursive: true });
      logWithTimestamp(`Cleared and recreated folder: ${folderPath}`);
    } catch (err) {
      logWithTimestamp(`Failed to clear and recreate folder: ${err}`);
      return cb(new Error('Failed to clear and recreate folder'), false);
    }

    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

app.post('/uploadFile', upload.single('file'), (req, res) => {
  const uuid = req.body.uuid;
  const folderPath = path.join('/home/bitnami/game_projects/Tools/ContentSharing/HostedData', uuid);
  const fileURL = path.join(folderPath, req.file.filename);
  logWithTimestamp(`File uploaded to: ${fileURL}`);
  res.send(fileURL);
});

// Delete unused folders
function deleteUnusedFolders() {
  const folderPath = '/home/bitnami/game_projects/Tools/ContentSharing/HostedData';
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      logWithTimestamp(`Failed to read directory: ${err}`);
      return;
    }

    const now = Date.now();
    files.forEach(file => {
      const filePath = path.join(folderPath, file);
      const lastAccessTime = lastClientAccess[file];

      if (!lastAccessTime || (now - lastAccessTime) > config.deleteAfter) { // configurable deleteAfter time
        fs.rm(filePath, { recursive: true, force: true }, (err) => {
          if (err) {
            logWithTimestamp(`Failed to delete folder: ${err}`);
          } else {
            logWithTimestamp(`Deleted folder: ${filePath}`);
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

// Log process information on server start
const pid = process.pid;
exec(`ps -p ${pid} -o pid,ppid,cmd,etime,%mem,%cpu`, (err, stdout, stderr) => {
  if (err) {
    logWithTimestamp(`Error fetching process info: ${err}`);
    return;
  }
  logWithTimestamp(`Server process info:\n${stdout}`);
});

app.listen(port, () => {
  logWithTimestamp(`Server is running at http://localhost:${port}`);
});
