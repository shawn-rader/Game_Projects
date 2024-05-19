#!/bin/bash

# Navigate to the project directory
cd /home/bitnami/game_projects

# Pull the latest code from GitHub
git pull origin master

# Install dependencies
npm install

# Check if the server is already running and kill it if it is
if pgrep -f "node server.js" > /dev/null
then
    echo "Server is running. Restarting server..."
    pkill -f "node server.js"
else
    echo "Server is not running. Starting server..."
fi

# Start the server in the background and log output
nohup npm start > /home/bitnami/game_projects/server.log 2>&1 &