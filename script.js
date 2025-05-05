// script.js

document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileElem');
    const outputArea = document.getElementById('output-area');
    const multiplierInput = document.getElementById('multiplier-input');
    const updateMultiplierButton = document.getElementById('update-multiplier');
    let scoreMultiplier = 350; // Default multiplier of most engines and fnf mods.
    let detectedEngine = "Unknown";
    let lastProcessedChartData = null;

    dropArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropArea.classList.add('hover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('hover');
    });

    dropArea.addEventListener('drop', (event) => {
        event.preventDefault();
        dropArea.classList.remove('hover');
        const files = event.dataTransfer.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        handleFiles(files);
    });

    updateMultiplierButton.addEventListener('click', () => {
        const newMultiplier = parseInt(multiplierInput.value, 10);
        if (!isNaN(newMultiplier) && newMultiplier > 0) {
            scoreMultiplier = newMultiplier;
            alert(`Score multiplier updated to ${scoreMultiplier}`);

            if (lastProcessedChartData) {
                processJson(lastProcessedChartData);
            }
        } else {
            alert('Please enter a valid positive number.');
        }
    });

    function handleFiles(files) {
        if (files.length === 1) {
            processSingleFile(files[0]);
        } else if (files.length === 2) {
            processMultipleFiles(files);
        } else {
            outputArea.textContent = 'Please upload one or two valid JSON files.';
        }
    }

    function processSingleFile(file) {
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
    }

    function processMultipleFiles(files) {
        let chartFile = null;
        let codenameMetadataFile = null;
        let vsliceMetadataFile = null;
        let psychEventsFile = null;

        const fileReadPromises = Array.from(files).map((file) => {
            return new Promise((resolve, reject) => {
                if (file.type === 'application/json') {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const jsonData = JSON.parse(e.target.result);
                            resolve({ file, jsonData });
                        } catch (error) {
                            reject(`Error parsing JSON in file ${file.name}: ${error.message}`);
                        }
                    };
                    reader.onerror = () => reject(`Error reading file ${file.name}`);
                    reader.readAsText(file);
                } else {
                    reject(`Invalid file type for ${file.name}`);
                }
            });
        });

        Promise.all(fileReadPromises)
            .then((results) => {
                results.forEach(({ jsonData }) => {
                    if (isPsychChartFile(jsonData)) {
                        chartFile = jsonData;
                        detectedEngine = "Psych Engine";
                    } else if (isPsychEventFile(jsonData)) {
                        psychEventsFile = jsonData;
                    } else if (isVSliceMetadata(jsonData)) {
                        vsliceMetadataFile = jsonData;
                    } else if (isVsliceChartFile(jsonData)) {
                        chartFile = jsonData;
                        detectedEngine = "V-Slice Engine";
                    } else if (isCodenameMetadataFile(jsonData)) {
                        codenameMetadataFile = jsonData;
                    } else if (isCodenameChartFile(jsonData)) {
                        chartFile = jsonData;
                        detectedEngine = "Codename Engine";
                    }
                });

                // Handle Psych Engine charts with optional events file
                if (chartFile && psychEventsFile && detectedEngine === "Psych Engine") {
                    mergePsychChartAndEvents(chartFile, psychEventsFile);
                }
                // Handle V-Slice charts with metadata
                else if (chartFile && vsliceMetadataFile && detectedEngine === "V-Slice Engine") {
                    processVsliceWithMetadata(chartFile, vsliceMetadataFile);
                }
                // Handle Codename charts with or without meta.json
                else if (chartFile && codenameMetadataFile && detectedEngine === "Codename Engine") {
                    processCodenameChart(chartFile, codenameMetadataFile);
                } else if (chartFile && detectedEngine === "Codename Engine") {
                    processCodenameChart(chartFile, null);
                }
                // Handle single Psych Engine chart file
                else if (chartFile && detectedEngine === "Psych Engine") {
                    processJson(chartFile);
                } else {
                    outputArea.textContent = 'No valid chart or event files detected.';
                }
            })
            .catch((error) => {
                outputArea.textContent = `Error processing files: ${error}`;
            });
    }

    function isPsychChartFile(data) {
        // Check for Psych Engine v1.0 format
        if (data.format === "psych_v1" && data.notes) {
            return "psych_v1";
        }

        // Check for Psych Engine v1.0 converted format or legacy structure
        if ((data.format === "psych_v1_convert" || !data.format) && data.song && data.song.notes) {
            return "psych_v1_convert";
        }

        return null;
    }

    function isPsychEventFile(data) {
        // Ensure the file has events but does not have notes
        if (data.song && data.song.events && !data.song.notes) {
            return true;
        }
        if (data.format === "psych_v1" && data.events && !data.notes) {
            return true;
        }
        return false;
    }

    function isVSliceMetadata(data) {
        // Vslice metadata file check
        return data.version && data.songName && data.artist;
    }

    function isVsliceChartFile(data) {
        // Checks for properties matching Vslice charts
        return data.version && data.notes && data.scrollSpeed;
    }

    function isCodenameMetadataFile(data) {
        // Codename Engine meta.json file check
        return data.displayName && data.bpm;
    }

    function isCodenameChartFile(data) {
        // Check for the "codenameChart" property
        return data.codenameChart === true;
    }

    function mergePsychChartAndEvents(chartFile, eventsFile) {
        let mergedEvents = [];

        if (eventsFile.format === "psych_v1" && Array.isArray(eventsFile.events)) {
            mergedEvents = [
                ...(chartFile?.events || []),
                ...eventsFile.events
            ];
        } else if (eventsFile.song && Array.isArray(eventsFile.song.events)) {
            mergedEvents = [
                ...(chartFile.song?.events || []),
                ...eventsFile.song.events
            ];
        }

        // Remove duplicate events (if any)
        const uniqueEvents = Array.from(
            new Set(mergedEvents.map((event) => JSON.stringify(event)))
        ).map((event) => JSON.parse(event));

        if (chartFile.format === "psych_v1") {
            chartFile.events = uniqueEvents;
        } else if (chartFile.song) {
            chartFile.song.events = uniqueEvents;
        }

        processJson(chartFile);
    }

    function processJson(data) {
        lastProcessedChartData = data;

        const psychFormat = isPsychChartFile(data);

        if (isVsliceChartFile(data)) {
            detectedEngine = "V-Slice Engine";
            processVsliceChart(data);

        } else if (isCodenameChartFile(data)) {
            detectedEngine = "Codename Engine";
            processCodenameChart(data, null);

        } else if (psychFormat === "psych_v1") {
            detectedEngine = "Psych Engine v1.0";
            processPsychChart(data);

        } else if (psychFormat === "psych_v1_convert") {
            detectedEngine = "Psych Engine (Legacy) / Kade Engine / Other";
            processPsychChart(data.song);

        } else {
            detectedEngine = "Unsupported Engine";
            outputArea.textContent = 'Unsupported chart format. If this is a mistake, please send a bug report and attach the chart file.\nhttps://github.com/MeguminBOT/fnf-chart-info-tool/issues';
        }
    }

    function processPsychChart(chartData) {
        const noteCounts = {};
        const keyNames = { 0: "Left", 1: "Down", 2: "Up", 3: "Right" };
        let initialScrollSpeed = chartData.speed || 1;
        let scrollSpeedInfo = `${initialScrollSpeed}`;

        // Handle "Change Scroll Speed" events (only if the events property exists)
        if (chartData.events && Array.isArray(chartData.events)) {
            const scrollSpeedChanges = chartData.events
                .filter(event => event[1][0][0] === "Change Scroll Speed")
                .map(event => parseFloat(event[1][0][1])); // Extract the multiplier value from the event

            if (scrollSpeedChanges.length > 0) {
                const adjustedSpeeds = scrollSpeedChanges.map(multiplier => (initialScrollSpeed * multiplier).toFixed(2));
                scrollSpeedInfo += ` (${adjustedSpeeds.join(", ")})`;
            }
        }

        const bpmChanges = new Set();
        if (Array.isArray(chartData.notes)) {
            for (const section of chartData.notes) {
                if (section.changeBPM === true && section.bpm && !isNaN(section.bpm)) {
                    bpmChanges.add(section.bpm);
                }
            }
        }

        // For some reason, we need this to have BPM changes work for Psych Engine v1.0 chart files.
        if (chartData.bpm && !bpmChanges.has(chartData.bpm)) {
            bpmChanges.add(chartData.bpm);
        }

        const bpmList = Array.from(bpmChanges);

        const bpmInfo = bpmList.length > 1 
            ? `${chartData.bpm || "Unknown"} (${bpmList.filter(bpm => bpm !== chartData.bpm).join(", ")})` 
            : chartData.bpm || "Unknown";

        if (Array.isArray(chartData.notes)) {
            for (const section of chartData.notes) {
                const mustHitSection = section.mustHitSection || false;
                for (const note of section.sectionNotes || []) {
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
        }

        const songName = chartData.song || chartData.songName || "Unknown";

        outputArea.innerHTML = '<h2>Chart Information</h2><hr>';
        outputArea.innerHTML += `<p><strong>Engine:</strong> ${detectedEngine}</p>`;
        outputArea.innerHTML += `<p><strong>Song:</strong> ${songName}</p>`;
        outputArea.innerHTML += `<p><strong>BPM:</strong> ${bpmInfo}</p>`;
        outputArea.innerHTML += `<p><strong>Scroll Speed:</strong> ${scrollSpeedInfo}</p><hr>`;

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
        outputArea.innerHTML += `<p><strong>Engine:</strong> ${detectedEngine}</p>`;
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
        outputArea.innerHTML += `<p><strong>Engine:</strong> ${detectedEngine}</p>`;
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
});