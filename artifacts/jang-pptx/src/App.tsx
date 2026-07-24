import React, { useState } from 'react';
import { validateLecture } from '@/schema/validate-lecture';
import { generateLecturePptx } from '@/renderer/generate-lecture-pptx';
import { sampleLecture } from '@/demo/sample-lecture';
import { sampleImages } from '@/demo/sample-images';
import type { LectureDocument, ImageBlock, ImportedImage } from '@/schema/lecture-types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Download, FileJson, Image as ImageIcon, Loader2, Play, Upload, XCircle, AlertTriangle } from 'lucide-react';

// Reusable Button Component avoiding external missing dependencies
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}
function Button({ className, variant = 'primary', size = 'default', ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };
  const sizes = {
    default: "h-10 py-2 px-4 text-sm",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-8 text-base",
  };
  
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className || ''}`} {...props} />
  );
}

export default function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [parsedLecture, setParsedLecture] = useState<LectureDocument | null>(null);
  
  const [importedImages, setImportedImages] = useState<Record<string, ImportedImage>>({});
  
  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [generationResultBlob, setGenerationResultBlob] = useState<Blob | null>(null);
  const [generationWarnings, setGenerationWarnings] = useState<string[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleLoadSample = () => {
    setJsonInput(JSON.stringify(sampleLecture, null, 2));
    setImportedImages(sampleImages);
    setValidationState('idle');
    setGenerationState('idle');
  };

  const handleClear = () => {
    setJsonInput('');
    setValidationState('idle');
    setValidationErrors([]);
    setValidationWarnings([]);
    setParsedLecture(null);
    setImportedImages({});
    setGenerationState('idle');
    setGenerationResultBlob(null);
    setGenerationWarnings([]);
    setGenerationError(null);
  };

  const handleValidate = () => {
    setValidationState('validating');
    
    // Slight delay to register visual feedback
    setTimeout(() => {
      try {
        const data = JSON.parse(jsonInput);
        const { valid, errors, warnings } = validateLecture(data);
        
        if (valid) {
          setValidationState('valid');
          setParsedLecture(data as LectureDocument);
          setValidationWarnings(warnings || []);
          setValidationErrors([]);
        } else {
          setValidationState('invalid');
          setValidationErrors(errors || []);
          setValidationWarnings(warnings || []);
          setParsedLecture(null);
        }
      } catch (e) {
        setValidationState('invalid');
        setValidationErrors([e instanceof Error ? e.message : 'Invalid JSON format']);
        setValidationWarnings([]);
        setParsedLecture(null);
      }
    }, 400);
  };

  const handleImageImport = (slotId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImportedImages(prev => ({
        ...prev,
        [slotId]: {
          dataUrl,
          fileName: file.name,
          mimeType: file.type
        }
      }));
    };
    reader.readAsDataURL(file);
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
    } catch (err) {
      setGenerationState('error');
      setGenerationError(err instanceof Error ? err.message : 'Unknown generation error');
    }
  };

  const handleDownload = () => {
    if (!generationResultBlob) return;
    const url = URL.createObjectURL(generationResultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lecture.pptx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Extract Image Blocks safely
  const imageBlocks: ImageBlock[] = [];
  if (parsedLecture?.sections) {
    for (const section of parsedLecture.sections) {
      if (section.slides) {
        for (const slide of section.slides) {
          if (slide.blocks) {
            for (const block of slide.blocks) {
              if (block.type === 'image') {
                imageBlocks.push(block as ImageBlock);
              }
            }
          }
        }
      }
    }
  }

  // Calculate slide count safely
  const slideCount = parsedLecture?.sections?.reduce((acc, sec) => acc + (sec.slides?.length || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-24 selection:bg-primary/20 selection:text-primary">
      {/* 1. HEADER */}
      <header className="bg-primary text-primary-foreground py-6 px-8 shadow-sm">
         <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Jang PPTX Engine</h1>
              <p className="text-primary-foreground/80 mt-1 text-sm font-medium">Native PowerPoint from structured lecture JSON</p>
            </div>
            <Button onClick={handleLoadSample} variant="secondary">
              Load Sample
            </Button>
         </div>
      </header>
      
      <main className="max-w-5xl mx-auto mt-8 px-8 space-y-8">
        
        {/* 2. JSON INPUT PANEL */}
        <section className="bg-card border border-border shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/40 flex justify-between items-center">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <FileJson className="w-5 h-5 text-muted-foreground" />
              JSON Input
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                {jsonInput.length} chars
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClear}>Clear</Button>
                <Button size="sm" onClick={handleValidate} disabled={validationState === 'validating'}>
                  {validationState === 'validating' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Validate
                </Button>
              </div>
            </div>
          </div>
          <div className="p-0">
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-80 p-6 bg-transparent font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20"
              placeholder="Paste lecture JSON here..."
              spellCheck={false}
            />
          </div>
        </section>
        
        {/* 3. VALIDATION RESULTS */}
        <AnimatePresence>
          {validationState !== 'idle' && validationState !== 'validating' && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={`p-6 border rounded-lg shadow-sm ${validationState === 'valid' ? 'bg-[#f0fdf4] border-[#bbf7d0]' : 'bg-[#fef2f2] border-[#fecaca]'}`}>
                 <h3 className="font-semibold mb-4 flex items-center gap-2">
                   {validationState === 'valid' ? (
                     <><CheckCircle2 className="w-5 h-5 text-[#16a34a]" /> <span className="text-[#166534]">Valid ✓</span></>
                   ) : (
                     <><XCircle className="w-5 h-5 text-[#dc2626]" /> <span className="text-[#991b1b]">Validation Failed</span></>
                   )}
                 </h3>
                 
                 {validationErrors.length > 0 && (
                   <ul className="space-y-2 mb-4">
                     {validationErrors.map((err, i) => (
                       <li key={i} className="text-sm text-[#b91c1c] font-mono bg-[#fef2f2] p-2.5 rounded border border-[#fecaca]">
                         {err}
                       </li>
                     ))}
                   </ul>
                 )}
                 
                 {validationWarnings.length > 0 && (
                   <div className="mt-4 pt-4 border-t border-black/5">
                     <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                       <AlertTriangle className="w-4 h-4 text-amber-600" /> Warnings
                     </h4>
                     <ul className="space-y-1.5">
                       {validationWarnings.map((warn, i) => (
                         <li key={i} className="text-sm text-amber-800 font-mono flex items-start">
                           <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 mr-2 flex-shrink-0" />
                           {warn}
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-8"
            >
              {/* 4. IMAGE SLOTS PANEL */}
              <section className="bg-card border border-border shadow-sm rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/40">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    Image Slots
                  </h2>
                </div>
                <div className="p-6">
                  {imageBlocks.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No image blocks found in the lecture.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {imageBlocks.map(block => (
                        <div key={block.slotId} className="flex gap-4 p-4 border border-border rounded-lg bg-muted/20 items-start">
                           <div className="w-20 h-20 bg-card rounded border border-border flex-shrink-0 overflow-hidden flex items-center justify-center shadow-sm">
                             {importedImages[block.slotId] ? (
                               <img src={importedImages[block.slotId].dataUrl} alt={block.label} className="w-full h-full object-cover" />
                             ) : (
                               <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                             )}
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="flex flex-col gap-1 mb-2">
                               <span className="font-semibold truncate text-sm leading-tight">{block.label}</span>
                               <span className="text-[11px] font-mono bg-primary/5 text-primary/80 border border-primary/10 px-1.5 py-0.5 rounded self-start">
                                 {block.slotId}
                               </span>
                             </div>
                             {block.description && (
                               <p className="text-xs text-muted-foreground mb-2 line-clamp-2" title={block.description}>
                                 {block.description}
                               </p>
                             )}
                             {block.sourceReference && (
                               <p className="text-[10px] text-muted-foreground mb-3 font-mono opacity-80 truncate">
                                 SRC: {block.sourceReference}
                               </p>
                             )}
                             
                             <div className="flex items-center mt-auto">
                               <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-card shadow-sm hover:bg-accent hover:text-accent-foreground h-7 px-3 transition-colors">
                                 <Upload className="w-3 h-3 mr-1.5" />
                                 Import Image
                                 <input
                                   type="file"
                                   accept="image/*"
                                   className="hidden"
                                   onChange={(e) => {
                                     const file = e.target.files?.[0];
                                     if (file) handleImageImport(block.slotId, file);
                                   }}
                                 />
                               </label>
                               {importedImages[block.slotId] && (
                                 <span className="ml-3 text-[11px] text-[#16a34a] font-medium flex items-center">
                                   <CheckCircle2 className="w-3 h-3 mr-1" /> Loaded
                                 </span>
                               )}
                             </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* 5. GENERATION CONTROLS */}
              <section className="bg-card border border-border shadow-sm rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/40">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Play className="w-5 h-5 text-muted-foreground" />
                    Generation Controls
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <Button 
                      onClick={handleGenerate}
                      disabled={generationState === 'generating'}
                      className="min-w-[180px] shadow-sm"
                    >
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
                  
                  {/* GENERATION RESULTS / ERRORS */}
                  {generationState === 'error' && (
                    <div className="mt-6 p-4 bg-[#fef2f2] border border-[#fecaca] rounded-md text-sm">
                      <strong className="text-[#991b1b]">Error generating PPTX:</strong> 
                      <span className="text-[#b91c1c] ml-2">{generationError}</span>
                    </div>
                  )}
                  
                  {generationState === 'success' && (
                    <div className="mt-6 space-y-4">
                      <div className="text-sm font-medium text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-3 rounded-md flex items-center">
                        <CheckCircle2 className="w-5 h-5 mr-2 text-[#16a34a]" />
                        Generated {slideCount} slides successfully.
                      </div>
                      
                      {/* 6. WARNINGS PANEL */}
                      <div className="border border-border rounded-md overflow-hidden shadow-sm">
                        <div className="bg-muted/50 px-4 py-2 border-b border-border flex justify-between items-center">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generation Log</h3>
                          <span className="text-[10px] bg-background border border-border px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                            {generationWarnings.length} Warnings
                          </span>
                        </div>
                        <div className="p-4 bg-card max-h-[300px] overflow-y-auto">
                          {generationWarnings.length === 0 ? (
                            <div className="flex items-center text-sm text-[#16a34a] font-medium">
                              <CheckCircle2 className="w-4 h-4 mr-2" /> No warnings
                            </div>
                          ) : (
                            <ul className="space-y-2">
                              {generationWarnings.map((warn, i) => (
                                <li key={i} className="text-sm text-amber-800 font-mono flex items-start bg-amber-50 p-2.5 rounded border border-amber-100">
                                  <AlertTriangle className="w-4 h-4 mr-2.5 flex-shrink-0 mt-0.5 text-amber-600" />
                                  <span>{warn}</span>
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
