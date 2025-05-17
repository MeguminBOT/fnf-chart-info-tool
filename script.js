// script.js

document.addEventListener('DOMContentLoaded', () => {
    const KEY_NAMES = { 0: "Left", 1: "Down", 2: "Up", 3: "Right", 4: "Extra1", 5: "Extra2", 6: "Extra3", 7: "Extra4" };
    const DIFFICULTIES = ["easy", "normal", "hard"];
    const DEFAULT_MULTIPLIER = 350;
    
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileElem');
    const outputArea = document.getElementById('output-area');
    const multiplierInput = document.getElementById('multiplier-input');
    const updateMultiplierButton = document.getElementById('update-multiplier');
    const wikiTemplateString = document.getElementById('song-info-output');
    const toggleSongInfoButton = document.getElementById('toggle-song-info');
    const songInfoContainer = document.getElementById('song-info-container');
    const saveOutputButton = document.getElementById('save-output');

    let scoreMultiplier = DEFAULT_MULTIPLIER;
    let detectedEngine = "Unknown";
    let lastProcessedChartData = null;

    setupEventListeners();

    function setupEventListeners() {
        dropArea.addEventListener('dragover', handleDragOver);
        dropArea.addEventListener('dragleave', handleDragLeave);
        dropArea.addEventListener('drop', handleFileDrop);
        fileInput.addEventListener('change', handleFileInput);
        updateMultiplierButton.addEventListener('click', updateMultiplier);
        toggleSongInfoButton.addEventListener('click', wikiTemplateVisibility);
        if (saveOutputButton) {
            saveOutputButton.addEventListener('click', saveOutputAsTextFile);
        }
    }

    function handleDragOver(event) {
        event.preventDefault();
        dropArea.classList.add('hover');
    }

    function handleDragLeave() {
        dropArea.classList.remove('hover');
    }

    function handleFileDrop(event) {
        event.preventDefault();
        dropArea.classList.remove('hover');
        handleFiles(event.dataTransfer.files);
    }

    function handleFileInput(event) {
        handleFiles(event.target.files);
    }

    function updateMultiplier() {
        const newMultiplier = parseInt(multiplierInput.value, 10);
        if (isValidMultiplier(newMultiplier)) {
            scoreMultiplier = newMultiplier;
            alert(`Score multiplier updated to ${scoreMultiplier}`);
            if (lastProcessedChartData) processJson(lastProcessedChartData);
        } else {
            alert('Please enter a valid positive number.');
        }
    }

    function wikiTemplateVisibility() {
        const isHidden = songInfoContainer.style.display === 'none' || songInfoContainer.style.display === '';
        songInfoContainer.style.display = isHidden ? 'block' : 'none';
        toggleSongInfoButton.textContent = isHidden
            ? 'Hide Funkipedia SongInfo Template'
            : 'Show Funkipedia SongInfo Template';
    }

    // File Handling
    function handleFiles(files) {
        if (files.length === 1) {
            processSingleFile(files[0]);
        } else if (files.length === 2) {
            processMultipleFiles(files);
        } else {
            outputArea.textContent = 'Please upload one or two valid JSON files.';
        }
    }

    function saveOutputAsTextFile() {
        if (!outputArea.textContent) {
            alert('No output to save.');
            return;
        }
        const blob = new Blob([outputArea.textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chart_output.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function processSingleFile(file) {
        if (isJsonFile(file)) {
            readFile(file).then(processJson).catch(showError);
        } else {
            outputArea.textContent = 'Please upload a valid JSON file.';
        }
    }

    function processMultipleFiles(files) {
        const fileReadPromises = Array.from(files).map(file => {
            if (isJsonFile(file)) {
                return readFile(file).then(jsonData => ({ file, jsonData }));
            }
            return Promise.reject(`Invalid file type for ${file.name}`);
        });

        Promise.all(fileReadPromises)
            .then(processFileResults)
            .catch(showError);
    }

    function processFileResults(results) {
        const { chartFile, metadataFiles } = categorizeFiles(results);

        if (chartFile) {
            processChartWithMetadata(chartFile, metadataFiles);
        } else {
            outputArea.textContent = 'No valid chart or event files detected. If you believe this is an error, please report it here:\nhttps://github.com/MeguminBOT/fnf-chart-info-tool/issues.';
        }
    }

    function categorizeFiles(results) {
        let chartFile = null;
        const metadataFiles = {};

        results.forEach(({ jsonData }) => {
            if (isPsychChartFile(jsonData)) {
                chartFile = jsonData;
                detectedEngine = "Psych Engine";
                scoreMultiplier = 350; // Default multiplier for Psych Engine
                multiplierInput.value = scoreMultiplier; //ugly temp solution

            } else if (isPsychEventFile(jsonData)) {
                metadataFiles.psychEvents = jsonData;
            
            } else if (isVSliceMetadata(jsonData)) {
                metadataFiles.vsliceMetadata = jsonData;
           
            } else if (isVsliceChartFile(jsonData)) {
                chartFile = jsonData;
                detectedEngine = "V-Slice Engine";
                scoreMultiplier = 500; // Default multiplier V-Slice
                multiplierInput.value = scoreMultiplier; //ugly temp solution
            
            } else if (isCodenameMetadataFile(jsonData)) {
                metadataFiles.codenameMetadata = jsonData;
            
            } else if (isCodenameChartFile(jsonData)) {
                chartFile = jsonData;
                detectedEngine = "Codename Engine";
                scoreMultiplier = 300; // Default multiplier for Codename Engine
                multiplierInput.value = scoreMultiplier; //ugly temp solution
            }
        });

        return { chartFile, metadataFiles };
    }

    function processChartWithMetadata(chartFile, metadataFiles) {
        if (detectedEngine === "Psych Engine" && metadataFiles.psychEvents) {
            mergePsychChartAndEvents(chartFile, metadataFiles.psychEvents);
        } else if (detectedEngine === "V-Slice Engine" && metadataFiles.vsliceMetadata) {
            processVsliceChart(chartFile, metadataFiles.vsliceMetadata);
        } else if (detectedEngine === "Codename Engine") {
            processCodenameChart(chartFile, metadataFiles.codenameMetadata || null);
        } else {
            processJson(chartFile);
        }
    }

    // Utility Functions
    function isJsonFile(file) {
        return file.type === 'application/json';
    }

    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    resolve(JSON.parse(e.target.result));
                } catch (error) {
                    reject(`Error parsing JSON in file ${file.name}: ${error.message}`);
                }
            };
            reader.onerror = () => reject(`Error reading file ${file.name}`);
            reader.readAsText(file);
        });
    }

    function isValidMultiplier(value) {
        return !isNaN(value) && value > 0;
    }

    function showError(error) {
        outputArea.textContent = `Error: ${error}`;
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
            processVsliceChart(data, null);

        } else if (isCodenameChartFile(data)) {
            detectedEngine = "Codename Engine";
            processCodenameChart(data, null);

        } else if (psychFormat === "psych_v1") {
            detectedEngine = "Psych Engine";
            processPsychChart(data);

        } else if (psychFormat === "psych_v1_convert") {
            detectedEngine = "Psych Engine (Legacy) / Kade Engine / Other";
            processPsychChart(data.song);

        } else {
            detectedEngine = "Unsupported Engine";
            outputArea.textContent = 'Unsupported chart format. If you believe this is an error, please report it here:\nhttps://github.com/MeguminBOT/fnf-chart-info-tool/issues.';
        }
    }

    function processPsychChart(chartData) {
        const noteCounts = {};
        let initialScrollSpeed = chartData.speed || 1;
        let scrollSpeedInfo = `${initialScrollSpeed}`;

        if (chartData.events && Array.isArray(chartData.events)) {
            const scrollSpeedChanges = chartData.events
                .filter(event => event[1][0][0] === "Change Scroll Speed")
                .map(event => parseFloat(event[1][0][1]));

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
                    if (mustHitSection && noteIndex >= 0 && noteIndex <= 7) {
                        noteCounts[noteIndex] = (noteCounts[noteIndex] || 0) + 1;
                    } else if (!mustHitSection && noteIndex >= 8 && noteIndex <= 15) {
                        const remappedIndex = noteIndex - 8;
                        noteCounts[remappedIndex] = (noteCounts[remappedIndex] || 0) + 1;
                    }
                }
            }
        }

        const songName = chartData.song || chartData.songName || "Unknown";

        const wikiTemplateString = generateWikiTemplate({
            songName,
            artist: "Unknown",
            charter: "Unknown",
            bpm: bpmInfo,
            scrollValues: [scrollSpeedInfo],
            maxComboValues: [`${Object.values(noteCounts).reduce((a, b) => a + b, 0)}`],
            maxScoreValues: [`${Object.values(noteCounts).reduce((a, b) => a + b, 0) * scoreMultiplier}`]
        });
        updateWikiTemplate(wikiTemplateString);

        outputArea.innerHTML = '<h2>Chart Information</h2><hr>';
        outputArea.innerHTML += `<p><strong>Engine:</strong> ${detectedEngine}</p>`;
        outputArea.innerHTML += `<p><strong>Song:</strong> ${songName}</p>`;
        outputArea.innerHTML += `<p><strong>BPM:</strong> ${bpmInfo}</p>`;
        outputArea.innerHTML += `<p><strong>Scroll Speed:</strong> ${scrollSpeedInfo}</p><hr>`;

        let totalCount = 0;

        for (let key = 0; key < 8; key++) {
            const count = noteCounts[key] || 0;
            outputArea.innerHTML += `<p>${KEY_NAMES[key]}: ${count}</p>`;
            totalCount += count;
        }

        const multipliedTotal = totalCount * scoreMultiplier;
        outputArea.innerHTML += `<hr><p>Max Combo: ${totalCount}</p>`;
        outputArea.innerHTML += `<p>Max Score: ${multipliedTotal}</p>`;
    }

    function processVsliceChart(chartData, metadata = null) {
        const scrollValues = [];
        const maxComboValues = [];
        const maxScoreValues = [];
        const bpm = metadata?.timeChanges?.[0]?.bpm || chartData.bpm || "Unknown";
        const songName = metadata?.songName || chartData.songName || "Unknown";
        const artist = metadata?.artist || chartData.artist || "Unknown";
        const charter = metadata?.charter || chartData.charter || "Unknown";

        DIFFICULTIES.forEach(difficulty => {
            if (chartData.scrollSpeed[difficulty]) {
                scrollValues.push(`${chartData.scrollSpeed[difficulty]} (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})`);
            }

            if (chartData.notes[difficulty]) {
                let totalCount = 0;
                const noteCounts = {};

                chartData.notes[difficulty].forEach(note => {
                    const noteIndex = note.d;
                    if (noteIndex >= 0 && noteIndex <= 7) {
                        noteCounts[noteIndex] = (noteCounts[noteIndex] || 0) + 1;
                        totalCount++;
                    }
                });

                for (let key = 0; key < 8; key++) {
                    const count = noteCounts[key] || 0;
                    outputArea.innerHTML += `<p>${KEY_NAMES[key]}: ${count}</p>`;
                }

                const multipliedTotal = totalCount * scoreMultiplier;
                outputArea.innerHTML += `<p><strong>Max Combo:</strong> ${totalCount}</p>`;
                outputArea.innerHTML += `<p><strong>Max Score:</strong> ${multipliedTotal}</p><hr>`;
            }
        });
    }

    function processCodenameChart(data, meta) {
        const noteCounts = {};
        let totalCount = 0;

        const playerStrumLine = data.strumLines.find(line => line.type === 1);
        if (!playerStrumLine) {
            outputArea.textContent = 'No player strum line found in the chart.';
            return;
        }

        for (const note of playerStrumLine.notes) {
            const noteIndex = note.id;
            if (noteIndex >= 0 && noteIndex <= 7) {
                noteCounts[noteIndex] = (noteCounts[noteIndex] || 0) + 1;
            }
        }

        for (let key = 0; key < 8; key++) {
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

        const wikiTemplateString = generateWikiTemplate({
            songName,
            artist: "Unknown",
            charter: "Unknown",
            bpm: bpmInfo,
            scrollValues: [scrollSpeedInfo],
            maxComboValues: [`${totalCount}`],
            maxScoreValues: [`${multipliedTotal}`]
        });
        updateWikiTemplate(wikiTemplateString);

        outputArea.innerHTML = '<h2>Chart Information</h2><hr>';
        outputArea.innerHTML += `<p><strong>Engine:</strong> ${detectedEngine}</p>`;
        outputArea.innerHTML += `<p><strong>Song:</strong> ${songName}</p>`;
        outputArea.innerHTML += `<p><strong>BPM:</strong> ${bpmInfo}</p>`;
        outputArea.innerHTML += `<p><strong>Scroll Speed:</strong> ${scrollSpeedInfo}</p><hr>`;

        for (let key = 0; key < 8; key++) {
            const count = noteCounts[key] || 0;
            outputArea.innerHTML += `<p>${KEY_NAMES[key]}: ${count}</p>`;
        }
        outputArea.innerHTML += `<p><strong>Max Combo:</strong> ${totalCount}</p>`;
        outputArea.innerHTML += `<p><strong>Max Score:</strong> ${multipliedTotal}</p>`;
    }

    function updateWikiTemplate(content) {
        wikiTemplateString.value = content;
    }

    function generateWikiTemplate({ songName, artist, charter, bpm, scrollValues, maxComboValues, maxScoreValues }) {
        return `{{SongInfo
    | name = ${songName || "Unknown"}
    | icon = 
    | file = 
    | inst = 
    | composer = ${artist || "Unknown"}
    | charter = ${charter || "Unknown"}
    | bpm = ${bpm || "Unknown"}
    | scroll = ${scrollValues?.join("<br>") || "Unknown"}
    | maxcombo = ${maxComboValues?.join("<br>") || "Unknown"}
    | maxscore = ${maxScoreValues?.join("<br>") || "Unknown"}}}`;
    }
});
