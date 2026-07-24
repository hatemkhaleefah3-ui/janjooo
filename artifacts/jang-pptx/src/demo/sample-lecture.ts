import type { LectureDocument } from '../schema/lecture-types';

/**
 * A realistic sample lecture for testing the PPTX engine.
 * Contains all block types: paragraph, bullets, subtitle, callout,
 * small table, large table, small diagram, large diagram, and two image slots.
 */
export const sampleLecture: LectureDocument = {
  schemaVersion: '1.0',
  documentTitle: 'Cell Biology and Metabolism: Core Concepts',
  direction: 'ltr',
  overview: {
    title: 'Course Overview',
    introduction:
      'This lecture covers the fundamental biochemical processes that power living cells, ' +
      'from ATP generation in cellular respiration to the molecular signaling cascades that ' +
      'regulate cell behavior. Students will understand how energy flows through biological systems.',
    keyPoints: [
      'ATP is the universal energy currency of cells',
      'Glycolysis converts glucose to pyruvate in 10 enzymatic steps',
      'The electron transport chain generates ~34 ATP per glucose molecule',
      'G-protein–coupled receptors initiate many cell-signaling pathways',
      'cAMP acts as a second messenger amplifying hormonal signals',
    ],
  },
  sections: [
    {
      sectionId: 'sec-respiration',
      sectionTitle: 'Cellular Respiration',
      slides: [
        {
          slideId: 'slide-resp-intro',
          slideTitle: 'Overview of Cellular Respiration',
          slideSubtitle: 'From glucose to ATP',
          sourceReferences: ['p1', 'p2'],
          blocks: [
            {
              blockId: 'b1-para',
              type: 'paragraph',
              text: 'Cellular respiration is the process by which cells break down glucose and other organic ' +
                'molecules to produce ATP, the primary energy currency of the cell. The process occurs ' +
                'in three main stages: glycolysis in the cytoplasm, the citric acid cycle in the ' +
                'mitochondrial matrix, and oxidative phosphorylation in the inner mitochondrial membrane.',
              sourceReferences: ['p1'],
            },
            {
              blockId: 'b1-bullets',
              type: 'bullets',
              items: [
                'Glycolysis: 2 ATP net (cytoplasm)',
                'Pyruvate oxidation: links glycolysis to TCA cycle',
                'Citric acid cycle: 2 ATP + electron carriers',
                'Oxidative phosphorylation: ~34 ATP via chemiosmosis',
                'Total yield: ~36–38 ATP per glucose molecule',
              ],
              sourceReferences: ['p1', 'p2'],
            },
          ],
        },
        {
          slideId: 'slide-glycolysis',
          slideTitle: 'Glycolysis Pathway',
          slideSubtitle: '',
          sourceReferences: ['p3'],
          blocks: [
            {
              blockId: 'b2-sub',
              type: 'subtitle',
              text: 'The Investment and Payoff Phases',
              sourceReferences: [],
            },
            {
              blockId: 'b2-para',
              type: 'paragraph',
              text: 'Glycolysis converts one glucose molecule into two pyruvate molecules through a 10-step ' +
                'enzymatic pathway. The first five steps (investment phase) consume 2 ATP to phosphorylate ' +
                'glucose and produce glyceraldehyde-3-phosphate. The final five steps (payoff phase) ' +
                'generate 4 ATP and 2 NADH, yielding a net gain of 2 ATP and 2 NADH.',
              sourceReferences: ['p3'],
            },
            {
              blockId: 'b2-diagram-small',
              type: 'diagram',
              label: 'Glycolysis simplified flow',
              diagramRows: [
                ['Glucose (C6)'],
                ['Fructose-1,6-bisphosphate'],
                ['2× Pyruvate (C3)'],
              ],
              sourceReferences: ['p3'],
            },
          ],
        },
        {
          slideId: 'slide-atp-table',
          slideTitle: 'ATP Production Summary',
          slideSubtitle: '',
          sourceReferences: ['p4'],
          blocks: [
            {
              blockId: 'b3-callout',
              type: 'callout',
              label: 'Key Concept',
              text: 'The majority of ATP in aerobic respiration is produced by ATP synthase, ' +
                'driven by the proton gradient across the inner mitochondrial membrane. ' +
                'This process is called chemiosmosis.',
              tone: 'note',
              sourceReferences: ['p4'],
            },
            {
              blockId: 'b3-table-small',
              type: 'table',
              label: 'ATP Yield by Stage',
              headers: ['Stage', 'ATP Produced', 'Location'],
              rows: [
                ['Glycolysis', '2 net', 'Cytoplasm'],
                ['Pyruvate oxidation', '0 (NADH only)', 'Mitochondrial matrix'],
                ['Citric acid cycle', '2', 'Mitochondrial matrix'],
                ['Oxidative phosphorylation', '~34', 'Inner mitochondrial membrane'],
                ['Total', '~38', 'Cell'],
              ],
              sourceReferences: ['p4'],
            },
          ],
        },
        {
          slideId: 'slide-etc-table',
          slideTitle: 'Electron Transport Chain Components',
          slideSubtitle: '',
          sourceReferences: ['p5'],
          blocks: [
            {
              blockId: 'b4-table-large',
              type: 'table',
              label: 'ETC Protein Complexes and Function',
              headers: ['Complex', 'Name', 'Prosthetic Groups', 'Function', 'Protons Pumped'],
              rows: [
                ['I', 'NADH dehydrogenase', 'FMN, Fe-S clusters', 'Oxidizes NADH, transfers e⁻ to CoQ', '4H⁺'],
                ['II', 'Succinate dehydrogenase', 'FAD, Fe-S, heme b', 'Oxidizes succinate, transfers e⁻ to CoQ', '0H⁺'],
                ['III', 'Cytochrome bc₁', 'Heme b, heme c₁, Fe-S', 'Transfers e⁻ from CoQH₂ to cyt c', '4H⁺'],
                ['IV', 'Cytochrome c oxidase', 'Heme a, heme a₃, Cu²⁺', 'Transfers e⁻ to O₂, forms H₂O', '2H⁺'],
                ['V', 'ATP synthase (F₀F₁)', 'None', 'Synthesizes ATP via proton flow', 'N/A'],
              ],
              sourceReferences: ['p5'],
            },
          ],
        },
        {
          slideId: 'slide-mito-image',
          slideTitle: '',
          slideSubtitle: '',
          sourceReferences: ['p6'],
          blocks: [
            {
              blockId: 'b5-image-mito',
              type: 'image',
              slotId: 'img-mitochondria',
              label: 'Mitochondria transmission electron micrograph',
              description: 'TEM showing the double-membrane structure of a mitochondrion, ' +
                'cristae folding, and matrix compartment from a liver hepatocyte.',
              important: true,
              sourceReference: 'p6',
              fit: 'contain',
              preferredAspect: 'wide',
              sourceReferences: ['p6'],
            },
          ],
        },
      ],
    },
    {
      sectionId: 'sec-signaling',
      sectionTitle: 'Signal Transduction',
      slides: [
        {
          slideId: 'slide-gpcr',
          slideTitle: 'G-Protein–Coupled Receptors',
          slideSubtitle: 'Mechanism of Action',
          sourceReferences: ['p7', 'p8'],
          blocks: [
            {
              blockId: 'b6-sub',
              type: 'subtitle',
              text: 'Receptor Activation and G-Protein Dissociation',
              sourceReferences: [],
            },
            {
              blockId: 'b6-para',
              type: 'paragraph',
              text: 'G-protein–coupled receptors (GPCRs) are the largest family of membrane receptors in mammals, ' +
                'with over 800 members. They transmit signals across the plasma membrane by coupling to ' +
                'heterotrimeric G-proteins (Gα, Gβ, Gγ). Ligand binding induces a conformational change ' +
                'that promotes GDP/GTP exchange on the Gα subunit, causing dissociation of Gα-GTP ' +
                'from the Gβγ dimer. Both active species modulate downstream effectors.',
              sourceReferences: ['p7'],
            },
            {
              blockId: 'b6-numbered',
              type: 'numbered',
              items: [
                'Ligand binds extracellular domain of GPCR',
                'Receptor undergoes conformational change',
                'GDP on Gα is replaced by GTP (GDP/GTP exchange)',
                'Gα-GTP dissociates from Gβγ dimer',
                'Both Gα-GTP and Gβγ activate downstream effectors',
                'Intrinsic GTPase activity of Gα hydrolyzes GTP → GDP',
                'Gα-GDP reassociates with Gβγ (receptor inactivated)',
              ],
              sourceReferences: ['p8'],
            },
          ],
        },
        {
          slideId: 'slide-camp-pathway',
          slideTitle: 'cAMP Second Messenger Cascade',
          slideSubtitle: '',
          sourceReferences: ['p9'],
          blocks: [
            {
              blockId: 'b7-diagram-large',
              type: 'diagram',
              label: 'Epinephrine → cAMP → PKA signaling cascade',
              diagramRows: [
                ['Epinephrine (ligand)'],
                ['β-Adrenergic receptor (GPCR)'],
                ['Gαs-GTP (active)'],
                ['Adenylyl cyclase (activated)'],
                ['ATP → cAMP (second messenger)'],
                ['PKA (cAMP-dependent protein kinase)'],
                ['Phosphorylation of target proteins'],
                ['Glycogen phosphorylase activation', 'CREB transcription factor'],
              ],
              sourceReferences: ['p9'],
            },
          ],
        },
        {
          slideId: 'slide-receptor-image',
          slideTitle: '',
          slideSubtitle: '',
          sourceReferences: ['p10'],
          blocks: [
            {
              blockId: 'b8-image-receptor',
              type: 'image',
              slotId: 'img-receptor-structure',
              label: 'β₂-Adrenergic receptor crystal structure',
              description: 'X-ray crystallographic structure of the human β₂-adrenergic receptor ' +
                'bound to carazolol (antagonist), showing the 7-transmembrane helix bundle ' +
                'and intracellular G-protein binding site.',
              important: true,
              sourceReference: 'p10',
              fit: 'contain',
              preferredAspect: 'portrait',
              sourceReferences: ['p10'],
            },
          ],
        },
      ],
    },
  ],
  endNote: 'Thank you for your attention.\nQuestions and discussion welcome.',
  extractionAudit: {
    sourceType: 'pdf',
    sourcePageOrSlideCount: 10,
    coveredSourceReferences: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'],
    unmappedSourceReferences: [],
    warnings: [],
  },
};
