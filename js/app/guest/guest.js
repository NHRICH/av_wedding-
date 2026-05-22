import { video } from './video.js';

import { image } from './image.js';

import { audio } from './audio.js';

import { photos } from './photos.js';

import { wishes } from './wishes.js';

import { progress } from './progress.js';

import { util } from '../../common/util.js';

import { bs } from '../../libs/bootstrap.js';

import { loader } from '../../libs/loader.js';

import { theme } from '../../common/theme.js';

import { lang } from '../../common/language.js';

import { i18n } from '../../common/i18n.js';

import { strings } from '../../i18n/strings.js';

import { storage } from '../../common/storage.js';

import { offline } from '../../common/offline.js';

import * as confetti from '../../libs/confetti.js';

import { pool } from '../../connection/request.js';



export const guest = (() => {



    /**

     * @type {ReturnType<typeof storage>|null}

     */

    let information = null;



    /**

     * @returns {Date}

     */

    const getWeddingDate = () => {

        const wedding = new Date();

        wedding.setMonth(wedding.getMonth() + 1);

        wedding.setHours(10, 0, 0, 0);

        return wedding;

    };



    /**

     * @returns {void}

     */

    const syncWeddingSchedule = () => {

        const wedding = getWeddingDate();

        const pad = (n) => String(n).padStart(2, '0');

        const y = wedding.getFullYear();

        const mo = pad(wedding.getMonth() + 1);

        const d = pad(wedding.getDate());



        document.body.setAttribute('data-time', `${y}-${mo}-${d} 10:00:00`);



        const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

        strings.en.weddingDate = wedding.toLocaleDateString('en-US', dateOpts);

        strings.am.weddingDate = wedding.toLocaleDateString('am-ET', dateOpts);

    };



    /**

     * @returns {void}

     */

    const countDownDate = () => {

        const count = (new Date(document.body.getAttribute('data-time').replace(' ', 'T'))).getTime();



        /**

         * @param {number} num 

         * @returns {string}

         */

        const pad = (num) => num < 10 ? `0${num}` : `${num}`;



        const day = document.getElementById('day');

        const hour = document.getElementById('hour');

        const minute = document.getElementById('minute');

        const second = document.getElementById('second');



        const updateCountdown = () => {

            const distance = Math.abs(count - Date.now());



            day.textContent = pad(Math.floor(distance / (1000 * 60 * 60 * 24)));

            hour.textContent = pad(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

            minute.textContent = pad(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)));

            second.textContent = pad(Math.floor((distance % (1000 * 60)) / 1000));



            util.timeOut(updateCountdown, 1000 - (Date.now() % 1000));

        };



        util.timeOut(updateCountdown);

    };



    /**

     * @returns {void}

     */

    const showGuestName = () => {

        const raw = window.location.search.split('to=');

        let name = null;



        if (raw.length > 1 && raw[1].length >= 1) {

            name = window.decodeURIComponent(raw[1]);

        }



        if (name) {

            const guestName = document.getElementById('guest-name');

            const div = document.createElement('div');

            div.classList.add('m-2');



            const template = `<small class="mt-0 mb-1 mx-0 p-0">${util.escapeHtml(guestName?.getAttribute('data-message'))}</small><p class="m-0 p-0" style="font-size: 1.25rem">${util.escapeHtml(name)}</p>`;

            util.safeInnerHTML(div, template);



            guestName?.appendChild(div);

        }



        const form = document.getElementById('form-name');

        if (form) {

            form.value = information.get('name') ?? name;

        }



        const emailForm = document.getElementById('form-email');

        if (emailForm && information.has('email')) {

            emailForm.value = information.get('email');

        }

    };



    /**

     * @returns {Promise<void>}

     */

    const slide = async () => {

        const interval = 6000;

        const slides = document.querySelectorAll('.slide-desktop');



        if (!slides || slides.length === 0) {

            return;

        }



        const desktopEl = document.getElementById('root')?.querySelector('.d-sm-block');

        if (!desktopEl) {

            return;

        }



        desktopEl.dispatchEvent(new Event('undangan.slide.stop'));



        if (window.getComputedStyle(desktopEl).display === 'none') {

            return;

        }



        if (slides.length === 1) {

            await util.changeOpacity(slides[0], true);

            return;

        }



        let index = 0;

        for (const [i, s] of slides.entries()) {

            if (i === index) {

                s.classList.add('slide-desktop-active');

                await util.changeOpacity(s, true);

                break;

            }

        }



        let run = true;

        const nextSlide = async () => {

            await util.changeOpacity(slides[index], false);

            slides[index].classList.remove('slide-desktop-active');



            index = (index + 1) % slides.length;



            if (run) {

                slides[index].classList.add('slide-desktop-active');

                await util.changeOpacity(slides[index], true);

            }



            return run;

        };



        desktopEl.addEventListener('undangan.slide.stop', () => {

            run = false;

        });



        const loop = async () => {

            if (await nextSlide()) {

                util.timeOut(loop, interval);

            }

        };



        util.timeOut(loop, interval);

    };



    /**

     * @param {HTMLButtonElement} button

     * @returns {void}

     */

    const open = (button) => {

        button.disabled = true;

        document.body.scrollIntoView({ behavior: 'instant' });

        document.getElementById('root').classList.remove('opacity-0');



        if (theme.isAutoMode()) {

            document.getElementById('button-theme').classList.remove('d-none');

        }



        document.getElementById('button-lang')?.classList.remove('d-none');

        slide();

        theme.spyTop();



        confetti.basicAnimation();

        util.timeOut(confetti.openAnimation, 1500);



        document.dispatchEvent(new Event('undangan.open'));

        util.changeOpacity(document.getElementById('welcome'), false).then((el) => el.remove());

    };



    /**

     * @param {HTMLImageElement} img

     * @returns {void}

     */

    const modal = (img) => {

        document.getElementById('button-modal-click').setAttribute('href', img.src);

        document.getElementById('button-modal-download').setAttribute('data-src', img.src);



        const i = document.getElementById('show-modal-image');

        i.src = img.src;

        i.width = img.width;

        i.height = img.height;

        bs.modal('modal-image').show();

    };



    /**

     * @returns {void}

     */

    const modalImageClick = () => {

        document.getElementById('show-modal-image').addEventListener('click', (e) => {

            const abs = e.currentTarget.parentNode.querySelector('.position-absolute');



            abs.classList.contains('d-none')

                ? abs.classList.replace('d-none', 'd-flex')

                : abs.classList.replace('d-flex', 'd-none');

        });

    };



    /**

     * @param {HTMLDivElement} div 

     * @returns {void}

     */

    const showStory = (div) => {

        if (navigator.vibrate) {

            navigator.vibrate(500);

        }



        confetti.tapTapAnimation(div, 100);

        util.changeOpacity(div, false).then((e) => e.remove());

    };



    /**

     * @returns {void}

     */

    const closeInformation = () => information.set('info', true);



    /**

     * @returns {void}

     */

    const animateSvg = () => {

        document.querySelectorAll('svg').forEach((el) => {

            if (el.hasAttribute('data-class')) {

                util.timeOut(() => el.classList.add(el.getAttribute('data-class')), parseInt(el.getAttribute('data-time')));

            }

        });

    };



    /**

     * @returns {void}

     */

    const buildGoogleCalendar = () => {

        /**

         * @param {string} d 

         * @returns {string}

         */

        const formatDate = (d) => (new Date(d.replace(' ', 'T') + ':00Z')).toISOString().replace(/[-:]/g, '').split('.').shift();



        const url = new URL('https://calendar.google.com/calendar/render');

        const data = new URLSearchParams({

            action: 'TEMPLATE',

            text: 'The Wedding of Kibrom and Betty',

            dates: (() => {

                const start = (document.body.getAttribute('data-time') || '2026-06-22 10:00:00').slice(0, 16);

                const day = start.slice(0, 11);

                return `${formatDate(start)}/${formatDate(`${day}13:00`)}`;

            })(),

            details: i18n.t('inviteIntro'),

            location: 'RT 10 RW 02, Pajerukan Village, Kalibagor District, Banyumas Regency, Central Java 53191, Indonesia.',

            ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,

        });



        url.search = data.toString();

        document.querySelector('#home button')?.addEventListener('click', () => window.open(url, '_blank'));

    };



    /**

     * @param {'en'|'am'} code

     * @returns {void}

     */

    const pickLanguage = (code) => {

        i18n.setLang(code);

        lang.setDefault(code);

        document.querySelectorAll('[data-lang-btn]').forEach((btn) => {

            const active = btn.getAttribute('data-lang-btn') === code;

            btn.classList.toggle('btn-light', active);

            btn.classList.toggle('btn-outline-light', !active);

        });

        const langBtn = document.getElementById('button-lang');

        if (langBtn) {

            langBtn.innerHTML = code === 'am'

                ? '<span style="font-size:0.65rem;font-weight:700;">አማ</span>'

                : '<span style="font-size:0.65rem;font-weight:700;">EN</span>';

        }

    };



    /**

     * @returns {void}

     */

    const toggleLanguage = () => {

        pickLanguage(i18n.getLang() === 'en' ? 'am' : 'en');

    };



    /**

     * @returns {object}

     */

    const loaderLibs = () => {

        progress.add();



        /**

         * @param {{aos: boolean, confetti: boolean}} opt

         * @returns {void}

         */

        const load = (opt) => {

            loader(opt)

                .then(() => progress.complete('libs'))

                .catch(() => progress.invalid('libs'));

        };



        return {

            load,

        };

    };



    /**

     * @returns {Promise<void>}

     */

    let booted = false;

    const booting = async () => {
        if (booted) {
            return;
        }

        booted = true;

        animateSvg();

        countDownDate();

        showGuestName();

        modalImageClick();

        buildGoogleCalendar();



        if (information.has('presence')) {

            document.getElementById('form-presence').value = information.get('presence') ? '1' : '2';

        }



        if (information.get('info')) {

            document.getElementById('information')?.remove();

        }



        await util.changeOpacity(document.getElementById('welcome'), true);

        await util.changeOpacity(document.getElementById('loading'), false).then((el) => el.remove());

    };



    /**

     * @returns {void}

     */

    const pageLoaded = () => {

        lang.init();

        lang.setDefault(i18n.getLang());

        offline.init();

        wishes.init();

        photos.init();

        progress.init();



        information = storage('information');



        const vid = video.init();

        const img = image.init();

        const aud = audio.init();

        const lib = loaderLibs();



        progress.add();



        window.addEventListener('resize', util.debounce(slide));

        document.addEventListener('undangan.progress.done', () => booting());

        document.addEventListener('hide.bs.modal', () => document.activeElement?.blur());

        document.getElementById('button-modal-download').addEventListener('click', (e) => {

            img.download(e.currentTarget.getAttribute('data-src'));

        });



        document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
            btn.addEventListener('click', () => pickLanguage(btn.getAttribute('data-lang-btn')));
        });

        document.getElementById('button-lang')?.addEventListener('click', toggleLanguage);

        pickLanguage(i18n.getLang());

        const confettiOn = document.body.getAttribute('data-confetti') !== 'false';



        if (img.hasDataSrc()) {

            img.load();

        }



        vid.load();

        aud.load();

        lib.load({ confetti: confettiOn });



        wishes.load()

            .then(() => progress.complete('wishes'))

            .catch(() => progress.complete('wishes', true));

    };



    /**

     * @returns {object}

     */

    const init = () => {

        syncWeddingSchedule();

        i18n.init();

        theme.init();



        window.addEventListener('load', () => {

            if (!window.isSecureContext) {

                const status = document.getElementById('loading-status');

                if (status) {

                    status.classList.remove('d-none');

                    status.classList.add('text-danger');

                    status.innerText = 'Run: npm run build:public && npm start — then open http://localhost:3000';

                }



                return;

            }



            pool.init(pageLoaded, [

                'image',

                'video',

                'audio',

                'libs',

            ]);

        });



        return {

            util,

            theme,

            wishes,

            guest: {

                open,

                modal,

                showStory,

                closeInformation,

            },

        };

    };



    return {

        init,

    };

})();

