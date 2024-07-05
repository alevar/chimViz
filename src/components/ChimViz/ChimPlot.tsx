import { color } from 'chart.js/helpers';
import * as d3 from 'd3';

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

function computeMidpoint(a: number, b: number): number {
    // Ensure a is less than b
    if (a > b) {
        [a, b] = [b, a];
    }

    // Calculate the midpoint
    const midpoint = (a + b) / 2;

    return midpoint;
}

interface ChimPlotData {
    densities: Record<string, number[]>;
    fai: Record<string, number>;
    genes: Record<string, [string, number][]>;
    geneCount: number;
    gtf_data: any;
    integrations: any[];
    width: number;
    height: number;
    fontSize: number;
}

type Interval = [number, number];

export class ChimPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private sections: {
        "legend": {
            "plot": d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null,
            "x": number,
            "y": number,
            "dimensions": {
                "font_size": number,
                "width": number,
                "height": number
            }
        },
        "hostPlot": {
            "plot": HostPlot | null,
            "x": number,
            "y": number,
            "dimensions": {
                "font_size": number,
                "width": number,
                "height": number,
                "gene_label_height": number,
                "gene_lines_height": number,
                "idiogram_height": number
            }
        },
        "connectionsPlot": {
            "plot": ConnectionsPlot | null,
            "x": number,
            "y": number,
            "dimensions": {
                "font_size": number,
                "width": number,
                "height": number
            }
        },
        "pathogenPlot": {
            "plot": PathogenPlot | null,
            "x": number,
            "y": number,
            "dimensions": {
                "font_size": number,
                "width": number,
                "height": number,
                "genome_height": number
            }
        }
    };
    private width: number;
    private height: number;
    private fontSize: number;
    private densities: Record<string, number[]> = {};
    private fai: Record<string, number> = {};
    private genes: Record<string, [string, number][]> = {};
    private geneCount: number = 0; // gene count threshold. Only labels above threshold will be displayed as names - oterwise simple markers
    private gtf_data: any = { "transcripts": [], "genome_components": [] };
    private integrations: any[] = [];

    constructor(svgElement: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
        data: ChimPlotData) {

        this.width = data.width;
        this.height = data.height;
        this.fontSize = data.fontSize;

        this.densities = data.densities;
        this.fai = data.fai;
        this.genes = data.genes;
        this.geneCount = data.geneCount;
        this.gtf_data = data.gtf_data;
        this.integrations = data.integrations;

        this.svg = svgElement;
        this.sections = {
            "legend": {
                "plot": null,
                "x": 0,
                "y": 0,
                "dimensions": {
                    "font_size": 0,
                    "width": 0,
                    "height": 0
                }
            },
            "hostPlot": {
                "plot": null,
                "x": 0,
                "y": 0,
                "dimensions": {
                    "font_size": 0,
                    "width": 0,
                    "height": 0,
                    "gene_label_height": 0,
                    "gene_lines_height": 0,
                    "idiogram_height": 0
                }
            },
            "connectionsPlot": {
                "plot": null,
                "x": 0,
                "y": 0,
                "dimensions": {
                    "font_size": 0,
                    "width": 0,
                    "height": 0
                }
            },
            "pathogenPlot": {
                "plot": null,
                "x": 0,
                "y": 0,
                "dimensions": {
                    "font_size": 0,
                    "width": 0,
                    "height": 0,
                    "genome_height": 0
                }
            }
        };

        this.color_integrations();
    }

    public plot(): void {
        this.updateSvgSize();
        this.setupSections();
    }

    private updateSvgSize(): void {
        this.svg
            .attr('width', this.width)
            .attr('height', this.height);
        this.svg.append('rect')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', 'white');

            
    }

    private color_integrations(): void {
        // add color to the integration sites based on their location on the x-axis.
        // assign from gradient scale.
        // points which occur closer to each other on the genome should have similar colors

        // get the maximum length of the genome
        const path_genome_length = this.gtf_data["genome_end"];
        // get color scale
        const color = d3.scaleSequential(d3.interpolateTurbo)
            .domain([0, path_genome_length]);
        // iterate over the integrations and assign color
        this.integrations.forEach(integration => {
            integration.push(color(integration[3]));
        });
    }

    private setupSections(): void {
        const parameters = {
            "idiogram_factor": 0.025,
            "genome_factor": 0.15,
            "connections_factor": 0.3,
            "legend_factor": 0.15,
        }

        // gather information about the data
        // 1. get maximum length of gene names
        const maxGeneNameLength = Object.keys(this.genes).reduce((max, key) => Math.max(max, key.length), 0);

        // Since width is invariant - we should deduce all heights and proportions relative to the width

        // Calculate heights for each section
        this.sections["hostPlot"]["dimensions"]["font_size"] = this.fontSize;
        this.sections["hostPlot"]["dimensions"]["gene_label_height"] = (maxGeneNameLength * this.fontSize) * 8; // height of gene labels
        this.sections["hostPlot"]["dimensions"]["gene_lines_height"] = (this.width * parameters["idiogram_factor"]); // height of lines connecting labels to idiogram
        this.sections["hostPlot"]["dimensions"]["idiogram_height"] = (this.width * parameters["idiogram_factor"]); // height of idiogram
        this.sections["hostPlot"]["dimensions"]["height"] = this.sections["hostPlot"]["dimensions"]["gene_label_height"] +
            this.sections["hostPlot"]["dimensions"]["gene_lines_height"] +
            this.sections["hostPlot"]["dimensions"]["idiogram_height"];
        this.sections["hostPlot"]["dimensions"]["width"] = this.width * (1 - parameters["legend_factor"]);
        this.sections["hostPlot"]["x"] = 0;
        this.sections["hostPlot"]["y"] = 0;




        this.sections["connectionsPlot"]["dimensions"]["height"] = this.width * parameters["connections_factor"] + this.sections["hostPlot"]["dimensions"]["idiogram_height"] / 2;
        this.sections["connectionsPlot"]["dimensions"]["width"] = this.width * (1 - parameters["legend_factor"]);
        this.sections["connectionsPlot"]["x"] = 0;
        this.sections["connectionsPlot"]["y"] = this.sections["hostPlot"]["dimensions"]["height"] - this.sections["hostPlot"]["dimensions"]["idiogram_height"] / 2;





        this.sections["pathogenPlot"]["dimensions"]["font_size"] = this.fontSize;
        this.sections["pathogenPlot"]["dimensions"]["genome_height"] = this.width * parameters["genome_factor"];
        this.sections["pathogenPlot"]["dimensions"]["height"] = this.sections["pathogenPlot"]["dimensions"]["genome_height"];
        this.sections["pathogenPlot"]["dimensions"]["width"] = this.width * (1 - parameters["legend_factor"]);
        this.sections["pathogenPlot"]["x"] = 0;
        this.sections["pathogenPlot"]["y"] = this.sections["connectionsPlot"]["y"] + this.sections["connectionsPlot"]["dimensions"]["height"];


        // update global dimensions accordingly
        this.height = this.sections["hostPlot"]["dimensions"]["height"] + this.sections["connectionsPlot"]["dimensions"]["height"] + this.sections["pathogenPlot"]["dimensions"]["height"];
        this.updateSvgSize()

        this.sections["legend"]["dimensions"]["height"] = this.sections["connectionsPlot"]["dimensions"]["height"];
        this.sections["legend"]["dimensions"]["width"] = (this.width * parameters["legend_factor"]) * 0.9;
        this.sections["legend"]["dimensions"]["font_size"] = this.fontSize;
        this.sections["legend"]["x"] = this.width * (1 - parameters["legend_factor"]) + (this.width * parameters["legend_factor"]) * 0.075;
        this.sections["legend"]["y"] = this.sections["connectionsPlot"]["y"];

        const legendSvg = this.svg.append('svg')
            .attr('x', this.sections["legend"]["x"])
            .attr('y', this.sections["legend"]["y"])
            .attr('width', this.sections["legend"]["dimensions"]["width"])
            .attr('height', this.sections["legend"]["dimensions"]["height"]);

        const connectionsPlotSvg = this.svg.append('svg')
            .attr('x', this.sections["connectionsPlot"]["x"])
            .attr('y', this.sections["connectionsPlot"]["y"])
            .attr('width', this.sections["connectionsPlot"]["dimensions"]["width"])
            .attr('height', this.sections["connectionsPlot"]["dimensions"]["height"]);

        // Create individual SVG elements for each plot
        const hostPlotSvg = this.svg.append('svg')
            .attr('x', this.sections["hostPlot"]["x"])
            .attr('y', this.sections["hostPlot"]["y"])
            .attr('width', this.sections["hostPlot"]["dimensions"]["width"])
            .attr('height', this.sections["hostPlot"]["dimensions"]["height"]);

        const pathogenPlotSvg = this.svg.append('svg')
            .attr('x', this.sections["pathogenPlot"]["x"])
            .attr('y', this.sections["pathogenPlot"]["y"])
            .attr('width', this.sections["pathogenPlot"]["dimensions"]["width"])
            .attr('height', this.sections["pathogenPlot"]["dimensions"]["height"]);

        // Create instances of Legend, HostPlot, ConnectionsPlot, and PathogenPlot
        this.sections["legend"]["plot"] = new Legend(legendSvg,
            this.sections["legend"]["dimensions"]);
        this.sections["legend"]["plot"].plot();

        this.sections["hostPlot"]["plot"] = new HostPlot(hostPlotSvg,
            this.sections["hostPlot"]["dimensions"],
            this.densities,
            this.fai,
            this.genes,
            this.geneCount);
        this.sections["hostPlot"]["plot"].plot();
        const seqids = this.sections["hostPlot"]["plot"].get_seqids();

        this.sections["pathogenPlot"]["plot"] = new PathogenPlot(pathogenPlotSvg,
            this.sections["pathogenPlot"]["dimensions"],
            this.gtf_data);
        this.sections["pathogenPlot"]["plot"].plot();

        const path_data = {
            "x": this.sections["pathogenPlot"]["x"],
            "y": this.sections["pathogenPlot"]["y"],
            "width": this.sections["pathogenPlot"]["dimensions"]["width"],
            "height": this.sections["pathogenPlot"]["dimensions"]["height"],
            "length": this.sections["pathogenPlot"]["plot"].get_length(),
        }
        this.sections["connectionsPlot"]["plot"] = new ConnectionsPlot(connectionsPlotSvg,
            this.sections["connectionsPlot"]["dimensions"],
            this.integrations,
            seqids,
            path_data);
        const used_integrations = this.sections["connectionsPlot"]["plot"].plot();

        // plot integration sites intot he transcriptome map
        this.sections["pathogenPlot"]["plot"].plot_integrations(used_integrations);
    }
}

class ConnectionsPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions = {
        "font_size": 0,
        "width": 0,
        "height": 0
    };
    private integrations: any[] = [];
    private host_seqids: Record<string, any> = {};
    private path_seqids: Record<string, any> = {};

    private connections: any[];

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
        dimensions: {
            "font_size": number,
            "width": number,
            "height": number
        },
        integrations: any[],
        host_seqids: Record<string, any>,
        path_seqids: Record<string, any>) {
        this.svg = svg;
        this.dimensions = dimensions;
        this.integrations = integrations;
        this.host_seqids = host_seqids;
        this.path_seqids = path_seqids;

        this.connections = [];
    }

    private splitDistance(point1: { xpoint: number; ypoint: number; }, point2: { xpoint: number; ypoint: number; }): { xpoint: number; ypoint: number; }[] {
        // Calculate the coordinates of the two intermediate points
        const intermediatePoint1 = {
            xpoint: point1.xpoint,
            ypoint: point1.ypoint + (point2.ypoint - point1.ypoint) / 5,
        };

        const intermediatePoint2 = {
            xpoint: point1.xpoint + (point2.xpoint - point1.xpoint) / 4,
            ypoint: point1.ypoint + (point2.ypoint - point1.ypoint) / 3,
        };

        const intermediatePoint3 = {
            xpoint: point1.xpoint + (3 * (point2.xpoint - point1.xpoint)) / 4,
            ypoint: point1.ypoint + (2 * (point2.ypoint - point1.ypoint)) / 3,
        };

        const intermediatePoint4 = {
            xpoint: point2.xpoint,
            ypoint: point2.ypoint - (point2.ypoint - point1.ypoint) / 6,
        };

        return [point1, intermediatePoint1, intermediatePoint2, intermediatePoint3, intermediatePoint4, point2];
    }


    public plot(): any[] {

        let used_integrations: any[] = [];

        this.integrations.forEach(integration => {
            // get respective data from host_seqids
            const cur_host_seqid = this.host_seqids[integration[0]];
            // skip if undefined
            if (cur_host_seqid === undefined) {
                return;
            }

            // skip if undefined
            if (this.path_seqids === undefined) {
                return;
            }

            // map coordinate
            const host_x = cur_host_seqid["x"] + (integration[2] / cur_host_seqid.length) * cur_host_seqid["width"];
            const path_x = this.path_seqids["x"] + (integration[3] / this.path_seqids.length) * this.path_seqids["width"];
            const points = this.splitDistance({ xpoint: host_x, ypoint: 0 },
                { xpoint: path_x, ypoint: this.dimensions["height"] });

            // Draw a dotted vertical line on the pathogen genome to identify the chimeric junction across all transcripts
            const lineGenerator = d3.line<{ xpoint: number; ypoint: number }>()
                .x((p) => p.xpoint)
                .y((p) => p.ypoint)
                .curve(d3.curveBasis);


            const connection = this.svg.append('path')
                .datum(points)
                .attr('d', lineGenerator)
                .attr('fill', 'none')
                .style('opacity', integration[4] / 500)
                .style('stroke', integration[5]) // Adjust line color for gene labels
                .style('stroke-width', 2);

            this.connections.push(connection);
            used_integrations.push(integration);

        });
        return used_integrations;
    }
}

class PathogenPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions = {
        "font_size": 0,
        "width": 0,
        "height": 0,
        "genome_height": 0,
        "transcript_height": 0
    };
    private gtf_data: any = {};

    private genome_plot: any | null = null;
    private transcript_plots: Record<string, TranscriptPlot> = {};
    private genome_length: number = 0;

    private da_plot_height;
    private integrations_height;
    private da_plot_y;
    private orf_plot_height;


    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
        dimensions: {
            "font_size": number,
            "width": number,
            "height": number,
            "genome_height": number,
            "transcript_height": number
        },
        gtf_data: any) {
        this.svg = svg;
        this.dimensions = dimensions;
        this.gtf_data = gtf_data;
        this.genome_length = 0;

        this.orf_plot_height = this.dimensions["genome_height"] * 0.45;
        this.da_plot_y = this.dimensions["genome_height"] * 0.55;
        this.integrations_height = this.dimensions["genome_height"] * 0.55;
        this.da_plot_height = this.dimensions["genome_height"] * 0.55;
    }

    public get_length(): number {
        return this.genome_length;
    }

    public plot(): void {
        this.makeGenomePlot();
    }

    public plot_integrations(used_integrations: any[]): void {
        /*
        plot components for the interactions
        */

        // plot dotted vertical line to signify integration event
        used_integrations.forEach(integration => {
            const path_x = (integration[3] / this.genome_length) * this.dimensions["width"];
            const verticalLine = this.svg.append('line')
                .attr('x1', path_x)
                .attr('y1', 0)
                .attr('x2', path_x)
                .attr('y2', this.integrations_height)
                .style('stroke', integration[5])
                .style('opacity', integration[4] / 500)
                .style('stroke-width', 1)
                .style('stroke-dasharray', '5,5');
        });
    }

    private makeGenomePlot(): void {
        this.genome_length = this.gtf_data["genome_end"]

        // plot genome with LTRs and donor and acceptors
        this.genome_plot = this.svg
            .append('rect')
            .attr('x', 0)
            .attr('y', this.da_plot_y)
            .attr('width', this.dimensions["width"])
            .attr('height', this.da_plot_height / 4)
            .attr('rx', this.da_plot_height / 16)
            .attr('ry', this.da_plot_height / 16)
            .style('fill', '#dddddd');

        // process donor labels
        const char_width = this.dimensions["font_size"] / 2;
        const raw_da_positions: Interval[] = [];
        const spread_da_positions: Interval[] = [];
        this.gtf_data["genome_components"].forEach(component => {
            if (component["type"] !== "da") {
                return;
            }
            const percent_position = (component["position"] / this.genome_length) * this.dimensions["width"];
            const label_width = component["name"].length * char_width;
            const interval_start = percent_position - label_width / 2;
            const interval_end = percent_position + label_width / 2;
            raw_da_positions.push([interval_start, interval_end]);
            spread_da_positions.push([interval_start, interval_end]);

        });

        const separator = 20;
        adjustIntervals(spread_da_positions, separator);

        // iterate over genome components and plot them accordingly
        let da_i = 0;
        for (const component of this.gtf_data["genome_components"]) {
            if (component["type"] === "ltr") {
                this.svg.append('rect')
                    .attr('x', (component["position"][0] / this.genome_length) * this.dimensions["width"])
                    .attr('y', this.da_plot_height)
                    .attr('width', ((component["position"][1] - component["position"][0]) / this.genome_length) * this.dimensions["width"])
                    .attr('height', this.da_plot_height / 4)
                    .attr('rx', this.da_plot_height / 16)
                    .attr('ry', this.da_plot_height / 16)
                    .style('fill', '#3652AD');
                // add text label to the middle of the rectangle
                this.svg.append('text')
                    .attr('x', (component["position"][0] / this.genome_length) * this.dimensions["width"] + (((component["position"][1] - component["position"][0]) / this.genome_length) * this.dimensions["width"]) / 2)
                    .attr('y', (this.da_plot_height) + (this.da_plot_height / 5))
                    .attr('text-anchor', 'middle')
                    .style('fill', 'white')
                    .style('font-size', this.dimensions["font_size"] + "px")
                    .text(component["name"]);
            }
            let da_x = 0;
            let raw_da_x = 0;
            let da_color = "#red";
            let ys = [0, 0, 0, 0];
            if (component["type"] === "da") {
                const da_position = spread_da_positions[da_i];
                da_x = computeMidpoint(da_position[0], da_position[1]);
                raw_da_x = computeMidpoint(raw_da_positions[da_i][0], raw_da_positions[da_i][1]);
                const da_y = this.dimensions["genome_height"];
                da_color = component["name"][1] === "A" ? "#ff0000" : "#000000";
                this.svg.append('text')
                    .attr('x', da_x)
                    .attr('y', da_y)
                    .attr('text-anchor', 'middle')
                    .style('fill', 'black')
                    .style('font-size', this.dimensions["font_size"] + "px")
                    .text(component["name"]);
                da_i += 1;

                const line_segment_xshift = ((da_y - this.da_plot_height) / 3);
                ys = [da_y - this.dimensions["font_size"],
                da_y - line_segment_xshift,
                da_y - (line_segment_xshift * 2),
                da_y - (line_segment_xshift * 3)];
            }

            // Draw a line connecting the gene label to the rectangle
            this.svg
                .append('line')
                .attr('x1', da_x)
                .attr('y1', ys[0])
                .attr('x2', da_x)
                .attr('y2', ys[1]) // Adjust y-position as needed for the line
                .style('stroke', da_color) // Adjust line color for gene labels
                .style('stroke-width', 1);

            this.svg
                .append('line')
                .attr('x1', da_x)
                .attr('y1', ys[1])
                .attr('x2', raw_da_x)
                .attr('y2', ys[2]) // Adjust y-position as needed for the line
                .style('stroke', da_color) // Adjust line color for gene labels
                .style('stroke-width', 1);

            this.svg
                .append('line')
                .attr('x1', raw_da_x)
                .attr('y1', ys[2])
                .attr('x2', raw_da_x)
                .attr('y2', ys[3]) // Adjust y-position as needed for the line
                .style('stroke', da_color) // Adjust line color for gene labels
                .style('stroke-width', 1);
        }


        // process ORFs to plot them independently
        const unique_orfs = new Set();
        const orfs = [];
        // get unique cds across all transcripts
        for (const tid in this.gtf_data["transcripts"]) {
            const transcript = this.gtf_data["transcripts"][tid];
            if (transcript["cds"].length === 0) {
                continue;
            }
            const cds_string = transcript["cds"].toString();
            if (!(unique_orfs.has(cds_string))) {
                unique_orfs.add(cds_string);
                orfs.push({ "orf": transcript["cds"], "gene_name": transcript["gene_name"], "y": 0 });
            }
        }

        // sort orfs
        orfs.sort((a, b) => {
            const a_start = a["orf"][0][0];
            const b_start = b["orf"][0][0];
            return a_start - b_start;
        });

        // compute the number of layers needed to plot all ORFs
        let rows: number[] = []; // keeps the last occupied position in each row
        for (const orf of orfs) {
            let found_row = false;
            let row_i = 0;
            for (const row of rows) {
                if (orf["orf"][0][0] > row) {
                    found_row = true;
                    rows[row_i] = orf["orf"].at(-1)[1];
                    orf["y"] = row_i;
                    break;
                }
                row_i += 1;
            }
            if (!found_row) {
                rows.push(orf["orf"].at(-1)[1]);
                orf["y"] = rows.length - 1;
            }
        }

        const orf_height = (this.orf_plot_height / rows.length) * 0.8;
        const offset = this.orf_plot_height / rows.length;

        // plot ORFs as rectangles
        let o_i = 0;
        for (const orf of orfs) {
            let c_i = 0;
            for (const cds of orf["orf"]) {
                const cds_start = (cds[0] / this.genome_length) * this.dimensions["width"];
                const cds_end = (cds[1] / this.genome_length) * this.dimensions["width"];
                const orfSvg = this.svg.append('g'); // Create a group element

                const orf_y = orf["y"] * offset;

                // Draw the rectangle part
                let cur_seg = orfSvg.append('rect')
                    .attr('x', cds_start)
                    .attr('y', orf_y)
                    .attr('height', orf_height)
                    .style('fill', '#FE7A36');

                if (c_i === orf["orf"].length - 1) {
                    cur_seg.attr('width', (cds_end - cds_start) - 10)
                    // Draw the triangle part
                    const trianglePoints = `${cds_end - 10},${orf_y + orf_height} ${cds_end - 10},${orf_y} ${cds_end},${orf_y + orf_height / 2}`;
                    orfSvg.append('polygon')
                        .attr('points', trianglePoints)
                        .style('fill', '#FE7A36');
                }
                else {
                    // Draw the rectangle part
                    cur_seg.attr('width', (cds_end - cds_start))
                }

                if (c_i > 0) {
                    const prev_cds_end = (orf["orf"][c_i - 1][1] / this.genome_length) * this.dimensions["width"];
                    orfSvg.append('line')
                        .attr('x1', prev_cds_end)
                        .attr('y1', orf_y + orf_height / 2) // Adjust y position as needed
                        .attr('x2', cds_start)
                        .attr('y2', orf_y + orf_height / 2) // Adjust y position as needed
                        .style('stroke', '#280274') // Adjust line color for gene labels
                        .style('stroke-width', 1);
                }

                c_i += 1;
            }
            // put the gene label in the center of the orf
            const orf_midpoint = (orf["orf"][0][0] + orf["orf"].at(-1)[1]) / 2;
            const orf_label_x = (orf_midpoint / this.genome_length) * this.dimensions["width"];
            this.svg.append('text')
                .attr('x', orf_label_x)
                .attr('y', orf["y"] * offset + orf_height / 2) // Adjust y position to center of rectangle
                .attr('text-anchor', 'middle')
                .style('fill', 'black')
                .style('font-size', this.dimensions["font_size"] + "px")
                .text(orf["gene_name"]);
            o_i += 1;
        }
    }
}

