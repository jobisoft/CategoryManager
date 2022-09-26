#/bin/bash

set -eux

# Build XPI file

# Get the path to the containing dir
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

# XPI filename
OUTPUT_FILE='category-manager-ng.xpi'

cd "$SCRIPT_DIR"
cd ..

scripts/gen-icons.sh

rm -f "$OUTPUT_FILE"

cd src

zip -r ../"$OUTPUT_FILE" *
