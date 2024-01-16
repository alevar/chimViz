// src/App.tsx
import React, { useState } from 'react';
import ChimViz from './components/ChimViz/ChimViz';
import SettingsPanel from './components/SettingsPanel/SettingsPanel';
import * as d3 from 'd3';

import './App.css';

function get_tid(attributes: string): string | null {
  const startToken = "transcript_id \"";
  const endToken = "\";";

  const startIndex = attributes.indexOf(startToken);
  const endIndex = attributes.indexOf(endToken, startIndex);

  if (startIndex !== -1 && endIndex !== -1) {
    const res = attributes.substring(startIndex + startToken.length, endIndex).trim();
    return res;
  } else {
    return null;
  }
}

const App: React.FC = () => {
  const [density, setDensity] = useState<string>("");
  const [genes, setGenes] = useState<string>("");
  const [pathogenGTF, setPathogenGTF] = useState<string>("");
  const [integrations, setIntegrations] = useState<string>("");
  const [fontSize, setFontSize] = useState<number>(12);
  const [width, setWidth] = useState<number>(1200);
  const [height, setHeight] = useState<number>(500);

  const handleDensityUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result as string;
        const rows = result.split('\n');

        // Use an object to store arrays for each unique value in the 1st column
        const densityMap = {};

        rows.forEach((row) => {
          const columns = row.split('\t');
          const seqid = columns[0];
          const density = +columns[3];

          // Check if the unique value in the 1st column already exists in the map
          if (densityMap[seqid]) {
            // If it exists, push the value to the corresponding array
            densityMap[seqid].push(density);
          } else {
            // If it doesn't exist, create a new array with the value
            densityMap[seqid] = [density];
          }
        });

        // Now dataMap contains arrays for each unique value in the 1st column
        setDensity(densityMap);
      };

      reader.readAsText(file);
    }
  };

  const handleGenesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result as string;
        const rows = result.split('\n');

        // Use an object to store arrays for each unique value in the 1st column
        const genes = {};

        rows.forEach((row) => {
          const columns = row.split('\t');
          const seqid = columns[0];
          const position = +columns[1];
          const gene_name = columns[2];

          // Check if the unique value in the 1st column already exists in the map
          if (!genes[seqid]) {
            // If it exists, push the value to the corresponding array
            genes[seqid] = [];
          }
          genes[seqid].push([gene_name, position]);
        });

        // Now dataMap contains arrays for each unique value in the 1st column
        setGenes(genes);
      };

      reader.readAsText(file);
    }
  };

  const handlePathogenGTFUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result as string;
        const rows = result.split('\n');

        // Use an object to store arrays for each unique value in the 1st column
        let transcripts = {};
        let genome_end = 0;

        rows.forEach((row) => {
          const lcs = row.split('\t');
          if (lcs.length < 9) {
            return;
          }

          const start = +lcs[3];
          const end = +lcs[4];

          if (end > genome_end) {
            genome_end = end;
          }
          
          if (lcs[2].toLocaleLowerCase() === "exon") {
            const tid = get_tid(lcs[8]);

            if (!transcripts[tid]) {
              transcripts[tid] = {"exons":[],
                                  "cds":[]};
            }
            transcripts[tid]["exons"].push([start, end]);
          }
          if (lcs[2].toLowerCase() === "cds") {
            const tid = get_tid(lcs[8]);

            if (!transcripts[tid]) {
              transcripts[tid] = {"exons":[],
                                  "cds":[]};
            }
            transcripts[tid]["cds"].push([start, end]);
          }
        });

        // Now dataMap contains arrays for each unique value in the 1st column
        setPathogenGTF(transcripts);
      };

      reader.readAsText(file);
    }
  };

  const handleIntegrationsUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result as string;
        const rows = result.split('\n');
      };
      setIntegrations(integrations);
    }
    reader.readAsText(file);
  }

  return (
    <div className="App">
      <div className="settings-panel">
        <SettingsPanel
          onDensityUpload={handleDensityUpload}
          onGenesUpload={handleGenesUpload}
          onPathogenGTFUpload={handlePathogenGTFUpload}
          onIntegrationsUpload={handleIntegrationsUpload}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          width={width}
          onWidthChange={setWidth}
          height={height}
          onHeightChange={setHeight}
        />
      </div>
      <div className="visualization-container">
        <ChimViz densities={density} genes={genes} path_transcripts={pathogenGTF} integrations={integrations} width={width} height={height} fontSize={fontSize} />
      </div>
    </div>
  );
};

export default App;
