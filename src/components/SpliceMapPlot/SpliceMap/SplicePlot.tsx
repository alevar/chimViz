import { color } from 'chart.js/helpers';
import * as d3 from 'd3';
import * as utils from "../../../utils/utils";
import * as plots from "../../../utils/plots";

interface SplicePlotData {
    gtf_data: any;
    expression_data: any;
    width: number;
    height: number;
    fontSize: number;
}

type Interval = [number, number];

export class SplicePlot {
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private width: number;
    private height: number;
    private fontSize: number;
    private gtf_data: any = { "transcripts": [], "genome_components": [] };
    private expression_data: any = {"donors":[{"pos": Number,
                                               "cov": [],
                                               "vals": []}],
                                     "acceptors":[{
                                        "pos": Number,
                                        "cov": [],
                                        "vals": []}]
                                     };
    private gridConfig: plots.GridConfig = {
        columnRatios: [0.8, 0.1, 0.1], // plot, labels, legend
        rowRatiosPerColumn: [
            [0.1, 0.45, 0.025, 0.2, 0.025, 0.2], // pathogen, transcriptome, spacer, donor expression, spacer, acceptor expression
            [0.1, 0.45, 0.025, 0.2, 0.025, 0.2], // pathogen, transcriptome, spacer, donor expression, spacer, acceptor expression
            [1], // 1 row: legend
        ],
        cellPadding: [
            [
                { top: 20, bottom: 0, left: 20, right: 0 },
                { top: 0, bottom: 0, left: 20, right: 0 },
                { top: 0, bottom: 0, left: 20, right: 0 },
                { top: 10, bottom: 30, left: 20, right: 0 },
                { top: 0, bottom: 0, left: 20, right: 0 },
                { top: 10, bottom: 30, left: 20, right: 0 }
            ],
            [
                { top: 20, bottom: 0, left: 20, right: 0 },
                { top: 0, bottom: 0, left: 20, right: 0 },
                { top: 0, bottom: 0, left: 20, right: 0 },
                { top: 10, bottom: 30, left: 20, right: 0 },
                { top: 0, bottom: 0, left: 20, right: 0 },
                { top: 10, bottom: 30, left: 20, right: 0 }
            ],
            [
                { top: 20, bottom: 20, left: 20, right: 20 }
            ]
        ]
    };
    private grid: plots.D3Grid = new plots.D3Grid(d3.select('svg'), 0, 0, this.gridConfig);

    constructor(svgElement: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
        data: SplicePlotData) {

        this.width = data.width;
        this.height = data.height;
        this.fontSize = data.fontSize;

        this.gtf_data = data.gtf_data;
        this.expression_data = data.expression_data;

        this.svg = svgElement;

        this.grid = new plots.D3Grid(this.svg, this.height, this.width, this.gridConfig);
    }

    public plot(): void {

        const pathogenPlotSvg = this.grid.getCellSvg(0, 0);
        if (pathogenPlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 0);
            const coordinates = this.grid.getCellCoordinates(0, 0);

            const pathogenPlotDimensions = {
                width: dimensions.width,
                height: dimensions.height,
                x: coordinates.x,
                y: coordinates.y
            };

            const pathogenPlot = new plots.PathogenPlot(pathogenPlotSvg, pathogenPlotDimensions, this.gtf_data);
            this.grid.setCellData(0, 0, pathogenPlot);
            pathogenPlot.plot();
        }


        const transcriptomePlotSvg = this.grid.getCellSvg(0, 1);
        let gene_coords = [];
        if (transcriptomePlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 1);

            const transcriptomePlotDimensions = {
                width: dimensions.width,
                height: dimensions.height,
                font_size: this.fontSize,
            };

