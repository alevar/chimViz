// src/App.tsx
import React, { useState } from 'react';
import SpliceMap from './components/SpliceMap/SpliceMap';
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
  const [GTF, setGTF] = useState<any>({"transcripts": [],"genome_components": []});
  const [fontSize, setFontSize] = useState<number>(12);
  const [width, setWidth] = useState<number>(1200);
  const [height, setHeight] = useState<number>(500);

  const handleGTFUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

          if (lcs[2].toLocaleLowerCase() === "transcript") {
            const tid = get_attribute(lcs[8],"transcript_id");

            if (!transcripts[tid]) {
              transcripts[tid] = {"exons":[],
                                  "cds":[],
                                  "gene_name":""};
            }
            transcripts[tid]["gene_name"] = get_attribute(lcs[8],"gene_name");
          }
          
          if (lcs[2].toLocaleLowerCase() === "exon") {
            const tid = get_attribute(lcs[8],"transcript_id");

            if (!transcripts[tid]) {
              transcripts[tid] = {"exons":[],
                                  "cds":[],
                                  "gene_name":""};
            }
            transcripts[tid]["exons"].push([start, end]);
          }
          if (lcs[2].toLowerCase() === "cds") {
            const tid = get_attribute(lcs[8],"transcript_id");

            if (!transcripts[tid]) {
              transcripts[tid] = {"exons":[],
                                  "cds":[],
                                  "gene_name":""};
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
        
        // add donors and acceptors to a combined list
        const gtf_das = [];
        let d_i = 0;
        for (const donor of gtf_donor_list) {
          genome_components.push({"type": "da", "position": donor, "name": "SD"+d_i});
          d_i++;
        }
        let a_i = 0;
        for (const acceptor of gtf_acceptor_list) {
          genome_components.push({"type": "da", "position": acceptor, "name": "SA"+a_i});
          a_i++;
        }

        // sort the combined list
        genome_components.sort((a,b) => a.position-b.position);

        // Now dataMap contains arrays for each unique value in the 1st column
        const gtf_data = {"transcripts": transcripts,
                    "genome_end": genome_end,
                    "genome_components": genome_components};
        setGTF(gtf_data);
      };

      reader.readAsText(file);
    }
  };

  function GeneDedup(input: any, tolerance: number): any {
    const deduplicated: any = {};
  
    // Helper function to check if positions are within N of each other
    const arePositionsWithinTolerance = (
      pos1: [string, number],
      pos2: [string, number]
    ): boolean => Math.abs(pos1[1] - pos2[1]) <= tolerance;
  
    // Iterate through the input object
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        const currentItem = input[key];

        // if (!(currentItem.position[0] in deduplicated)) {
        //   deduplicated[currentItem.position[0]] = [];
        // }
        // deduplicated[currentItem.position[0]].push(currentItem);
  
        // Deduplicate only if the name is not "-"
        if (currentItem.name !== "-") {
          const existingItems = deduplicated[currentItem.position[0]] || [];
  
          // Deduplicate based on name
          const duplicateIndex = existingItems.findIndex(
            (item) => item.name === currentItem.name && arePositionsWithinTolerance(item.position, currentItem.position)
          );
  
          if (duplicateIndex === -1) {
            existingItems.push(currentItem);
            deduplicated[currentItem.position[0]] = existingItems;
          }
        } else {
          // Deduplicate if name is "-" and positions are within tolerance
          const matchingItems = deduplicated[currentItem.position[0]] || [];
          const duplicateIndex = matchingItems.findIndex(
            (item) => item.name === "-" && arePositionsWithinTolerance(item.position, currentItem.position)
          );
  
          if (duplicateIndex === -1) {
            matchingItems.push(currentItem);
            deduplicated[currentItem.position[0]] = matchingItems;
          }
        }
      }
    }
  
    return deduplicated;
  }

  return (
    <div className="App">
      <div className="settings-panel">
        <SettingsPanel
          onGTFUpload={handleGTFUpload}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          width={width}
          onWidthChange={setWidth}
          height={height}
          onHeightChange={setHeight}
        />
      </div>
      <div className="visualization-container">
        <SpliceMap gtf_data={GTF} width={width} height={height} fontSize={fontSize} />
      </div>
    </div>
  );
};

export default App;
