import { crossProductVectors, deg2rad, normalizeVector } from './Mathematic.js';

export function generateRotationFigure(curvePoints, segments) {
    if (!curvePoints || curvePoints.length < 2) {
        console.error('generateRotationFigure: curvePoints must have at least 2 points');
        return { vertices: [], triangles: [] };
    }
    
    if (segments < 3) {
        console.error('generateRotationFigure: segments must be at least 3');
        return { vertices: [], triangles: [] };
    }
    
    // Создаем фигуру вращения
    const vertices = [];
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * 360;

        for (let j = 0; j < curvePoints.length; j++) {
            const point = curvePoints[j];
            const vertex = [point[0] * Math.cos(deg2rad(angle)), point[1], point[0] * Math.sin(deg2rad(angle))];
            vertices.push(vertex);
        }
    }
    
    // Триангулируем
    const triangles = [];
    const pointsPerCircle = curvePoints.length;
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < pointsPerCircle - 1; j++) {
            const a = i * pointsPerCircle + j;
            const b = i * pointsPerCircle + j + 1;

            const next_i = (i + 1) % segments;
            const c = next_i * pointsPerCircle + j;
            const d = next_i * pointsPerCircle + j + 1;
            
            triangles.push([a, b, c]);
            triangles.push([b, d, c]);
        }
    }
    return { vertices, triangles };
}

export function calculateNormalsInVerteces(vertices, triangles) {
    const normals = Array(vertices.length).fill(0).map(() => Array(3).fill(0));
    for (let i = 0; i < triangles.length; i++) {
        const triangle = triangles[i];
        const i1 = triangle[0];
        const i2 = triangle[1];
        const i3 = triangle[2];
        
        const v1 = vertices[i1];
        const v2 = vertices[i2];
        const v3 = vertices[i3];
        
        const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
        const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
        
        const normal = crossProductVectors(edge1, edge2);
        
        normals[i1].forEach((_,i,arr) => {arr[i]+=normal[i]})
        normals[i2].forEach((_,i,arr) => {arr[i]+=normal[i]})
        normals[i3].forEach((_,i,arr) => {arr[i]+=normal[i]})
    }
    return normals.map(normal => normalizeVector(normal));
}