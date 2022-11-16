#!/bin/bash

if [ ! -d "dist" ]; then
    npm i
    npm run build    
fi 