#!/usr/bin/env bash

# Checks to see if packages are installed
# If not, installs them
if [[ ! -d "./node_modules" ]]; then
  npm install
fi

node visual-testing/imgdiff.js $1 $2 $3 $4 $5 $6 $7 $8 $9 &

wait

# clear

# Ask user if they want the directory to be deleted
read -p "Do you want to delete the directory? (y/n) " -r

if [[ $REPLY =~ ^[Yy]$ ]]
then
  rm -rf "images/"
fi

clear