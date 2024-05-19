#!/bin/bash
git pull origin master
npm install
sudo /opt/bitnami/ctlscript.sh restart