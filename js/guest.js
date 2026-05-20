import { guest } from './app/guest/guest.js';

((w) => {
    const app = guest.init();
    w.undangan = app;
    w.undangan.wishes = app.wishes;
})(window);