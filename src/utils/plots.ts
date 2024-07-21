import * as d3 from "d3";

import * as utils from "./utils";

export interface GridConfig {
    columns: number;
    columnRatios: number[];
    rowRatiosPerColumn: number[][];
    padding: Padding;
}

export interface Padding {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export class D3Grid {
    private height: number;
    private width: number;
    private gridConfig: GridConfig;
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private cellDimensions: { width: number, height: number }[][];
    private cellCoordinates: { x: number, y: number }[][];
    private cellData: any[][]; // holds any data associated with each cell
    private cellSvgs: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>[][];

    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, 
        height: number, 
        width: number, 
        gridConfig: GridConfig
    ) {
        this.height = height;
        this.width = width;
        this.gridConfig = gridConfig;

        this.cellDimensions = [];
        this.cellCoordinates = [];
        this.cellData = [];
        this.cellSvgs = [];
        this.svg = svg
            .attr('width', this.width)
            .attr('height', this.height);

        // Setup grid
        this.setupGrid();
    }

    private setupGrid(): void {
        const totalColumnRatio = this.gridConfig.columnRatios.reduce((sum, ratio) => sum + ratio, 0);

        let xOffset = 0;
        this.gridConfig.columnRatios.forEach((colRatio, colIndex) => {
            const columnWidth = (colRatio / totalColumnRatio) * this.width;
            const totalRowRatio = this.gridConfig.rowRatiosPerColumn[colIndex].reduce((sum, ratio) => sum + ratio, 0);

            this.cellDimensions[colIndex] = [];
            this.cellCoordinates[colIndex] = [];
            this.cellData[colIndex] = [];
            this.cellSvgs[colIndex] = [];

            let yOffset = 0;
            this.gridConfig.rowRatiosPerColumn[colIndex].forEach((rowRatio, rowIndex) => {
                const rowHeight = (rowRatio / totalRowRatio) * this.height;

                const paddedWidth = columnWidth - this.gridConfig.padding.left - this.gridConfig.padding.right;
                const paddedHeight = rowHeight - this.gridConfig.padding.top - this.gridConfig.padding.bottom;

                this.cellDimensions[colIndex][rowIndex] = { width: paddedWidth, height: paddedHeight };
                this.cellCoordinates[colIndex][rowIndex] = { x: xOffset, y: yOffset };
                this.cellData[colIndex][rowIndex] = {};

                const new_svg = this.svg.append('svg')
                    .attr('x', xOffset)
                    .attr('y', yOffset)
                    .attr('width', columnWidth)
                    .attr('height', rowHeight)
                    .attr('viewBox', `${-this.gridConfig.padding.left} ${-this.gridConfig.padding.top} ${columnWidth} ${rowHeight}`);
                this.cellSvgs[colIndex][rowIndex] = new_svg;

                yOffset += rowHeight;
            });

            xOffset += columnWidth;
        });
    }

    public getCellData(colIndex: number, rowIndex: number): any {
        return this.cellData[colIndex]?.[rowIndex];
    }

    public setCellData(colIndex: number, rowIndex: number, data: any): void {
        this.cellData[colIndex][rowIndex] = data;
    }

    public getSvg(): d3.Selection<SVGSVGElement, unknown, HTMLElement, any> {
        return this.svg;
    }

    public getCellDimensions(colIndex: number, rowIndex: number): { width: number, height: number } | undefined {
        return this.cellDimensions[colIndex]?.[rowIndex];
    }

    public getCellCoordinates(colIndex: number, rowIndex: number): { x: number, y: number } | undefined {
        const coordinates = this.cellCoordinates[colIndex]?.[rowIndex];
        if (coordinates) {
            return {
                x: coordinates.x + this.gridConfig.padding.left,
                y: coordinates.y + this.gridConfig.padding.top
            };
        }
        return undefined;
    }

    public getCellSvg(colIndex: number, rowIndex: number): d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | undefined {
        return this.cellSvgs[colIndex]?.[rowIndex];
    }
}


export class ConnectionsPlot {
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
                .style('stroke', "grey") // Adjust line color for gene labels
                .style('stroke-width', 2);

            this.connections.push(connection);
            used_integrations.push(integration);

        });
        return used_integrations;
    }
}

