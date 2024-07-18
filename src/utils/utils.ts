type Interval = [number, number];

// export function adjustIntervals(intervals: Interval[], separator: number): Interval[] {
//     // Base case: when there are no intervals or only one interval
//     if (intervals.length <= 1) {
//         return intervals;
//     }

//     // Sort intervals by their start position
//     intervals.sort((a, b) => a[0] - b[0]);

//     // Adjust intervals so they are spread evenly to both sides
//     function spreadIntervals(intervals: Interval[]): void {
//         for (let i = 1; i < intervals.length; i++) {
//             const currentInterval = intervals[i];
//             const leftNeighbor = intervals[i - 1];

//             // Calculate the required start position for the current interval
//             const requiredStart = leftNeighbor[1] + separator;
//             const overlap = requiredStart - currentInterval[0];

//             if (overlap > 0) {
//                 // If overlap is positive, move intervals to the right
//                 const shift = overlap / 2;

//                 // Adjust current interval to the right, ensuring we don't exceed original bounds
//                 if (i == intervals.length - 1 || currentInterval[1] + shift <= intervals[intervals.length - 1][1]) {
//                     currentInterval[0] += shift;
//                     currentInterval[1] += shift;
//                 }

//                 // Adjust left neighbor to the left, ensuring we don't go below original start
//                 if (i == 1 || leftNeighbor[0] - shift >= intervals[0][0]) {
//                     leftNeighbor[0] -= shift;
//                     leftNeighbor[1] -= shift;
//                 }
//             }
//         }
//     }

//     spreadIntervals(intervals);

//     // Function to balance intervals and ensure no overlap in reverse order
//     function balanceIntervals(intervals: Interval[]): void {
//         for (let i = intervals.length - 2; i >= 0; i--) {
//             const currentInterval = intervals[i];
//             const rightNeighbor = intervals[i + 1];

//             // Calculate the required end position for the current interval
//             const requiredEnd = rightNeighbor[0] - separator;
//             const overlap = currentInterval[1] - requiredEnd;

//             if (overlap > 0) {
//                 // If overlap is positive, move intervals to the left
//                 const shift = overlap / 2;

//                 // Adjust current interval to the left, ensuring we don't exceed original bounds
//                 if (i == 0 || currentInterval[0] - shift >= intervals[0][0]) {
//                     currentInterval[0] -= shift;
//                     currentInterval[1] -= shift;
//                 }

//                 // Adjust right neighbor to the right, ensuring we don't exceed original end
//                 if (i == intervals.length - 2 || rightNeighbor[1] + shift <= intervals[intervals.length - 1][1]) {
//                     rightNeighbor[0] += shift;
//                     rightNeighbor[1] += shift;
//                 }
//             }
//         }
//     }

//     balanceIntervals(intervals);

//     return intervals;
// }

// export function adjustIntervals(intervals: Interval[], rangeStart: number, rangeEnd: number, spread: number): Interval[] {
//     // Sort intervals based on their starting points
//     intervals.sort((a, b) => a[0] - b[0]);

//     // Adjust intervals to ensure they fit within the rangeStart and rangeEnd
//     intervals.forEach(interval => {
//         interval[0] = Math.max(interval[0], rangeStart);
//         interval[1] = Math.min(interval[1], rangeEnd);
//     });

//     // Function to shift an interval if needed
//     const shiftInterval = (interval: Interval, shift: number, rangeStart: number, rangeEnd: number): Interval => {
//         let [start, end] = interval;
//         start += shift;
//         end += shift;

//         if (start < rangeStart) {
//             start = rangeStart;
//             end = start + (interval[1] - interval[0]);
//         }
//         if (end > rangeEnd) {
//             end = rangeEnd;
//             start = end - (interval[1] - interval[0]);
//         }

//         return [start, end];
//     };

//     // Iterate over intervals to adjust their positions
//     for (let i = 1; i < intervals.length; i++) {
//         const prev = intervals[i - 1];
//         let curr = intervals[i];

//         if (curr[0] <= prev[1] + spread) {
//             const shiftRight = (prev[1] + spread) - curr[0];
//             curr = shiftInterval(curr, shiftRight, rangeStart, rangeEnd);
//             intervals[i] = curr;

//             // If overlapping after adjustment, shift left if possible
//             if (curr[0] <= prev[1] + spread) {
//                 const shiftLeft = prev[1] + spread - curr[0];
//                 curr = shiftInterval(curr, -shiftLeft, rangeStart, rangeEnd);
//                 intervals[i] = curr;
//             }
//         }
//     }

//     return intervals;
// }

export function adjustIntervals(intervals: Interval[], start: number, end: number, separator: number): Interval[] {
    if (intervals.length <= 1) {
        return intervals;
    }

    // Sort intervals by their start position
    intervals.sort((a, b) => a[0] - b[0]);

    const totalIntervals = intervals.length;
    const totalSpace = end - start;
    const totalIntervalWidth = intervals.reduce((acc, interval) => acc + (interval[1] - interval[0]), 0);
    const emptyScaleFactor = (totalSpace - totalIntervalWidth) / totalSpace; // total fraction of space that is not occupied by intervals

    // compute intervals between interval median points
    let negativeIntervals = [[0,0]];
    for (let i = 0; i < totalIntervals; i++) {
        const midpoint = computeMidpoint(intervals[i][0], intervals[i][1]);
        negativeIntervals[negativeIntervals.length - 1][1] = midpoint;
        negativeIntervals.push([midpoint,end]);
    }

    // compute scaled width of spacers
    let scaledSpacerWidths = [];
    for (let i = 0; i < negativeIntervals.length; i++) {
        const interval = negativeIntervals[i];
        const intervalWidth = interval[1] - interval[0];
        const scaledWidth = intervalWidth * emptyScaleFactor;
        scaledSpacerWidths.push(scaledWidth);
    }

    // compute positions of original intervals separated by scaled spacers
    let new_intervals = [];
    let prev_end = start;
    for (let i = 0; i < totalIntervals; i++) {
        const interval = intervals[i];
        const intervalWidth = interval[1] - interval[0];
        const spacer = scaledSpacerWidths[i];
        const new_interval = [prev_end+spacer, prev_end + spacer + intervalWidth];
        prev_end = new_interval[1];
        new_intervals.push(new_interval);
    }
    
    return new_intervals;
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