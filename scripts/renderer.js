import { generateRotationFigure, calculateNormalsInVerteces } from './geometry.js';
import { getColorIntensity } from './lighting.js';
import { drawAxios, drawBetweenTwoEdges } from './draw.js';
import {
    productMatrices,
    dotProductVectors,
    crossProductVectors,
    rotateMatrix,
    scaleMatrix,
    normalizeVector,
    identityMatrix,
    deg2rad
} from './mathematic.js';

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
        lightDirection: normalizeVector([2,2,-1]),
        lightI: 1,

        rotationX: 30,
        rotationY: 30,
        isDragging: false,
        lastX: 0,
        lastY: 0,
        distance: 10,
        isSceneSetuped: false,
        
        // Матрицы преобразования
        // Матрица вида
        viewUp: [0,1,0],
        viewTarget: [0,0,0],
        viewPosition: [0,0,-1],
        viewMatrix: identityMatrix(),

        // Матрица проекции
        fov: 60,
        near: 0.1,
        far: 100,
        proectionMatrix: identityMatrix()
    };
}

// Пересчитывает матрицу вида
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

// Пересчитывает матрицу проекции
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
    for (let i = -circles/2; i <= circles/2; ++i) {
        const angle = (i * Math.PI) / circles; // от 0 до π радиан
        array.push([Math.cos(angle), Math.sin(angle)]);
    }
}

// Создает фигуру для мира
export function setupScene(renderer) {
    const curvePoints = [];
    generateSphere(36, curvePoints);

    renderer.geometry = generateRotationFigure(curvePoints, 36);
    renderer.isSceneSetuped = true;
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

export function render(renderer) {
    const ctx = renderer.ctx;

    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    renderer.viewPosition = [
        renderer.distance * Math.cos(deg2rad(renderer.rotationY)) * Math.sin(deg2rad(renderer.rotationX)),
        renderer.distance * Math.sin(deg2rad(renderer.rotationY)),
        renderer.distance * Math.cos(deg2rad(renderer.rotationY)) * Math.cos(deg2rad(renderer.rotationX))
    ];
    const viewDirection = normalizeVector([
        renderer.viewPosition[0] - renderer.viewTarget[0],
        renderer.viewPosition[1] - renderer.viewTarget[1],
        renderer.viewPosition[2] - renderer.viewTarget[2]
    ]);
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
        list[i].push(getColorIntensity(normalV[i], viewDirection, renderer.lightDirection, renderer.lightI));
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

// Запускает цикл анимации
export function updateScene(renderer) {
    if (renderer.isSceneSetuped === false) {
        return;
    }
    render(renderer);
    window.requestAnimationFrame(() => updateScene(renderer));
}