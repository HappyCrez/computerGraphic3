import { setupCanvas, updateScene } from "./Renderer.js";

// Обработка событий окна
export function setupEventListeners(renderer) {
    renderer.canvas.addEventListener('mousedown', function(e) {
        renderer.isDragging = true;
        renderer.lastX = e.clientX;
        renderer.lastY = e.clientY;
        renderer.canvas.style.cursor = 'grabbing';
    });
    
    renderer.canvas.addEventListener('mousemove', function(e) {
        if (!renderer.isDragging) return;
        
        const deltaX = e.clientX - renderer.lastX;
        const deltaY = e.clientY - renderer.lastY;
        
        renderer.rotationX -= deltaX * 0.5;
        renderer.rotationY += deltaY * 0.5;

        renderer.rotationY = Math.min(Math.max(-90, renderer.rotationY), 90);

        renderer.lastX = e.clientX;
        renderer.lastY = e.clientY;
    });
    
    renderer.canvas.addEventListener('mouseup', function() {
        renderer.isDragging = false;
        renderer.canvas.style.cursor = 'grab';
    });
    
    renderer.canvas.addEventListener('mouseleave', function() {
        renderer.isDragging = false;
        renderer.canvas.style.cursor = 'grab';
    });

    window.addEventListener('wheel', function(e) {
        const scrollSpeed = 0.01;
        renderer.distance = Math.min(Math.max(renderer.distance + e.deltaY*scrollSpeed, 5), 40);
    });
    
    window.addEventListener('resize', function() {
        setupCanvas(renderer);
    });
}