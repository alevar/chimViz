import { color } from 'chart.js/helpers';
import * as d3 from 'd3';
import * as utils from "../../../utils/utils";
import * as plots from "../../../utils/plots";

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
            "plot": plots.HostPlot | null,
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
            "plot": plots.ConnectionsPlot | null,
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
                    "genome_height": 0,
                    "transcript_height": 0,
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
        this.sections["legend"]["plot"] = new plots.Legend(legendSvg,
            this.sections["legend"]["dimensions"]);
        this.sections["legend"]["plot"].plot();

        this.sections["hostPlot"]["plot"] = new plots.HostPlot(hostPlotSvg,
            this.sections["hostPlot"]["dimensions"],
            this.densities,
            this.fai,
            this.genes,
            this.geneCount);
        this.sections["hostPlot"]["plot"].plot();
        const seqids = this.sections["hostPlot"]["plot"].get_seqids();

        this.sections["pathogenPlot"]["plot"] = new plots.PathogenPlot(pathogenPlotSvg,
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
        this.sections["connectionsPlot"]["plot"] = new plots.ConnectionsPlot(connectionsPlotSvg,
            this.sections["connectionsPlot"]["dimensions"],
            this.integrations,
            seqids,
            path_data);
        const used_integrations = this.sections["connectionsPlot"]["plot"].plot();

        // plot integration sites intot he transcriptome map
        this.sections["pathogenPlot"]["plot"].plot_integrations(used_integrations);
    }
}
