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
    private expression_data: any = { "donors": {}, "acceptors": {} };
    private gridConfig: plots.GridConfig = {
        columns: 3,
        columnRatios: [0.8, 0.1, 0.1], // plot, labels, legend
        rowRatiosPerColumn: [
            [0.2, 0.5, 0.3], // 3 rows: pathogen, transcriptome, expression
            [0.2, 0.5, 0.3], // 3 rows: pathogen, transcriptome, expression
            [1], // 1 row: legend
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


        const expressionPlotSvg = this.grid.getCellSvg(0, 2);
        if (expressionPlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 2);

            const expressionPlotDimensions = {
                width: dimensions.width,
                height: dimensions.height,
                font_size: this.fontSize,
            };

            const expressionPlot = new plots.ExpressionPlot(expressionPlotSvg, expressionPlotDimensions, this.gtf_data, this.expression_data);
            this.grid.setCellData(0, 2, expressionPlot);
            expressionPlot.plot();
        }
    }
}