export class DonorAcceptorPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions: any;
    private genome_length: number;
    private gtf_data: any;
    private direction: string;
    private spread: number;

    private spread_xs: Interval[] = [];
    private raw_xs: Interval[] = [];

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, dimensions: any, genome_length: number, gtf_data: any, spread: number, direction: string = 'bottom-up') {
        this.svg = svg;
        this.dimensions = dimensions;
        this.genome_length = genome_length;
        this.gtf_data = gtf_data;
        this.direction = direction;
        this.spread = spread;

        // construct x transformation
        const char_width = this.dimensions["font_size"] / 1.25;

        this.gtf_data["genome_components"].forEach(component => {
            if (component["type"] !== "da") {
                return;
            }
            const percent_position = (component["position"] / this.genome_length) * this.dimensions["width"];
            const label_width = component["name"].length * char_width;
            const interval_start = percent_position - label_width / 2;
            const interval_end = percent_position + label_width / 2;
            this.raw_xs.push([interval_start, interval_end]);
            this.spread_xs.push([interval_start, interval_end]);
        });

        utils.adjustIntervals(this.spread_xs, 1, this.width, this.spread);
    }

    public get_xs(): any {
        return { "raw_xs": this.raw_xs, "spread_xs": this.spread_xs };
    }

    public plot(): void {
        let da_i = 0;
        for (const component of this.gtf_data["genome_components"]) {
            if (component["type"] === "da") {
                const da_position = this.spread_xs[da_i];
                const da_x = utils.computeMidpoint(da_position[0], da_position[1]);
                const raw_da_x = utils.computeMidpoint(this.raw_xs[da_i][0], this.raw_xs[da_i][1]);
                const da_color = component["name"][1] === "A" ? "#ff0000" : "#000000";

                const da_label_y = this.direction === 'bottom-up'
                    ? this.dimensions["y"] + this.dimensions["height"] - this.dimensions["font_size"]
                    : this.dimensions["y"] + this.dimensions["font_size"];
                this.svg.append('text')
                    .attr('x', da_x)
                    .attr('y', da_label_y)
                    .attr('text-anchor', 'middle')
                    .style('fill', 'black')
                    .style('font-size', this.dimensions["font_size"] + "px")
                    .text(component["name"]);

                da_i += 1;

                const line_segment_xshift = (this.dimensions["height"] - this.dimensions["font_size"] * 2) / 3;
                const ys = this.direction === 'bottom-up'
                    ? [
                        this.dimensions["y"],
                        this.dimensions["y"] + line_segment_xshift,
                        this.dimensions["y"] + (line_segment_xshift * 2),
                        this.dimensions["y"] + (line_segment_xshift * 3)
                    ]
                    : [
                        this.dimensions["height"] - this.dimensions["y"],
                        this.dimensions["height"] - this.dimensions["y"] - line_segment_xshift,
                        this.dimensions["height"] - this.dimensions["y"] - (line_segment_xshift * 2),
                        this.dimensions["height"] - this.dimensions["y"] - (line_segment_xshift * 3)
                    ];

                const xs = [raw_da_x,
                    raw_da_x,
                    da_x,
                    da_x];

                this.svg.append('line')
                    .attr('x1', xs[0])
                    .attr('y1', ys[0])
                    .attr('x2', xs[1])
                    .attr('y2', ys[1])
                    .style('stroke', da_color)
                    .style('stroke-width', 1);

                this.svg.append('line')
                    .attr('x1', xs[1])
                    .attr('y1', ys[1])
                    .attr('x2', xs[2])
                    .attr('y2', ys[2])
                    .style('stroke', da_color)
                    .style('stroke-width', 1);

                this.svg.append('line')
                    .attr('x1', xs[2])
                    .attr('y1', ys[2])
                    .attr('x2', xs[3])
                    .attr('y2', ys[3])
                    .style('stroke', da_color)
                    .style('stroke-width', 1);
            }
        }
    }
}

