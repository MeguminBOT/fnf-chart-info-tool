# FNF Chart Info Tool
Tool webpage can be found here: https://meguminbot.github.io/fnf-chart-info-tool/

The **FNF Chart Info Tool** is a web-based utility designed to analyze and display information about chart files used in **Friday Night Funkin'** (FNF). This tool supports multiple FNF engines and provides information about the chart, including note counts, BPM, scroll speeds, and more.

Mainly intended to for [Funkipedia](https://fridaynightfunking.fandom.com/) Wiki editors!

## Features

- **Supported Engines**:
  - V-Slice Engine
  - Psych Engine
  - Codename Engine
- **Upcoming Support**:
  - Engines: Kade Engine and more.
  - Scroll Speed Change detection for all engines.
  - Saving the output.

- **Key Features**:
  - Drag-and-drop or file upload support for `.json` chart files.
  - Automatically detects the engine type for the uploaded chart files.
  - Supports metadata files for V-Slice and Codename engines.
  - Displays detailed chart information, including:
    - BPM (with changes, if applicable).
    - Scroll speeds.
    - Note counts per key. (For player side)
    - Maximum combo (For player side).
    - Maximum score based on score multiplier (For player side)
      - Various FNF mods and engines may have different score for a perfect hit, you can customize the multiplier.

## How to Use

1. **Upload Files**:
   - Drag and drop `.json` files into the designated area, or click the "Select Files" button to upload.
   - You can upload a single chart file or a combination of chart and metadata files (for V-Slice and Codename engines).
     - V-Slice and Codename engine requires the metadata file to display some information like Song name, BPM and Scroll Speed.

2. **View Chart Information**:
   - The tool will process the uploaded files and display information about the chart, including:
     - Detected engine type.
     - Song name, BPM, and scroll speed.
     - Note counts for each key.
     - Maximum combo and score.

3. **Customize Score Multiplier**:
   - Enter a custom score multiplier in the input field and click "Update" to recalculate the maximum score. Defaults to 350.

## Installation
This tool is hosted on GitHub Pages and can be accessed directly via your browser. No installation is required.
