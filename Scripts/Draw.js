import { getXbyY, linearInterpolation, productMatrices } from "./Mathematic.js";
import { proectVertexOnScreen, transformVertex } from "./Renderer.js";

// Закрашивает пространство между двумя отрезками e0 и e1
// renderer - параметры для отрисовки на дисплей
// e0, e1 - рёбра заданные двумя точками, e0: [[x0,y0,I0], [x1,y1,I1]]
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

// Рисует на экране оси
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