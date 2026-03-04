export function percentProgressor(
    total: number,
    onProgress: (percent: number) => void,
    step: number = 1,
): {
    singleTaskDone: () => void;
    manualTriggerOnProgress: () => void;
} {
    let doneCount = 0;
    let lastPercent = -1;

    function updateProgress() {
        if (total === 0) {
            onProgress(100);
            return;
        }
        const percent = Math.floor((doneCount / total) * 100);
        if (percent !== lastPercent && percent % step === 0) {
            lastPercent = percent;
            onProgress(percent);
        }
    }

    return {
        singleTaskDone: () => {
            doneCount++;
            updateProgress();
        },
        manualTriggerOnProgress: () => {
            if (lastPercent === -1) {
                updateProgress();
            } else {
                onProgress(lastPercent);
            }
        },
    };
}
