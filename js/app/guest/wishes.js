import { util } from '../../common/util.js';
import { i18n } from '../../common/i18n.js';
import { storage } from '../../common/storage.js';

export const wishes = (() => {

    /**
     * @type {HTMLElement|null}
     */
    let listEl = null;

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
     * @param {{name:string,email:string,message:string,timestamp:string,presence:string}} w
     * @returns {string}
     */
    const renderCard = (w) => {
        const presenceIcon = w.presence === 'Attending' || w.presence === 'እመጣለሁ'
            ? '<i class="fa-solid fa-circle-check text-success ms-1"></i>'
            : w.presence === 'Unable to attend' || w.presence === 'አልከተልም'
                ? '<i class="fa-solid fa-circle-xmark text-danger ms-1"></i>'
                : '';

        return `
        <div class="bg-theme-auto shadow p-3 mx-0 mt-0 mb-3 rounded-4">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong style="font-size: 0.95rem;">${util.escapeHtml(w.name)}</strong>
                <small class="text-secondary" style="font-size: 0.75rem;">${util.escapeHtml(w.timestamp ? new Date(w.timestamp).toLocaleString() : '')}</small>
            </div>
            ${w.presence ? `<p class="m-0 mb-1" style="font-size: 0.8rem;">${util.escapeHtml(w.presence)}${presenceIcon}</p>` : ''}
            <p class="m-0 p-0" style="font-size: 0.9rem; white-space: pre-wrap;">${util.escapeHtml(w.message)}</p>
        </div>`;
    };

    /**
     * @returns {Promise<void>}
     */
    const load = async () => {
        if (!listEl) {
            return;
        }

        listEl.setAttribute('data-loading', 'true');
        util.safeInnerHTML(listEl, '<div class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></div>');

        try {
            const res = await apiFetch('/api/wishes');
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || 'Failed to load');
            }

            const rows = json.data || [];
            if (rows.length === 0) {
                util.safeInnerHTML(listEl, `<div class="text-center p-4 bg-theme-auto rounded-4 shadow"><p class="fw-bold m-0" style="font-size: 0.95rem;">${util.escapeHtml(i18n.t('emptyWishes'))}</p></div>`);
            } else {
                util.safeInnerHTML(listEl, rows.map(renderCard).join(''));
            }
        } catch (err) {
            console.error(err);
            util.safeInnerHTML(listEl, `<div class="alert alert-warning rounded-4">${util.escapeHtml(i18n.t('wishError'))}</div>`);
        } finally {
            listEl.setAttribute('data-loading', 'false');
        }
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const send = async (button) => {
        const nameEl = document.getElementById('form-name');
        const emailEl = document.getElementById('form-email');
        const presenceEl = document.getElementById('form-presence');
        const messageEl = document.getElementById('form-comment');

        const name = nameEl?.value?.trim() ?? '';
        const email = emailEl?.value?.trim() ?? '';
        const message = messageEl?.value?.trim() ?? '';
        const presence = presenceEl?.value ?? '0';

        if (name.length < 2) {
            util.notify(i18n.t('nameRequired')).warning();
            nameEl?.focus();
            return;
        }

        if (presence === '0') {
            util.notify(i18n.t('selectRsvp')).warning();
            presenceEl?.focus();
            return;
        }

        if (!message) {
            util.notify(i18n.t('messageRequired')).warning();
            messageEl?.focus();
            return;
        }

        const btn = util.disableButton(button);

        try {
            const res = await apiFetch('/api/wishes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ name, email, message, presence }),
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || 'Failed');
            }

            storage('information').set('name', name);
            storage('information').set('presence', presence === '1');
            if (email) {
                storage('information').set('email', email);
            }

            if (messageEl) {
                messageEl.value = '';
            }

            util.notify(i18n.t('wishSent')).success();
            await load();
            listEl?.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            console.error(err);
            util.notify(i18n.t('wishError')).error();
        } finally {
            btn.restore();
        }
    };

    /**
     * @returns {void}
     */
    const init = () => {
        listEl = document.getElementById('comments');
        document.addEventListener('undangan.lang', () => load());
    };

    return {
        init,
        load,
        send,
    };
})();
