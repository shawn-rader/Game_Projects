const express = require('express');
const path = require('path');

const app = express();
const port = 3000; // You can change this port if needed

// Serve static files from the /home/bitnami/game_projects directory
app.use(express.static('/home/bitnami/game_projects'));

app.get('/', (req, res) => {
  res.sendFile(path.join('/home/bitnami/game_projects', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
