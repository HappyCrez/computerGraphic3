import  { getXbyY, productMatrices, dotProductVectors, crossProductVectors, rotateMatrix, lengthVector, rad2deg, scaleMatrix, normalizeVector } from './mathematic.js';
import { generateRotationFigure, calculateVertexNormals } from './geometry.js';
import { calculateGouraudColor } from './lighting.js';

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
        lightDirection: normalizeVector([-1,-1,-1]),
        cameraPositions: [
            [0, 1, 1],
            [10, 1, 1]
        ],
        currentCameraIndex: 0,
        cameraProgress: 0,
        cameraSpeed: 0.002,
        rotationX: -20,
        rotationY: 20,
        isDragging: false,
        lastX: 0,
        lastY: 0,
        viewDirection: normalizeVector([0,0,-1]), // Направление взгляда
        isSceneSetuped: false,
        proectionMatrix: [ // Ортогональная проекция
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 1]
        ]
    };
}

export function setupCanvas(renderer) {
    renderer.canvas.width = window.innerWidth;
    renderer.canvas.height = window.innerHeight;
    renderer.width = renderer.canvas.width;
    renderer.height = renderer.canvas.height;
}

function generateSphere(circles, array) {
    for (let i = -circles/2; i <= circles/2; i++) {
        const angle = (i * Math.PI) / circles; // от 0 до π радиан
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        array.push([x, y]);
    }
}

export function setupScene(renderer) {
    const curvePoints = [];
    generateSphere(36, curvePoints);

    renderer.geometry = generateRotationFigure(curvePoints, 36);
    renderer.isSceneSetuped = true;
}

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
    
    window.addEventListener('resize', function() {
        setupCanvas(renderer);
    });
}

export function projectVertex(renderer, vertex) {
    if (!vertex) return [0, 0];
    
    const scale = 80;
    const z = vertex[2] + 10;
    
    if (z <= 0) return [0, 0];
    
    const factor = 400 / z;
    
    return [
        renderer.width / 2 + vertex[0] * factor * scale,
        renderer.height / 2 - vertex[1] * factor * scale
    ];
}

export function transformVertex(vertex, transformMatrix) {
    const transformed = productMatrices([[...vertex,1]],transformMatrix)[0];
    transformed[0] /= transformed[3];
    transformed[1] /= transformed[3];
    return transformed;
}

export function drawGouraudTriangle(renderer, v1, v2, v3, c1, c2, c3) {
    if (!v1 || !v2 || !v3) return;
    
    const vertices = [
        { x: v1[0], y: v1[1], color: c1 },
        { x: v2[0], y: v2[1], color: c2 },
        { x: v3[0], y: v3[1], color: c3 }
    ];
    
    vertices.sort((a, b) => a.y - b.y);
    
    const minY = Math.max(0, Math.floor(vertices[0].y));
    const midY = Math.floor(vertices[1].y);
    const maxY = Math.min(renderer.height, Math.floor(vertices[2].y));
    
    for (let y = minY; y <= maxY; y++) {
        let x1, x2, color1, color2;
        
        if (y < midY) {
            const t = (y - vertices[0].y) / (vertices[1].y - vertices[0].y);
            x1 = vertices[0].x + (vertices[1].x - vertices[0].x) * t;
            x2 = vertices[0].x + (vertices[2].x - vertices[0].x) * t;
            color1 = vertices[0].color + (vertices[1].color - vertices[0].color) * t;
            color2 = vertices[0].color + (vertices[2].color - vertices[0].color) * t;
        } else {
            if (vertices[2].y === vertices[1].y) continue;
            const t = (y - vertices[1].y) / (vertices[2].y - vertices[1].y);
            x1 = vertices[1].x + (vertices[2].x - vertices[1].x) * t;
            x2 = vertices[0].x + (vertices[2].x - vertices[0].x) * t;
            color1 = vertices[1].color + (vertices[2].color - vertices[1].color) * t;
            color2 = vertices[0].color + (vertices[2].color - vertices[0].color) * t;
        }
        
        if (x1 > x2) {
            [x1, x2] = [x2, x1];
            [color1, color2] = [color2, color1];
        }
        
        const startX = Math.max(0, Math.floor(x1));
        const endX = Math.min(renderer.width, Math.floor(x2));
        
        for (let x = startX; x <= endX; x++) {
            if (x2 === x1) continue;
            
            const t = (x - x1) / (x2 - x1);
            const color = Math.round(color1 + (color2 - color1) * t);
            
            renderer.ctx.fillStyle = `rgb(${color}, ${color}, ${color})`;
            renderer.ctx.fillRect(x, y, 1, 1);
        }
    }
}

