import React, { useState, useRef, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Search, FolderUp, Hash, Trash2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, FileText, ExternalLink } from 'lucide-react';
import { scanContent } from './utils/scanner';
import type { Occurrence } from './utils/scanner';
import { getFilesFromDataTransferItems } from './utils/fileHelpers';
import { extractTextFromFile, isSupportedFile } from './utils/textExtractor';

// Error Boundary Implementation
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-red-500 p-8 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-4">Something went wrong.</h1>
          <pre className="bg-slate-800 p-4 rounded text-sm max-w-2xl overflow-auto text-white border border-red-500/30">
            {this.state.error?.toString()}
            <br />
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Add webkitdirectory to InputHTMLAttributes
declare module 'react' {
  interface InputHTMLAttributes<T> extends React.HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

// Structure to hold aggregated results: Variable -> File -> Occurrences
type VariableMap = Map<string, Map<string, Occurrence[]>>;

function App() {
  const [variableMap, setVariableMap] = useState<VariableMap>(new Map());
  const [filter, setFilter] = useState('');
  const [folderName, setFolderName] = useState('');
  const [fileCount, setFileCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // UI State for expansion
  const [expandedVar, setExpandedVar] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[], sourceName: string) => {
    setIsScanning(true);
    setVariableMap(new Map());
    setError('');
    setFolderName(sourceName);
    setExpandedVar(null);
    setFileCount(0);

    let tempMap: VariableMap = new Map();
    let scannedCount = 0;

    try {
      for (const file of files) {
        if (isSupportedFile(file)) {
          scannedCount++;
          const text = await extractTextFromFile(file);

          // Determine file display path
          let filePath = (file as any).path || file.webkitRelativePath || file.name;

          // Electron: Try to get absolute path using webUtils (modern standard)
          // @ts-ignore
          if (window.require) {
            try {
              // @ts-ignore
              const { webUtils } = window.require('electron');
              const adminPath = webUtils.getPathForFile(file);
              if (adminPath) {
                filePath = adminPath;
              }
            } catch (e) {
              console.warn("webUtils.getPathForFile failed", e);
            }
          }

          console.log('Scanned file:', file.name, 'Path:', filePath);

          const occurrences = scanContent(text);

          occurrences.forEach(occ => {
            if (!tempMap.has(occ.variable)) {
              tempMap.set(occ.variable, new Map());
            }
            const fileMap = tempMap.get(occ.variable)!;

            if (!fileMap.has(filePath)) {
              fileMap.set(filePath, []);
            }
            fileMap.get(filePath)!.push(occ);
          });
        }
      }

      setFileCount(scannedCount);

      if (scannedCount === 0) {
        setError('No supported files found.');
      } else {
        setVariableMap(tempMap);
      }
    } catch (err) {
      setError('Error scanning files. Please try again.');
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList);
    const firstPath = files[0].webkitRelativePath;
    const folder = firstPath.split('/')[0] || "Selected Folder";
    await processFiles(files, folder);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.items) {
      const files = await getFilesFromDataTransferItems(e.dataTransfer.items);
      if (files.length > 0) {
        const sourceName = e.dataTransfer.items[0].webkitGetAsEntry()?.name || "Dropped Files";
        await processFiles(files, sourceName);
      }
    }
  };

  const triggerFolderUpload = () => {
    fileInputRef.current?.click();
  };

  const openFile = async (path: string) => {
    try {
      console.log('Attempting to open file at path:', path);
      // @ts-ignore
      if (window.require) {
        // @ts-ignore
        const { shell } = window.require('electron');
        const error = await shell.openPath(path);
        if (error) {
          console.error("Electron shell.openPath error:", error);
          alert(`Failed to open file: ${error}`);
        }
      } else {
        console.warn("Electron shell is not available");
        alert("Error: Electron environment not detected. Cannot open file.");
      }
    } catch (e) {
      console.error("Failed to open file", e);
      alert(`Exception opening file: ${e}`);
    }
  };

  const toggleExpand = (variable: string) => {
    setExpandedVar(expandedVar === variable ? null : variable);
  };

  // Filter Variables
  const normalizedFilter = filter.replace('#', '');
  const sortedVariables = Array.from(variableMap.keys())
    .filter(v => normalizedFilter ? v.replace('#', '').startsWith(normalizedFilter) : true)
    .sort();

