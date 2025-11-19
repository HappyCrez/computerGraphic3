// LA - linear algebra - Линейная алгебра

export function deg2rad(deg) {
    return deg * Math.PI / 180.;
}

export function rad2deg(rad) {
    return rad * 180. / Math.PI;
}

export function productMatrices(a, b) {
    if (a[0].length != b.length) {
        throw "Matrixes should be NxM MxK";
    }

    const response = Array(a.length).fill(0).map(() => Array(b[0].length).fill(0));
    for (let i = 0; i < a.length; ++i) {
        for (let j = 0; j < b[0].length; ++j) {
            for (let k = 0; k < a[0].length; ++k) {
                response[i][j] += a[i][k] * b[k][j];
            }
        }
    }
    return response;
}

// x, y, z - угол по соответствующей оси вращения в градусах
export function rotateMatrix(x, y, z) {
    const rad_x = deg2rad(x);
    const rotate_matrix_x = [
        [1, 0, 0, 0],
        [0, Math.cos(rad_x), -Math.sin(rad_x), 0],
        [0, Math.sin(rad_x), Math.cos(rad_x), 0],
        [0, 0, 0, 1]
    ];

    const rad_y = deg2rad(y);
    const rotate_matrix_y = [
        [Math.cos(rad_y), 0, Math.sin(rad_y), 0],
        [0, 1, 0, 0],
        [-Math.sin(rad_y), 0, Math.cos(rad_y), 0],
        [0, 0, 0, 1]
    ];

    const rad_z = deg2rad(z);
    const rotate_matrix_z = [
        [Math.cos(rad_z), -Math.sin(rad_z), 0, 0],
        [Math.sin(rad_z), Math.cos(rad_z), 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ];
    return productMatrices(productMatrices(rotate_matrix_x, rotate_matrix_y), rotate_matrix_z);
}

// x,y,z - коэффициент масштабирования по соответствующей оси
export function scaleMatrix(x, y, z) {
    return [[x, 0, 0, 0], [0, y, 0, 0], [0, 0, z, 0], [0, 0, 0, 1]];
}

// x,y,z - перемещение в пространстве по соответствующей оси
export function translateMatrix(x, y, z) {
    return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [x, y, z, 1]];
}

// yz,xz,xy - отображение объекта в определенной плоскости
export function mirrorMatrix(yz, xz, xy) {
    return [[yz ? -1 : 1, 0, 0, 0], [0, xz ? -1 : 1, 0, 0], [0, 0, xy ? -1 : 1, 0], [0, 0, 0, 1]];
}

// Единичная матрица
export function identityMatrix() {
    return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
}

// Векторное произведение
export function crossProductVectors(a, b) {
    if (!a || !b || a.length !== 3 || b.length !== 3) {
        return [0, 0, 0];
    }
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

// Скалярное произведение
export function dotProductVectors(a, b) {
    let res = 0;
    for (let i = 0; i < a.length; ++i) {
        res += a[i]*b[i];
    }
    return res;
}

// Длина вектора
export function lengthVector(v) {
    return Math.sqrt(dotProductVectors(v,v));
}

// Нормализация вектора
export function normalizeVector(v) {
    const length = lengthVector(v);
    if (length === 0) {
        return [0, 0, 0];
    }
    return [v[0] / length, v[1] / length, v[2] / length];
}

// edge - отрезок заданный двумя точками [[x0,y0], [x1,y1]]
export function getXbyY(edge, y) {
    // Математический вывод формулы:
    // y0 = k*x0 + b
    // y1 = k*x1 + b
    // y0-y1 = k*x0-k*x1
    // y0-y1 = k(x0 - x1)
    // k = (y0 - y1)/(x0 - x1)
    // b = y0 - k*x0
    // x = (y - b)/k  Получаем x при заданом y на прямой
    const eps = 0.1;
    if (Math.abs(edge[0][0] - edge[1][0]) < eps || Math.abs(edge[0][1] - edge[1][1]) < eps) {
        return edge[0][0];
    }
    const k = (edge[0][1] - edge[1][1])/(edge[0][0] - edge[1][0]);
    const b = edge[0][1] - k*edge[0][0];
    return (y-b)/k;
}

export function linearInterpolation(v, points) {
    const [[x0, y0, I0], [x1, y1, I1]] = points;
    
    // Вычисляем параметр t через проекцию на вектор отрезка
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lengthSq = dx * dx + dy * dy;
    
    // Если точки совпадают, возвращаем среднее значение
    if (lengthSq === 0) {
        return (I0 + I1) / 2;
    }
    
    // Вектор от начальной точки к целевой
    const vx = v[0] - x0;
    const vy = v[1] - y0;
    
    // Проекция на направляющий вектор отрезка
    const t = (vx * dx + vy * dy) / lengthSq;
    
    // Линейная интерполяция
    return (I1-I0)*t + I0;
}