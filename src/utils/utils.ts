export function adjustIntervals(intervals: Interval[], separator: number): Interval[] {
    // Base case: when there are no intervals or only one interval
    if (intervals.length <= 1) {
        return intervals;
    }

    // Sort intervals by their start position
    intervals.sort((a, b) => a[0] - b[0]);

    // Recursive function to adjust intervals
    function adjustRecursive(index: number): void {
        if (index <= 0) {
            // Base case: reached the beginning of the array
            return;
        }

        const currentInterval = intervals[index];
        const leftNeighbor = intervals[index - 1];

        // There is an overlap with the left neighbor
        const overlap = Math.max(0, (leftNeighbor[1] - currentInterval[0]) - separator);
        let adjustAmount = overlap / 2;

        // Adjust position of the left neighbor
        if (leftNeighbor[0] - adjustAmount < 0) {
            adjustAmount = leftNeighbor[0];
        }
        leftNeighbor[1] -= adjustAmount;
        leftNeighbor[0] -= adjustAmount;

        // Recursive call for the adjusted left neighbor
        adjustRecursive(index - 1);

        // adjust current element according to the adjusted left neighbor
        const new_overlap = Math.min(0, (intervals[index][0] - intervals[index - 1][1]) - separator);
        intervals[index][0] = intervals[index][0] - new_overlap;
        intervals[index][1] = intervals[index][1] - new_overlap;

        return
    }

    adjustRecursive(intervals.length - 1);
}

export function computeMidpoint(a: number, b: number): number {
    // Ensure a is less than b
    if (a > b) {
        [a, b] = [b, a];
    }

    // Calculate the midpoint
    const midpoint = (a + b) / 2;

    return midpoint;
}