import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface ChimVizProps {
    densities: Record<string, number[]>;
    genes: Record<string, [string, number][]>;
    width: number;
    height: number;
    fontSize: number;
}

type Interval = [number, number];

function adjustIntervals(intervals: Interval[], separator: number): Interval[] {
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
      const overlap = Math.max(0,(leftNeighbor[1] - currentInterval[0]) - separator);
      let adjustAmount = overlap / 2;

      // Adjust position of the left neighbor
      if ( leftNeighbor[0] - adjustAmount < 0 ) {
          adjustAmount = leftNeighbor[0];
      }
      leftNeighbor[1] -= adjustAmount;
      leftNeighbor[0] -= adjustAmount;

      // Recursive call for the adjusted left neighbor
      adjustRecursive(index - 1);

      // adjust current element according to the adjusted left neighbor
      const new_overlap = Math.min(0,(intervals[index][0] - intervals[index-1][1]) - separator);
      intervals[index][0] = intervals[index][0] - new_overlap;
      intervals[index][1] = intervals[index][1] - new_overlap;
      
      return
  }

  adjustRecursive(intervals.length-1);
}

const ChimViz: React.FC<ChimVizProps> = ({ densities, genes, width, height, fontSize }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const colorScale = d3.scaleSequential(d3.interpolateViridis); // Use a sequential color scale for heatmap

    const totalValues = Object.values(densities).reduce((acc, arr) => acc + arr.length, 0);
    let xPosition = 0;
    const chromosome_spacer = 1;
    const label_width = (fontSize/width)*100*1.125;

    Object.entries(densities).forEach(([key, values]) => {
      const rectWidth = (values.length / totalValues) * 100;

      // Create a gradient for the heatmap
      const gradient = svg
        .append('defs')
        .append('linearGradient')
        .attr('id', `heatmap-gradient-${key}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');

      values.forEach((value, index) => {
        gradient
          .append('stop')
          .attr('offset', `${(index / (values.length - 1)) * 100}%`)
          .style('stop-color', colorScale(value))
          .style('stop-opacity', 1);
      });

      // Draw rectangle with heatmap fill
      svg
        .append('rect')
        .attr('x', xPosition + '%')
        .attr('y', 40) // Adjust y-position as needed
        .attr('width', rectWidth - chromosome_spacer + '%')
        .attr('height', 20) // Adjust height as needed
        .attr('rx', 10) // Adjust corner radius x
        .attr('ry', 10) // Adjust corner radius y
        .style('fill', `url(#heatmap-gradient-${key})`); // Use the heatmap gradient

      // Add label text underneath the rectangle
      svg
        .append('text')
        .attr('x', xPosition + rectWidth / 2 + '%')
        .attr('y', 30) // Adjust y-position as needed for the label underneath
        .attr('text-anchor', 'middle') // Center the text
        .style('fill', '#000000') // Adjust text color
        .style('font-size', fontSize+"px") // Adjust font size
        .text(key);

      // Check if there are gene labels for the current rectangle
      if (genes[key]) {

        // extract raw label positions
        const raw_label_positions:Interval[] = [];
        const spread_label_positions:Interval[] = [];
        genes[key].forEach(([geneName, genePosition]) => {
            const percent_position = ((genePosition / 100000) / 100) * (rectWidth - chromosome_spacer);
            const interval_start = percent_position - label_width/2;
            const interval_end = percent_position + label_width/2;
            raw_label_positions.push([interval_start,interval_end]);
            spread_label_positions.push([interval_start,interval_end]);
        });
        
        const separator = 0.2;
        adjustIntervals(spread_label_positions,separator);

        let gene_index = 0;
        genes[key].forEach(([geneName, genePosition]) => {
          // Ensure that genePosition is a valid number
          if (!isNaN(genePosition)) {
            // Calculate the x-position of the gene label relative to the current rectangle
            const gene_label_adjusted_xpos = xPosition + (spread_label_positions[gene_index][1] + spread_label_positions[gene_index][0])/2;
            const gene_label_xpos = xPosition + (raw_label_positions[gene_index][1] + raw_label_positions[gene_index][0])/2;

            // Add gene label text on the rectangle
            svg
              .append('text')
              .attr('x', `${gene_label_adjusted_xpos}%`)
              .attr('y', 100) // Adjust y-position as needed for the gene label
              .attr('text-anchor', 'end') // Center the text
              .style('fill', '#ff0000') // Adjust text color for gene labels
              .attr('transform', `rotate(-90 ${gene_label_adjusted_xpos * (width / 100)},${100})`) // Rotate text 90 degrees
              .style('font-size', fontSize+"px") // Adjust font size
              .text(geneName);

            // Draw a line connecting the gene label to the rectangle
            svg
              .append('line')
              .attr('x1', gene_label_xpos + '%')
              .attr('y1', 60)
              .attr('x2', gene_label_xpos + '%')
              .attr('y2', 80) // Adjust y-position as needed for the line
              .style('stroke', '#ff0000') // Adjust line color for gene labels
              .style('stroke-width', 1);

            svg
              .append('line')
              .attr('x1', gene_label_xpos + '%')
              .attr('y1', 80)
              .attr('x2', gene_label_adjusted_xpos + '%')
              .attr('y2', 100) // Adjust y-position as needed for the line
              .style('stroke', '#ff0000') // Adjust line color for gene labels
              .style('stroke-width', 1);
          }
          gene_index += 1;
        });
      }

      xPosition += rectWidth; // Add 1% space between rectangles (adjust as needed)
    });
  }, [densities, genes, width, height, fontSize]);

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default ChimViz;
