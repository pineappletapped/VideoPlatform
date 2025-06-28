import { ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";

const db = getDatabaseInstance();

function getVtsRef(eventId) {
    return ref(db, `vts/${eventId}`);
}

export function renderVtsPanel(container, eventId, onLoadVT) {
    // Listen for VTs
    onValue(getVtsRef(eventId), (snapshot) => {
        const vts = snapshot.val() || [];
        renderPanel(vts);
    });

    function renderPanel(vts) {
        container.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h2 class="font-bold text-lg">VT's</h2>
                <button class="control-button btn-sm" id="add-vt">Add VT</button>
            </div>
            <ul class="space-y-2 mb-4">
                ${vts.length === 0 ? `<li class='text-gray-400'>No VTs yet.</li>` : vts.map((vt, idx) => `
                    <li class="flex items-center gap-4 bg-gray-50 rounded p-2">
                        <img src="${vt.thumbnail || 'https://via.placeholder.com/64x36?text=No+Thumb'}" alt="thumb" class="w-16 h-9 object-cover rounded border" />
                        <div class="flex-1">
                            <div class="font-semibold">${vt.name}</div>
                            <div class="text-xs text-gray-500">${vt.duration || '--:--'} | <span class="italic">${vt.videoUrl ? vt.videoUrl.split('/').pop() : ''}</span></div>
                        </div>
                        <button class="control-button btn-sm" data-action="edit" data-idx="${idx}">Edit</button>
                        <button class="control-button btn-sm" data-action="remove" data-idx="${idx}">Remove</button>
                        <button class="control-button btn-sm" data-action="load" data-idx="${idx}">Load</button>
                    </li>
                `).join('')}
            </ul>
            <div id="vt-modal" class="modal-overlay" style="display:none;">
                <div class="modal-window">
                    <h3 class="font-bold text-lg mb-2" id="vt-modal-title">Add VT</h3>
                    <form id="vt-form">
                        <div class="mb-2">
                            <label class="block text-sm">Video Name</label>
                            <input class="border p-1 w-full" name="name" required />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Video File</label>
                            <input type="file" id="vt-video-file" accept="video/*" />
                            <button type="button" id="vt-upload-video" class="control-button btn-sm mt-1">Upload</button>
                            <input class="border p-1 w-full mt-1" name="videoUrl" placeholder="Uploaded video URL" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Thumbnail</label>
                            <input type="file" id="vt-thumb-file" accept="image/*" />
                            <button type="button" id="vt-upload-thumb" class="control-button btn-sm mt-1">Upload</button>
                            <input class="border p-1 w-full mt-1" name="thumbnail" placeholder="Thumbnail URL" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Duration (mm:ss)</label>
                            <input class="border p-1 w-full" name="duration" placeholder="00:00" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Music License (optional)</label>
                            <input type="file" id="vt-license-file" />
                            <button type="button" id="vt-upload-license" class="control-button btn-sm mt-1">Upload</button>
                            <input class="border p-1 w-full mt-1" name="license" placeholder="License file URL" />
                        </div>
                        <input type="hidden" name="idx" />
                        <div class="flex gap-2 mt-4">
                            <button type="submit" class="control-button btn-sm">Save</button>
                            <button type="button" id="vt-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                            <span id="vt-upload-status" class="text-xs text-gray-600 ml-2"></span>
                        </div>
                    </form>
                </div>
            </div>
        `;
        // Add/Edit/Remove/Load handlers
        container.querySelector('#add-vt').onclick = () => showVtModal();
        container.querySelectorAll('button[data-action="edit"]').forEach(btn => {
            btn.onclick = () => showVtModal(vts[btn.getAttribute('data-idx')], btn.getAttribute('data-idx'));
        });
        container.querySelectorAll('button[data-action="remove"]').forEach(btn => {
            btn.onclick = async () => {
                const idx = btn.getAttribute('data-idx');
                vts.splice(idx, 1);
                await set(getVtsRef(eventId), vts);
            };
        });
        container.querySelectorAll('button[data-action="load"]').forEach(btn => {
            btn.onclick = async () => {
                const idx = btn.getAttribute('data-idx');
                const vt = vts[idx];
                if (onLoadVT) onLoadVT(vt);
                await set(ref(db, `status/${eventId}/vt`), vt);
            };
        });
        // Modal logic
        const modal = container.querySelector('#vt-modal');
        const form = container.querySelector('#vt-form');
        if (modal && form) {
            container.querySelector('#vt-cancel').onclick = () => { modal.style.display = 'none'; };
            form.onsubmit = async e => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(form));
                let videoUrl = data.videoUrl;
                if (form['vt-video-file'].files[0]) {
                    const path = `uploads/${eventId}/vts/${form['vt-video-file'].files[0].name}`;
                    setStatus('Uploading video...');
                    const url = await uploadToServer(form['vt-video-file'].files[0], path);
                    setStatus('');
                    if (url) videoUrl = url;
                }
                let thumbnail = data.thumbnail;
                if (form['vt-thumb-file'].files[0]) {
                    const path = `uploads/${eventId}/vts/thumbnails/${form['vt-thumb-file'].files[0].name}`;
                    setStatus('Uploading thumb...');
                    const url = await uploadToServer(form['vt-thumb-file'].files[0], path);
                    setStatus('');
                    if (url) thumbnail = url;
                }
                let license = data.license;
                if (form['vt-license-file'].files[0]) {
                    const path = `uploads/${eventId}/vts/licenses/${form['vt-license-file'].files[0].name}`;
                    setStatus('Uploading license...');
                    const url = await uploadToServer(form['vt-license-file'].files[0], path);
                    setStatus('');
                    if (url) license = url;
                }
                const vt = {
                    name: data.name,
                    videoUrl,
                    thumbnail,
                    duration: data.duration,
                    license
                };
                if (data.idx) {
                    vts[data.idx] = vt;
                } else {
                    vts.push(vt);
                }
                await set(getVtsRef(eventId), vts);
                modal.style.display = 'none';
            };
            container.querySelector('#vt-upload-video').onclick = async () => {
                if (form['vt-video-file'].files[0]) {
                    const path = `uploads/${eventId}/vts/${form['vt-video-file'].files[0].name}`;
                    setStatus('Uploading video...');
                    const url = await uploadToServer(form['vt-video-file'].files[0], path);
                    setStatus('');
                    if (url) form.videoUrl.value = url;
                }
            };
            container.querySelector('#vt-upload-thumb').onclick = async () => {
                if (form['vt-thumb-file'].files[0]) {
                    const path = `uploads/${eventId}/vts/thumbnails/${form['vt-thumb-file'].files[0].name}`;
                    setStatus('Uploading thumb...');
                    const url = await uploadToServer(form['vt-thumb-file'].files[0], path);
                    setStatus('');
                    if (url) form.thumbnail.value = url;
                }
            };
            container.querySelector('#vt-upload-license').onclick = async () => {
                if (form['vt-license-file'].files[0]) {
                    const path = `uploads/${eventId}/vts/licenses/${form['vt-license-file'].files[0].name}`;
                    setStatus('Uploading license...');
                    const url = await uploadToServer(form['vt-license-file'].files[0], path);
                    setStatus('');
                    if (url) form.license.value = url;
                }
            };
        }
        function showVtModal(vt = {}, idx = '') {
            modal.style.display = 'flex';
            form.name.value = vt.name || '';
            form.videoUrl.value = vt.videoUrl || '';
            form.thumbnail.value = vt.thumbnail || '';
            form.duration.value = vt.duration || '';
            form.license.value = vt.license || '';
            form['vt-video-file'].value = '';
            form['vt-thumb-file'].value = '';
            form['vt-license-file'].value = '';
            form.idx.value = idx;
            container.querySelector('#vt-modal-title').textContent = idx === '' ? 'Add VT' : 'Edit VT';
            form['vt-video-file'].onchange = () => {
                const file = form['vt-video-file'].files[0];
                if (file) {
                    const url = URL.createObjectURL(file);
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    video.onloadedmetadata = () => {
                        const dur = video.duration;
                        const mins = Math.floor(dur / 60);
                        const secs = Math.floor(dur % 60);
                        form.duration.value = `${mins}:${secs.toString().padStart(2,'0')}`;
                        URL.revokeObjectURL(url);
                    };
                    video.src = url;
                }
            };
        }
    }
}

function setStatus(text) {
    const statusEl = document.getElementById('vt-upload-status');
    if (statusEl) statusEl.textContent = text;
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
