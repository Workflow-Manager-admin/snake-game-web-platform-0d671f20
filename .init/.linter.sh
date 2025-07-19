#!/bin/bash
cd /home/kavia/workspace/code-generation/snake-game-web-platform-0d671f20/snake_game_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

