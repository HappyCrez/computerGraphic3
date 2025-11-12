import { dotProductVectors } from './mathematic.js';

// triangleNormal - нормализованный вектор нормали треугольника
// viewDirection - нормализованный вектор направления взгляда (от камеры к объекту)
// lightDirection - нормализованный вектор направления света 
export function calculateGouraudColor(triangleNormal, viewDirection, lightDirection) {
    const ambient = 0.2;
    const diffuse = 0.7;
    const specular = 0.1;
    const shininess = 32;
    
    // Диффузная составляющая - косинус угла между нормалью и направлением света
    const lightDot = Math.max(0, dotProductVectors(triangleNormal, lightDirection));
    
    // Вектор отражения света
    const reflectVector = [
        2 * lightDot * triangleNormal[0] - lightDirection[0],
        2 * lightDot * triangleNormal[1] - lightDirection[1],
        2 * lightDot * triangleNormal[2] - lightDirection[2]
    ];
    
    // Зеркальная составляющая - косинус угла между вектором отражения и направлением взгляда
    const specularDot = Math.max(0, dotProductVectors(viewDirection, reflectVector));
    const specularFactor = Math.pow(specularDot, shininess);
    
    // Итоговая интенсивность
    const intensity = ambient + diffuse * lightDot + specular * specularFactor;
    return Math.min(255, Math.max(0, Math.floor(intensity * 255)));
}