import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

const db = getDatabase(getApp());

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
            <div id="vt-modal" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:1000;align-items:center;justify-content:center;">
                <div style="background:#fff;padding:2rem;border-radius:0.5rem;min-width:320px;max-width:95vw;">
                    <h3 class="font-bold text-lg mb-2" id="vt-modal-title">Add VT</h3>
                    <form id="vt-form">
                        <div class="mb-2">
                            <label class="block text-sm">Video Name</label>
                            <input class="border p-1 w-full" name="name" required />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Video File (URL or select file)</label>
                            <input class="border p-1 w-full" name="videoUrl" placeholder="/uploads/{eventId}/vts/yourfile.mp4" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Thumbnail (URL or select file)</label>
                            <input class="border p-1 w-full" name="thumbnail" placeholder="/uploads/{eventId}/vts/thumbnails/yourthumb.jpg" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Duration (mm:ss)</label>
                            <input class="border p-1 w-full" name="duration" placeholder="00:00" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Music License (optional, URL or select file)</label>
                            <input class="border p-1 w-full" name="license" placeholder="/uploads/{eventId}/vts/licenses/yourlicense.pdf" />
                        </div>
                        <input type="hidden" name="idx" />
                        <div class="flex gap-2 mt-4">
                            <button type="submit" class="control-button btn-sm">Save</button>
                            <button type="button" id="vt-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
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
            btn.onclick = () => {
                const idx = btn.getAttribute('data-idx');
                if (onLoadVT) onLoadVT(vts[idx]);
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
                const vt = {
                    name: data.name,
                    videoUrl: data.videoUrl,
                    thumbnail: data.thumbnail,
                    duration: data.duration,
                    license: data.license
                };
                if (data.idx) {
                    vts[data.idx] = vt;
                } else {
                    vts.push(vt);
                }
                await set(getVtsRef(eventId), vts);
                modal.style.display = 'none';
            };
        }
        function showVtModal(vt = {}, idx = '') {
            modal.style.display = 'flex';
            form.name.value = vt.name || '';
            form.videoUrl.value = vt.videoUrl || '';
            form.thumbnail.value = vt.thumbnail || '';
            form.duration.value = vt.duration || '';
            form.license.value = vt.license || '';
            form.idx.value = idx;
            container.querySelector('#vt-modal-title').textContent = idx === '' ? 'Add VT' : 'Edit VT';
        }
    }
}
