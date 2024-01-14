// src/App.tsx
import React, { useState } from 'react';
import ChimViz from './components/ChimViz/ChimViz';
import * as d3 from 'd3';

const App: React.FC = () => {
  const [density, setDensity] = useState<number[]>([]);
  const [genes, setGenes] = useState<number[]>([]);
  const [fontSize, setFontSize] = useState<number>(12);
  const [width, setWidth] = useState<number>(1400);
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
          genes[seqid].push([gene_name,position]);
        });

        // Now dataMap contains arrays for each unique value in the 1st column
        setGenes(genes);
      };

      reader.readAsText(file);
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        {/* Settings Panel */}
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Settings</h5>

              <div className="form-group">
                <label htmlFor="densityUpload">Density</label>
                <input
                  type="file"
                  className="form-control"
                  id="densityUpload"
                  onChange={handleDensityUpload}
                />
              </div>
              <div className="form-group">
                <label htmlFor="genesUpload">Font Size</label>
                <input
                  type="file"
                  className="form-control"
                  id="genesUpload"
                  onChange={handleGenesUpload}
                />
              </div>
              
              {/* Font Size Selector */}
              <div className="form-group">
                <label htmlFor="fontSize">Font Size</label>
                <input
                  type="number"
                  className="form-control"
                  id="fontSize"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                />
              </div>
              
              {/* Width Adjustment */}
              <div className="form-group">
                <label htmlFor="width">Width</label>
                <input
                  type="number"
                  className="form-control"
                  id="width"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                />
              </div>
              
              {/* Height Adjustment */}
              <div className="form-group">
                <label htmlFor="height">Height</label>
                <input
                  type="number"
                  className="form-control"
                  id="height"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-md-9">
          <div>
            <ChimViz densities={density} genes={genes} width={width} height={height} fontSize={fontSize} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
