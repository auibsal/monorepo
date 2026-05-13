#!/bin/bash
pnpm --filter web run dev &
pnpm --filter nexus run dev &
sleep 5
