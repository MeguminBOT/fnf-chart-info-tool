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

        if (files.length === 2) {
            handleMultipleFiles(files); // Always expect two files for Vslice
        } else if (files.length === 1) {
            const file = files[0];
            if (file.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const jsonData = JSON.parse(e.target.result);
                    if (isPsychChartFile(jsonData)) {
                        processPsych(jsonData); // Process Psych Engine chart directly
                    } else {
                        outputArea.textContent = 'Unsupported file format. Please drop two files for Vslice or one Psych Engine chart.';
                    }
                };
                reader.readAsText(file);
            } else {
                outputArea.textContent = 'Please upload a valid JSON file.';
            }
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
        let metadataFile = null;

        for (const file of files) {
            if (file.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const jsonData = JSON.parse(e.target.result);
                    if (isMetadataFile(jsonData)) {
                        metadataFile = jsonData;
                    } else if (isVsliceChartFile(jsonData)) {
                        chartFile = jsonData;
                    }

                    if (chartFile && metadataFile) {
                        processVsliceWithMetadata(chartFile, metadataFile);
                    }
                };
                reader.readAsText(file);
            }
        }
    }

    function isMetadataFile(data) {
        return data.version && data.songName && data.artist; // Basic checks for metadata file
    }

    function isVsliceChartFile(data) {
        return data.version && data.notes && data.scrollSpeed; // Basic checks for Vslice chart file
    }

    function isPsychChartFile(data) {
        return data.song && data.song.notes && data.song.bpm && data.song.song; // Basic checks for Psych Engine chart file
    }

    function processJson(data) {
        if (isVsliceChartFile(data)) {
            // Vslice Engine
            processVslice(data);
        } else if (isPsychChartFile(data)) {
            // Psych Engine
            processPsych(data);
        } else {
            outputArea.textContent = 'Unsupported chart format.';
        }
    }

    function processPsych(data) {
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

    function processVslice(data) {
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

    function displayResults(noteCounts, keyNames, songName, bpm, speed) {
        outputArea.innerHTML = '<h2>Chart Information</h2><hr>';
        outputArea.innerHTML += `<p><strong>Song:</strong> ${songName}</p>`;
        outputArea.innerHTML += `<p><strong>BPM:</strong> ${bpm}</p>`;
        outputArea.innerHTML += `<p><strong>Speed:</strong> ${speed}</p><hr>`;

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