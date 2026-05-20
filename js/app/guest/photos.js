import { util } from '../../common/util.js';
import { i18n } from '../../common/i18n.js';

export const photos = (() => {

    /**
     * @returns {string}
     */
    const apiBase = () => {
        const base = document.body.getAttribute('data-api-base');
        if (base === null || base === undefined) {
            return '';
        }

        return base.replace(/\/$/, '');
    };

    /**
     * @param {string} path
     * @returns {Promise<Response>}
     */
    const apiFetch = (path, options = {}) => fetch(`${apiBase()}${path}`, options);

    /**
     * @param {{id:string,thumbnailLink?:string,webViewLink?:string,name?:string}} file
     * @returns {string}
     */
    const renderThumb = (file) => {
        const src = file.thumbnailLink || file.webViewLink || '';
        const href = file.webViewLink || src;

        return `
        <div class="col-4 col-md-3 mb-2">
            <a href="${util.escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="d-block rounded-4 overflow-hidden shadow-sm">
                <img src="${util.escapeHtml(src)}" alt="${util.escapeHtml(file.name || 'photo')}" class="img-fluid w-100" style="aspect-ratio:1;object-fit:cover;" loading="lazy" referrerpolicy="no-referrer">
            </a>
        </div>`;
    };

    /**
     * @returns {Promise<void>}
     */
    const load = async () => {
        const grid = document.getElementById('guest-photos-grid');
        if (!grid) {
            return;
        }

        try {
            const res = await apiFetch('/api/photos');
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || 'Failed');
            }

            const files = json.data || [];
            if (files.length === 0) {
                grid.innerHTML = '';
                return;
            }

            util.safeInnerHTML(grid, `<div class="row g-2">${files.map(renderThumb).join('')}</div>`);
        } catch (err) {
            console.error(err);
            util.safeInnerHTML(grid, `<small class="text-secondary">${util.escapeHtml(i18n.t('photoError'))}</small>`);
        }
    };

    /**
     * @param {HTMLInputElement} input
     * @returns {Promise<void>}
     */
    const upload = async (input) => {
        const file = input.files?.[0];
        if (!file) {
            return;
        }

        const status = document.getElementById('photo-upload-status');
        if (status) {
            status.textContent = i18n.t('uploading');
        }

        const form = new FormData();
        form.append('photo', file);

        try {
            const res = await apiFetch('/api/photos', { method: 'POST', body: form });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || 'Failed');
            }

            util.notify(i18n.t('photoUploaded')).success();
            input.value = '';
            await load();
        } catch (err) {
            console.error(err);
            util.notify(i18n.t('photoError')).error();
        } finally {
            if (status) {
                status.textContent = '';
            }
        }
    };

    /**
     * @returns {void}
     */
    const init = () => {
        const cameraInput = document.getElementById('photo-upload-camera');
        const galleryInput = document.getElementById('photo-upload-gallery');

        cameraInput?.addEventListener('change', () => upload(cameraInput));
        galleryInput?.addEventListener('change', () => upload(galleryInput));
        document.addEventListener('undangan.open', () => load());
    };

    return {
        init,
        load,
        upload,
    };
})();