// Sets up a panel for all transcripts to be displayed
class TranscriptPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    dimensions = {
        "font_size": 0,
        "width": 0,
        "height": 0
    };
    private genome_length: number;
    private tid: string;
    private transcript: { "exons": [number, number], "cds": [number, number] } = { "exons": [0, 0], "cds": [0, 0] };
    private exon_svgs: any;
    private cds_svgs: any;
    private intron_svgs: any;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
        dimensions: {
            "font_size": number,
            "width": number,
            "height": number
        },
        genome_length: number,
        tid: string,
        transcript: { "exons": [number, number], "cds": [number, number] }) {
        this.svg = svg;
        this.dimensions = dimensions;
        this.genome_length = genome_length;
        this.tid = tid;
        this.transcript = transcript;
        this.exon_svgs = [];
        this.cds_svgs = [];
        this.intron_svgs = [];
    }

    public plot(): void {
        let e_i = 0;
        this.transcript["exons"].forEach(exon => {
            const exon_start = (exon[0] / this.genome_length) * this.dimensions["width"];
            const exon_end = (exon[1] / this.genome_length) * this.dimensions["width"];
            const exonSvg = this.svg
                .append('rect')
                .attr('x', exon_start)
                .attr('y', this.dimensions["height"] * ((1 - 0.5) / 2))
                .attr('width', (exon_end - exon_start))
                .attr('height', this.dimensions["height"] * 0.5)
                .style('fill', '#3652AD');
            this.exon_svgs.push(exonSvg);

            // Draw introns
            if (e_i > 0) {
                const prev_exon_end = (this.transcript["exons"][e_i - 1][1] / this.genome_length) * this.dimensions["width"];
                const intronSvg = this.svg.append('line')
                    .attr('x1', prev_exon_end)
                    .attr('y1', this.dimensions["height"] / 2) // Adjust y position as needed
                    .attr('x2', exon_start)
                    .attr('y2', this.dimensions["height"] / 2) // Adjust y position as needed
                    .style('stroke', '#280274') // Adjust line color for gene labels
                    .style('stroke-width', 1);
                this.intron_svgs.push(intronSvg);
            }
            e_i += 1; // increment index
        });

        // plot CDS
        this.transcript["cds"].forEach(cds => {
            // scale exon to the dimensions of the plot
            const cds_start = (cds[0] / this.genome_length) * this.dimensions["width"];
            const cds_end = (cds[1] / this.genome_length) * this.dimensions["width"];
            const cdsSvg = this.svg
                .append('rect')
                .attr('x', cds_start)
                .attr('y', this.dimensions["height"] * ((1 - 0.75) / 2))
                .attr('width', (cds_end - cds_start))
                .attr('height', this.dimensions["height"] * 0.75)
                .style('fill', '#FE7A36');
            this.cds_svgs.push(cdsSvg);
        });
    }
}











































