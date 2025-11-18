import { dotProductVectors } from './mathematic.js';

// Считает интенсивность цвета для нормали vertexNormal
// normal - нормализованный вектор нормали треугольника
// viewDirection - нормализованный вектор направления взгляда (от камеры к объекту)
// lightDirection - нормализованный вектор направления света 
export function getColorIntensity(normal, viewDirection, lightDirection) {
    const ambient = 0.2; // Коэффициент окружающего освещения
    const diffuse = 0.7; // Коэффициент "матовости"
    const specular = 0.3; // Коэффициент зеркальности (шерховатость поверхности)
    const phoeng = 16; // Коэффициент Фонга (качество полировки)
    
    // Диффузная составляющая - косинус угла между нормалью и направлением света
    const lightDot = Math.max(0, dotProductVectors(normal, lightDirection));
    
    // Вектор идеального отражения света
    const reflectVector = [
        2 * lightDot * normal[0] - lightDirection[0],
        2 * lightDot * normal[1] - lightDirection[1],
        2 * lightDot * normal[2] - lightDirection[2]
    ];
    
    // Зеркальная составляющая - косинус угла между вектором отражения и направлением взгляда
    const specularDot = Math.max(0, dotProductVectors(viewDirection, reflectVector));
    const specularFactor = Math.pow(specularDot, phoeng); // cos^p
    
    // Итоговая интенсивность
    return ambient + diffuse * lightDot + specular * specularFactor;
}