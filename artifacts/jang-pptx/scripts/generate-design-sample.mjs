import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateLecturePptx } from '../dist/index.js';

const lecture = {
  schemaVersion: '1.1',
  documentTitle: 'Cell Biology and Metabolism',
  direction: 'ltr',
  overview: {
    title: 'A sequence for learning',
    introduction: 'A complete engine-generated example using the approved premium academic design system.',
    keyPoints: [
      'Editable native PowerPoint text and shapes',
      'Deterministic pagination and continuation slides',
      'Professional tables, diagrams, and image framing',
    ],
  },
  sections: [
    {
      sectionId: 'respiration', sectionTitle: 'Cellular Respiration', slides: [
        {
          slideId: 'respiration-overview', slideTitle: 'The opportunity is not ATP alone',
          slideSubtitle: 'From glucose to usable cellular energy', sourceReferences: ['r1'],
          blocks: [
            { blockId: 'r1-p', type: 'paragraph', text: 'Cellular respiration is a coordinated sequence of reactions that converts chemical energy in glucose into ATP. Glycolysis begins in the cytoplasm, the citric acid cycle continues in the mitochondrial matrix, and oxidative phosphorylation uses the inner mitochondrial membrane to create most of the final ATP yield.', sourceReferences: ['r1'] },
            { blockId: 'r1-b', type: 'bullets', items: ['Glycolysis produces pyruvate and a small ATP yield', 'The citric acid cycle loads high-energy electron carriers', 'The electron transport chain establishes a proton gradient', 'ATP synthase converts that gradient into usable energy'], sourceReferences: ['r1'] },
          ],
        },
        {
          slideId: 'glycolysis', slideTitle: 'Glycolysis converts glucose into pyruvate', slideSubtitle: '', sourceReferences: ['r2'],
          blocks: [
            { blockId: 'r2-p', type: 'paragraph', text: 'The investment phase consumes ATP to prepare glucose for cleavage. The payoff phase produces ATP and NADH while forming two molecules of pyruvate.', sourceReferences: ['r2'] },
            { blockId: 'r2-d', type: 'diagram', label: 'Simplified glycolysis pathway', diagramRows: [['Glucose', 'Investment phase', 'Two 3-carbon molecules'], ['Payoff phase', 'ATP + NADH', 'Pyruvate']], sourceReferences: ['r2'] },
          ],
        },
        {
          slideId: 'atp-table', slideTitle: 'ATP production summary', slideSubtitle: '', sourceReferences: ['r3'],
          blocks: [
            { blockId: 'r3-c', type: 'callout', label: 'Key concept', text: 'Most ATP in aerobic respiration is produced by ATP synthase, driven by the proton gradient across the inner mitochondrial membrane.', tone: 'note', sourceReferences: ['r3'] },
            { blockId: 'r3-t', type: 'table', label: 'ATP yield by stage', headers: ['Stage', 'ATP', 'Location', 'Main output'], rows: [['Glycolysis', '2 net', 'Cytoplasm', 'Pyruvate + NADH'], ['Citric acid cycle', '2', 'Matrix', 'NADH + FADH₂'], ['Oxidative phosphorylation', '~34', 'Inner membrane', 'ATP via proton gradient'], ['Total', '~38', 'Cell', 'Energy for cellular work']], sourceReferences: ['r3'] },
          ],
        },
        {
          slideId: 'mitochondria-image', slideTitle: '', slideSubtitle: '', sourceReferences: ['r4'],
          blocks: [{ blockId: 'r4-i', type: 'image', slotId: 'mitochondria', label: 'Mitochondrial energy-conversion architecture', description: 'A local abstract illustration representing membrane compartments, electron flow, and the proton gradient.', important: true, sourceReference: 'Teaching illustration', fit: 'contain', preferredAspect: 'wide', sourceReferences: ['r4'] }],
        },
      ],
    },
    {
      sectionId: 'signaling', sectionTitle: 'Signal Transduction', slides: [
        {
          slideId: 'gpcr', slideTitle: 'G-protein–coupled receptor activation', slideSubtitle: 'A numbered sequence of editable steps', sourceReferences: ['s1'],
          blocks: [{ blockId: 's1-n', type: 'numbered', items: ['Ligand binds the extracellular receptor domain', 'The receptor changes conformation', 'GDP is exchanged for GTP on the Gα subunit', 'Gα-GTP and Gβγ activate downstream effectors', 'GTP hydrolysis resets the signaling complex'], sourceReferences: ['s1'] }],
        },
        {
          slideId: 'camp', slideTitle: 'From signal to supported cellular response', slideSubtitle: '', sourceReferences: ['s2'],
          blocks: [{ blockId: 's2-d', type: 'diagram', label: 'Epinephrine to cAMP signaling cascade', diagramRows: [['Epinephrine', 'β-adrenergic receptor', 'Gαs-GTP'], ['Adenylyl cyclase', 'cAMP', 'Protein kinase A'], ['Target proteins', 'Cellular response']], sourceReferences: ['s2'] }],
        },
        {
          slideId: 'evidence', slideTitle: 'What to evaluate before scaling', slideSubtitle: '', sourceReferences: ['s3'],
          blocks: [{ blockId: 's3-t', type: 'table', label: 'Evaluation dimensions', headers: ['Dimension', 'Question', 'Evidence', 'Signal', 'Owner'], rows: [['Usefulness', 'Does it improve the intended decision?', 'Time to action', 'Outcome', 'Clinical team'], ['Safety', 'Does it fail visibly?', 'Near misses', 'Guardrail', 'Quality team'], ['Equity', 'Does performance hold across groups?', 'Stratified results', 'Parity', 'Governance'], ['Trust', 'Do people understand its limits?', 'Calibration feedback', 'Confidence', 'Education'], ['Sustainability', 'Can the workflow support it?', 'Training and cost', 'Fit', 'Operations']], sourceReferences: ['s3'] }],
        },
      ],
    },
  ],
  endNote: 'Questions for discussion',
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720"><rect width="1200" height="720" fill="#111111"/><g fill="none" stroke="#777777" stroke-width="8" opacity=".8"><ellipse cx="575" cy="360" rx="420" ry="230"/><ellipse cx="575" cy="360" rx="310" ry="170"/><ellipse cx="575" cy="360" rx="190" ry="105"/></g><path d="M160 360h830" stroke="#505050" stroke-width="6"/><circle cx="575" cy="360" r="34" fill="#FAFAF9"/><circle cx="270" cy="245" r="20" fill="#777777"/><circle cx="920" cy="490" r="16" fill="#D7D7D5"/><text x="600" y="650" text-anchor="middle" font-family="Arial" font-size="34" fill="#D7D7D5">Editable local illustration</text></svg>`;
const images = {
  mitochondria: {
    fileName: 'mitochondria-architecture.svg', mimeType: 'image/svg+xml',
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  },
};

const result = await generateLecturePptx(lecture, images, { strictGeometry: true });
const outputDir = resolve('generated');
await mkdir(outputDir, { recursive: true });
const outputPath = resolve(outputDir, 'jang-approved-design-engine-example.pptx');
await writeFile(outputPath, Buffer.from(await result.blob.arrayBuffer()));
console.log(JSON.stringify({ outputPath, slideCount: result.slideCount, warnings: result.warnings }, null, 2));
