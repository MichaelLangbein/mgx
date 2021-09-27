export function renderLoop(fps: number, renderFunction: (tDelta: number) => void): void {

    const tDeltaTarget = 1000 * 1.0 / fps;
    let tDelta = tDeltaTarget;
    let tStart, tNow, tSleep: number;

    const render = () => {
        tStart = window.performance.now();

        renderFunction(tDelta);

        tNow = window.performance.now();
        tDelta = tNow - tStart;
        tSleep = Math.max(tDeltaTarget - tDelta, 0);
        setTimeout(() => {
            requestAnimationFrame(render);
        }, tSleep);

    };

    render();
}