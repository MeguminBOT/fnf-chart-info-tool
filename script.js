// script.js

document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const outputArea = document.getElementById('output-area');
    const multiplierInput = document.getElementById('multiplier-input');
    const updateMultiplierButton = document.getElementById('update-multiplier');
    let scoreMultiplier = 350; // Default multiplier

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
        if (files.length > 0) {
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

    function processJson(data) {
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