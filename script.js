document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const searchBtn = document.getElementById('search-btn');
    const gamertagInput = document.getElementById('gamertag-input');
    const resultsSection = document.getElementById('results-section');
    const loader = document.getElementById('loader');
    const mediaGrid = document.getElementById('media-grid');
    const displayGamertag = document.getElementById('display-gamertag');
    const userAvatar = document.getElementById('user-avatar');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const userStats = document.querySelector('.user-stats');

    // Settings Modal Elements
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const clearApiKeyBtn = document.getElementById('clear-api-key-btn');
    const apiKeyInput = document.getElementById('api-key-input');
    const connectionStatus = document.getElementById('connection-status');

    // Video Modal Elements
    const videoModal = document.getElementById('video-modal');
    const closeVideoBtn = document.getElementById('close-video-btn');
    const mainVideoPlayer = document.getElementById('main-video-player');
    const mainScreenshotViewer = document.getElementById('main-screenshot-viewer');
    const videoModalTitle = document.getElementById('video-modal-title');
    const downloadLink = document.getElementById('download-link');

    // --- Configuration ---
    let currentData = [];
    // Hardcoded API Key from user request
    const DEFAULT_API = 'bbe7ec95-5bc2-4846-8000-f89e54142612';
    // Load from local storage or use default
    let apiKey = localStorage.getItem('xbox_api_key');

    if (!apiKey) {
        apiKey = DEFAULT_API;
        localStorage.setItem('xbox_api_key', DEFAULT_API);
    }

    // --- Initialization ---
    updateConnectionStatus();

    // --- Modal Logic ---
    settingsBtn.addEventListener('click', () => {
        apiKeyInput.value = apiKey || '';
        modal.style.display = 'flex';
    });

    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    saveApiKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            apiKey = key;
            localStorage.setItem('xbox_api_key', key);
            updateConnectionStatus();
            modal.style.display = 'none';
            alert('API Key guardada. Ahora buscarás datos reales.');
        } else {
            alert('Por favor ingresa una clave válida.');
        }
    });

    // --- Debug Console Logic ---
    const debugTestBtn = document.getElementById('debug-test-btn');
    const debugEndpoint = document.getElementById('debug-endpoint');
    const debugOutput = document.getElementById('debug-output');

    debugTestBtn.addEventListener('click', async () => {
        const endpoint = debugEndpoint.value.trim();
        if (!endpoint) return;
        if (!apiKey) {
            debugOutput.textContent = 'Error: Guarda tu API Key primero.';
            return;
        }

        debugOutput.textContent = 'Cargando...';

        try {
            const CORS_PROXY = 'https://corsproxy.io/?';
            const targetUrl = `https://xbl.io/api/v2/${endpoint}`;
            const fullUrl = CORS_PROXY + encodeURIComponent(targetUrl);

            const response = await fetch(fullUrl, {
                headers: { 'X-Authorization': apiKey, 'Accept': 'application/json' }
            });

            const status = response.status;
            let data;
            try {
                data = await response.json();
            } catch (e) {
                data = await response.text();
            }

            debugOutput.textContent = `Status: ${status}\n\n` + JSON.stringify(data, null, 2);
        } catch (e) {
            debugOutput.textContent = 'Error de Conexión: ' + e.message;
        }
    });

    clearApiKeyBtn.addEventListener('click', () => {
        apiKey = null;
        localStorage.removeItem('xbox_api_key');
        updateConnectionStatus();
        modal.style.display = 'none';
        alert('API Key borrada. Volviendo a modo Simulación.');
    });

    // --- Video Modal Logic ---
    closeVideoBtn.addEventListener('click', closeVideoModal);
    window.addEventListener('click', (e) => {
        if (e.target === videoModal) closeVideoModal();
    });

    function closeVideoModal() {
        videoModal.style.display = 'none';
        mainVideoPlayer.pause();
        mainVideoPlayer.src = ''; // Stop buffering
        mainScreenshotViewer.src = '';
    }

    function openMediaModal(item) {
        videoModalTitle.textContent = item.title;
        downloadLink.href = item.videoUri;

        // Update download button text
        const downloadText = item.type === 'Clip' ? 'Descargar Video' : 'Descargar Captura';
        downloadLink.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            ${downloadText}
        `;

        if (item.type === 'Clip') {
            mainVideoPlayer.style.display = 'block';
            mainScreenshotViewer.style.display = 'none';
            mainVideoPlayer.src = item.videoUri;
            // Attempt to play
            mainVideoPlayer.play().catch(e => console.log("Autoplay blocked:", e));
        } else {
            mainVideoPlayer.style.display = 'none';
            mainScreenshotViewer.style.display = 'block';
            mainScreenshotViewer.src = item.videoUri; // Use the high-res URI for viewer
        }

        videoModal.style.display = 'flex';
    }

    function updateConnectionStatus() {
        if (apiKey) {
            connectionStatus.textContent = 'Modo: En Vivo (API)';
            connectionStatus.classList.remove('simulation');
            connectionStatus.classList.add('live');
        } else {
            connectionStatus.textContent = 'Modo: Simulación';
            connectionStatus.classList.remove('live');
            connectionStatus.classList.add('simulation');
        }
    }

    // --- Search Logic ---
    searchBtn.addEventListener('click', handleSearch);
    gamertagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const type = btn.dataset.type;
            const filtered = type === 'all'
                ? currentData
                : currentData.filter(item => item.type.toLowerCase() === type);

            renderGrid(filtered); // No extra log needed here as it's just filtering
        });
    });

    async function handleSearch() {
        const gamertag = gamertagInput.value.trim();
        if (!gamertag) return;

        // Reset UI
        resultsSection.style.display = 'none';
        loader.style.display = 'flex';
        mediaGrid.innerHTML = '';

        try {
            if (apiKey) {
                // REAL API CALL
                const { clips, profilePic, debugLog } = await fetchRealXboxData(gamertag);
                currentData = clips;

                updateUserProfile(gamertag, currentData, profilePic);
                renderGrid(currentData, debugLog); // Pass debug info

            } else {
                // MOCK DATA
                await new Promise(resolve => setTimeout(resolve, 1000));
                currentData = generateMockData(gamertag);
                updateUserProfile(gamertag, currentData);
                renderGrid(currentData);
            }

            loader.style.display = 'none';
            resultsSection.style.display = 'block';

        } catch (error) {
            loader.style.display = 'none';
            console.error(error);

            if (error.message.includes('Failed to fetch')) {
                alert('Error de Conexión (CORS):\n1. Asegúrate de haber guardado tu API Key en ESTA página web (Configuración > Guardar).\n2. Desactiva tu AdBlocker (puede estar bloqueando el proxy).\n3. Verifica tu conexión a internet.');
            } else {
                alert('Error al buscar: ' + error.message);
            }
        }
    }

    // Video editor elements
    const toggleEditorBtn = document.getElementById('toggle-editor-btn');
    const editorControls = document.getElementById('editor-controls');
    const previewTrimBtn = document.getElementById('preview-trim-btn');
    const exportTrimBtn = document.getElementById('export-trim-btn');
    const exportStatus = document.getElementById('export-status');

    // Timeline Elements
    const timelineContainer = document.getElementById('timeline-container');
    const timelineTrack = document.getElementById('timeline-track');
    const timelineFill = document.getElementById('timeline-fill');
    const handleStart = document.getElementById('handle-start');
    const handleEnd = document.getElementById('handle-end');
    const displayStart = document.getElementById('time-start-display');
    const displayEnd = document.getElementById('time-end-display');
    const displayDuration = document.getElementById('time-duration-display');

    let isEditorOpen = false;
    let trimStart = 0;
    let trimEnd = 0;
    let videoDuration = 0;

    // Helper to format time
    const fmtTime = s => s.toFixed(1) + 's';

    // Update UI from state
    function updateTimelineUI() {
        if (!videoDuration) return;
        const startPct = (trimStart / videoDuration) * 100;
        const endPct = (trimEnd / videoDuration) * 100;

        handleStart.style.left = `${startPct}%`;
        handleEnd.style.left = `${endPct}%`;
        timelineFill.style.left = `${startPct}%`;
        timelineFill.style.width = `${endPct - startPct}%`;

        displayStart.textContent = fmtTime(trimStart);
        displayEnd.textContent = fmtTime(trimEnd);
        displayDuration.textContent = fmtTime(trimEnd - trimStart);
    }

    // Toggle Editor
    if (toggleEditorBtn) {
        toggleEditorBtn.addEventListener('click', () => {
            isEditorOpen = !isEditorOpen;
            editorControls.style.display = isEditorOpen ? 'block' : 'none';

            if (isEditorOpen && mainVideoPlayer.duration) {
                videoDuration = mainVideoPlayer.duration;
                trimStart = 0;
                trimEnd = videoDuration;
                updateTimelineUI();
            }
        });
    }

    // Timeline Drag Logic
    let isDragging = null; // 'start' or 'end'

    const getXFromEvent = (e) => {
        return e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    };

    const handleDragStart = (type) => (e) => {
        isDragging = type;
        // Prevent default only on mouse to allow touch scrolling if needed,
        // but we set touch-action: none on container so we are good.
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
    };

    const handleDragMove = (e) => {
        if (!isDragging || !videoDuration) return;

        // e.preventDefault(); // Stop page scroll while scrubbing

        const rect = timelineTrack.getBoundingClientRect();
        const clientX = getXFromEvent(e);
        let pct = (clientX - rect.left) / rect.width;

        // Clamp 0-1
        if (pct < 0) pct = 0;
        if (pct > 1) pct = 1;

        const time = pct * videoDuration;

        if (isDragging === 'start') {
            // Constrain start < end - min_gap
            if (time < trimEnd - 0.5) {
                trimStart = time;
            } else {
                trimStart = Math.max(0, trimEnd - 0.5);
            }
            mainVideoPlayer.currentTime = trimStart; // Scrub
        } else {
            // Constrain end > start + min_gap
            if (time > trimStart + 0.5) {
                trimEnd = time;
            } else {
                trimEnd = Math.min(videoDuration, trimStart + 0.5);
            }
            mainVideoPlayer.currentTime = trimEnd; // Scrub
        }

        updateTimelineUI();
    };

    const handleDragEnd = () => {
        isDragging = null;
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('touchend', handleDragEnd);
    };

    // Attach listeners if elements exist
    if (handleStart && handleEnd) {
        handleStart.addEventListener('mousedown', handleDragStart('start'));
        handleStart.addEventListener('touchstart', handleDragStart('start'), { passive: false });

        handleEnd.addEventListener('mousedown', handleDragStart('end'));
        handleEnd.addEventListener('touchstart', handleDragStart('end'), { passive: false });
    }


    // Preview Logic
    if (previewTrimBtn) {
        previewTrimBtn.addEventListener('click', () => {
            // Use variables instead of input values
            mainVideoPlayer.currentTime = trimStart;
            mainVideoPlayer.play();

            const stopPreview = () => {
                if (mainVideoPlayer.currentTime >= trimEnd) {
                    mainVideoPlayer.pause();
                    mainVideoPlayer.removeEventListener('timeupdate', stopPreview);
                }
            };
            mainVideoPlayer.addEventListener('timeupdate', stopPreview);
        });
    }

    // Export Logic (Client-Side Recording)
    if (exportTrimBtn) {
        exportTrimBtn.addEventListener('click', async () => {
            const start = trimStart;
            const end = trimEnd;
            const duration = (end - start) * 1000;

            if (duration <= 0) {
                alert('El tiempo final debe ser mayor al inicial.');
                return;
            }

            exportStatus.textContent = "Preparando grabación (esto tomará lo que dure el video)...";
            exportTrimBtn.disabled = true;

            try {
                // Need crossOrigin to record
                if (!mainVideoPlayer.crossOrigin) {
                    // Determine current src to reload with crossorigin
                    const currentSrc = mainVideoPlayer.src;
                    mainVideoPlayer.crossOrigin = "anonymous";
                    mainVideoPlayer.src = currentSrc;
                    await new Promise(r => mainVideoPlayer.onloadedmetadata = r);
                }

                mainVideoPlayer.currentTime = start;

                // Allow time to seek
                await new Promise(r => setTimeout(r, 500));

                const stream = mainVideoPlayer.captureStream(); // Modern browsers
                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
                const chunks = [];

                mediaRecorder.ondataavailable = e => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    const url = URL.createObjectURL(blob);

                    // Trigger Download
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `recorte_${Date.now()}.webm`;
                    document.body.appendChild(a);
                    a.click();

                    window.URL.revokeObjectURL(url);
                    exportStatus.textContent = "¡Exportado con éxito!";
                    exportTrimBtn.disabled = false;
                };

                // Start Recording and Playing
                mediaRecorder.start();
                mainVideoPlayer.play();
                exportStatus.textContent = `Grabando recorte (${(duration / 1000).toFixed(1)}s)... No cierres.`;

                // Setup auto-stop
                setTimeout(() => {
                    mediaRecorder.stop();
                    mainVideoPlayer.pause();
                }, duration);

            } catch (e) {
                console.error(e);
                exportStatus.textContent = "Error: " + (e.message || "CORS/Formato no soportado.");
                exportStatus.style.color = "#ef4444";
                exportTrimBtn.disabled = false;
                alert("No se pudo grabar el video debido a restricciones de seguridad del navegador (CORS) con el servidor de Xbox. Intenta descargar el original.");
            }
        });
    }

    function updateUserProfile(gamertag, data, imgUrl = null) {
        displayGamertag.textContent = gamertag;

        if (imgUrl) {
            userAvatar.innerHTML = `<img src="${imgUrl}" alt="${gamertag}">`;
        } else {
            userAvatar.innerHTML = gamertag.charAt(0).toUpperCase();
        }

        const clips = data.filter(i => i.type === 'Clip').length;
        const screens = data.filter(i => i.type === 'Screenshot').length;
        userStats.textContent = `${clips} Clips • ${screens} Capturas encontradas`;
    }

    // --- Data Fetching Implementations ---

    async function fetchRealXboxData(gamertag) {
        let logs = []; // Debug logs

        const log = (msg) => {
            console.log(msg);
            logs.push(msg);
        };

        log(`Iniciando búsqueda para: ${gamertag}`);

        const CORS_PROXY = 'https://corsproxy.io/?'; // Use this consistently

        // 1. Get XUID
        // Try the User's suggested endpoint: api/v2/search/{gt}
        // This endpoint seems to return 'people' array vs 'profileUsers' from friends/search
        const searchUrl = `https://xbl.io/api/v2/search/${encodeURIComponent(gamertag)}`;

        let searchResponse = await fetch(CORS_PROXY + encodeURIComponent(searchUrl), {
            headers: { 'X-Authorization': apiKey, 'Accept': 'application/json' }
        });

        // Fallback to friends/search if general search fails or is empty?
        // Let's stick to valid response check first.
        if (!searchResponse.ok) {
            log(`Error Search Legacy: ${searchResponse.status}`);
            // Try friends path as backup
            const friendsSearchUrl = `https://xbl.io/api/v2/friends/search?gt=${encodeURIComponent(gamertag)}`;
            searchResponse = await fetch(CORS_PROXY + encodeURIComponent(friendsSearchUrl), {
                headers: { 'X-Authorization': apiKey, 'Accept': 'application/json' }
            });

            if (!searchResponse.ok) {
                throw new Error('Error al buscar usuario (Status ' + searchResponse.status + ')');
            }
        }

        const searchData = await searchResponse.json();

        let xuid = null;
        let profilePic = null;

        // Check both schemas (people vs profileUsers)
        if (searchData.people && searchData.people.length > 0) {
            xuid = searchData.people[0].xuid;
            profilePic = searchData.people[0].displayPicRaw;
        } else if (searchData.profileUsers && searchData.profileUsers.length > 0) {
            xuid = searchData.profileUsers[0].id;
            profilePic = searchData.profileUsers[0].settings.find(s => s.id === 'GameDisplayPicRaw')?.value;
        } else {
            throw new Error(`Usuario "${gamertag}" no encontrado.`);
        }

        log(`XUID encontrado: ${xuid}`);

        // Use CORS proxy for media calls too
        const PROXY_URL = CORS_PROXY;

        // Helper to fetch media
        const fetchMedia = async (endpoint, type) => {
            try {
                // Try specific user endpoint
                const targetUrl = `https://xbl.io/api/v2/dvr/${endpoint}/${xuid}`;
                log(`Intentando obtener ${type} de: ${targetUrl}`);

                let response = await fetch(PROXY_URL + encodeURIComponent(targetUrl), {
                    headers: { 'X-Authorization': apiKey, 'Accept': 'application/json' }
                });

                let data = null;
                if (response.ok) {
                    data = await response.json();
                    log(`Exito directo (Status ${response.status}). Keys: ${Object.keys(data).join(', ')}`);
                } else {
                    log(`Fallo directo (Status ${response.status}). Probando fallback...`);
                    // Fallback
                    const fallbackUrl = `https://xbl.io/api/v2/dvr/${endpoint}`;
                    response = await fetch(PROXY_URL + encodeURIComponent(fallbackUrl), {
                        headers: { 'X-Authorization': apiKey, 'Accept': 'application/json' }
                    });
                    if (response.ok) {
                        data = await response.json();
                        log(`Exito fallback (Status ${response.status}). Keys: ${Object.keys(data).join(', ')}`);
                    } else {
                        log(`Fallo fallback (Status ${response.status})`);
                    }
                }

                if (!data) return [];

                // PATCH: Include 'values' key in data access
                const items = data.gameClips || data.game_clips || data.screenshots || data.values || [];

                log(`Items crudos encontrados: ${items.length}`);

                // If items are found, filter them
                const filtered = items.filter(i => {
                    const itemXuid = i.xuid || i.ownerXuid;
                    if (itemXuid) return itemXuid == xuid;
                    return false;
                });

                log(`Coincidencias con XUID (${xuid}): ${filtered.length}. Total items: ${items.length}`);

                if (items.length > 0 && filtered.length === 0) {
                    // Check if the first item has an ID at all, for debugging
                    const firstItemXuid = items[0].xuid || items[0].ownerXuid || 'N/A';
                    log(`ADVERTENCIA: No hay coincidencia. Buscado: ${xuid}, Encontrado en item[0]: ${firstItemXuid}`);
                }

                // STRICT: Only return items that match the target XUID. 
                // Do NOT return 'items' as fallback, as that shows the API Key owner's clips instead of the searched user's.
                // UNLESS the array is empty and we want to allow at least *trying* to show something if the logic fails? 
                // No, user specifically requested not to show wrong clips. 
                const finalItems = filtered;

                return finalItems.map(item => {
                    let thumbnail = '';
                    let videoUri = '';
                    let title = item.titleName || 'Sin título';
                    let game = item.titleName || 'Desconocido';
                    let views = item.viewCount || item.views || 0;
                    let date = item.uploadDate || item.dateRecorded || item.dateTaken || new Date().toISOString();

                    // Schema A: contentLocators (New/Observed Schema)
                    if (item.contentLocators) {
                        const download = item.contentLocators.find(l => l.locatorType === 'Download');
                        const thumbLarge = item.contentLocators.find(l => l.locatorType === 'Thumbnail_Large');
                        const thumbSmall = item.contentLocators.find(l => l.locatorType === 'Thumbnail_Small');

                        if (download) videoUri = download.uri;
                        if (thumbLarge) thumbnail = thumbLarge.uri;
                        else if (thumbSmall) thumbnail = thumbSmall.uri;
                    }
                    // Schema B: gameClipUris / thumbnails (Old/Standard Schema)
                    else {
                        thumbnail = (item.thumbnails && item.thumbnails[0]) ? item.thumbnails[0].uri : '';
                        if (type === 'Clip' && item.gameClipUris && item.gameClipUris[0]) {
                            videoUri = item.gameClipUris[0].uri;
                        } else if (type === 'Screenshot' && item.screenshotUris && item.screenshotUris[0]) {
                            videoUri = item.screenshotUris[0].uri;
                        }
                    }

                    // Fallback for videoUri if it's a screenshot (use thumbnail as full view if needed)
                    if (type === 'Screenshot' && !videoUri && thumbnail) {
                        videoUri = thumbnail;
                    }

                    return {
                        id: item.gameClipId || item.screenshotId || item.contentId || Math.random(),
                        title: title,
                        game: game,
                        type: type,
                        date: new Date(date).toLocaleDateString(),
                        thumbnail: thumbnail,
                        videoUri: videoUri,
                        views: views,
                        ownerId: item.xuid || item.ownerXuid
                    };
                });

            } catch (e) {
                log(`Excepción al obtener ${type}: ${e.message}`);
                return [];
            }
        };

        const [clips, screenshots] = await Promise.all([
            fetchMedia('gameclips', 'Clip'),
            fetchMedia('screenshots', 'Screenshot')
        ]);

        const allMedia = [...clips, ...screenshots];
        allMedia.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            profilePic,
            clips: allMedia,
            debugLog: logs
        };
    }

    // --- Mock Data Generator (Fallback) ---
    const generateMockData = (gamertag) => {
        const games = ['Halo Infinite', 'Forza Horizon 5', 'Starfield', 'Call of Duty: MW3', 'Elden Ring', 'FIFA 24', 'Minecraft'];
        const types = ['Clip', 'Screenshot'];

        return Array.from({ length: 12 }, (_, i) => {
            const game = games[Math.floor(Math.random() * games.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            const bgId = Math.floor(Math.random() * 50);

            return {
                id: i,
                title: type === 'Clip' ? `Momentazo en ${game}` : `Vista increíble en ${game}`,
                game: game,
                type: type,
                date: new Date().toLocaleDateString(),
                thumbnail: `https://picsum.photos/seed/${gamertag}${i}/400/225`,
                views: Math.floor(Math.random() * 1000)
            };
        });
    };

    function renderGrid(data, debugLog = []) {
        mediaGrid.innerHTML = '';

        if (data.length === 0) {
            let debugHtml = '';
            let mainMessage = 'No se encontraron clips accesibles.';
            let subMessage = 'Nota: La API de Xbox bloquea el acceso si no eres amigo del usuario en Xbox Live,<br>incluso si sus clips son "Públicos" en la web.';

            // Analyze logs for specific errors
            const logString = debugLog.join(' ');
            if (logString.includes('Status 404') || logString.includes('XUIDs no coinciden') || logString.includes('no coinciden con el XUID')) {
                mainMessage = 'Contenido Privado o No Encontrado';
                subMessage = 'No pudimos acceder a los clips de este usuario desde la API.<br>Esto suele deberse a que sus clips no son "Públicos" o la relación de amistad no se detecta.';
            }

            const gamertag = document.getElementById('display-gamertag').textContent || 'Usuario';
            const gamerDvrUrl = `https://gamerdvr.com/gamer/${encodeURIComponent(gamertag)}`;
            const xboxUrl = `https://www.xbox.com/play/user/${encodeURIComponent(gamertag)}`;

            const externalLinks = `
                <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <a href="${gamerDvrUrl}" target="_blank" class="secondary-btn" style="width: auto; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        Verificar en GamerDVR
                    </a>
                    <a href="${xboxUrl}" target="_blank" class="secondary-btn" style="width: auto; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        Ver en Xbox.com
                    </a>
                </div>
                <p style="font-size: 0.8rem; margin-top: 1rem; color: var(--text-muted);">Si tampoco aparecen en GamerDVR, significa que la configuración de privacidad del usuario bloquea el acceso externo.</p>
            `;

            if (debugLog.length > 0) {
                console.log("Debug Logs:", debugLog); // Ensure logs are visible in console
                debugHtml = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.5); border-radius: 8px; font-family: monospace; font-size: 0.8rem; text-align: left; opacity: 0.8;">
                        <strong>Log de Depuración:</strong><br>
                        ${debugLog.slice(0, 8).map(l => `> ${l}`).join('<br>')}<br>...
                    </div>
                `;
            }

            mediaGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">
                    <div style="margin-bottom: 1.5rem; opacity: 0.8;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <p style="font-size: 1.4rem; margin-bottom: 0.5rem; color: #fff;">${mainMessage}</p>
                    <p style="font-size: 0.95rem; line-height: 1.6; opacity: 0.8; max-width: 600px; margin: 0 auto;">
                        ${subMessage}
                    </p>
                    ${externalLinks}
                    ${debugHtml}
                </div>`;
            return;
        }

        data.forEach((item, index) => {
            const card = document.createElement('div'); // Div instead of A
            card.className = 'media-card';
            card.style.animationDelay = `${index * 0.1}s`;
            card.style.animation = 'fadeInUp 0.5s ease-out forwards';
            card.style.opacity = '0';

            const playIcon = item.type === 'Clip' ? `
                <div class="play-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="0"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>` : '';

            // Handle potential broken images
            const fallbackImage = 'https://via.placeholder.com/400x225/000000/FFFFFF?text=Sin+Vista+Previa';

            card.innerHTML = `
                <div class="card-thumbnail-container">
                    <img src="${item.thumbnail}" 
                         alt="${item.title}" 
                         class="card-thumbnail"
                         onerror="this.onerror=null; this.src='${fallbackImage}';">
                    ${playIcon}
                </div>
                <div class="card-content">
                    <div class="card-meta" style="margin-bottom: 0.5rem;">
                        <span class="card-type-badge">${item.type}</span>
                        <span>${item.date}</span>
                    </div>
                    <h3 class="card-title">${item.title}</h3>
                    <div class="card-meta">
                        <span>${item.game}</span>
                        <span>${item.views} vistas</span>
                    </div>
                </div>
            `;

            // Click event to open modal
            card.addEventListener('click', () => openMediaModal(item));

            mediaGrid.appendChild(card);
        });
    }
});
