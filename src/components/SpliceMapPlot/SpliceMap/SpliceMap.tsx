import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

import { SplicePlot } from './SplicePlot';

interface SpliceMapProps {
    gtf_data: any;
    expression_data: any;
    width: number;
    height: number;
    fontSize: number;
}

const SpliceMap: React.FC<SpliceMapProps> = ({ gtf_data, expression_data, width, height, fontSize }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    const handleDownload = () => {
        if (svgRef.current) {
            const svgElement = svgRef.current;
            const svgString = new XMLSerializer().serializeToString(svgElement);
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'chim-viz.svg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        const chim = new SplicePlot(svg, { gtf_data, expression_data, width, height, fontSize });
        chim.plot();
        
    }, [gtf_data, expression_data, width, height, fontSize]);

    return (
        <div>
            <svg ref={svgRef}></svg>
            <button onClick={handleDownload}>Download SVG</button>
        </div>
    );
};

export default SpliceMap;