export class GenomePlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions: any;
    private genome_length: number;
    private gtf_data: any;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, dimensions: any, genome_length: number, gtf_data: any) {
        this.svg = svg;
        this.dimensions = dimensions;
        this.genome_length = genome_length;
        this.gtf_data = gtf_data;
    }

    public plot(): void {
        this.svg.append('rect')
            .attr('x', 0)
            .attr('y', this.dimensions["y"])
            .attr('width', this.dimensions["width"])
            .attr('height', this.dimensions["height"])
            .attr('rx', this.dimensions["height"] / 2)
            .attr('ry', this.dimensions["height"] / 2)
            .style('fill', '#dddddd');

        for (const component of this.gtf_data["genome_components"]) {
            if (component["type"] === "ltr") {
                this.svg.append('rect')
                    .attr('x', (component["position"][0] / this.genome_length) * this.dimensions["width"])
                    .attr('y', this.dimensions["y"])
                    .attr('width', ((component["position"][1] - component["position"][0]) / this.genome_length) * this.dimensions["width"])
                    .attr('height', this.dimensions["height"])
                    .attr('rx', this.dimensions["height"] / 2)
                    .attr('ry', this.dimensions["height"] / 2)
                    .style('fill', '#3652AD');
            }
        }
        for (const component of this.gtf_data["genome_components"]) {
            if (component["type"] === "ltr") {
                // add text label to the middle of the rectangle
                this.svg.append('text')
                    .attr('x', (component["position"][0] / this.genome_length) * this.dimensions["width"] + (((component["position"][1] - component["position"][0]) / this.genome_length) * this.dimensions["width"]) / 2)
                    .attr('y', (this.dimensions["y"]) + (this.dimensions["height"] / 1.25))
                    .attr('text-anchor', 'middle')
                    .style('fill', 'white')
                    .style('font-size', this.dimensions["font_size"] + "px")
                    .text(component["name"]);
            }
        }
    }
}

export class ORFPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions: any;
    private genome_length: number;
    private gtf_data: any;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, dimensions: any, genome_length: number, gtf_data: any) {
        this.svg = svg;
        this.dimensions = dimensions;
        this.genome_length = genome_length;
        this.gtf_data = gtf_data;
    }

    public plot(): void {
        const unique_orfs = new Set();
        const orfs = [];

        for (const tid in this.gtf_data["transcripts"]) {
            const transcript = this.gtf_data["transcripts"][tid];
            if (transcript["cds"].length === 0) {
                continue;
            }
            const cds_string = transcript["cds"].toString();
            if (!unique_orfs.has(cds_string)) {
                unique_orfs.add(cds_string);
                orfs.push({ "orf": transcript["cds"], "gene_name": transcript["gene_name"], "y": 0 });
            }
        }

        orfs.sort((a, b) => a["orf"][0][0] - b["orf"][0][0]);

        let rows: number[] = [];
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

        const orf_height = (this.dimensions["height"] / rows.length) * 0.8;
        const offset = this.dimensions["height"] / rows.length;

        for (const orf of orfs) {
            for (let c_i = 0; c_i < orf["orf"].length; c_i++) {
                const cds = orf["orf"][c_i];
                const cds_start = (cds[0] / this.genome_length) * this.dimensions["width"];
                const cds_end = (cds[1] / this.genome_length) * this.dimensions["width"];
                const orf_y = this.dimensions["y"] + orf["y"] * offset;

                const orfSvg = this.svg.append('g');
                let cur_seg = orfSvg.append('rect')
                    .attr('x', cds_start)
                    .attr('y', orf_y)
                    .attr('height', orf_height)
                    .style('fill', '#FE7A36');

                if (c_i === orf["orf"].length - 1) {
                    cur_seg.attr('width', (cds_end - cds_start) - 10);
                    const trianglePoints = `${cds_end - 10},${orf_y + orf_height} ${cds_end - 10},${orf_y} ${cds_end},${orf_y + orf_height / 2}`;
                    orfSvg.append('polygon')
                        .attr('points', trianglePoints)
                        .style('fill', '#FE7A36');
                } else {
                    cur_seg.attr('width', (cds_end - cds_start));
                }

                if (c_i > 0) {
                    const prev_cds_end = (orf["orf"][c_i - 1][1] / this.genome_length) * this.dimensions["width"];
                    orfSvg.append('line')
                        .attr('x1', prev_cds_end)
                        .attr('y1', orf_y + orf_height / 2)
                        .attr('x2', cds_start)
                        .attr('y2', orf_y + orf_height / 2)
                        .style('stroke', '#280274')
                        .style('stroke-width', 1);
                }
            }

            const orf_midpoint = (orf["orf"][0][0] + orf["orf"].at(-1)[1]) / 2;
            const orf_label_x = (orf_midpoint / this.genome_length) * this.dimensions["width"];
            this.svg.append('text')
                .attr('x', orf_label_x)
                .attr('y', this.dimensions["y"] + orf["y"] * offset + orf_height / 2)
                .attr('text-anchor', 'middle')
                .style('fill', 'black')
                .style('font-size', this.dimensions["font_size"] + "px")
                .text(orf["gene_name"]);
        }
    }
}

