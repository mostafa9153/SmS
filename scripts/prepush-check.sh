#!/bin/sh
# Type-checks exactly what is committed (HEAD), not the working tree, so a change that was
# forgotten in a commit fails here instead of on CI / Vercel.
set -e
root=$(git rev-parse --show-toplevel)
cd "$root"
dir="$root/.git/prepush-check"
rm -rf "$dir" && mkdir -p "$dir"
trap 'rm -rf "$dir"' EXIT
git archive HEAD | tar -x -C "$dir"
cd "$dir"
echo "pre-push: type-checking the committed code..."
# node_modules is found by walking up from .git/prepush-check to the repo root
NODE_OPTIONS=--max-old-space-size=4096 node "$root/node_modules/typescript/bin/tsc" --noEmit -p .
echo "pre-push: types OK"