  return (
    <div
      className="min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500 selection:text-white"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="fixed top-0 left-0 right-0 h-10 z-50 titlebar-drag" />

      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">

        <header className="mb-8 flex items-center gap-4 titlebar-drag">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-tr from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30 no-drag">
            <Hash className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Variable Scanner
          </h1>
        </header>

        <main className="space-y-4">

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <button
                onClick={triggerFolderUpload}
                className="flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FolderUp size={18} />
                Select Folder
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  readOnly
                  value={folderName || ""}
                  placeholder="No folder designated"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg py-2 px-3 focus:outline-none cursor-default"
                />
                {folderName && fileCount > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                    {fileCount} files
                  </span>
                )}
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFolderChange}
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
            />

            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter (e.g. 6)..."
                autoComplete="off"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm rounded-lg py-2 pl-9 pr-8 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
              />
              {filter && (
                <button
                  onClick={() => setFilter('')}
                  className="absolute inset-y-0 right-2 flex items-center text-slate-500 hover:text-slate-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 py-2 px-4 rounded-lg text-sm font-medium">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {isScanning && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-slate-400 text-sm">Scanning files...</p>
            </div>
          )}

          {!isScanning && (sortedVariables.length > 0 || (folderName && !error && fileCount > 0)) && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm min-h-[50vh]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-500 w-4 h-4" />
                  Found Variables
                </h2>
                <span className="text-slate-500 text-xs font-mono">
                  {sortedVariables.length} results
                </span>
              </div>

              {sortedVariables.length > 0 ? (
                <div className="space-y-2">
                  {sortedVariables.map((v) => {
                    const isExpanded = expandedVar === v;
                    const fileMap = variableMap.get(v)!;
                    const totalOccurrences = Array.from(fileMap.values()).reduce((acc, curr) => acc + curr.length, 0);

                    return (
                      <div key={v} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden transition-all">
                        {/* Header Row */}
                        <div
                          onClick={() => toggleExpand(v)}
                          className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/50 transition-colors ${isExpanded ? 'bg-slate-700/30' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown size={16} className="text-indigo-400" /> : <ChevronRight size={16} className="text-slate-500" />}
                            <span className="font-mono text-indigo-300 font-medium text-lg">{v}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>{totalOccurrences} matches</span>
                            <span>{fileMap.size} files</span>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="border-t border-slate-700/50 bg-slate-900/30">
                            {Array.from(fileMap.entries()).map(([filePath, occurrences]) => (
                              <div key={filePath} className="border-b border-slate-800 last:border-0">
                                {/* File Header */}
                                <div className="flex items-center justify-between p-2 px-4 bg-slate-800/30">
                                  <div className="flex items-center gap-2 text-slate-300 overflow-hidden">
                                    <FileText size={14} className="flex-none text-slate-500" />
                                    <span className="text-xs font-mono truncate max-w-md" title={filePath}>
                                      {/* Show simplified name if needed, or full path */}
                                      {filePath.split(/[/\\]/).pop()}
                                      <span className="text-slate-600 ml-2 text-[10px] hidden md:inline">{filePath}</span>
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openFile(filePath);
                                    }}
                                    className="flex items-center gap-1 text-[10px] bg-slate-700 hover:bg-indigo-600 text-white px-2 py-1 rounded transition-colors flex-none"
                                  >
                                    <ExternalLink size={10} />
                                    Open
                                  </button>
                                </div>

                                {/* Occurrences / Snippets */}
                                <div className="p-2 px-8 space-y-1">
                                  {occurrences.map((occ, idx) => (
                                    <div key={idx} className="text-xs font-mono text-slate-400 flex gap-4 hover:bg-slate-800/50 p-1 rounded">
                                      <span className="text-slate-600 select-none w-8 text-right flex-none">{occ.line}:</span>
                                      <span className="truncate text-slate-300">{occ.snippet}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  {variableMap.size === 0 ? "No variables found." : `No matches for "${filter}"`}
                </div>
              )}
            </div>
          )}

          {!isScanning && variableMap.size === 0 && !folderName && !error && (
            <div className={`flex flex-col items-center justify-center min-h-[60vh] text-slate-600 transition-opacity duration-300 ${isDragging ? 'opacity-50' : 'opacity-100'}`}>
              <div className="p-4 bg-slate-800/50 rounded-2xl mb-4">
                <FolderUp className="w-12 h-12 text-slate-700" />
              </div>
              <p className="text-sm font-medium">Select a folder to start scanning</p>
            </div>
          )}

        </main>
      </div>

      {isDragging && (
        <div className="fixed inset-0 z-40 bg-indigo-500/20 backdrop-blur-sm flex items-center justify-center border-4 border-indigo-500/50 pointer-events-none">
          <div className="bg-slate-900/90 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-bounce-subtle">
            <FolderUp className="w-12 h-12 text-indigo-400" />
            <p className="text-xl font-bold text-white">Drop to Scan</p>
          </div>
        </div>
      )}
    </div>
  );
}

const AppWithBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithBoundary;