export class PathogenPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions: any;
    private gtf_data: any;
    private genome_length: number = 0;

    private orf_plot_y: number = 0;
    private orf_plot_height: number = 0;
    private genome_plot_y: number = 0;
    private genome_plot_height: number = 0;
    private da_plot_y: number = 0;
    private da_plot_height: number = 0;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, dimensions: any, gtf_data: any) {
        this.svg = svg;
        this.dimensions = dimensions;
        this.gtf_data = gtf_data;

        this.orf_plot_height = this.dimensions["height"] * 0.45;
        this.orf_plot_y = this.dimensions["height"] - this.orf_plot_height;
        this.genome_plot_y = this.orf_plot_height - this.dimensions["font_size"];
        this.genome_plot_height = this.dimensions["height"] * 0.1;
        this.da_plot_y = 0;
        this.da_plot_height = this.genome_plot_y + this.genome_plot_height;
    }

    public get_length(): number {
        return this.genome_length;
    }

    public plot(): void {
        this.genome_length = this.gtf_data["genome_end"];

        const genome_dimensions = {
            "font_size": this.dimensions["font_size"],
            "width": this.dimensions["width"],
            "height": this.genome_plot_height,
            "y": this.genome_plot_y
        };
        const genomePlot = new GenomePlot(this.svg, genome_dimensions, this.genome_length, this.gtf_data);
        genomePlot.plot();

        const da_dimensions = {
            "font_size": this.dimensions["font_size"],
            "width": this.dimensions["width"],
            "height": this.da_plot_height,
            "y": this.da_plot_y
        };
        const donorAcceptorPlot = new DonorAcceptorPlot(this.svg, da_dimensions, this.genome_length, this.gtf_data, 200, "top-down");
        donorAcceptorPlot.plot();

        const orf_dimensions = {
            "font_size": this.dimensions["font_size"],
            "width": this.dimensions["width"],
            "height": this.orf_plot_height,
            "y": this.orf_plot_y
        };
        const orfPlot = new ORFPlot(this.svg, orf_dimensions, this.genome_length, this.gtf_data);
        orfPlot.plot();

        // next for each of the donor/acceptor sites - draw vertical lines across all transcripts
        Object.entries(this.gtf_data["genome_components"]).forEach(([tid, component]) => {
            if (component["type"] !== "da") {
                return;
            }
            const da_position = (component["position"] / this.genome_length) * this.dimensions["width"];
            const da_color = component["name"][1] === "A" ? "#ff0000" : "#000000";
            this.svg.append('line')
                .attr('x1', da_position)
                .attr('y1', genome_dimensions["y"])
                .attr('x2', da_position)
                .attr('y2', this.dimensions["height"])
                .style('stroke', da_color)
                .style('stroke-width', 1);
        });
    }

    public plot_integrations(used_integrations: any[]): void {
        used_integrations.forEach(integration => {
            const path_x = (integration[3] / this.genome_length) * this.dimensions["width"];
            this.svg.append('line')
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
}

export class GeneLabelPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions: any;
    private genes: any;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, dimensions: any, genes: any) {
        this.svg = svg;
        this.dimensions = dimensions;
        this.genes = genes;
    }

    private createCurlyBracePath(y0: number, y1: number): string {
        const braceWidth = this.dimensions["width"] / 4;
        const height = y1 - y0;
    
        // Scale the sample path to fit the desired height
        const scaledPath = `
            M 0,${y0}
            C ${braceWidth/2},${y0} 0,${y0 + height / 2} ${braceWidth},${y0 + height / 2}
            C 0,${y0 + height / 2} ${braceWidth/2},${y1} 0,${y1}
            
        `;
        
        return scaledPath;
    }

    public plot(): void {
        this.genes.forEach(gene => {
            const gene_y = gene["y"][0] + (gene["y"][1] - gene["y"][0]) / 2;
            this.svg.append('text')
                .attr('x', this.dimensions["width"] / 2)
                .attr('y', gene_y)
                .attr('text-anchor', 'middle')
                .style('fill', 'black')
                .style('font-size', this.dimensions["font_size"] + "px")
                .text(gene["name"]);
            // draw brace
            this.svg.append('path')
                .attr('d', this.createCurlyBracePath(gene["y"][0], gene["y"][1], gene_y))
                .attr('stroke', 'black')
                .attr('fill', 'none');
        });
    }
}

