import React, { useState } from "react";
import * as parsers from "../../utils/parsers";
import "./SpliceMapPlot.css";
import SettingsPanel from "./SettingsPanel/SettingsPanel";
import SpliceMap from "./SpliceMap/SpliceMap";

const SpliceMapPlot: React.FC = () => {
  const [pathogenGTF, setPathogenGTF] = useState<any>({
    transcripts: [],
    genome_components: [],
  });
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
    <div className="splicemap-plot">
      <SettingsPanel
        onPathogenGTFUpload={(e) => handleFileUpload(e, (result) => parsers.parsePathogenGTF(result, setPathogenGTF))}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        width={width}
        onWidthChange={setWidth}
        height={height}
        onHeightChange={setHeight}
      />
      <div className="visualization-container">
        <SpliceMap
          gtf_data={pathogenGTF}
          width={width}
          height={height}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default SpliceMapPlot;
