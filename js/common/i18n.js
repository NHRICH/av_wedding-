import { strings } from '../i18n/strings.js';
import { storage } from './storage.js';

const STORAGE_KEY = 'locale';

export const i18n = (() => {

    /**
     * @type {'en'|'am'}
     */
    let current = 'en';

    /**
     * @returns {'en'|'am'}
     */
    const getLang = () => current;

    /**
     * @param {'en'|'am'} code
     * @returns {void}
     */
    const setLang = (code) => {
        if (!strings[code]) {
            code = 'en';
        }

        current = code;
        storage('locale').set(STORAGE_KEY, code);
        document.documentElement.lang = code === 'am' ? 'am' : 'en';
        document.documentElement.dir = 'ltr';
        applyToDom();
        document.dispatchEvent(new CustomEvent('undangan.lang', { detail: { lang: code } }));
    };

    /**
     * @param {string} key
     * @returns {string}
     */
    const t = (key) => strings[current]?.[key] ?? strings.en[key] ?? key;

    /**
     * @returns {void}
     */
    const applyToDom = () => {
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (!key) {
                return;
            }

            const val = t(key);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.hasAttribute('placeholder')) {
                    el.setAttribute('placeholder', val);
                }
            } else if (el.tagName === 'OPTION') {
                el.textContent = val;
            } else {
                el.textContent = val;
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
        });

        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
        });

        document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
            el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
        });

        document.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const key = el.getAttribute('data-i18n-html');
            if (key) {
                el.innerHTML = t(key);
            }
        });

        const title = document.querySelector('title');
        if (title) {
            title.textContent = t('metaTitle');
        }

        const guestName = document.getElementById('guest-name');
        if (guestName?.hasAttribute('data-message')) {
            guestName.setAttribute('data-message', t('guestDear'));
        }
    };

    /**
     * @returns {void}
     */
    const init = () => {
        const saved = storage('locale').get(STORAGE_KEY);
        current = saved === 'am' ? 'am' : 'en';
        document.documentElement.lang = current === 'am' ? 'am' : 'en';
        applyToDom();
    };

    return {
        init,
        getLang,
        setLang,
        t,
        applyToDom,
    };
})();