// Additional classes (HostPlot, ConnectionsPlot, PathogenPlot) can be implemented similarly.
class HostPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private densities: Record<string, number[]> = {};
    private fai: Record<string, number> = {};
    private genes: Record<string, [string, number][]> = {};
    private geneCount: number = 0; // gene count threshold. Only labels above threshold will be displayed as names - oterwise simple markers

    private dimensions = {
        "font_size": 0,
        "width": 0,
        "height": 0,
        "gene_label_height": 0,
        "gene_lines_height": 0,
        "idiogram_height": 0
    };

    private seqids: Record<string, {
        plot: IdiogramPlot,
        x: number,
        y: number,
        width: number,
        height: number
    }[]>;

    private spacer = 0.5; // percent of the total plot that is reserved for spacing between chromosomes

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
        dimensions: {
            "width": number,
            "height": number,
            "font_size": number,
            "gene_label_height": number,
            "gene_lines_height": number,
            "idiogram_height": number
        },
        densities: Record<string, number[]>,
        fai: Record<string, number>,
        genes: Record<string, [string, number][]>,
        geneCount: number) {
        this.svg = svg;
        this.densities = densities;
        this.fai = fai;
        this.genes = genes;
        this.geneCount = geneCount;
        this.dimensions = dimensions;

        this.seqids = {};
    }

    public get_seqids(): Record<string, any> {
        const res: Record<string, any> = {};
        Object.entries(this.seqids).forEach(([key, value]) => {
            res[key] = {
                width: value["width"],
                height: value["height"],
                x: value["x"],
                y: value["y"],
                length: this.fai[key]
            };
        });
        return res;
    }

    public plot(): void {
        const totalValues = Object.values(this.densities).reduce((acc, arr) => acc + arr.length, 0);
        let x_pos = 0;

        Object.entries(this.densities).forEach(([key, values]) => {
            const idiogramWidth_percent = (values.length / totalValues) * 100 - this.spacer;
            const idiogramWidth = idiogramWidth_percent * (this.dimensions["width"] / 100);

            let sub_dimensions = JSON.parse(JSON.stringify(this.dimensions));
            sub_dimensions["width"] = idiogramWidth;
            const idiogramSvg = this.svg.append('svg')
                .attr('x', x_pos)
                .attr('y', 0)
                .attr('width', idiogramWidth)
                .attr('height', this.dimensions["height"]);
            this.seqids[key] = {
                "plot": new IdiogramPlot(idiogramSvg,
                    sub_dimensions,
                    key,
                    this.fai[key],
                    values,
                    this.genes[key],
                    this.geneCount),
                "x": x_pos,
                "y": 0,
                "width": idiogramWidth,
                "height": this.dimensions["height"]
            };

            this.seqids[key]["plot"].plot();

            x_pos += idiogramWidth + this.spacer * (this.dimensions["width"] / 100);
        });
    }
}

