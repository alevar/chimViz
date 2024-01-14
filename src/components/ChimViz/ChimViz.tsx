import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface ChimVizProps {
    densities: Record<string, number[]>;
    genes: Record<string, [string, number][]>;
    width: number;
    height: number;
    fontSize: number;
}

function spread_labels(input: number[][]): number[][] {
    const sortedCircles = input.map(([_, center]) => center).sort((a, b) => a - b);
    const result: number[][] = [{ center: sortedCircles[0], radius: LABEL_WIDTH }];
  
    for (let i = 1; i < sortedCircles.length; i++) {
        const currentCenter = sortedCircles[i];
        const lastCircle = result[result.length - 1];
    
        const minDistance = lastCircle.radius + LABEL_WIDTH;
        let newCenter = lastCircle.center + minDistance;
    
        // Ensure the new center is within bounds
        newCenter = Math.max(MIN_POSITION, Math.min(MAX_POSITION - LABEL_WIDTH, newCenter));
    
        result.push({ center: newCenter, radius: LABEL_WIDTH });
    }
  
    return result;
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
        const raw_label_positions = [];
        genes[key].forEach(([geneName, genePosition]) => {
            const percent_position = ((genePosition / 100000) / 100) * (rectWidth - chromosome_spacer);
            raw_label_positions.push([geneName,percent_position - label_width/2, percent_position + label_width/2]);
        });
        console.log(genes[key]);
        console.log(raw_label_positions);
        // add 

        genes[key].forEach(([geneName, genePosition]) => {
          // Ensure that genePosition is a valid number
          if (!isNaN(genePosition)) {
            // Calculate the x-position of the gene label relative to the current rectangle
            const gene_label_xpos = xPosition + ((genePosition / 100000) / 100) * (rectWidth - chromosome_spacer);

            // Add gene label text on the rectangle
            svg
              .append('text')
              .attr('x', gene_label_xpos + '%')
              .attr('y', 100) // Adjust y-position as needed for the gene label
              .attr('text-anchor', 'middle') // Center the text
              .style('fill', '#ff0000') // Adjust text color for gene labels
              .text(geneName);

            // Draw a line connecting the gene label to the rectangle
            svg
              .append('line')
              .attr('x1', gene_label_xpos + '%')
              .attr('y1', 65)
              .attr('x2', gene_label_xpos + '%')
              .attr('y2', 90) // Adjust y-position as needed for the line
              .style('stroke', '#ff0000') // Adjust line color for gene labels
              .style('stroke-width', 1);
          }
        });
      }

      xPosition += rectWidth; // Add 1% space between rectangles (adjust as needed)
    });
  }, [densities, genes, width, height, fontSize]);

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default ChimViz;
