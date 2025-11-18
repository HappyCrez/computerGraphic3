import  { getXbyY, productMatrices, dotProductVectors, crossProductVectors, rotateMatrix, lengthVector, scaleMatrix, normalizeVector, linearInterpolation, identityMatrix, deg2rad, rad2deg } from './mathematic.js';
import { generateRotationFigure, calculateNormalsInVerteces } from './geometry.js';
import { getColorIntensity } from './lighting.js';

// Объект изменяемого состояния
export function createRenderer() {
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        throw new Error('Canvas element not found');
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get 2D context');
    }
    
    return {
        canvas,
        ctx,
        width: 0,
        height: 0,
        geometry: null,
        normals: null,
        lightDirection: normalizeVector([-1,1,1]),
        cameraPositions: [
            [0, 0, -10],
            [1, 1, -1]
        ],
        cameraIdx: 0,
        cameraProgress: 0,
        cameraSpeed: 0.002,

        rotationX: 120,
        rotationY: 70,
        isDragging: false,
        lastX: 0,
        lastY: 0,
        isSceneSetuped: false,
        
        // Матрицы преобразования
        viewUp: [0,1,0],
        viewTarget: [0,0,0],
        viewPosition: [0,0,-1],
        viewMatrix: identityMatrix(),

        fov: 60,
        near: 0.1,
        far: 100,
        proectionMatrix: identityMatrix()
    };
}

export function updateViewMatrix(renderer) {
    const z = normalizeVector([
        renderer.viewPosition[0] - renderer.viewTarget[0],
        renderer.viewPosition[1] - renderer.viewTarget[1],
        renderer.viewPosition[2] - renderer.viewTarget[2]
    ]);
    
    const x = normalizeVector(crossProductVectors(renderer.viewUp, z));
    const y = normalizeVector(crossProductVectors(z, x));

    renderer.viewMatrix = [
        [x[0], y[0], z[0], 0],
        [x[1], y[1], z[1], 0],
        [x[2], y[2], z[2], 0],
        [-dotProductVectors(x, renderer.viewPosition), -dotProductVectors(y, renderer.viewPosition), -dotProductVectors(z, renderer.viewPosition), 1]
    ];
}

export function updatePerspectiveMatrix(renderer) {
    const aspect = renderer.width/renderer.height;
    const f = 1.0 / Math.tan(deg2rad(renderer.fov) / 2);
    const rangeInv = 1.0 / (renderer.near - renderer.far);
    
    renderer.proectionMatrix = [
        [f / aspect, 0, 0, 0],
        [0, f, 0, 0],
        [0, 0, (renderer.far + renderer.near) * rangeInv, 2 * renderer.far * renderer.near * rangeInv],
        [0, 0, -1, 0]
    ];
}

// Инициализируем размеры canvas
export function setupCanvas(renderer) {
    renderer.canvas.width = window.innerWidth;
    renderer.canvas.height = window.innerHeight;
    renderer.width = renderer.canvas.width;
    renderer.height = renderer.canvas.height;

    updatePerspectiveMatrix(renderer);
}

// Генерирует окружность в виде набора точек в массив array
// circles - количество точек окружности в одной четверти графика
// array - выходной параметр (набор точек окружности)
function generateSphere(circles, array) {
    for (let i = -circles/2; i <= circles/2; i++) {
        const angle = (i * Math.PI) / circles; // от 0 до π радиан
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        array.push([x, y]);
    }
}

// Создает фигуру для мира
export function setupScene(renderer) {
    const curvePoints = [
        // [1, 0],
        // [1, 1]
    ];
    generateSphere(36, curvePoints);

    renderer.geometry = generateRotationFigure(curvePoints, 36);
    renderer.isSceneSetuped = true;
}

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
        
        renderer.rotationY += deltaX * 0.5;
        renderer.rotationX -= deltaY * 0.5;

        renderer.rotationY = Math.min(Math.max(0, renderer.rotationY), 180);
        renderer.rotationX = Math.min(Math.max(90, renderer.rotationX), 180);

        renderer.lastX = e.clientX;
        renderer.lastY = e.clientY;
        updateScene(renderer);
    });
    
    renderer.canvas.addEventListener('mouseup', function() {
        renderer.isDragging = false;
        renderer.canvas.style.cursor = 'grab';
    });
    
    renderer.canvas.addEventListener('mouseleave', function() {
        renderer.isDragging = false;
        renderer.canvas.style.cursor = 'grab';
    });

    window.addEventListener('keydown', function(e) {
        const cameraSpeed = 1.5;
        // if (e.key == 'ArrowLeft') 
        // else if (e.key == 'ArrowRight') 
        updateScene(renderer);
    });
    
    window.addEventListener('resize', function() {
        setupCanvas(renderer);
        updateScene(renderer);
    });
}

// Умножает вектор строку на матрицу преобразования
// Возвращает результирующий вектор
export function transformVertex(vertex, transformMatrix) {
    const transformed = productMatrices([[...vertex,1]],transformMatrix)[0];
    return [transformed[0]/transformed[3], transformed[1]/transformed[3], transformed[2]/transformed[3]];
}

// Проецируем вершину на экран
// v - вершина для проецирования задается в формате [x,y]
export function proectVertexOnScreen(renderer, v) {
    return [(v[0] + 1) * renderer.width / 2, (1 - v[1]) * renderer.height / 2];
}