// plots a single idiogram in the allotted space and adds appropriate labels
class IdiogramPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions = {
        "font_size": 0,
        "width": 0,
        "height": 0,
        "gene_label_height": 0,
        "gene_lines_height": 0,
        "idiogram_height": 0
    };
    private colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, 1]);

    private seqid: string;
    private length: number;

    private densities: number[] = [];
    private genes: [string, number][] = [];
    private geneCount: number = 0; // gene count threshold. Only labels above threshold will be displayed as names - oterwise simple markers

    private y_section: { // precomputed y-coordinates of the sections
        y_gene_labels: number,
        y_gene_lines: number,
        y_heatmap: number,
        y_seqid_label: number,
    }

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
        dimensions: {
            "width": number,
            "height": number,
            "font_size": number,
            "gene_label_height": number,
            "gene_lines_height": number,
            "idiogram_height": number,
        },
        seqid: string,
        length: number,
        densities: number[],
        genes: [string, number][],
        geneCount: number) {
        this.svg = svg;
        this.dimensions = dimensions;

        this.seqid = seqid;
        this.length = length;

        this.densities = densities;
        this.genes = genes;
        this.geneCount = geneCount;

        this.y_section = {
            y_gene_labels: 0,
            y_gene_lines: this.dimensions["gene_label_height"],
            y_heatmap: this.dimensions["gene_label_height"] + this.dimensions["gene_lines_height"],
            y_seqid_label: this.dimensions["gene_label_height"] + this.dimensions["gene_lines_height"] + this.dimensions["idiogram_height"]
        }
    }

    public plot(): void {
        this.makeIdiogram();
        this.plotLabels();
    }

    private makeIdiogram(): void {

        // Create a gradient for the heatmap
        const gradient = this.svg
            .append('defs')
            .append('linearGradient')
            .attr('id', `heatmap-gradient-${this.seqid}`)
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');

        this.densities.forEach((density, index) => {
            gradient
                .append('stop')
                .attr('offset', `${(index / (this.densities.length - 1)) * 100}%`)
                .style('stop-color', this.colorScale(density))
                .style('stop-opacity', 1);
        });

        // Draw rectangle with heatmap fill
        this.svg
            .append('rect')
            .attr('x', 0 + '%')
            .attr('y', this.y_section.y_heatmap)
            .attr('width', this.dimensions["width"])
            .attr('height', this.dimensions["idiogram_height"])
            .attr('rx', this.dimensions["idiogram_height"] / 2)
            .attr('ry', this.dimensions["idiogram_height"] / 2)
            .style('fill', `url(#heatmap-gradient-${this.seqid})`); // Use the heatmap gradient

        // Add label text underneath the rectangle
        this.svg
            .append('text')
            .attr('x', this.dimensions["width"] / 2)
            .attr('y', this.y_section.y_heatmap + this.dimensions["idiogram_height"] / 2 + this.dimensions["font_size"] / 3)
            .attr('text-anchor', 'middle')
            .style('fill', '#ffffff')
            .style('font-size', this.dimensions["font_size"] + "px")
            .text(this.seqid);
    }

    private plotLabels(): void {
        const char_width = this.dimensions["font_size"];

        const marker_intergenic_y = this.y_section.y_gene_labels + ((this.y_section.y_gene_labels + this.y_section.y_heatmap) * 0.99);
        const marker_intergenic_high_y = this.y_section.y_gene_labels + ((this.y_section.y_gene_labels + this.y_section.y_heatmap) * 0.95);
        const marker_genic_y = this.y_section.y_gene_labels + ((this.y_section.y_gene_labels + this.y_section.y_heatmap) * 0.9);

        // Check if there are gene labels for the current rectangle
        if (this.genes) {
            // extract raw label positions
            const spread_label_positions: Interval[] = [];
            this.genes.forEach(gene => {
                if ((gene["name"] === "-") || (gene["count"] < this.geneCount)) {
                    return;
                }
                const percent_position = (gene["position"][1] / this.length) * this.dimensions["width"];
                const interval_start = percent_position - char_width / 2;
                const interval_end = percent_position + char_width / 2;
                spread_label_positions.push([interval_start, interval_end]);
            });

            const separator = 10;
            adjustIntervals(spread_label_positions, separator);

            let gene_index = 0;
            this.genes.forEach(gene => {
                const gene_label_xpos = (gene["position"][1] / this.length) * this.dimensions["width"];
                if (gene["name"] === "-") {
                    // if above threshold - make red star, otherwise green circle
                    if (gene["count"] > this.geneCount) {
                        // mark intergenic below threshold with a green circle
                        this.svg.append("path")
                            .attr("d", d3.symbol(d3.symbolStar, this.dimensions["font_size"] * 4))
                            .attr("transform", `translate(${gene_label_xpos},${marker_intergenic_high_y})`)
                            .attr("fill", "red");
                    }
                    else {
                        // mark intergenic with a blue square
                        this.svg.append("path")
                            .attr("d", d3.symbol(d3.symbolDiamond, this.dimensions["font_size"] * 2))
                            .attr("transform", `translate(${gene_label_xpos},${marker_intergenic_y})`)
                            .attr("fill", "black");
                    }

                    return;
                }
                if (gene["count"] < this.geneCount) {
                    // mark genic below threshold with a green circle
                    this.svg.append("path")
                        .attr("d", d3.symbol(d3.symbolCross, this.dimensions["font_size"] * 2))
                        .attr("transform", `translate(${gene_label_xpos},${marker_genic_y})`)
                        .attr("fill", "green");
                    return;
                }
                // Ensure that genePosition is a valid number
                if (!isNaN(gene["position"][1])) {
                    // Calculate the x-position of the gene label relative to the current rectangle
                    const gene_label_adjusted_xpos = (spread_label_positions[gene_index][1] + spread_label_positions[gene_index][0]) / 2;

                    // Add gene label text on the rectangle
                    this.svg
                        .append('text')
                        .attr('x', `${gene_label_adjusted_xpos}%`)
                        .attr('y', this.y_section.y_gene_labels + this.y_section.y_gene_lines) // Adjust y-position as needed for the gene label
                        .attr('text-anchor', 'end') // Center the text
                        .style('fill', '#ff0000') // Adjust text color for gene labels
                        .attr('transform', `rotate(90 ${gene_label_adjusted_xpos * (this.dimensions["width"] / 100)},${this.y_section.y_gene_labels + this.y_section.y_gene_lines})`) // Rotate text 90 degrees
                        .style('font-size', this.dimensions["font_size"] + "px") // Adjust font size
                        .text(gene["name"]);

                    // Draw a line connecting the gene label to the rectangle
                    const line_segment_xshift = ((this.y_section.y_heatmap - this.y_section.y_gene_lines) / 3)
                    this.svg
                        .append('line')
                        .attr('x1', gene_label_adjusted_xpos + '%')
                        .attr('y1', this.y_section.y_gene_lines)
                        .attr('x2', gene_label_adjusted_xpos + '%')
                        .attr('y2', this.y_section.y_gene_lines + line_segment_xshift) // Adjust y-position as needed for the line
                        .style('stroke', '#ff0000') // Adjust line color for gene labels
                        .style('stroke-width', 1);

                    this.svg
                        .append('line')
                        .attr('x1', gene_label_adjusted_xpos + '%')
                        .attr('y1', this.y_section.y_gene_lines + line_segment_xshift)
                        .attr('x2', gene_label_xpos)
                        .attr('y2', this.y_section.y_gene_lines + line_segment_xshift * 2) // Adjust y-position as needed for the line
                        .style('stroke', '#ff0000') // Adjust line color for gene labels
                        .style('stroke-width', 1);

                    this.svg
                        .append('line')
                        .attr('x1', gene_label_xpos)
                        .attr('y1', this.y_section.y_gene_lines + line_segment_xshift * 2)
                        .attr('x2', gene_label_xpos)
                        .attr('y2', this.y_section.y_heatmap + this.dimensions.idiogram_height) // Adjust y-position as needed for the line
                        .style('stroke', '#ff0000') // Adjust line color for gene labels
                        .style('stroke-width', 1);
                }
                gene_index += 1;
            });
        }

    }
}

