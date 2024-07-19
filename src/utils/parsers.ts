// src/utils/parsers.ts

// Helper function to get attributes from strings
export function getAttribute(attributes: string, key: string): string | null {
    const startToken = `${key} "`;
    const endToken = '";';
    const startIndex = attributes.indexOf(startToken);
    const endIndex = attributes.indexOf(endToken, startIndex);
  
    return startIndex !== -1 && endIndex !== -1
      ? attributes.substring(startIndex + startToken.length, endIndex).trim()
      : null;
  }
  
  // Helper function to deduplicate genes
  export function geneDedup(input: any, tolerance: number): any {
    const deduplicated: any = {};
  
    const arePositionsWithinTolerance = (
      pos1: [string, number],
      pos2: [string, number]
    ): boolean => Math.abs(pos1[1] - pos2[1]) <= tolerance;
  
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        const currentItem = input[key];
        if (currentItem.name !== "-") {
          const existingItems = deduplicated[currentItem.position[0]] || [];
          const duplicateIndex = existingItems.findIndex(
            (item) =>
              item.name === currentItem.name &&
              arePositionsWithinTolerance(item.position, currentItem.position)
          );
          if (duplicateIndex === -1) {
            existingItems.push(currentItem);
            deduplicated[currentItem.position[0]] = existingItems;
          }
        } else {
          const matchingItems = deduplicated[currentItem.position[0]] || [];
          const duplicateIndex = matchingItems.findIndex(
            (item) =>
              item.name === "-" &&
              arePositionsWithinTolerance(item.position, currentItem.position)
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
  
  // Function to parse density data
  export function parseDensity(result: string, setDensity: React.Dispatch<React.SetStateAction<any[]>>) {
    const rows = result.split("\n");
    const densityMap: any = {};
  
    rows.forEach((row) => {
      const [seqid, , , density] = row.split("\t");
      densityMap[seqid] = densityMap[seqid] || [];
      densityMap[seqid].push(+density);
    });
  
    setDensity(densityMap);
  }
  
  // Function to parse FAI data
  export function parseFai(result: string, setFai: React.Dispatch<React.SetStateAction<any[]>>) {
    const rows = result.split("\n");
    const faiMap: any = {};
  
    rows.forEach((row) => {
      const [seqid, length] = row.split("\t");
      faiMap[seqid] = faiMap[seqid] || [];
      faiMap[seqid].push(+length);
    });
  
    setFai(faiMap);
  }

  type Expression = {
    pos: number;
    cov: [];
    donor: { "+": []; "-": []; ".": [] };
    acceptor: { "+": []; "-": []; ".": [] };
  };
  
  export function parseExpression(
    result: string,
    setExpression: React.Dispatch<React.SetStateAction<Expression[]>>
  ) {
    const rows = result.split("\n");
    const expressions: Expression[] = [];
    
    rows.forEach((row) => {
      const [seqid, posStr, covStr, sample, dpStr, dmStr, dnStr, apStr, amStr, anStr] = row.split("\t");
      // skip if the row is not data
      if (isNaN(parseInt(posStr, 10))) {
        return;
      }
      const pos = parseInt(posStr, 10);
      const cov = parseFloat(covStr);
      const dp = parseFloat(dpStr);
      const dm = parseFloat(dmStr);
      const dn = parseFloat(dnStr);
      const ap = parseFloat(apStr);
      const am = parseFloat(amStr);
      const an = parseFloat(anStr);
  
      // Ensure the expressions array is long enough to accommodate the position
      while (expressions.length <= pos+1) {
        expressions.push({
          pos: expressions.length,
          cov: [],
          donor: { "+": [], "-": [], ".": [] },
          acceptor: { "+": [], "-": [], ".": [] },
        });
      }
      
      expressions[pos].cov.push(cov);
      expressions[pos].donor["+"].push(dp);
      expressions[pos].donor["-"].push(dm);
      expressions[pos].donor["."].push(dn);
      expressions[pos].acceptor["+"].push(ap);
      expressions[pos].acceptor["-"].push(am);
      expressions[pos].acceptor["."].push(an);
    });
  
    setExpression(expressions);
  }
  
  
  // Function to parse Pathogen GTF data
  export function parsePathogenGTF(result: string, setPathogenGTF: React.Dispatch<React.SetStateAction<any>>) {
    const rows = result.split("\n");
    const transcripts: any = {};
    let genomeEnd = 0;
    const genomeComponents: any[] = [];
  
    rows.forEach((row) => {
      const lcs = row.split("\t");
      if (lcs.length < 9) return;
  
      const [ , , type, startStr, endStr, , , , attributes] = lcs;
      const start = +startStr;
      const end = +endStr;
      if (end > genomeEnd) genomeEnd = end;
  
      const tid = getAttribute(attributes, "transcript_id");
      if (type.toLowerCase() === "transcript" && tid) {
        transcripts[tid] = transcripts[tid] || { exons: [], cds: [], gene_name: "" };
        transcripts[tid].gene_name = getAttribute(attributes, "gene_name");
      }
  
      if (type.toLowerCase() === "exon" && tid) {
        transcripts[tid] = transcripts[tid] || { exons: [], cds: [], gene_name: "" };
        transcripts[tid].exons.push([start, end]);
      }
  
      if (type.toLowerCase() === "cds" && tid) {
        transcripts[tid] = transcripts[tid] || { exons: [], cds: [], gene_name: "" };
        transcripts[tid].cds.push([start, end]);
      }
  
      if (type.toLowerCase() === "long_terminal_repeat") {
        const ltrName = getAttribute(attributes, "note");
        genomeComponents.push({ type: "ltr", position: [start, end], name: ltrName });
      }
    });
  
    const gtfDonors = new Set<number>();
    const gtfAcceptors = new Set<number>();
    for (const tid in transcripts) {
      const exons = transcripts[tid].exons;
      if (exons.length > 1) {
        for (let i = 0; i < exons.length - 1; i++) {
          gtfDonors.add(exons[i][1]);
          gtfAcceptors.add(exons[i + 1][0]);
        }
      }
    }
  
    gtfDonors.forEach((donor, i) => genomeComponents.push({ type: "da", position: donor, name: `SD${i}` }));
    gtfAcceptors.forEach((acceptor, i) => genomeComponents.push({ type: "da", position: acceptor, name: `SA${i}` }));
    genomeComponents.sort((a, b) => a.position - b.position);

    // group transcripts by gene name
    const genes = {};
    for (const tid in transcripts) {
      const geneName = transcripts[tid].gene_name;
      genes[geneName] = genes[geneName] || [];
      genes[geneName].push(tid);
    }

    console.log(genes);
  
    setPathogenGTF({ transcripts, genome_end: genomeEnd, genome_components: genomeComponents, genes });
  }
  
  // Function to parse Integrations data
  export function parseIntegrations(result: string, setIntegrations: React.Dispatch<React.SetStateAction<any[]>>, setGenes: React.Dispatch<React.SetStateAction<any[]>>) {
    const rows = result.split("\n");
    const integrations: any[] = [];
    const integrationGenes: any = {};
  
    rows.forEach((row) => {
      const [seqid1, seqid2, pos1Str, pos2Str, countStr, gene1, gene2] = row.split("\t");
      const pos1 = +pos1Str;
      const pos2 = +pos2Str;
      const count = +countStr;
  
      integrations.push([seqid1, seqid2, pos1, pos2, count]);
  
      if (!integrationGenes[`${seqid1}:${pos1}`]) {
        integrationGenes[`${seqid1}:${pos1}`] = { name: gene2, position: [seqid1, pos1], count: 0 };
      }
      integrationGenes[`${seqid1}:${pos1}`].count += count;
    });
  
    setIntegrations(integrations);
    setGenes(geneDedup(integrationGenes, 100000));
  }
  