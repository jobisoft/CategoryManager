#!/bin/bash

set -eux

# Get the path to the containing dir
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

cd "$SCRIPT_DIR"

im_resize() {
    # resize the original icon to $1x$1 px
    convert "../images/catman/catman.png" -resize "$1x$1" "../src/images/icon-$1px.png"
}

im_resize 64
im_resize 32
im_resize 16
