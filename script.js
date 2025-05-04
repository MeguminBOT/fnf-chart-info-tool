// script.js

document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const outputArea = document.getElementById('output-area');
    const multiplierInput = document.getElementById('multiplier-input');
    const updateMultiplierButton = document.getElementById('update-multiplier');
    let scoreMultiplier = 350; // Default multiplier
    let metadataFile = null; // Store metadata file if detected

    dropArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropArea.classList.add('active');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('active');
    });

    dropArea.addEventListener('drop', (event) => {
        event.preventDefault();
        dropArea.classList.remove('active');
        const files = event.dataTransfer.files;

        if (files.length === 1) {
            const file = files[0];
            if (file.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const jsonData = JSON.parse(e.target.result);
                    processJson(jsonData);
                };
                reader.readAsText(file);
            } else {
                outputArea.textContent = 'Please upload a valid JSON file.';
            }
        } else if (files.length === 2) {
            handleMultipleFiles(files); // Handle engines with multiple files for chart data.
        } else {
            outputArea.textContent = 'Please drop one Psych Engine chart or two files for Vslice.';
        }
    });

    updateMultiplierButton.addEventListener('click', () => {
        const newMultiplier = parseInt(multiplierInput.value, 10);
        if (!isNaN(newMultiplier) && newMultiplier > 0) {
            scoreMultiplier = newMultiplier;
            alert(`Score multiplier updated to ${scoreMultiplier}`);
        } else {
            alert('Please enter a valid positive number.');
        }
    });

    function handleMultipleFiles(files) {
        let chartFile = null;
        let codenameMetadataFile = null;
        let vsliceMetadataFile = null;

        for (const file of files) {
            if (file.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const jsonData = JSON.parse(e.target.result);

                    if (isVSliceMetadata(jsonData)) {
                        vsliceMetadataFile = jsonData;
                    } else if (isCodenameMetadataFile(jsonData)) {
                        codenameMetadataFile = jsonData;
                    } else if (isVsliceChartFile(jsonData)) {
                        chartFile = jsonData;
                    } else if (isCodenameChartFile(jsonData)) {
                        chartFile = jsonData;
                    }

                    // Handle Vslice charts with metadata
                    if (chartFile && vsliceMetadataFile) {
                        processVsliceWithMetadata(chartFile, vsliceMetadataFile);
                    }
                    // Handle Codename charts with or without meta.json
                    else if (chartFile && codenameMetadataFile) {
                        processCodenameChart(chartFile, codenameMetadataFile);
                    } else if (chartFile && !codenameMetadataFile) {
                        processCodenameChart(chartFile, null);
                    }
                };
                reader.readAsText(file);
            }
        }
    }

    function isVSliceMetadata(data) {
        // Vslice metadata file check
        return data.version && data.songName && data.artist;
    }

    function isCodenameMetadataFile(data) {
        // Codename Engine meta.json file check
        return data.displayName && data.bpm;
    }

    function isVsliceChartFile(data) {
        // Checks for properties matching Vslice charts
        return data.version && data.notes && data.scrollSpeed;
    }

    function isPsychChartFile(data) {
        // Checks for properties matching Psych Engine charts
        return data.song && data.song.notes && data.song.bpm && data.song.song;
    }

    function isCodenameChartFile(data) {
        // Check for the "codenameChart" property
        return data.codenameChart === true;
    }

    function processJson(data) {
        if (isVsliceChartFile(data)) {
            processVsliceChart(data);
        } else if (isPsychChartFile(data)) {
            processPsychChart(data);
        } else if (isCodenameChartFile(data)) {
            processCodenameChart(data, null);
        } else {
            outputArea.textContent = 'Unsupported chart format.';
        }
    }

    function processPsychChart(data) {
        const noteCounts = {};
        const keyNames = { 0: "Left", 1: "Down", 2: "Up", 3: "Right" };

        const bpmChanges = new Set();
        for (const section of data.song.notes) {
            if (section.bpm) {
                bpmChanges.add(section.bpm);
            }
        }

        const bpmList = Array.from(bpmChanges);
        const bpmInfo = bpmList.length > 1 ? `${data.song.bpm} (${bpmList.join(', ')})` : data.song.bpm;

        for (const section of data.song.notes) {
            const mustHitSection = section.mustHitSection || false;
            for (const note of section.sectionNotes) {
                const noteIndex = note[1];
                // Psych Engine uses 0-3 for player notes if mustHitSection is true.
                // If mustHitSection is false, it uses 4-7 for player notes. So we need to remap them.
                if (mustHitSection && noteIndex >= 0 && noteIndex <= 3) {
                    noteCounts[noteIndex] = (noteCounts[noteIndex] || 0) + 1;
                } else if (!mustHitSection && noteIndex >= 4 && noteIndex <= 7) {
                    const remappedIndex = noteIndex - 4;
                    noteCounts[remappedIndex] = (noteCounts[remappedIndex] || 0) + 1;
                }
            }
        }

        displayResults(noteCounts, keyNames, data.song.song, bpmInfo, data.song.speed);
    }

    function processVsliceChart(data) {
        const keyNames = { 0: "Left", 1: "Down", 2: "Up", 3: "Right" };
        outputArea.innerHTML = '<h2>Chart Information</h2><hr>';
        outputArea.innerHTML += `<p><strong>Song:</strong> Vslice Chart</p>`;
        outputArea.innerHTML += `<p><strong>BPM:</strong> Easy: ${data.scrollSpeed.easy}, Normal: ${data.scrollSpeed.normal}, Hard: ${data.scrollSpeed.hard}</p><hr>`;

        for (const difficulty in data.notes) {
            const noteCounts = {};
            let totalCount = 0;

            for (const note of data.notes[difficulty]) {
                const noteIndex = note.d;
                if (noteIndex >= 0 && noteIndex <= 3) {
                    // V-Slice uses 0-3 for player notes.
                    noteCounts[noteIndex] = (noteCounts[noteIndex] || 0) + 1;
                }
            }

            for (let key = 0; key < 4; key++) {
                totalCount += noteCounts[key] || 0;
            }
            const multipliedTotal = totalCount * scoreMultiplier;

            outputArea.innerHTML += `<h3>${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Difficulty</h3>`;
            for (let key = 0; key < 4; key++) {
                const count = noteCounts[key] || 0;
                outputArea.innerHTML += `<p>${keyNames[key]}: ${count}</p>`;
            }
            outputArea.innerHTML += `<p><strong>Max Combo:</strong> ${totalCount}</p>`;
            outputArea.innerHTML += `<p><strong>Max Score:</strong> ${multipliedTotal}</p><hr>`;
        }
    }

    function processVsliceWithMetadata(chartData, metadata) {
        const keyNames = { 0: "Left", 1: "Down", 2: "Up", 3: "Right" };
        outputArea.innerHTML = '<h2>Chart Information</h2><hr>';
        outputArea.innerHTML += `<p><strong>Song:</strong> ${metadata.songName}</p>`;
        outputArea.innerHTML += `<p><strong>Artist:</strong> ${metadata.artist}</p>`;
        outputArea.innerHTML += `<p><strong>Charter:</strong> ${metadata.charter}</p>`;
    
        const bpmChanges = metadata.timeChanges || [];
        const bpmList = bpmChanges.map(change => change.bpm);
        const bpmInfo = bpmList.length > 1 ? `${bpmList[0]} (${bpmList.join(', ')})` : bpmList[0] || "Unknown";
    
        const scrollSpeed = chartData.scrollSpeed
            ? `Easy: ${chartData.scrollSpeed.easy}, Normal: ${chartData.scrollSpeed.normal}, Hard: ${chartData.scrollSpeed.hard}`
            : "Unknown";

        outputArea.innerHTML += `<p><strong>BPM:</strong> ${bpmInfo}</p>`;
        outputArea.innerHTML += `<p><strong>Scroll Speed:</strong> ${scrollSpeed}</p><hr>`;

        for (const difficulty in chartData.notes) {
            const noteCounts = {};
            let totalCount = 0;

            for (const note of chartData.notes[difficulty]) {
                const noteIndex = note.d;
                if (noteIndex >= 0 && noteIndex <= 3) {
                    // V-Slice uses 0-3 for player notes. 
                    noteCounts[noteIndex] = (noteCounts[noteIndex] || 0) + 1;
                }
            }

            for (let key = 0; key < 4; key++) {
                totalCount += noteCounts[key] || 0;
            }
            const multipliedTotal = totalCount * scoreMultiplier;
    
            outputArea.innerHTML += `<h3>${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Difficulty</h3>`;
            for (let key = 0; key < 4; key++) {
                const count = noteCounts[key] || 0;
                outputArea.innerHTML += `<p>${keyNames[key]}: ${count}</p>`;
            }
            outputArea.innerHTML += `<p><strong>Max Combo:</strong> ${totalCount}</p>`;
            outputArea.innerHTML += `<p><strong>Max Score:</strong> ${multipliedTotal}</p><hr>`;
        }
    }

    function processCodenameChart(data, meta) {
        const keyNames = { 0: "Left", 1: "Down", 2: "Up", 3: "Right" };
        const noteCounts = {};
        let totalCount = 0;
    
        // Codename Engine uses 0-3 for all notes and relies on "Strumline Type"
        const playerStrumLine = data.strumLines.find(line => line.type === 1);
        if (!playerStrumLine) {
            outputArea.textContent = 'No player strum line found in the chart.';
            return;
        }
    
        for (const note of playerStrumLine.notes) {
            const noteIndex = note.id;
            if (noteIndex >= 0 && noteIndex <= 3) {
                noteCounts[noteIndex] = (noteCounts[noteIndex] || 0) + 1;
            }
        }

        for (let key = 0; key < 4; key++) {
            totalCount += noteCounts[key] || 0;
        }
        const multipliedTotal = totalCount * scoreMultiplier;
    
        const bpmChanges = data.events
            .filter(event => event.name === "BPM Change")
            .map(event => event.params[0]);
        const scrollSpeedChanges = data.events
            .filter(event => event.name === "Scroll Speed Change")
            .map(event => event.params[1]);
    
        const startingBPM = meta ? meta.bpm : "<meta.json not provided>";
        const songName = meta ? meta.displayName : "<meta.json not provided>";
        const bpmInfo = bpmChanges.length > 1
            ? `${startingBPM} (${bpmChanges.join(', ')})`
            : startingBPM;
    
        const startingScrollSpeed = data.scrollSpeed || "Unknown";
        const scrollSpeedInfo = scrollSpeedChanges.length > 0
            ? `${startingScrollSpeed} (${scrollSpeedChanges.join(', ')})`
            : startingScrollSpeed;
    
        outputArea.innerHTML = '<h2>Chart Information</h2><hr>';
        outputArea.innerHTML += `<p><strong>Song:</strong> ${songName}</p>`;
        outputArea.innerHTML += `<p><strong>BPM:</strong> ${bpmInfo}</p>`;
        outputArea.innerHTML += `<p><strong>Scroll Speed:</strong> ${scrollSpeedInfo}</p><hr>`;
    
        for (let key = 0; key < 4; key++) {
            const count = noteCounts[key] || 0;
            outputArea.innerHTML += `<p>${keyNames[key]}: ${count}</p>`;
        }
        outputArea.innerHTML += `<p><strong>Max Combo:</strong> ${totalCount}</p>`;
        outputArea.innerHTML += `<p><strong>Max Score:</strong> ${multipliedTotal}</p>`;
    }

    function displayResults(noteCounts, keyNames, songName, bpm, speed) {
        outputArea.innerHTML = '<h2>Chart Information</h2><hr>';
        outputArea.innerHTML += `<p><strong>Song:</strong> ${songName}</p>`;
        outputArea.innerHTML += `<p><strong>BPM:</strong> ${bpm}</p>`;
        outputArea.innerHTML += `<p><strong>Scroll Speed:</strong> ${speed}</p><hr>`;

        let totalCount = 0;

        for (let key = 0; key < 4; key++) {
            const count = noteCounts[key] || 0;
            outputArea.innerHTML += `<p>${keyNames[key]}: ${count}</p>`;
            totalCount += count;
        }

        const multipliedTotal = totalCount * scoreMultiplier;
        outputArea.innerHTML += `<hr><p>Max Combo: ${totalCount}</p>`;
        outputArea.innerHTML += `<p>Max Score: ${multipliedTotal}</p>`;
    }
});