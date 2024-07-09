import React, { useState } from "react";
import ChimViz from "./ChimViz/ChimViz";
import SettingsPanel from "./SettingsPanel/SettingsPanel";
import {
  parseDensity,
  parseFai,
  parsePathogenGTF,
  parseIntegrations
} from "../../utils/parsers";
import "./ChimVizPlot.css";

const ChimVizPlot: React.FC = () => {
  const [density, setDensity] = useState<any[]>([]);
  const [fai, setFai] = useState<any[]>([]);
  const [genes, setGenes] = useState<any[]>([]);
  const [pathogenGTF, setPathogenGTF] = useState<any>({
    transcripts: [],
    genome_components: [],
  });
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [geneCount, setGeneCount] = useState<number>(300);
  const [fontSize, setFontSize] = useState<number>(12);
  const [width, setWidth] = useState<number>(1200);
  const [height, setHeight] = useState<number>(500);

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    parseFunction: (result: string) => void
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        parseFunction(result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="ChimVizPlot">
        <SettingsPanel
            onDensityUpload={(e) => handleFileUpload(e, (result) => parseDensity(result, setDensity))}
            onFaiUpload={(e) => handleFileUpload(e, (result) => parseFai(result, setFai))}
            onPathogenGTFUpload={(e) => handleFileUpload(e, (result) => parsePathogenGTF(result, setPathogenGTF))}
            onIntegrationsUpload={(e) => handleFileUpload(e, (result) => parseIntegrations(result, setIntegrations, setGenes))}
            geneCount={geneCount}
            onGeneCountChange={setGeneCount}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            width={width}
            onWidthChange={setWidth}
            height={height}
            onHeightChange={setHeight}
        />
      <div className="visualization-container">
        <ChimViz
          densities={density}
          fai={fai}
          genes={genes}
          gtf_data={pathogenGTF}
          integrations={integrations}
          width={width}
          height={height}
          fontSize={fontSize}
          geneCount={geneCount}
        />
      </div>
    </div>
  );
};

export default ChimVizPlot;
