import { mkdir, writeFile } from 'node:fs/promises';
import { generateLecturePptx } from '../dist/index.js';

const svg = (label, fill = '#777777') => `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="${fill}"/><circle cx="350" cy="390" r="230" fill="#111111"/><rect x="650" y="160" width="380" height="480" rx="36" fill="#fafaf9"/><text x="840" y="410" font-family="Arial" font-size="46" text-anchor="middle" fill="#111111">${label}</text></svg>`).toString('base64')}`;

const lecture = {
  schemaVersion: '1.2',
  documentTitle: 'Hierarchical Amino Acid Metabolism',
  direction: 'ltr',
  overview: {
    title: 'Lecture Overview: Amino Acid Metabolism',
    introduction: 'A complete teaching sequence that preserves source facts while reorganizing them into sections, titles, sub-titles, definitions, pathways, tables, notes, lists, and important image positions.',
    keyPoints: ['Glycine Metabolism', 'Phenylalanine and Tyrosine Metabolism'],
  },
  sections: [
    {
      sectionId: 'glycine',
      sectionTitle: 'Glycine Metabolism',
      sectionDefinition: 'Glycine metabolism connects amino-acid interconversion, one-carbon transfer, neurotransmission, biosynthesis, and clinical disease.',
      slides: [
        {
          slideId: 'glycine-overview',
          slideTitle: 'Metabolic Roles of Glycine',
          titleDefinition: 'Glycine acts as a biosynthetic substrate, inhibitory neurotransmitter, and donor to one-carbon metabolism.',
          slideSubtitle: 'Core functions',
          subtitleDefinition: 'The major physiological roles that explain why glycine appears in many pathways.',
          sourceReferences: ['p1', 'p2'],
          blocks: [
            { blockId: 'g-paragraph', type: 'paragraph', text: 'Glycine contributes carbon and nitrogen to purines, heme, creatine, glutathione, and protein synthesis while also functioning as an inhibitory neurotransmitter.', sourceReferences: ['p1'] },
            { blockId: 'g-list', type: 'bullets', items: ['Purine and heme synthesis', 'Glutathione and antioxidant defense', 'Inhibitory neurotransmission'], sourceReferences: ['p2'] },
          ],
        },
        {
          slideId: 'glycine-pathway',
          slideTitle: 'Glycine Synthesis and Degradation',
          titleDefinition: 'Reversible serine conversion and the glycine-cleavage system determine glycine availability.',
          slideSubtitle: 'Ordered reactions',
          subtitleDefinition: 'Substrates, enzymes, products, and cofactors are retained as an editable pathway and explanatory text.',
          sourceReferences: ['p3'],
          blocks: [
            { blockId: 'g-path-text', type: 'paragraph', text: 'Serine hydroxymethyltransferase converts serine to glycine while transferring a one-carbon unit to tetrahydrofolate. The glycine-cleavage system then degrades glycine to carbon dioxide, ammonia, and a methylene group.', sourceReferences: ['p3'] },
            { blockId: 'g-path', type: 'diagram', label: 'Glycine pathway', diagramType: 'metabolic', diagramRows: [['Serine', 'Glycine', '5,10-methylene-THF'], ['Glycine', 'CO₂ + NH₃', 'One-carbon pool']], sourceReferences: ['p3'] },
            { blockId: 'g-note', type: 'callout', label: 'Clinical link', text: 'Defects in the glycine-cleavage system cause nonketotic hyperglycinemia.', tone: 'warning', sourceReferences: ['p3'] },
          ],
        },
      ],
    },
    {
      sectionId: 'aromatic',
      sectionTitle: 'Phenylalanine and Tyrosine Metabolism',
      sectionDefinition: 'Aromatic amino-acid metabolism links phenylalanine conversion to neurotransmitters, thyroid hormones, melanin, and inherited disorders.',
      slides: [
        {
          slideId: 'aromatic-products',
          slideTitle: 'Biosynthesis of Specialized Products from Tyrosine',
          titleDefinition: 'Tyrosine is a shared precursor for catecholamines, thyroid hormones, and melanin.',
          slideSubtitle: 'Precursor flow',
          subtitleDefinition: 'The pathway preserves the ordered conversions while the definitions explain their physiological meaning.',
          sourceReferences: ['p10', 'p11'],
          blocks: [
            { blockId: 'a-paragraph', type: 'paragraph', text: 'Phenylalanine hydroxylase converts phenylalanine to tyrosine. Tyrosine then enters several specialized biosynthetic routes with distinct enzymes and tissue distributions.', sourceReferences: ['p10'] },
            { blockId: 'a-image', type: 'image', slotId: 'clinical-photo', label: 'Clinical photograph', description: 'A safely croppable clinical photograph demonstrating a visible phenotype.', important: true, sourceReference: 'p11', fit: 'contain', visualType: 'photo', preferredAspect: 'portrait', sourceReferences: ['p11'] },
            { blockId: 'a-title', type: 'title', text: 'Clinical Consequences', definition: 'Enzyme defects redirect metabolites and produce characteristic disease patterns.', sourceReferences: ['p12'] },
            { blockId: 'a-subtitle', type: 'subtitle', text: 'Phenylketonuria', definition: 'Phenylalanine hydroxylase deficiency elevates phenylalanine and reduces tyrosine availability.', sourceReferences: ['p12'] },
            { blockId: 'a-table', type: 'table', tableType: 'comparison', label: 'Disorders and defects', headers: ['Disorder', 'Defect', 'Key consequence'], rows: [['PKU', 'Phenylalanine hydroxylase', 'High phenylalanine'], ['Alkaptonuria', 'Homogentisate oxidase', 'Homogentisic acid accumulation']], sourceReferences: ['p12'] },
          ],
        },
      ],
    },
  ],
  endNote: 'Complete lecture reconstruction covering Glycine, Phenylalanine, and Tyrosine metabolism and clinical correlates.',
};

const importedImages = {
  'clinical-photo': { dataUrl: svg('Clinical image', '#8a8a8a'), fileName: 'clinical.svg', mimeType: 'image/svg+xml' },
};

await mkdir('generated', { recursive: true });
const result = await generateLecturePptx(lecture, importedImages, { strictGeometry: true });
await writeFile('generated/issue29-hierarchical-review.pptx', Buffer.from(await result.blob.arrayBuffer()));
await writeFile('generated/issue29-hierarchical-review.json', JSON.stringify({ slideCount: result.slideCount, warnings: result.warnings }, null, 2));
if (result.warnings.some((warning) => warning.startsWith('Geometry:'))) throw new Error(result.warnings.join('\n'));
console.log(`Generated ${result.slideCount} slides with ${result.warnings.length} warnings.`);