            const transcriptomePlot = new plots.TranscriptomePlot(transcriptomePlotSvg, transcriptomePlotDimensions, this.gtf_data);
            this.grid.setCellData(0, 1, transcriptomePlot);
            gene_coords = transcriptomePlot.plot();
        }

        const geneLabelPlotSvg = this.grid.getCellSvg(1, 1);
        if (geneLabelPlotSvg) {
            const dimensions = this.grid.getCellDimensions(1, 1);

            const geneLabelPlotDimensions = {
                width: dimensions.width,
                height: dimensions.height,
                font_size: this.fontSize,
            };

            const geneLabelPlot = new plots.GeneLabelPlot(geneLabelPlotSvg, geneLabelPlotDimensions, gene_coords);
            this.grid.setCellData(1, 1, geneLabelPlot);
            geneLabelPlot.plot();
        }

        const donorExpressionPlotSvg = this.grid.getCellSvg(0, 3);
        if (donorExpressionPlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 3);

            const donorExpressionPlotDimensions = {
                width: dimensions.width,
                height: dimensions.height,
                font_size: this.fontSize,
            };

            // extract donors from gtf_data
            const donors = [];
            this.gtf_data["genome_components"].forEach(component => {
                if (component["type"] === "da") {
                    if (component["name"].startsWith("SD")) {
                        donors.push(component);
                    }
                }
            });

            // draw donors on overlay as well
            const overlaySvg = this.grid.createOverlaySvg(0, [0, 1, 2]);
            for (const donor of donors) {
                console.log(donor);
                const donor_x = donor["position"]/this.gtf_data["genome_end"] * dimensions.width;
                overlaySvg.append("line")
                    .attr("x1", donor_x)
                    .attr("y1", 0)
                    .attr("x2", donor_x)
                    .attr("y2", this.height)
                    .attr("stroke", "#F78154")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "5,5");
            }

            const donorExpressionPlot = new plots.ExpressionPlot(donorExpressionPlotSvg, donorExpressionPlotDimensions, this.gtf_data["genome_end"], donors, this.expression_data.donors,"#F78154");
            this.grid.setCellData(0, 3, donorExpressionPlot);
            donorExpressionPlot.plot();
            const donor_yScale = donorExpressionPlot.get_yScale();
            const donor_yAxis = d3.axisRight(donor_yScale)
                .ticks(5);
            const donorYAxisPlotSvg = this.grid.getCellSvg(1, 3);
            donorYAxisPlotSvg.append("g")
                .attr("class", "y axis")
                .attr("transform", `translate(0,0)`)
                .call(donor_yAxis);

            const donorBed_yScale = donorExpressionPlot.get_bed_yScale();
            const donorBedYAxisPlotSvg = this.grid.getCellSvg(1, 3);
            const donorBed_yAxis = d3.axisRight(donorBed_yScale).ticks(2);
            donorBedYAxisPlotSvg.append("g")
                .attr("class", "y axis")
                .attr("transform", `translate(0,0)`)
                .call(donorBed_yAxis);
        }

        const acceptorExpressionPlotSvg = this.grid.getCellSvg(0, 5);
        if (acceptorExpressionPlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 5);

            const acceptorExpressionPlotDimensions = {
                width: dimensions.width,
                height: dimensions.height,
                font_size: this.fontSize,
            };

            const acceptors = [];
            this.gtf_data["genome_components"].forEach(component => {
                if (component["type"] === "da") {
                    if (component["name"].startsWith("SA")) {
                        acceptors.push(component);
                    }
                }
            });

            // draw acceptors on overlay as well

            const overlaySvg = this.grid.createOverlaySvg(0, [0, 1, 2, 3, 4]);
            for (const acceptor of acceptors) {
                const acceptor_x = acceptor["position"]/this.gtf_data["genome_end"] * dimensions.width;
                overlaySvg.append("line")
                    .attr("x1", acceptor_x)
                    .attr("y1", 0)
                    .attr("x2", acceptor_x)
                    .attr("y2", this.height)
                    .attr("stroke", "#5FAD56")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "5,5");
            }

            const acceptorExpressionPlot = new plots.ExpressionPlot(acceptorExpressionPlotSvg, acceptorExpressionPlotDimensions, this.gtf_data["genome_end"], acceptors, this.expression_data.acceptors, "#5FAD56");
            this.grid.setCellData(0, 5, acceptorExpressionPlot);
            acceptorExpressionPlot.plot();
            const acceptor_yScale = acceptorExpressionPlot.get_yScale();
            const acceptor_yAxis = d3.axisRight(acceptor_yScale)
                .ticks(5);
            const acceptorYAxisPlotSvg = this.grid.getCellSvg(1, 5);
            acceptorYAxisPlotSvg.append("g")
                .attr("class", "y axis")
                .call(acceptor_yAxis);

            const acceptorBed_yScale = acceptorExpressionPlot.get_bed_yScale();
            const acceptorBedYAxisPlotSvg = this.grid.getCellSvg(1, 5);
            const acceptorBed_yAxis = d3.axisRight(acceptorBed_yScale).ticks(2);
            acceptorBedYAxisPlotSvg.append("g")
                .attr("class", "y axis")
                .call(acceptorBed_yAxis);
        }

        this.grid.promote(0, 0);
        this.grid.promote(0, 3);
    }
}