// renderer - параметры для отрисовки на дисплей
// e0, e1 - рёбра заданные двумя точками [[x0,y0,I0], [x1,y1,I1]]
// Каждая точка дополнительно характеризуется интенсивностью
export function drawBetweenTwoEdges(renderer, e0, e1) {
    const yMax = Math.ceil(Math.min(renderer.height, Math.max(e0[0][1], e0[1][1]), Math.max(e1[0][1],e1[1][1])));
    const yMin = Math.ceil(Math.max(0, Math.min(e0[0][1], e0[1][1]), Math.min(e1[0][1],e1[1][1])));

    for (let y = yMin; y < yMax; ++y) {
        const x0 = Math.trunc(getXbyY(e0,y));
        const x1 = Math.trunc(getXbyY(e1,y));

        // Интерполируем линейно интенсивность в точках [x0,y] и [x1,y]
        const Iq = linearInterpolation([x0,y],e0);
        const Ir = linearInterpolation([x1,y],e1);

        for (let x = Math.max(0,Math.min(x0,x1)); x < Math.min(renderer.width,Math.max(x0,x1)); ++x) {
            const intensity = linearInterpolation([x,y],[[x0,y,Iq],[x1,y,Ir]]);
            
            const color = Math.min(255, Math.max(0, Math.floor(intensity * 255)));
            renderer.ctx.fillStyle = `rgb(${color},${color},${color})`;
            renderer.ctx.fillRect(x,y,1,1);
        }
    }
}

// Рисует на экране оси в мировом пространстве
export function drawAxios(renderer) {
    const axios = [
        [[-5,0,0],[5,0,0]], // X (red)
        [[0,-5,0],[0,5,0]], // Y (green)
        [[0,0,-5],[0,0,5]]  // Z (blue)
    ];
    axios.forEach((axis,i) => {
        axis.forEach((_,j,v) => {
            v[j] = transformVertex(v[j], productMatrices(renderer.viewMatrix, renderer.proectionMatrix));
            v[j] = proectVertexOnScreen(renderer,v[j]);
        });
        renderer.ctx.beginPath();
        renderer.ctx.strokeStyle = i===0? 'red' : (i===1? 'green' : 'blue');
        renderer.ctx.moveTo(...axis[0]);
        renderer.ctx.lineTo(...axis[1]);
        renderer.ctx.stroke();
        renderer.ctx.closePath();
    });
}

export function render(renderer) {
    const ctx = renderer.ctx;

    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    const cameraPosition = renderer.cameraPositions[0];
    renderer.viewPosition = [
        cameraPosition[0] + lengthVector(cameraPosition) * Math.cos(deg2rad(renderer.rotationY)),
        cameraPosition[1] + lengthVector(cameraPosition) * Math.cos(deg2rad(renderer.rotationX)),
        cameraPosition[2] + lengthVector(cameraPosition) * Math.cos(deg2rad(renderer.rotationX)) * Math.sin(deg2rad(renderer.rotationY))
    ];
    const viewDirection = normalizeVector([-renderer.viewPosition[0], -renderer.viewPosition[1], -renderer.viewPosition[2]]);
    updateViewMatrix(renderer);

    drawAxios(renderer);

    const modelMatrix = productMatrices(scaleMatrix(0.25, 0.25, 0.25), rotateMatrix(0, 0, 0));
    const ndcV = renderer.geometry.vertices.map(row => row.slice());
    ndcV.forEach((_,i,list)=>{
        list[i] = transformVertex(list[i], modelMatrix);
    });

    // Каждый треугольник задается тремя индексами вершин, соответстсвующими вершинам в массиве вершин ndcV
    const triangles = renderer.geometry.triangles;
    
    // Считаем нормали в вершинах с учетом применения аффинных преобразований
    const normalV = calculateNormalsInVerteces(ndcV, triangles);

    // Считаем нормаль каждого треугольника, она будет нужна для проверки видим мы данный треугольник или нет
    const normalT = triangles.map((triangle) => {
        const edge1 = [ndcV[triangle[1]][0] - ndcV[triangle[0]][0], ndcV[triangle[1]][1] - ndcV[triangle[0]][1], ndcV[triangle[1]][2] - ndcV[triangle[0]][2]];
        const edge2 = [ndcV[triangle[2]][0] - ndcV[triangle[0]][0], ndcV[triangle[2]][1] - ndcV[triangle[0]][1], ndcV[triangle[2]][2] - ndcV[triangle[0]][2]];
        return normalizeVector(crossProductVectors(edge2, edge1));
    });

    const mvpMatrix = productMatrices(productMatrices(modelMatrix, renderer.viewMatrix), renderer.proectionMatrix);
    const mvpV = renderer.geometry.vertices.map(row => row.slice());
    mvpV.forEach((_,i,list)=>{
        list[i] = transformVertex(list[i], mvpMatrix);
    });
    
    // Проводим проекцию вершин и дополняем информацию о каждой вершине интенсивностью в ней
    mvpV.forEach((_,i,list)=>{
        list[i] = proectVertexOnScreen(renderer,list[i]);
        list[i].push(getColorIntensity(normalV[i], viewDirection, renderer.lightDirection));
    });
    
    for (let i = 0; i < triangles.length; ++i) {
        const i1 = triangles[i][0];
        const i2 = triangles[i][1];
        const i3 = triangles[i][2];

        // Проверяем сонаправленость векторов нормали треугольника и направления взгляда
        if (dotProductVectors(normalT[i], viewDirection) > 0) { // Этот треугольник не виден
            continue;
        }

        // Отрисовываем треугольник
        drawBetweenTwoEdges(renderer, [mvpV[i1],mvpV[i2]], [mvpV[i1],mvpV[i3]]);
        drawBetweenTwoEdges(renderer, [mvpV[i1],mvpV[i2]], [mvpV[i2],mvpV[i3]]);
        drawBetweenTwoEdges(renderer, [mvpV[i1],mvpV[i3]], [mvpV[i2],mvpV[i3]]);
    }
}

export function updateScene(renderer) {
    if (renderer.isSceneSetuped === false) {
        return;
    }
    render(renderer);
}