// builds a panel of all transcripts to be plotted
// builds a panel of all transcripts to be plotted
export class TranscriptomePlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions = {
        "font_size": 0,
        "width": 0,
        "height": 0,
    };
    private gtf_data: any = {};
    private genome_length: number = 0;
    private transcript_plots: Record<string, TranscriptPlot> = {};
    private transcript_height: number = 0;

    private genes: any = []; // gene groups mapping gene name to upper and lower y coordinates in the plot

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
        dimensions: {
            "font_size": number,
            "width": number,
            "height": number,
        },
        gtf_data: any) {
        this.svg = svg;
        this.dimensions = dimensions;
        this.gtf_data = gtf_data;
        this.genome_length = this.gtf_data["genome_end"];
        this.transcript_height = this.dimensions["height"] / Object.keys(this.gtf_data["transcripts"]).length;
        this.genes = [];
    }

    public plot(): [] {
        let y_pos = 0;
        Object.entries(this.gtf_data["genes"]).forEach(([gene_name, tids]) => {
            this.genes.push({ "name": gene_name, "y": [y_pos,y_pos + tids.length*this.transcript_height] });
            for (const tid of tids) {
                const transcript = this.gtf_data["transcripts"][tid];
                const transcriptSvg = this.svg.append('svg')
                    .attr('x', 0)
                    .attr('y', y_pos)
                    .attr('width', this.dimensions["width"])
                    .attr('height', this.transcript_height);

                this.transcript_plots[tid] = new TranscriptPlot(transcriptSvg,
                    {
                        "font_size": this.dimensions["font_size"],
                        "width": this.dimensions["width"],
                        "height": this.transcript_height,
                    },
                    this.genome_length,
                    tid,
                    transcript);
                this.transcript_plots[tid].plot();
                y_pos += this.transcript_height;
            }
        });

        // next for each of the donor/acceptor sites - draw vertical lines across all transcripts
        Object.entries(this.gtf_data["genome_components"]).forEach(([tid, component]) => {
            if (component["type"] !== "da") {
                return;
            }
            const da_position = (component["position"] / this.genome_length) * this.dimensions["width"];
            const da_color = component["name"][1] === "A" ? "#ff0000" : "#000000";
            this.svg.append('line')
                .attr('x1', da_position)
                .attr('y1', 0)
                .attr('x2', da_position)
                .attr('y2', this.dimensions["height"])
                .style('stroke', da_color)
                .style('stroke-width', 1);
        });
        return this.genes;
    }
}

// displays a single transcript
class TranscriptPlot {
    private svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
    private dimensions = {
        "font_size": 0,
        "width": 0,
        "height": 0
    };
    private genome_length: number;
    private tid: string;
    private transcript: { "exons": [number, number][], "cds": [number, number][] } = { "exons": [[0, 0]], "cds": [[0, 0]] };
    private exon_svgs: any;
    private cds_svgs: any;
    private intron_svgs: any;