// builds a legend for the plot
class Legend {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions = {
        "font_size": 0,
        "width": 0,
        "height": 0
    };

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
        dimensions: {
            "font_size": number,
            "width": number,
            "height": number
        }) {
        this.svg = svg;
        this.dimensions = dimensions;
    }

    public plot() {
        const legend_font_size = this.dimensions["font_size"] * 1.5;
        const spacer = this.dimensions["font_size"] * 2;
        const legend_markers_x = this.dimensions["width"] * 0.05;
        const legend_text_x = this.dimensions["width"] * 0.2;
        const heatmap_hight = this.dimensions["height"] * 0.1;
        const heatmap_y = this.dimensions["height"] * 0.05;
        const marker_height = this.dimensions["font_size"] * 2;
        const marker1_y = heatmap_y + heatmap_hight + spacer;
        const marker2_y = marker1_y + marker_height + spacer;
        const marker3_y = marker2_y + marker_height + spacer;
        const orf_height = this.dimensions["font_size"] * 2;
        const orf_y = marker3_y + marker_height + spacer;


        const legendBox = this.svg.append('rect')
            .attr('class', 'legend-box')
            .attr('x', 0) // Adjust the x-position as needed
            .attr('y', 0) // Adjust the y-position as needed
            .attr('width', this.dimensions.width)
            .attr('height', this.dimensions.height)
            .attr('rx', 10) // Set the x-axis radius for rounded corners
            .attr('ry', 10) // Set the y-axis radius for rounded corners
            .style("stroke", "rgba(0,0,0,0.5)")
            .attr("fill", "rgba(0,0,0,0.05)"); // Adjust the border color and width as needed

        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(' + (legend_markers_x) + ',' + heatmap_y + ')'); // Adjust the position as needed

        // color scale for the idiogram
        const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, 1]);
        legend.selectAll("legend")
            .data(d3.range(0, 1.1, 0.1))
            .enter()
            .append('rect')
            .attr('x', 0)
            .attr('y', function (d) { return d * heatmap_hight; })
            .attr('width', 20)
            .attr('height', heatmap_hight / 10)
            .attr("fill", function (d) { return colorScale(d); });

        // markers
        legend.append("path")
            .attr("d", d3.symbol(d3.symbolCross, marker_height * 4))
            .attr("transform", `translate(${marker_height / 2},${marker1_y})`)
            .attr("fill", "green");

        legend.append("path")
            .attr("d", d3.symbol(d3.symbolDiamond, marker_height * 4))
            .attr("transform", `translate(${marker_height / 2},${marker2_y})`)
            .attr("fill", "black");

        legend.append("path")
            .attr("d", d3.symbol(d3.symbolStar, marker_height * 4))
            .attr("transform", `translate(${marker_height / 2},${marker3_y})`)
            .attr("fill", "red");

        // ORF
        legend.append('rect')
            .attr('x', 0)
            .attr('y', orf_y)
            .attr('height', orf_height)
            .attr('width', orf_height - 10)
            .style('fill', '#FE7A36');

        const trianglePoints = `${orf_height - 10},${orf_y + orf_height} ${orf_height - 10},${orf_y} ${orf_height},${orf_y + orf_height / 2}`;
        legend.append('polygon')
            .attr('points', trianglePoints)
            .style('fill', '#FE7A36');

        // Add text to the labels
        legend.append('text')
            .attr('x', legend_text_x)
            .attr('y', (heatmap_y + heatmap_hight) / 2)
            .attr('text-anchor', 'start')
            .style('fill', 'black')
            .style('font-size', legend_font_size + "px")
            .text('Gene Density');

        legend.append('text')
            .attr('x', legend_text_x)
            .attr('y', marker1_y + marker_height / 4)
            .attr('text-anchor', 'start')
            .style('fill', 'black')
            .style('font-size', legend_font_size + "px")
            .text('Genic');

        legend.append('text')
            .attr('x', legend_text_x)
            .attr('y', marker2_y + marker_height / 4)
            .attr('text-anchor', 'start')
            .style('fill', 'black')
            .style('font-size', legend_font_size + "px")
            .text('Intergenic');

        const labelText = 'Intergenic\nHigh Count';

        // Split the text into lines based on the newline character '\n'
        const lines = labelText.split('\n');

        // Append a text element for each line
        legend
            .append('text')
            .attr('x', legend_text_x)
            .attr('y', marker3_y + marker_height / 4)
            .attr('text-anchor', 'start')
            .style('fill', 'black')
            .style('font-size', legend_font_size + "px")
            .selectAll('tspan')
            .data(lines)
            .enter()
            .append('tspan')
            .attr('x', legend_text_x)
            .attr('dy', (d, i) => i * 1.2 + 'em') // Adjust the line height
            .text(d => d);

        legend.append('text')
            .attr('x', legend_text_x)
            .attr('y', orf_y + orf_height / 2)
            .attr('text-anchor', 'start')
            .style('fill', 'black')
            .style('font-size', legend_font_size + "px")
            .text('ORF');
    }
}