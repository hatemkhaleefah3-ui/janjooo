import React, { useState } from 'react';
import { validateLecture } from '@/schema/validate-lecture';
import { generateLecturePptx } from '@/renderer/generate-lecture-pptx';
import { sampleLecture } from '@/demo/sample-lecture';
import { sampleImages } from '@/demo/sample-images';
import {
  IMAGE_FILE_ACCEPT,
  LECTURE_FILE_ACCEPT,
  parseLectureJsonText,
  readImageFile,
  readLectureJsonFile,
} from '@/demo/import-files';
import type { LectureDocument, ImageBlock, ImportedImage } from '@/schema/lecture-types';
import { richTextToPlain } from '@/renderer/rich-text';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  Image as ImageIcon,
  Loader2,
  Play,
  Upload,
  XCircle,
} from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

function Button({ className, variant = 'primary', size = 'default', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };
  const sizes = {
    default: 'h-10 py-2 px-4 text-sm',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-12 px-8 text-base',
  };

  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className || ''}`} {...props} />;
}

export default function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [lectureFileName, setLectureFileName] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [parsedLecture, setParsedLecture] = useState<LectureDocument | null>(null);

  const [importedImages, setImportedImages] = useState<Record<string, ImportedImage>>({});
  const [imageImportErrors, setImageImportErrors] = useState<Record<string, string>>({});

  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [generationResultBlob, setGenerationResultBlob] = useState<Blob | null>(null);
  const [generationWarnings, setGenerationWarnings] = useState<string[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const resetGeneration = () => {
    setGenerationState('idle');
    setGenerationResultBlob(null);
    setGenerationWarnings([]);
    setGenerationError(null);
  };

  const applyLectureValidation = (data: unknown) => {
    const { valid, errors, warnings } = validateLecture(data);
    setValidationWarnings(warnings || []);

    if (valid) {
      setValidationState('valid');
      setParsedLecture(data as LectureDocument);
      setValidationErrors([]);
      return;
    }

    setValidationState('invalid');
    setValidationErrors(errors || ['The lecture document is invalid.']);
    setParsedLecture(null);
  };

  const handleLoadSample = () => {
    setJsonInput(JSON.stringify(sampleLecture, null, 2));
    setLectureFileName('Bundled sample');
    setImportedImages(sampleImages);
    setImageImportErrors({});
    resetGeneration();
    applyLectureValidation(sampleLecture);
  };

  const handleClear = () => {
    setJsonInput('');
    setLectureFileName(null);
    setValidationState('idle');
    setValidationErrors([]);
    setValidationWarnings([]);
    setParsedLecture(null);
    setImportedImages({});
    setImageImportErrors({});
    resetGeneration();
  };

  const handleJsonChange = (value: string) => {
    setJsonInput(value);
    setLectureFileName(null);
    setValidationState('idle');
    setValidationErrors([]);
    setValidationWarnings([]);
    setParsedLecture(null);
    resetGeneration();
  };

  const handleValidate = () => {
    setValidationState('validating');
    resetGeneration();

    try {
      applyLectureValidation(parseLectureJsonText(jsonInput));
    } catch (error) {
      setValidationState('invalid');
      setValidationErrors([error instanceof Error ? error.message : 'Invalid JSON format']);
      setValidationWarnings([]);
      setParsedLecture(null);
    }
  };

  const handleLectureFileImport = async (file: File) => {
    setValidationState('validating');
    setValidationErrors([]);
    setValidationWarnings([]);
    setParsedLecture(null);
    setImportedImages({});
    setImageImportErrors({});
    resetGeneration();

    try {
      const { text, data } = await readLectureJsonFile(file);
      setJsonInput(text);
      setLectureFileName(file.name);
      applyLectureValidation(data);
    } catch (error) {
      setJsonInput('');
      setLectureFileName(file.name);
      setValidationState('invalid');
      setValidationErrors([error instanceof Error ? error.message : `Could not import ${file.name}.`]);
    }
  };

  const handleImageImport = async (slotId: string, file: File) => {
    setImageImportErrors((previous) => {
      const next = { ...previous };
      delete next[slotId];
      return next;
    });

    try {
      const importedImage = await readImageFile(file);
      setImportedImages((previous) => ({ ...previous, [slotId]: importedImage }));
      resetGeneration();
    } catch (error) {
      setImageImportErrors((previous) => ({
        ...previous,
        [slotId]: error instanceof Error ? error.message : `Could not import ${file.name}.`,
      }));
    }
  };

  const handleGenerate = async () => {
    if (!parsedLecture) return;
    setGenerationState('generating');
    setGenerationError(null);
    setGenerationWarnings([]);
    setGenerationResultBlob(null);

    try {
      const result = await generateLecturePptx(parsedLecture, importedImages);
      setGenerationState('success');
      setGenerationResultBlob(result.blob);
      setGenerationWarnings(result.warnings || []);
    } catch (error) {
      setGenerationState('error');
      setGenerationError(error instanceof Error ? error.message : 'Unknown generation error');
    }
  };

  const handleDownload = () => {
    if (!generationResultBlob) return;
    const url = URL.createObjectURL(generationResultBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'lecture.pptx';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const imageBlocks: ImageBlock[] = [];
  for (const section of parsedLecture?.sections || []) {
    for (const slide of section.slides || []) {
      for (const block of slide.blocks || []) {
        if (block.type === 'image') imageBlocks.push(block);
      }
    }
  }

  const slideCount = parsedLecture?.sections?.reduce((total, section) => total + (section.slides?.length || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-24 selection:bg-primary/20 selection:text-primary">
      <header className="bg-primary text-primary-foreground py-6 px-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Jang PPTX Engine</h1>
            <p className="text-primary-foreground/80 mt-1 text-sm font-medium">Native PowerPoint from structured lecture JSON</p>
          </div>
          <Button onClick={handleLoadSample} variant="secondary">Load Sample</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 px-8 space-y-8">
        <section className="bg-card border border-border shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/40 flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <FileJson className="w-5 h-5 text-muted-foreground" />
                JSON Input
              </h2>
              {lectureFileName && <p className="mt-1 text-xs text-muted-foreground">Loaded: {lectureFileName}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">{jsonInput.length} chars</span>
              <label className="cursor-pointer inline-flex h-8 items-center justify-center rounded-md border border-input bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Import JSON
                <input
                  type="file"
                  accept={LECTURE_FILE_ACCEPT}
                  className="sr-only"
                  onChange={(event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];
                    input.value = '';
                    if (file) void handleLectureFileImport(file);
                  }}
                />
              </label>
              <Button variant="outline" size="sm" onClick={handleClear}>Clear</Button>
              <Button size="sm" onClick={handleValidate} disabled={validationState === 'validating' || !jsonInput.trim()}>
                {validationState === 'validating' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Validate
              </Button>
            </div>
          </div>
          <textarea
            value={jsonInput}
            onChange={(event) => handleJsonChange(event.target.value)}
            className="w-full h-80 p-6 bg-transparent font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20"
            placeholder="Paste lecture JSON here or choose Import JSON..."
            spellCheck={false}
          />
        </section>

        <AnimatePresence>
          {validationState !== 'idle' && validationState !== 'validating' && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
              aria-live="polite"
            >
              <div className={`p-6 border rounded-lg shadow-sm ${validationState === 'valid' ? 'bg-[#f0fdf4] border-[#bbf7d0]' : 'bg-[#fef2f2] border-[#fecaca]'}`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  {validationState === 'valid' ? (
                    <><CheckCircle2 className="w-5 h-5 text-[#16a34a]" /><span className="text-[#166534]">Valid ✓</span></>
                  ) : (
                    <><XCircle className="w-5 h-5 text-[#dc2626]" /><span className="text-[#991b1b]">Validation Failed</span></>
                  )}
                </h3>

                {validationErrors.length > 0 && (
                  <ul className="space-y-2 mb-4">
                    {validationErrors.map((error, index) => (
                      <li key={`${error}-${index}`} className="text-sm text-[#b91c1c] font-mono bg-[#fef2f2] p-2.5 rounded border border-[#fecaca]">{error}</li>
                    ))}
                  </ul>
                )}

                {validationWarnings.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-black/5">
                    <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Warnings
                    </h4>
                    <ul className="space-y-1.5">
                      {validationWarnings.map((warning, index) => (
                        <li key={`${warning}-${index}`} className="text-sm text-amber-800 font-mono flex items-start">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 mr-2 flex-shrink-0" />{warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {validationState === 'valid' && parsedLecture && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-8">
              <section className="bg-card border border-border shadow-sm rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/40">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" /> Image Slots
                  </h2>
                </div>
                <div className="p-6">
                  {imageBlocks.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No image blocks found in the lecture.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {imageBlocks.map((block) => {
                        const importedImage = importedImages[block.slotId];
                        const importError = imageImportErrors[block.slotId];
                        return (
                          <div key={`${block.blockId}:${block.slotId}`} className="flex gap-4 p-4 border border-border rounded-lg bg-muted/20 items-start">
                            <div className="w-20 h-20 bg-card rounded border border-border flex-shrink-0 overflow-hidden flex items-center justify-center shadow-sm">
                              {importedImage ? (
                                <img src={importedImage.dataUrl} alt={richTextToPlain(block.label)} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col gap-1 mb-2">
                                <span className="font-semibold truncate text-sm leading-tight">{richTextToPlain(block.label)}</span>
                                <span className="text-[11px] font-mono bg-primary/5 text-primary/80 border border-primary/10 px-1.5 py-0.5 rounded self-start">{block.slotId}</span>
                              </div>
                              {richTextToPlain(block.description) && (
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2" title={richTextToPlain(block.description)}>{richTextToPlain(block.description)}</p>
                              )}
                              {block.sourceReference && (
                                <p className="text-[10px] text-muted-foreground mb-3 font-mono opacity-80 truncate">SRC: {block.sourceReference}</p>
                              )}

                              <div className="flex flex-wrap items-center gap-3 mt-auto">
                                <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-card shadow-sm hover:bg-accent hover:text-accent-foreground h-7 px-3 transition-colors">
                                  <Upload className="w-3 h-3 mr-1.5" />
                                  {importedImage ? 'Replace Image' : 'Import Image'}
                                  <input
                                    type="file"
                                    accept={IMAGE_FILE_ACCEPT}
                                    className="sr-only"
                                    onChange={(event) => {
                                      const input = event.currentTarget;
                                      const file = input.files?.[0];
                                      input.value = '';
                                      if (file) void handleImageImport(block.slotId, file);
                                    }}
                                  />
                                </label>
                                {importedImage && (
                                  <span className="text-[11px] text-[#16a34a] font-medium flex items-center min-w-0" title={importedImage.fileName}>
                                    <CheckCircle2 className="w-3 h-3 mr-1 flex-shrink-0" /><span className="truncate">{importedImage.fileName || 'Loaded'}</span>
                                  </span>
                                )}
                              </div>
                              {importError && <p className="mt-2 text-xs text-[#b91c1c]" role="alert">{importError}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-card border border-border shadow-sm rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/40">
                  <h2 className="font-semibold text-foreground flex items-center gap-2"><Play className="w-5 h-5 text-muted-foreground" /> Generation Controls</h2>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <Button onClick={handleGenerate} disabled={generationState === 'generating'} className="min-w-[180px] shadow-sm">
                      {generationState === 'generating' ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating PPTX...</>
                      ) : (
                        <><Play className="w-4 h-4 mr-2" /> Generate PPTX</>
                      )}
                    </Button>
                    {generationState === 'success' && generationResultBlob && (
                      <Button onClick={handleDownload} className="bg-[#16a34a] hover:bg-[#15803d] text-white shadow-sm">
                        <Download className="w-4 h-4 mr-2" /> Download lecture.pptx
                      </Button>
                    )}
                  </div>

                  {generationState === 'error' && (
                    <div className="mt-6 p-4 bg-[#fef2f2] border border-[#fecaca] rounded-md text-sm" role="alert">
                      <strong className="text-[#991b1b]">Error generating PPTX:</strong><span className="text-[#b91c1c] ml-2">{generationError}</span>
                    </div>
                  )}

                  {generationState === 'success' && (
                    <div className="mt-6 space-y-4">
                      <div className="text-sm font-medium text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-3 rounded-md flex items-center">
                        <CheckCircle2 className="w-5 h-5 mr-2 text-[#16a34a]" /> Generated {slideCount} slides successfully.
                      </div>
                      <div className="border border-border rounded-md overflow-hidden shadow-sm">
                        <div className="bg-muted/50 px-4 py-2 border-b border-border flex justify-between items-center">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generation Log</h3>
                          <span className="text-[10px] bg-background border border-border px-1.5 py-0.5 rounded text-muted-foreground font-mono">{generationWarnings.length} Warnings</span>
                        </div>
                        <div className="p-4 bg-card max-h-[300px] overflow-y-auto">
                          {generationWarnings.length === 0 ? (
                            <div className="flex items-center text-sm text-[#16a34a] font-medium"><CheckCircle2 className="w-4 h-4 mr-2" /> No warnings</div>
                          ) : (
                            <ul className="space-y-2">
                              {generationWarnings.map((warning, index) => (
                                <li key={`${warning}-${index}`} className="text-sm text-amber-800 font-mono flex items-start bg-amber-50 p-2.5 rounded border border-amber-100">
                                  <AlertTriangle className="w-4 h-4 mr-2.5 flex-shrink-0 mt-0.5 text-amber-600" /><span>{warning}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
