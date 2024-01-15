import * as d3 from 'd3';

interface ChimPlotData {
    densities: Record<string, number[]>;
    genes: Record<string, [string, number][]>;
    pathogenGTF: Record<string, [number, number][]>;
    width: number;
    height: number;
    fontSize: number;
}

type Interval = [number, number];

export class ChimPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private sections: {
        "hostPlot": {"plot": HostPlot | null,
                   "x":number,
                   "y":number,
                   "height":number,
                   "width":number
                  },
        "connectionsPlot": {"plot": ConnectionsPlot | null,
                   "x":number,
                   "y":number,
                   "height":number,
                   "width":number
                  },
        "pathogenPlot": {"plot": PathogenPlot | null,
                   "x":number,
                   "y":number,
                   "height":number,
                   "width":number
                  }
    };
    private width: number;
    private height: number;
    private fontSize: number;
    private densities: Record<string, number[]> = {};
    private genes: Record<string, [string, number][]> = {};
    private pathogenGTF: Record<string, [number, number][]> = {};

    constructor(svgElement: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, data: ChimPlotData) {
        this.width = data.width;
        this.height = data.height;
        this.fontSize = data.fontSize;

        this.densities = data.densities;
        this.genes = data.genes;
        this.pathogenGTF = data.pathogenGTF;

        this.svg = svgElement;
        this.sections = {
            "hostPlot": {"plot": null,
                       "x":0,
                       "y":0,
                       "height":0,
                       "width":0
                      },
            "connectionsPlot": {"plot": null,
                       "x":0,
                       "y":0,
                       "height":0,
                       "width":0
                      },
            "pathogenPlot": {"plot": null,
                       "x":0,
                       "y":0,
                       "height":0,
                       "width":0
                      }
        };
        this.updateSvgSize();
        this.setupSections();
    }

    private updateSvgSize(): void {
        this.svg.attr('width', this.width).attr('height', this.height);
    }

    private setupSections(): void {
        // Remove all elements from the svg
        this.svg.selectAll("*").remove();

        // Calculate heights for each section
        this.sections["hostPlot"]["height"] = this.height * 0.25;
        this.sections["hostPlot"]["width"] = this.width * 1.0;
        this.sections["hostPlot"]["x"] = 0;
        this.sections["hostPlot"]["y"] = 0;

        this.sections["connectionsPlot"]["height"] = this.height * 0.5;
        this.sections["connectionsPlot"]["width"] = this.width * 1.0;
        this.sections["connectionsPlot"]["x"] = 0;
        this.sections["connectionsPlot"]["y"] = this.sections["hostPlot"]["height"];

        this.sections["pathogenPlot"]["height"] = this.height * 0.25;
        this.sections["pathogenPlot"]["width"] = this.width * 1.0;
        this.sections["pathogenPlot"]["x"] = 0;
        this.sections["pathogenPlot"]["y"] = this.sections["hostPlot"]["height"] + this.sections["connectionsPlot"]["height"];

        // Create individual SVG elements for each plot
        const hostPlotSvg = this.svg.append('svg')
            .attr('x', this.sections["hostPlot"]["x"])
            .attr('y', this.sections["hostPlot"]["y"])
            .attr('width', this.sections["hostPlot"]["width"])
            .attr('height', this.sections["hostPlot"]["height"]);

        const connectionsPlotSvg = this.svg.append('svg')
            .attr('x', this.sections["connectionsPlot"]["x"])
            .attr('y', this.sections["connectionsPlot"]["y"])
            .attr('width', this.sections["connectionsPlot"]["width"])
            .attr('height', this.sections["connectionsPlot"]["height"]);

        const pathogenPlotSvg = this.svg.append('svg')
            .attr('x', this.sections["pathogenPlot"]["x"])
            .attr('y', this.sections["pathogenPlot"]["y"])
            .attr('width', this.sections["pathogenPlot"]["width"])
            .attr('height', this.sections["pathogenPlot"]["height"]);

        // Create instances of HostPlot, ConnectionsPlot, and PathogenPlot
        console.log(this.densities)
        this.sections["hostPlot"]["plot"] = new HostPlot(hostPlotSvg, this.sections["hostPlot"]["width"], this.sections["hostPlot"]["height"], this.fontSize, this.densities, this.genes);
        this.sections["connectionsPlot"]["plot"] = new ConnectionsPlot(connectionsPlotSvg, this.sections["connectionsPlot"]["width"], this.sections["connectionsPlot"]["height"]);
        this.sections["pathogenPlot"]["plot"] = new PathogenPlot(pathogenPlotSvg, this.sections["pathogenPlot"]["width"], this.sections["pathogenPlot"]["height"]);
    }
}

// Additional classes (HostPlot, ConnectionsPlot, PathogenPlot) can be implemented similarly.
class HostPlot {
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private width: number;
  private height: number;
  private fontSize: number;
  private densities: Record<string, number[]> = {};
  private genes: Record<string, [string, number][]> = {};

  constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, width: number, height: number, fontSize: number, densities: Record<string, number[]>, genes: Record<string, [string, number][]>) {
      this.svg = svg;
      this.width = width;
      this.height = height;
      this.fontSize = fontSize;
      this.densities = densities;
      this.genes = genes;

      const colorScale = d3.scaleSequential(d3.interpolateViridis); // Use a sequential color scale for heatmap
      console.log("densities",this.densities)
      const totalValues = Object.values(densities).reduce((acc, arr) => acc + arr.length, 0);
      let xPosition = 0;
      const chromosome_spacer = 1;
      const label_width = (this.fontSize / width) * 100 * 1.125;

      Object.entries(densities).forEach(([key, values]) => {
        const rectWidth = (values.length / totalValues) * 100;

        // Create a gradient for the heatmap
        const gradient = this.svg
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
        this.svg
            .append('rect')
            .attr('x', xPosition + '%')
            .attr('y', 40) // Adjust y-position as needed
            .attr('width', rectWidth - chromosome_spacer + '%')
            .attr('height', 20) // Adjust height as needed
            .attr('rx', 10) // Adjust corner radius x
            .attr('ry', 10) // Adjust corner radius y
            .style('fill', `url(#heatmap-gradient-${key})`); // Use the heatmap gradient

        // Add label text underneath the rectangle
        this.svg
            .append('text')
            .attr('x', xPosition + rectWidth / 2 + '%')
            .attr('y', 30) // Adjust y-position as needed for the label underneath
            .attr('text-anchor', 'middle') // Center the text
            .style('fill', '#000000') // Adjust text color
            .style('font-size', fontSize + "px") // Adjust font size
            .text(key);

        // Check if there are gene labels for the current rectangle
        if (genes[key]) {

            // extract raw label positions
            const raw_label_positions: Interval[] = [];
            const spread_label_positions: Interval[] = [];
            genes[key].forEach(([geneName, genePosition]) => {
                const percent_position = ((genePosition / 100000) / 100) * (rectWidth - chromosome_spacer);
                const interval_start = percent_position - label_width / 2;
                const interval_end = percent_position + label_width / 2;
                raw_label_positions.push([interval_start, interval_end]);
                spread_label_positions.push([interval_start, interval_end]);
            });

            const separator = 0.2;
            this.adjustIntervals(spread_label_positions, separator);

            let gene_index = 0;
            genes[key].forEach(([geneName, genePosition]) => {
                // Ensure that genePosition is a valid number
                if (!isNaN(genePosition)) {
                    // Calculate the x-position of the gene label relative to the current rectangle
                    const gene_label_adjusted_xpos = xPosition + (spread_label_positions[gene_index][1] + spread_label_positions[gene_index][0]) / 2;
                    const gene_label_xpos = xPosition + (raw_label_positions[gene_index][1] + raw_label_positions[gene_index][0]) / 2;

                    // Add gene label text on the rectangle
                    this.svg
                        .append('text')
                        .attr('x', `${gene_label_adjusted_xpos}%`)
                        .attr('y', 105) // Adjust y-position as needed for the gene label
                        .attr('text-anchor', 'end') // Center the text
                        .style('fill', '#ff0000') // Adjust text color for gene labels
                        .attr('transform', `rotate(-90 ${gene_label_adjusted_xpos * (width / 100)},${100})`) // Rotate text 90 degrees
                        .style('font-size', fontSize + "px") // Adjust font size
                        .text(geneName);

                    // Draw a line connecting the gene label to the rectangle
                    this.svg
                        .append('line')
                        .attr('x1', gene_label_xpos + '%')
                        .attr('y1', 60)
                        .attr('x2', gene_label_xpos + '%')
                        .attr('y2', 70) // Adjust y-position as needed for the line
                        .style('stroke', '#ff0000') // Adjust line color for gene labels
                        .style('stroke-width', 1);

                    this.svg
                        .append('line')
                        .attr('x1', gene_label_xpos + '%')
                        .attr('y1', 70)
                        .attr('x2', gene_label_adjusted_xpos + '%')
                        .attr('y2', 90) // Adjust y-position as needed for the line
                        .style('stroke', '#ff0000') // Adjust line color for gene labels
                        .style('stroke-width', 1);

                    this.svg
                        .append('line')
                        .attr('x1', gene_label_adjusted_xpos + '%')
                        .attr('y1', 90)
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
  }

  private adjustIntervals(intervals: Interval[], separator: number): Interval[] {
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
}

class ConnectionsPlot {
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private width: number;
  private height: number;

  constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, width: number, height: number) {
      this.svg = svg;
      this.width = width;
      this.height = height;

      // Add a border around the SVG element for visual distinction
      this.svg.style('border', '1px solid black');

      // Implementation for ConnectionsPlot class
  }
}

class PathogenPlot {
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private width: number;
  private height: number;

  constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, width: number, height: number) {
      this.svg = svg;
      this.width = width;
      this.height = height;

      // Add a border around the SVG element for visual distinction
      this.svg.style('border', '1px solid black');

      // Implementation for PathogenPlot class
  }
}