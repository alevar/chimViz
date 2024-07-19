import React, { useState } from "react";
import * as parsers from "../../utils/parsers";
import "./SpliceMapPlot.css";
import SettingsPanel from "./SettingsPanel/SettingsPanel";
import SpliceMap from "./SpliceMap/SpliceMap";

const SpliceMapPlot: React.FC = () => {
  const [pathogenGTF, setPathogenGTF] = useState<any>({
    transcripts: [],
    genome_components: [],
    genes: {},
  });
  const [expression, setExpression] = useState<any>([]);
  const [fontSize, setFontSize] = useState<number>(10);
  const [width, setWidth] = useState<number>(1100);
  const [height, setHeight] = useState<number>(700);

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
        onExpressionUpload={(e) => handleFileUpload(e, (result) => parsers.parseExpression(result, setExpression))}
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
          expression_data={expression}
          width={width}
          height={height}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default SpliceMapPlot;