    constructor(svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
        dimensions: {
            "font_size": number,
            "width": number,
            "height": number
        },
        genome_length: number,
        tid: string,
        transcript: { "exons": [number, number][], "cds": [number, number][] }) {
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



export class HostPlot {
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
export class IdiogramPlot {
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
            utils.adjustIntervals(spread_label_positions, separator);

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
export class Legend {
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

export class CoveragePlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions: any;
    private genome_length: number;
    private coverage_data: number[];
    private yScale: d3.ScaleLinear<number, number>;
    private color: string;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, dimensions: any, genome_length: number, coverage_data: number[], yScale: d3.ScaleLinear<number, number>, color: string) {
        this.svg = svg;
        this.dimensions = dimensions;
        this.genome_length = genome_length;
        this.coverage_data = coverage_data;
        this.yScale = yScale;
        this.color = color;
    }

    public plot(): void {
        const xScale = d3.scaleLinear()
            .domain([0, this.coverage_data.length - 1])
            .range([this.dimensions.x, this.dimensions.x + this.dimensions.width]);
    
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.coverage_data, d => d3.max(d.val.map((val, i) => val / d.cov[i]))!)])
            .range([this.dimensions.y + this.dimensions.height, this.dimensions.y]);
    
        const coverageGroup = this.svg.append("g")
            .attr("transform", `translate(0,0)`);
    
        coverageGroup.append("rect")
            .attr("x", this.dimensions.x)
            .attr("y", this.dimensions.y)
            .attr("width", this.dimensions.width)
            .attr("height", this.dimensions.height)
            .attr("fill", this.color)
            .attr("fill-opacity", 0.025)
            .attr("stroke", this.color)
            .attr("stroke-opacity", 0.15)
            .attr("stroke-width", 1);
    
        // Compute the statistics for each position
        const stats = this.coverage_data.map(data => {
            const ratios = data.val.map((val, i) => val / data.cov[i]);
            ratios.sort((a, b) => a - b);
    
            const median = d3.median(ratios)!;
            const q1 = d3.quantile(ratios, 0.25)!;
            const q3 = d3.quantile(ratios, 0.75)!;
            const iqr = q3 - q1;
            const lowerWhisker = Math.max(Math.min(...ratios.filter(d => d >= (q1 - 1.5 * iqr))), d3.min(ratios)!);
            const upperWhisker = Math.min(Math.max(...ratios.filter(d => d <= (q3 + 1.5 * iqr))), d3.max(ratios)!);
    
            return { median, q1, q3, lowerWhisker, upperWhisker };
        });
    
        // Define the area generator for the IQR
        const areaIQR = d3.area()
            .x((d, i) => xScale(i))
            .y0(d => yScale(d.q1))
            .y1(d => yScale(d.q3))
            .curve(d3.curveLinear);
    
        const whiskersArea = d3.area()
            .x((d, i) => xScale(i))
            .y0(d => yScale(d.lowerWhisker))
            .y1(d => yScale(d.upperWhisker))
            .curve(d3.curveLinear);
    
        const medianLine = d3.line()
            .x((d, i) => xScale(i))
            .y(d => yScale(d.median))
            .curve(d3.curveLinear);
    
        // Draw the IQR area
        coverageGroup.append("path")
            .datum(stats)
            .attr("class", "area-iqr")
            .attr("d", areaIQR)
            .attr("fill", this.color)
            .attr("fill-opacity", 0.25);
    
        // Draw the whiskers area
        coverageGroup.append("path")
            .datum(stats)
            .attr("class", "whiskers-area")
            .attr("d", whiskersArea)
            .attr("fill", this.color)
            .attr("fill-opacity", 0.1);
    
        // Draw the median line
        coverageGroup.append("path")
            .datum(stats)
            .attr("class", "median-line")
            .attr("d", medianLine)
            .attr("stroke", this.color)
            .attr("stroke-width", 1)
            .attr("fill", "none");

        // Add x-axis with ticks for start and end coordinates
        if (this.coverage_data.length === 0) {
            return;
        }
        const xAxis = d3.axisBottom(xScale)
            .ticks(2)
            .tickValues([0, this.coverage_data.length - 1])
            .tickFormat((d, i) => i === 0 ? this.coverage_data[0].pos : this.coverage_data[this.coverage_data.length - 1].pos);

        const xAxisGroup = coverageGroup.append("g")
            .attr("transform", `translate(0,${this.dimensions.y + this.dimensions.height})`)
            .call(xAxis);

        // Rotate the x-axis labels
        xAxisGroup.selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("x", -10)
            .attr("y", 10)
            .style("text-anchor", "end");

        // Add x-axis label
        coverageGroup.append("text")
            .attr("x", this.dimensions.x + this.dimensions.width / 2)
            .attr("y", this.dimensions.y + this.dimensions.height + 40)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Position");
    }
}


// plots connector triangles from a point to a box
export class ConnectorsPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions: any;
    private xs: any;
    private color: string = "#000000";

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, dimensions: any, xs: any, color: string) {
        this.svg = svg;
        this.dimensions = dimensions;
        this.xs = xs;
        this.color = color;
    }

    public plot(): void {
        for (let xi = 0; xi < this.xs.raw_xs.length; xi++) {
            const raw_xs = this.xs.raw_xs[xi];
            const spread_xs = this.xs.spread_xs[xi];
            const color = this.xs.colors[xi];
            const raw_midpoint = utils.computeMidpoint(raw_xs[0], raw_xs[1]);
            const spread_midpoint = utils.computeMidpoint(spread_xs[0], spread_xs[1]);

            // draw a triangle from raw_midpoint to spread interval
            this.svg.append("polygon")
                .attr("points", `${raw_midpoint},${this.dimensions.y} ${spread_xs[0]},${this.dimensions.y + this.dimensions.height} ${spread_xs[1]},${this.dimensions.y + this.dimensions.height}`)
                .attr("fill", "none")  // No fill for the triangle
                .attr("fill", color)  // Color of the triangle lines
                .attr("fill-opacity", 0.025)  // Opacity of the triangle
                .attr("stroke", this.color)  // Color of the triangle lines
                .attr("stroke-opacity", 0.15)  // Opacity of the triangle
                .attr("stroke-width", 1);  // Width of the triangle lines

            // Plot the line connecting raw_midpoint to spread_midpoint
            this.svg.append("line")
                .attr("x1", raw_midpoint)
                .attr("y1", this.dimensions.y)
                .attr("x2", spread_midpoint)
                .attr("y2", this.dimensions.y + this.dimensions.height)
                .attr("stroke", this.color)  // Color of the line
                .attr("stroke-width", 1)  // Width of the line
                .attr("stroke-dasharray", "5,5");
        }
    }
}

