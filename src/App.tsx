// src/App.tsx
import React, { useState } from 'react';
import ChimViz from './components/ChimViz/ChimViz';
import SettingsPanel from './components/SettingsPanel/SettingsPanel';
import * as d3 from 'd3';

import './App.css';

function get_attribute(attributes: string, key: string): string | null {
  const startToken = key+" \"";
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
  const [density, setDensity] = useState<any[]>([]);
  const [fai, setFai] = useState<any[]>([]);
  const [genes, setGenes] = useState<any[]>([]);
  const [pathogenGTF, setPathogenGTF] = useState<any>({"transcripts": [],"genome_components": []});
  const [integrations, setIntegrations] = useState<any[]>([]);
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

  const handleFaiUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // parse fasta index and load chromosome lengths
    const file = event.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result as string;
        const rows = result.split('\n');

        // Use an object to store arrays for each unique value in the 1st column
        const faiMap = {};

        rows.forEach((row) => {
          const columns = row.split('\t');
          const seqid = columns[0];
          const length = +columns[1];

          // Check if the unique value in the 1st column already exists in the map
          if (faiMap[seqid]) {
            // If it exists, push the value to the corresponding array
            faiMap[seqid].push(length);
          } else {
            // If it doesn't exist, create a new array with the value
            faiMap[seqid] = [length];
          }
        });

        // Now dataMap contains arrays for each unique value in the 1st column
        setFai(faiMap);
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
        let genome_components = [];

        rows.forEach((row) => {
          const lcs = row.split('\t');
          if (lcs.length < 9) {
            return;
          }

          const start = +lcs[3];
          const end = + lcs[4];

          if (end > genome_end) {
            genome_end = end;
          }
          
          if (lcs[2].toLocaleLowerCase() === "exon") {
            const tid = get_attribute(lcs[8],"transcript_id");

            if (!transcripts[tid]) {
              transcripts[tid] = {"exons":[],
                                  "cds":[]};
            }
            transcripts[tid]["exons"].push([start, end]);
          }
          if (lcs[2].toLowerCase() === "cds") {
            const tid = get_attribute(lcs[8],"transcript_id");

            if (!transcripts[tid]) {
              transcripts[tid] = {"exons":[],
                                  "cds":[]};
            }
            transcripts[tid]["cds"].push([start, end]);
          }
          if (lcs[2].toLocaleLowerCase() === "long_terminal_repeat"){
            const ltr_name = get_attribute(lcs[8],"note");
            genome_components.push({"type": "ltr", "position": [start, end],"name":ltr_name});
          }
        });

        // extract introns from exons
        let gtf_donors = new Set();
        let gtf_acceptors = new Set();
        for (const tid in transcripts){
          const exons = transcripts[tid]["exons"];

          if (exons.length > 1) {
            for (let i = 0; i < exons.length - 1; i++) {
              const intron_start = exons[i][1];
              const intron_end = exons[i+1][0];
              gtf_donors.add(intron_start);
              gtf_acceptors.add(intron_end);
            }
          }
        }
        // sort donors and acceptors into lists
        const gtf_donor_list = Array.from(gtf_donors);
        gtf_donor_list.sort((a,b) => a-b);
        const gtf_acceptor_list = Array.from(gtf_acceptors);
        gtf_acceptor_list.sort((a,b) => a-b);
        // add donors and acceptors to the genome components
        let d_i = 0;
        for (const donor of gtf_donor_list) {
          genome_components.push({"type": "donor", "position": donor, "name": "d"+d_i});
          d_i++;
        }
        let a_i = 0;
        for (const acceptor of gtf_acceptor_list) {
          genome_components.push({"type": "acceptor", "position": acceptor, "name": "a"+a_i});
          a_i++;
        }

        // Now dataMap contains arrays for each unique value in the 1st column
        const gtf_data = {"transcripts": transcripts,
                    "genome_end": genome_end,
                    "genome_components": genome_components};
        setPathogenGTF(gtf_data);
      };

      reader.readAsText(file);
    }
  };

  const handleIntegrationsUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      const interactions: any[] = [];

      reader.onload = (e) => {
        const result = e.target?.result as string;
        const rows = result.split('\n');

        // seqid1, seqid2, pos1, pos2, count
        rows.forEach((row) => {
          const columns = row.split('\t');
          const seqid1 = columns[0];
          const seqid2 = columns[1];
          const pos1 = +columns[2];
          const pos2 = +columns[3];
          const count = +columns[4];

          interactions.push([seqid1, seqid2, pos1, pos2, count])
        });
        setIntegrations(interactions);
      };
      reader.readAsText(file);
    } 
  }

  return (
    <div className="App">
      <div className="settings-panel">
        <SettingsPanel
          onDensityUpload={handleDensityUpload}
          onFaiUpload={handleFaiUpload}
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
        <ChimViz densities={density} fai={fai} genes={genes} gtf_data={pathogenGTF} integrations={integrations} width={width} height={height} fontSize={fontSize} />
      </div>
    </div>
  );
};

export default App;