// renderer - параметры для отрисовки на дисплей
// e0, e1 - рёбра заданные двумя точками [[x0,y0], [x1,y1]]
export function drawBetweenTwoEdges(ctx, e0, e1) {
    const yMax = Math.ceil(Math.min(Math.max(e0[0][1], e0[1][1]), Math.max(e1[0][1],e1[1][1])));
    const yMin = Math.ceil(Math.max(Math.min(e0[0][1], e0[1][1]), Math.min(e1[0][1],e1[1][1])));
    for (let y = yMin; y < yMax; ++y) {
        const x0 = Math.trunc(getXbyY(e0,y));
        const x1 = Math.trunc(getXbyY(e1,y));
        for (let x = Math.min(x0,x1); x < Math.max(x0,x1); ++x) {
            ctx.fillRect(x,y,1,1);
        }
    }
}

export function drawAxios(renderer) {
    const axios = [
        [[-1,0,0],[1,0,0]], // X
        [[0,-1,0],[0,1,0]], // Y
        [[0,0,-3],[0,0,3]]  // Z
    ];
    axios.forEach((_,i,axis) => {
        axis[i].forEach((_,j,v) => {
            v[j].push(1);
            v[j] = productMatrices([v[j]], renderer.proectionMatrix)[0];
            
            v[j][0] = (v[j][0]/v[j][3] + 1) * renderer.width / 2;
            v[j][1] = (1 - v[j][1]/v[j][3]) * renderer.height / 2;
        });
    });

    axios.forEach((axis,i) => {
        renderer.ctx.beginPath();
        renderer.ctx.strokeStyle = i===0? 'red' : (i===1? 'green' : 'blue');
        renderer.ctx.moveTo(axis[0][0], axis[0][1]);
        renderer.ctx.lineTo(axis[1][0], axis[1][1]);
        renderer.ctx.stroke();
        renderer.ctx.closePath();
    });
}

export function render(renderer) {
    const ctx = renderer.ctx;

    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    drawAxios(renderer);

    const scaledMatrix = scaleMatrix(0.25, 0.25, 0.25);    
    const rotationMatrix = rotateMatrix(renderer.rotationX, renderer.rotationY, 0);
    const transformMatrix = productMatrices(productMatrices(scaledMatrix, rotationMatrix), renderer.proectionMatrix);
    const vertecesTransformed = renderer.geometry.vertices.map(row => row.slice());
    vertecesTransformed.forEach((_,i,arr) => {
        arr[i].push(1);
        arr[i] = productMatrices([arr[i]],transformMatrix)[0];
        arr[i][0] = (arr[i][0]/arr[i][3] + 1) * renderer.width / 2;
        arr[i][1] = (1 - arr[i][1]/arr[i][3]) * renderer.height / 2;
    });

    const vertecesRotated = renderer.geometry.vertices.map(row => row.slice());
    vertecesRotated.forEach((_,i,list)=>{
        list[i] = transformVertex(list[i], productMatrices(scaledMatrix, rotationMatrix));
    });

    const triangles = renderer.geometry.triangles;
    for (let i = 0; i < triangles.length; ++i) {
        const triangle = triangles[i];
        const i1 = triangle[0];
        const i2 = triangle[1];
        const i3 = triangle[2];
        
        const edge1 = [vertecesRotated[i2][0] - vertecesRotated[i1][0], vertecesRotated[i2][1] - vertecesRotated[i1][1], vertecesRotated[i2][2] - vertecesRotated[i1][2]];
        const edge2 = [vertecesRotated[i3][0] - vertecesRotated[i1][0], vertecesRotated[i3][1] - vertecesRotated[i1][1], vertecesRotated[i3][2] - vertecesRotated[i1][2]];
        
        const triangleNormal = normalizeVector(crossProductVectors(edge2, edge1));

        // Считаем угол между нормалями
        // cosA = (a*b)/(|a|*|b|)
        // Angle = arccos(cosA)
        const angle = rad2deg(Math.abs(Math.acos(dotProductVectors(triangleNormal, renderer.viewDirection)/(lengthVector(triangleNormal) * lengthVector(renderer.viewDirection)))));
        if (angle > 90) { // Этот треугольник не виден
            continue;
        }

        const color = calculateGouraudColor(triangleNormal, renderer.viewDirection, renderer.lightDirection);
        ctx.fillStyle = `rgb(${color}, ${color}, ${color})`;
        // Отрисовываем треугольник, последовательно заполняя пространство
        drawBetweenTwoEdges(ctx, [vertecesTransformed[i1], vertecesTransformed[i2]], [vertecesTransformed[i1], vertecesTransformed[i3]]); 
        drawBetweenTwoEdges(ctx, [vertecesTransformed[i1], vertecesTransformed[i2]], [vertecesTransformed[i2], vertecesTransformed[i3]]);
        drawBetweenTwoEdges(ctx, [vertecesTransformed[i1], vertecesTransformed[i3]], [vertecesTransformed[i2], vertecesTransformed[i3]]);
    }
}

export function updateScene(renderer) {
    if (renderer.isSceneSetuped === false) {
        return;
    }
    render(renderer);
}