// plots a set of values across coordinates from bed format
export class BedPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions: { x: number; y: number; width: number; height: number };
    private expressions: Array<{ pos: number; cov: number[]; val: number[] }>;
    private yScale: d3.ScaleLinear<number, number>;
    private color: string;

    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, 
        dimensions: { x: number; y: number; width: number; height: number }, 
        expressions: Array<{ pos: number; cov: number[]; val: number[] }>,
        color: string) {
        this.svg = svg;
        this.dimensions = dimensions;
        this.expressions = expressions;
        this.yScale = d3.scaleLinear();
        this.color = color;
    }

    private calculateAverages() {
        return this.expressions.map(exp => {
            const ratios = exp.cov.map((cov, i) => exp.val[i] / cov);
            const average = d3.mean(ratios) ?? 0;
            return { pos: exp.pos, average };
        });
    }

    public get_yScale(): d3.ScaleLinear<number, number> {
        return this.yScale;
    }

    public plot(): void {
        if (this.expressions.length === 0) {
            console.error("No expressions provided.");
            return;
        }
    
        // Calculate averages
        const averagesData = this.calculateAverages();
    
        // Create the x-axis scale
        const xScale = d3.scaleLinear()
            .domain([256, this.expressions.length - 1])
            .range([0, this.dimensions.width]);
    
        // Create the y-axis scale
        this.yScale = d3.scaleLinear()
            .domain([0, d3.max(averagesData, d => d.average) ?? 0])
            .range([this.dimensions.y + this.dimensions.height, this.dimensions.y]);
    
        // Add the x-axis
        const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat('');
        this.svg.append("g")
            .attr("transform", `translate(0,${this.dimensions.y + this.dimensions.height})`)
            .call(xAxis);
    
        // Add a background rectangle for the grid
        this.svg.append("rect")
            .attr("class", "grid-background")
            .attr("x", 0)
            .attr("y", this.dimensions.y)
            .attr("width", this.dimensions.width)
            .attr("height", this.dimensions.height)
            .attr("fill", "rgba(200, 200, 200, 0.1)");
    
        // Add horizontal grid lines
        this.svg.append("g")
            .attr("class", "grid")
            .attr("stroke", "rgba(0, 0, 0, 0.1)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .attr("opacity", 0.3)
            .call(d3.axisLeft(this.yScale)
                .ticks(2)
                .tickSize(-this.dimensions.width)
                .tickFormat(null));
    
        // Plot bars to the average points
        const barWidth = 5;
    
        this.svg.selectAll(".bar")
            .data(averagesData)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", (d, i) => xScale(i) - barWidth / 2)
            .attr("y", d => this.yScale(d.average))
            .attr("width", barWidth)
            .attr("height", d => this.dimensions.y + this.dimensions.height - this.yScale(d.average))
            .attr("fill", this.color);
    }
}

