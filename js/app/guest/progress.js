export const progress = (() => {

    const MAX_LOADING_MS = 1000;

    /**
     * @type {HTMLElement|null}
     */
    let info = null;

    /**
     * @type {HTMLElement|null}
     */
    let bar = null;

    let total = 0;
    let loaded = 0;
    let valid = true;
    let doneFired = false;

    /**
     * @type {ReturnType<typeof setTimeout>|null}
     */
    let maxLoadingTimer = null;

    /**
     * @type {Promise<void>|null}
     */
    let cancelProgress = null;

    /**
     * @returns {void}
     */
    const finish = () => {
        if (doneFired) {
            return;
        }

        doneFired = true;
        valid = false;
        cancelProgress = null;

        if (maxLoadingTimer) {
            clearTimeout(maxLoadingTimer);
            maxLoadingTimer = null;
        }

        document.dispatchEvent(new Event('undangan.progress.done'));
    };

    /**
     * @returns {void}
     */
    const add = () => {
        total += 1;
    };

    /**
     * @returns {string}
     */
    const showInformation = () => {
        return `(${loaded}/${total}) [${parseInt((loaded / total) * 100).toFixed(0)}%]`;
    };

    /**
     * @param {string} type
     * @param {boolean} [skip=false]
     * @returns {void}
     */
    const complete = (type, skip = false) => {
        if (!valid) {
            return;
        }

        loaded += 1;
        if (info) {
            info.innerText = `Loading ${type} ${skip ? 'skipped' : 'complete'} ${showInformation()}`;
        }
        if (bar) {
            bar.style.width = Math.min((loaded / total) * 100, 100).toString() + '%';
        }

        if (loaded === total) {
            finish();
        }
    };

    /**
     * @param {string} type
     * @returns {void}
     */
    const invalid = (type) => {
        if (valid) {
            valid = false;
            if (bar) {
                bar.style.backgroundColor = 'red';
            }
            const message = `Error loading ${type} ${showInformation()}`;
            if (info) {
                info.innerText = message;
            } else {
                const status = document.getElementById('loading-status');
                if (status) {
                    status.classList.remove('d-none');
                    status.classList.add('text-danger');
                    status.innerText = message;
                }
            }
            document.dispatchEvent(new Event('undangan.progress.invalid'));
        }
    };

    /**
     * @returns {Promise<void>|null}
     */
    const getAbort = () => cancelProgress;

    /**
     * @returns {void}
     */
    const init = () => {
        info = document.getElementById('progress-info');
        bar = document.getElementById('progress-bar');
        info?.classList.remove('d-none');
        cancelProgress = new Promise((res) => document.addEventListener('undangan.progress.invalid', res));
        maxLoadingTimer = setTimeout(finish, MAX_LOADING_MS);
    };

    return {
        init,
        add,
        invalid,
        complete,
        getAbort,
    };
})();