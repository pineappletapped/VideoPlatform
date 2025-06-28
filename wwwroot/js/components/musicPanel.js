import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";
import { updateOverlayState } from "../firebase.js";

const db = getDatabaseInstance();

function getMusicRef(eventId) {
    return ref(db, `music/${eventId}`);
}

export function renderMusicPanel(container, eventId) {
    let currentAudio = null;
    let currentIdx = null;
    let loop = false;
    let loopPlaylist = false;
    let playlist = [];
    let playlistPos = 0;
    let timeInterval = null;
    let monitor = false;

    window.musicPlayer = {
        setVolume(v) { if (currentAudio) currentAudio.volume = v; },
        pause() { if (currentAudio) currentAudio.pause(); },
        resume() { if (currentAudio) currentAudio.play(); },
        isPlaying() { return currentAudio && !currentAudio.paused; }
    };

    onValue(getMusicRef(eventId), (snapshot) => {
        const tracks = snapshot.val() || [];
        renderPanel(tracks);
    });

    function renderPanel(tracks) {
        container.innerHTML = `
            <div class="mb-4" id="music-player-section">
                <div id="music-player-info" class="mb-1 text-sm text-gray-700"></div>
                <input type="range" id="music-progress" class="w-full mb-2" min="0" max="0" step="0.01" value="0" />
                <div class="flex gap-2 items-center flex-wrap">
                    <button class="control-button btn-sm" id="music-play">Play</button>
                    <button class="control-button btn-sm" id="music-pause">Pause</button>
                    <button class="control-button btn-sm" id="playlist-start">Play Playlist</button>
                    <label class="flex items-center gap-1 ml-2 text-xs">
                        <input type="checkbox" id="music-loop" /> Loop Track
                    </label>
                    <label class="flex items-center gap-1 ml-2 text-xs">
                        <input type="checkbox" id="playlist-loop" /> Loop Playlist
                    </label>
                    <span id="music-time" class="ml-4 text-xs text-gray-500"></span>
                </div>
            </div>
            <div class="flex justify-between items-center mb-2">
                <h2 class="font-bold text-lg">Music Tracks</h2>
                <button class="control-button btn-sm" id="add-music">Add Track</button>
            </div>
            <ul class="space-y-2 mb-4">
                ${tracks.length === 0 ? `<li class='text-gray-400'>No music tracks yet.</li>` : tracks.map((track, idx) => `
                    <li class="flex items-center gap-4 bg-gray-50 rounded p-2">
                        <img src="${track.thumbnail || 'https://via.placeholder.com/64x36?text=No+Thumb'}" alt="thumb" class="w-16 h-9 object-cover rounded border" />
                        <div class="flex-1">
                            <div class="font-semibold">${track.name}</div>
                            <div class="text-xs text-gray-500">${track.duration || '--:--'} | <span class="italic">${track.audioUrl ? track.audioUrl.split('/').pop() : ''}</span></div>
                        </div>
                        <button class="control-button btn-sm" data-action="edit" data-idx="${idx}">Edit</button>
                        <button class="control-button btn-sm" data-action="remove" data-idx="${idx}">Remove</button>
                        <button class="control-button btn-sm" data-action="play" data-idx="${idx}">Play</button>
                        <button class="control-button btn-sm" data-action="queue" data-idx="${idx}">Add</button>
                    </li>
                `).join('')}
            </ul>
            <div id="music-modal" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:1000;align-items:center;justify-content:center;">
                <div style="background:#fff;padding:2rem;border-radius:0.5rem;min-width:320px;max-width:95vw;">
                    <h3 class="font-bold text-lg mb-2" id="music-modal-title">Add Track</h3>
                    <form id="music-form">
                        <div class="mb-2">
                            <label class="block text-sm">Track Name</label>
                            <input class="border p-1 w-full" name="name" required />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Audio File</label>
                            <input type="file" id="music-audio-file" accept="audio/*" />
                            <input class="border p-1 w-full mt-1" name="audioUrl" placeholder="Uploaded audio URL" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Thumbnail</label>
                            <input type="file" id="music-thumb-file" accept="image/*" />
                            <input class="border p-1 w-full mt-1" name="thumbnail" placeholder="Thumbnail URL" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Duration (mm:ss)</label>
                            <input class="border p-1 w-full" name="duration" placeholder="00:00" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Music License (optional)</label>
                            <input type="file" id="music-license-file" />
                            <input class="border p-1 w-full mt-1" name="license" placeholder="License file URL" />
                        </div>
                        <input type="hidden" name="idx" />
                        <div class="flex gap-2 mt-4">
                            <button type="submit" class="control-button btn-sm">Save</button>
                            <button type="button" id="music-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                            <span id="music-upload-status" class="text-xs text-gray-600 ml-2"></span>
                        </div>
                    </form>
                </div>
            </div>
        `;
        // Add/Edit/Remove/Play handlers
        container.querySelector('#add-music').onclick = () => showMusicModal();
        container.querySelectorAll('button[data-action="edit"]').forEach(btn => {
            btn.onclick = () => showMusicModal(tracks[btn.getAttribute('data-idx')], btn.getAttribute('data-idx'));
        });
        container.querySelectorAll('button[data-action="remove"]').forEach(btn => {
            btn.onclick = async () => {
                const idx = btn.getAttribute('data-idx');
                tracks.splice(idx, 1);
                await set(getMusicRef(eventId), tracks);
            };
        });
        container.querySelectorAll('button[data-action="play"]').forEach(btn => {
            btn.onclick = () => playTrack(tracks[btn.getAttribute('data-idx')], btn.getAttribute('data-idx'));
        });
        container.querySelectorAll('button[data-action="queue"]').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.getAttribute('data-idx'), 10);
                if (!playlist.includes(idx)) playlist.push(idx);
            };
        });
        // Modal logic
        const modal = container.querySelector('#music-modal');
        const form = container.querySelector('#music-form');
        if (modal && form) {
            container.querySelector('#music-cancel').onclick = () => { modal.style.display = 'none'; };
            form.onsubmit = async e => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(form));
                let audioUrl = data.audioUrl;
                if (form['music-audio-file'].files[0]) {
                    const path = `uploads/${eventId}/music/${form['music-audio-file'].files[0].name}`;
                    setStatus('Uploading audio...');
                    const url = await uploadToServer(form['music-audio-file'].files[0], path);
                    setStatus('');
                    if (url) audioUrl = url;
                }
                let thumbnail = data.thumbnail;
                if (form['music-thumb-file'].files[0]) {
                    const path = `uploads/${eventId}/music/thumbnails/${form['music-thumb-file'].files[0].name}`;
                    setStatus('Uploading thumb...');
                    const url = await uploadToServer(form['music-thumb-file'].files[0], path);
                    setStatus('');
                    if (url) thumbnail = url;
                }
                let license = data.license;
                if (form['music-license-file'].files[0]) {
                    const path = `uploads/${eventId}/music/licenses/${form['music-license-file'].files[0].name}`;
                    setStatus('Uploading license...');
                    const url = await uploadToServer(form['music-license-file'].files[0], path);
                    setStatus('');
                    if (url) license = url;
                }
                const track = {
                    name: data.name,
                    audioUrl,
                    thumbnail,
                    duration: data.duration,
                    license
                };
                if (data.idx) {
                    tracks[data.idx] = track;
                } else {
                    tracks.push(track);
                }
                await set(getMusicRef(eventId), tracks);
                modal.style.display = 'none';
            };
        }
        function showMusicModal(track = {}, idx = '') {
            modal.style.display = 'flex';
            form.name.value = track.name || '';
            form.audioUrl.value = track.audioUrl || '';
            form.thumbnail.value = track.thumbnail || '';
            form.duration.value = track.duration || '';
            form.license.value = track.license || '';
            form['music-audio-file'].value = '';
            form['music-thumb-file'].value = '';
            form['music-license-file'].value = '';
            form.idx.value = idx;
            container.querySelector('#music-modal-title').textContent = idx === '' ? 'Add Track' : 'Edit Track';
            form['music-audio-file'].onchange = () => {
                const file = form['music-audio-file'].files[0];
                if (file) {
                    const url = URL.createObjectURL(file);
                    const audio = document.createElement('audio');
                    audio.preload = 'metadata';
                    audio.onloadedmetadata = () => {
                        const dur = audio.duration;
                        const mins = Math.floor(dur / 60);
                        const secs = Math.floor(dur % 60);
                        form.duration.value = `${mins}:${secs.toString().padStart(2,'0')}`;
                        URL.revokeObjectURL(url);
                    };
                    audio.src = url;
                }
            };
        }
        // Player controls
        const playBtn = container.querySelector('#music-play');
        const pauseBtn = container.querySelector('#music-pause');
        const playlistBtn = container.querySelector('#playlist-start');
        const loopBox = container.querySelector('#music-loop');
        const playlistLoopBox = container.querySelector('#playlist-loop');
        const progress = container.querySelector('#music-progress');
        const timeSpan = container.querySelector('#music-time');
        if (playBtn && pauseBtn) {
            playBtn.onclick = () => {
                if (currentIdx !== null && tracks[currentIdx]) {
                    if (currentAudio && !currentAudio.paused && playlist.length===0) {
                        // already playing
                        return;
                    }
                    playTrack(tracks[currentIdx], currentIdx);
                }
            };
            pauseBtn.onclick = () => {
                if (currentAudio) currentAudio.pause();
            };
        }
        if (loopBox) {
            loopBox.onchange = () => {
                loop = loopBox.checked;
                if (currentAudio) currentAudio.loop = loop;
            };
        }
        if (playlistLoopBox) {
            playlistLoopBox.onchange = () => {
                loopPlaylist = playlistLoopBox.checked;
            };
        }
        if (playlistBtn) {
            playlistBtn.onclick = () => {
                if (tracks.length === 0) return;
                playlist = tracks.map((_, i) => i);
                playlistPos = 0;
                playTrack(tracks[playlist[0]], playlist[0]);
            };
        }
        const monitorBtn = document.getElementById('music-monitor');
        if (monitorBtn) {
            monitorBtn.onclick = () => {
                monitor = !monitor;
                monitorBtn.textContent = monitor ? 'Monitor On' : 'Monitor';
            };
        }
        if (progress) {
            progress.oninput = () => {
                if (currentAudio) {
                    currentAudio.currentTime = parseFloat(progress.value);
                }
            };
        }
        function playTrack(track, idx) {
            if (currentIdx === idx && currentAudio) {
                currentAudio.play();
            } else {
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio = null;
                }
                if (!track.audioUrl) return;
                if (monitor) {
                    currentAudio = new Audio(track.audioUrl);
                    currentAudio.loop = loop;
                    currentAudio.volume = (window.masterVolume || 1) * (window.musicVolume || 1);
                    currentAudio.play();
                }
                updateOverlayState(eventId, { nowPlaying: track, musicVisible: true });
                currentIdx = idx;
                updatePlayerInfo(track);
                if (progress) {
                    progress.max = currentAudio ? currentAudio.duration : 0;
                }
            }
            if (timeInterval) clearInterval(timeInterval);
            timeInterval = setInterval(() => updateTime(track), 500);
            currentAudio.onended = () => {
                if (playlist.length && playlistPos < playlist.length - 1) {
                    playlistPos++;
                    currentIdx = playlist[playlistPos];
                    playTrack(tracks[currentIdx], currentIdx);
                } else if (playlist.length && loopPlaylist) {
                    playlistPos = 0;
                    currentIdx = playlist[0];
                    playTrack(tracks[currentIdx], currentIdx);
                } else if (loop) {
                    playTrack(track, idx);
                } else {
                    updatePlayerInfo(null);
                    if (timeInterval) clearInterval(timeInterval);
                    updateOverlayState(eventId, { nowPlaying: null, musicVisible: false });
                }
            };
        }
        function updatePlayerInfo(track) {
            const info = container.querySelector('#music-player-info');
            if (!track) {
                info.textContent = 'No track playing.';
                timeSpan.textContent = '';
                return;
            }
            info.innerHTML = `<span class="font-semibold">${track.name}</span> <span class="text-xs text-gray-500">${track.duration || '--:--'}</span>`;
        }
        function updateTime(track) {
            if (!currentAudio || !track) {
                timeSpan.textContent = '';
                return;
            }
            if (progress) progress.value = currentAudio.currentTime;
            const remaining = Math.max(0, (currentAudio.duration || 0) - (currentAudio.currentTime || 0));
            const mins = Math.floor(remaining / 60);
            const secs = Math.floor(remaining % 60);
            timeSpan.textContent = `Time Remaining: ${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }
}

function setStatus(text) {
    const el = document.getElementById('music-upload-status');
    if (el) el.textContent = text;
}

async function uploadToServer(file, path) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path.replace(/^\/+/, ''));
        const resp = await fetch('upload.php', { method: 'POST', body: formData });
        if (!resp.ok) throw new Error('upload failed');
        const data = await resp.json();
        return data.url;
    } catch (err) {
        console.error('Upload failed', err);
        return null;
    }
}
