import { 
    createRenderer, 
    setupCanvas, 
    setupScene,
    updateScene 
} from './renderer.js';

import { setupEventListeners } from './listeners.js'

async function init() {
    try {
        // Показываем индикатор загрузки
        const loadingElement = document.getElementById('loading');
        const canvas = document.getElementById('canvas');
        const infoElement = document.getElementById('info-block');
        
        // Создаем и настраиваем рендерер
        const renderer = createRenderer();
        setupCanvas(renderer);
        
        // Настраиваем сцену
        await setupScene(renderer);
        
        // Настраиваем обработчики событий
        setupEventListeners(renderer);
        
        // Скрываем индикатор загрузки и показываем canvas и информацию
        loadingElement.style.display = 'none';
        canvas.style.display = 'block';
        infoElement.style.display = 'block';
        
        // Запускаем анимацию -> отрисовка сцены
        updateScene(renderer);
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        // Показываем сообщение об ошибке
        const loadingElement = document.querySelector('.loading');
        loadingElement.textContent = `Ошибка загрузки: ${error.message}`;
        loadingElement.style.color = 'red';
    }
}

// Динамически импортируем модули при загрузке страницы
window.addEventListener('load', () => {
    init();
});