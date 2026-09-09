import { initTextSync } from './modules/textSync.js';
import { initUploader } from './modules/uploader.js';
import { initAccordion } from './modules/accordion.js';
import { initScore } from './modules/score.js';
import { initModal } from './modules/modal.js';
import { initExporter } from './modules/exporter.js';

document.addEventListener("DOMContentLoaded", () => {
    initTextSync();
    initUploader();
    initAccordion();
    initScore();
    initModal();
    initExporter();
});