import React from 'react';
import './About.css';

function About() {
  return (
    <div className="about-container">
      <h2>About the CHESS Project</h2>
      <p>
        CHESS is a comprehensive set of human genes based on nearly 10,000 RNA sequencing experiments produced by the GTEx project. It includes a total of 19838 protein-coding genes and 17624 lncRNA genes. Adding antisense and other RNA genes, release v.3.0.1 of the database contains 63755 genes and 168451 transcripts. Of these transcripts, 99201 represent protein-coding gene isoforms and the rest are noncoding RNAs.
      </p>
      <h3>Publications</h3>
      <ul>
        <li>
          Varabyou, A., Sommer, M. J., Erdogdu, B., Shinder, I., Minkin, I., ... & Pertea, M. (2022). CHESS 3: an improved, comprehensive catalog of human genes and transcripts based on large-scale expression data, phylogenetic analysis, and protein structure. bioRxiv.
        </li>
        <li>
          Pertea, M., Shumate, A., Pertea, G., Varabyou, A., Breitwieser, F. P., Chang, Y. C., ... & Salzberg, S. L. (2018). CHESS: a new human gene catalog curated from thousands of large-scale RNA sequencing experiments reveals extensive transcriptional noise. Genome biology, 19(1), 1-14.
        </li>
      </ul>
      <h3>Website Authors</h3>
      <ul>
        <li>Ales Varabyou</li>
        <li>Mihaela Pertea</li>
        <li>Steven Salzberg</li>
      </ul>
    </div>
  );
}

export default About;
