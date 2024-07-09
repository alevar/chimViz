import { color } from 'chart.js/helpers';
import * as d3 from 'd3';
import * as utils from "../../../utils/utils";
import * as plots from "../../../utils/plots";

interface SplicePlotData {
    gtf_data: any;
    width: number;
    height: number;
    fontSize: number;
}

type Interval = [number, number];

export class SplicePlot {
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
        "pathogenPlot": {
            "plot": plots.PathogenPlot | null,
            "x": number,
            "y": number,
            "dimensions": {
                "font_size": number,
                "width": number,
                "height": number,
                "genome_height": number,
                "transcript_height": number,
            }
        },
        "expressionPlot": {
            "plot": plots.ExpressionPlot | null,
            "x": number,
            "y": number,
            "dimensions": {
                "font_size": number,
                "width": number,
                "height": number
            }
        }
    };
    private width: number;
    private height: number;
    private fontSize: number;
    private gtf_data: any = { "transcripts": [], "genome_components": [] };

    constructor(svgElement: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
        data: SplicePlotData) {

        this.width = data.width;
        this.height = data.height;
        this.fontSize = data.fontSize;

        this.gtf_data = data.gtf_data;

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
            "pathogenPlot": {
                "plot": null,
                "x": 0,
                "y": 0,
                "dimensions": {
                    "font_size": 0,
                    "width": 0,
                    "height": 0,
                    "genome_height": 0,
                    "transcript_height": 0,
                }
            },
            "expressionPlot": {
                "plot": null,
                "x": 0,
                "y": 0,
                "dimensions": {
                    "font_size": 0,
                    "width": 0,
                    "height": 0
                }
            }
        };
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

    private setupSections(): void {
        const parameters = {
            "genome_factor": 0.7,
            "expression_factor": 0.3,
            "legend_factor": 0.15,
        }

        // Since width is invariant - we should deduce all heights and proportions relative to the width

        // Calculate heights for each section
        this.sections["pathogenPlot"]["dimensions"]["font_size"] = this.fontSize;
        this.sections["pathogenPlot"]["dimensions"]["genome_height"] = this.height * parameters["genome_factor"];
        this.sections["pathogenPlot"]["dimensions"]["height"] = this.sections["pathogenPlot"]["dimensions"]["genome_height"];
        this.sections["pathogenPlot"]["dimensions"]["width"] = this.width * (1 - parameters["legend_factor"]);
        this.sections["pathogenPlot"]["x"] = 0;
        this.sections["pathogenPlot"]["y"] = 0;


        // update global dimensions accordingly
        this.sections["expressionPlot"]["dimensions"]["height"] = this.height * parameters["expression_factor"] + this.sections["pathogenPlot"]["dimensions"]["height"];
        this.sections["expressionPlot"]["dimensions"]["width"] = this.width * (1 - parameters["legend_factor"]);
        this.sections["expressionPlot"]["x"] = 0;
        this.sections["expressionPlot"]["y"] = this.sections["pathogenPlot"]["dimensions"]["height"];
        this.updateSvgSize()

        this.sections["legend"]["dimensions"]["height"] = this.sections["pathogenPlot"]["dimensions"]["height"] + this.sections["expressionPlot"]["dimensions"]["height"];
        this.sections["legend"]["dimensions"]["width"] = (this.width * parameters["legend_factor"]) * 0.9;
        this.sections["legend"]["dimensions"]["font_size"] = this.fontSize;
        this.sections["legend"]["x"] = this.width * (1 - parameters["legend_factor"]) + (this.width * parameters["legend_factor"]) * 0.075;
        this.sections["legend"]["y"] = 0

        const legendSvg = this.svg.append('svg')
            .attr('x', this.sections["legend"]["x"])
            .attr('y', this.sections["legend"]["y"])
            .attr('width', this.sections["legend"]["dimensions"]["width"])
            .attr('height', this.sections["legend"]["dimensions"]["height"]);

        const pathogenPlotSvg = this.svg.append('svg')
            .attr('x', this.sections["pathogenPlot"]["x"])
            .attr('y', this.sections["pathogenPlot"]["y"])
            .attr('width', this.sections["pathogenPlot"]["dimensions"]["width"])
            .attr('height', this.sections["pathogenPlot"]["dimensions"]["height"]);

        const expressionPlotSvg = this.svg.append('svg')
            .attr('x', this.sections["expressionPlot"]["x"])
            .attr('y', this.sections["expressionPlot"]["y"])
            .attr('width', this.sections["expressionPlot"]["dimensions"]["width"])
            .attr('height', this.sections["expressionPlot"]["dimensions"]["height"]);

        // Create instances of Legend, HostPlot, ConnectionsPlot, and PathogenPlot
        this.sections["legend"]["plot"] = new plots.Legend(legendSvg,
            this.sections["legend"]["dimensions"]);
        this.sections["legend"]["plot"].plot();

        this.sections["pathogenPlot"]["plot"] = new plots.PathogenPlot(pathogenPlotSvg,
            this.sections["pathogenPlot"]["dimensions"],
            this.gtf_data);
        this.sections["pathogenPlot"]["plot"].plot();

        this.sections["expressionPlot"]["plot"] = new plots.ExpressionPlot(expressionPlotSvg,
            this.sections["expressionPlot"]["dimensions"]);

        const path_data = {
            "x": this.sections["pathogenPlot"]["x"],
            "y": this.sections["pathogenPlot"]["y"],
            "width": this.sections["pathogenPlot"]["dimensions"]["width"],
            "height": this.sections["pathogenPlot"]["dimensions"]["height"],
            "length": this.sections["pathogenPlot"]["plot"].get_length(),
        }
    }
}