export class ExpressionPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private dimensions: any;
    private data: any;
    private expression_data: any;
    private genome_length: number = 0;

    private color = "black";

    private bed_plot_y: number = 0;
    private bed_plot_height: number = 0;

    private connectors_plot_y: number = 0;
    private connectors_plot_height: number = 0;
    private box_plot_y: number = 0;
    private box_plot_height: number = 0;

    private bed_plot_factor = 0.2;
    private connectors_plot_factor = 0.3;
    private box_plot_factor = 0.5;

    private yScale: d3.ScaleLinear<number, number>;
    private bed_yScale: d3.ScaleLinear<number, number>;

    constructor(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, dimensions: any, genome_length: Number, data: any, expression_data: any, color: string) {
        this.svg = svg;
        this.dimensions = {
            width: dimensions.width,
            height: dimensions.height,
            font_size: dimensions.font_size
        };
        this.data = data;
        this.expression_data = expression_data;
        this.genome_length = genome_length;

        this.color = color;

        this.bed_plot_y = 0;
        this.bed_plot_height = this.dimensions.height * this.bed_plot_factor

        this.connectors_plot_y = this.bed_plot_height;
        this.connectors_plot_height = this.dimensions.height * this.connectors_plot_factor;

        this.box_plot_y = this.bed_plot_height + this.connectors_plot_height;
        this.box_plot_height = this.dimensions.height * this.box_plot_factor;

        this.yScale = d3.scaleLinear();
        this.bed_yScale = d3.scaleLinear();
    }

    public get_length(): number {
        return this.genome_length;
    }

    public build_xs(): any {
        const char_width = this.dimensions["font_size"]/0.5;

        const raw_xs: any = [];
        let spread_xs: any = [];
        const colors: any = [];

        this.data.forEach(component => {
            const percent_position = (component["position"] / this.genome_length) * this.dimensions["width"];
            const label_width = component["name"].length * char_width;
            const interval_start = percent_position - label_width / 2;
            const interval_end = percent_position + label_width / 2;
            raw_xs.push([interval_start, interval_end]);
            spread_xs.push([interval_start, interval_end]);
        });

        const new_xs = utils.adjustIntervals(spread_xs, 1, this.dimensions["width"], 215);
        return { raw_xs: raw_xs, spread_xs: new_xs, colors: colors };
    }

    public get_max_fraction(): number {
        let max_fraction = 0;
        for (const vals of this.expression_data) {
            for (let i = 0; i < vals["cov"].length; i++) {
                const cov = vals["cov"][i];
                let max_val = vals["val"][i]/cov;
                if (max_val > max_fraction) {
                    max_fraction = max_val;
                }
            }
            if (max_fraction>1){
                console.log("max_fraction", max_fraction,vals);
            }
        }
        return max_fraction;
    }

    public subsetExpression(pos:Number,spread:Number): any {
        let res = [];
        for (const vals of this.expression_data.slice(pos+256-spread,pos+256+spread)) {
            res.push({pos:vals["pos"],cov:vals["cov"],val:vals["val"]});
        }
        return res;
    }

    public get_yScale() {
        return this.yScale;
    }
    public get_bed_yScale() {
        return this.bed_yScale;
    }

    public plot(): void {
        // get maximum expression value
        const max_frac = this.get_max_fraction();

        // Create shared y-axis for the coverage plots
        this.yScale = d3.scaleLinear()
            .domain([0, max_frac])  // assuming 100 is the max value for the y-axis
            .range([this.box_plot_y + this.box_plot_height, this.box_plot_y]);

        // Add a background rectangle for the grid
        this.svg.append("rect")
            .attr("class", "grid-background")
            .attr("x", 0)
            .attr("y", this.box_plot_y)
            .attr("width", this.dimensions.width)
            .attr("height", this.box_plot_height)
            .attr("fill", "rgba(200, 200, 200, 0.1)");

        // Add horizontal grid lines
        this.svg.append("g")
            .attr("class", "grid")
            .attr("stroke", "rgba(0, 0, 0, 0.1)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .attr("opacity", 0.3)
            .call(d3.axisLeft(this.yScale)
                .ticks(5)
                .tickSize(-(this.dimensions.width))
                .tickFormat(null));

        // plot bedgraph
        const bed_dimensions = {
            font_size: this.dimensions.font_size,
            width: this.dimensions.width,
            height: this.bed_plot_height,
            y: this.bed_plot_y,
            x: this.dimensions.x,
        };
        const bedPlot = new BedPlot(this.svg, bed_dimensions, this.expression_data, this.color);
        bedPlot.plot();
        this.bed_yScale = bedPlot.get_yScale();

        // add a shared y-axis to the boxplot area with horizontal lines across and transparent background
        const xs = this.build_xs();

        // plot connectors
        const connectors_dimensions = {
            font_size: this.dimensions.font_size,
            width: this.dimensions.width,
            height: this.connectors_plot_height,
            y: this.connectors_plot_y,
        };
        const connectorsPlot = new ConnectorsPlot(this.svg, connectors_dimensions, xs, this.color);
        connectorsPlot.plot();

        // plot boxes at the terminations of the DA plot  

        let xi = 0;
        this.data.forEach(component => {
            if (component["type"] === "da") {
                const x = xs.spread_xs[xi];
                xi += 1;

                const cov_dimensions = {
                    font_size: this.dimensions.font_size,
                    width: x[1] - x[0],
                    height: this.box_plot_height,
                    y: this.box_plot_y,
                    x: x[0],
                };

                const sub_cov = this.subsetExpression(component["position"],5);

                const coveragePlot = new CoveragePlot(this.svg, cov_dimensions, this.genome_length, sub_cov, this.yScale, this.color);
                coveragePlot.plot();

                // add component name below the coverage plot
                this.svg.append('text')
                    .attr('x', x[0] + cov_dimensions.width / 2)
                    .attr('y', this.box_plot_y + this.box_plot_height + this.dimensions.font_size)
                    .attr('text-anchor', 'middle')
                    .style('fill', 'black')
                    .style('font-size', this.dimensions.font_size + "px")
                    .text(component["name"]);
            }
        });
    }
}
