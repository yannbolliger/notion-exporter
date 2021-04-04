#!/usr/bin/env node

"use strict"

// Manually created bin file as an entry-point into the CLI.
// Inspired by prettier.
require("../dist").main(process.argv.slice(2))
