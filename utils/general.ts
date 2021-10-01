/**
 * This code was first developed [here](https://github.com/michaellangbein/webglexperiments)
 * It has been further developed [here](https://github.com/dlr-eoc/ukis-frontend-libraries) 
 * Since then, modifications have been made to the code. (with this we comply with Apache-2.0 $4.b)
 * The original license from https://github.com/dlr-eoc/ukis-frontend-libraries can be found in this repo as `license.orig.txt` (with this we comply with Apache-2.0 $4.a)
 */




export function renderLoop(fps: number, renderFunction: (tDelta: number) => void): void {

    const tTarget = 1000 * 1.0 / fps;
    let tCalculation = 0;
    let tSleep = tTarget;
    let tStart = 0.0;
    let tNow = 0.0;
    let timeSinceLastRenderCall = 0.0;

    const render = () => {
        tStart = window.performance.now();

        timeSinceLastRenderCall = tCalculation + tSleep;
        renderFunction(timeSinceLastRenderCall);

        tNow = window.performance.now();
        tCalculation = tNow - tStart;
        tSleep = Math.max(tTarget - tCalculation, 0);
        setTimeout(() => {
            requestAnimationFrame(render);
        }, tSleep);

    };

    render();
}