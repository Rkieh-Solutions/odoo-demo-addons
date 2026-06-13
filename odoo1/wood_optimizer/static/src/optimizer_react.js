const { useState, useEffect, useMemo, useRef } = React;

// --- Icons (SVG Implementation for stability) ---
const Icons = {
    Saw: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 13 8.5 8.5" /><path d="m16 7 4.5 4.5" /><path d="m11 8 8 8" /><path d="m3 3 8 8" /><path d="m8 11 8 8" /><path d="M12 13 3.5 4.5" /><path d="m7 16 4.5 4.5" />
        </svg>
    ),
    ArrowRight: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
    ),
    Maximize: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
    ),
    Scissors: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /><path d="M8.12 15.88 12 12" /><path d="m14.8 9.2 5.2-5.2" />
        </svg>
    ),
    FileText: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
        </svg>
    ),
    Layers: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" /><polygon points="2 17 12 22 22 17" /><polygon points="2 12 12 17 22 12" />
        </svg>
    ),
    Component: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-8 4.5v9L12 21l8-4.5v-9L12 3Z" /><path d="m12 12 8-4.5" /><path d="M12 12v9" /><path d="m12 12-8-4.5" /><path d="m16 5.25-8 4.5" />
        </svg>
    ),
    Plus: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" /><path d="M5 12h14" />
        </svg>
    ),
    Calculator: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="16" y1="14" x2="16" y2="18" /><line x1="16" y1="10" x2="16" y2="10" /><line x1="12" y1="10" x2="12" y2="10" /><line x1="8" y1="10" x2="8" y2="10" /><line x1="12" y1="14" x2="12" y2="14" /><line x1="8" y1="14" x2="8" y2="14" /><line x1="12" y1="18" x2="12" y2="18" /><line x1="8" y1="18" x2="8" y2="18" />
        </svg>
    ),
    X: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
    ),
    Search: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
    ),
    Layout: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
        </svg>
    ),
    Square: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
        </svg>
    ),
    CheckCircle: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    Trash2: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
        </svg>
    ),
    Grid: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
    )
};

// --- Packing Algorithm (MaxRects Bottom-Left) ---
class MaxRectsPacker {
    constructor(width, height, kerf = 0) {
        this.width = width;
        this.height = height;
        this.kerf = kerf;
        this.freeRects = [{ x: 0, y: 0, w: width, h: height }];
        this.packedRects = [];
    }

    pack(piece, allowRotation = true) {
        let bestNode = null;
        let bestY = Infinity;
        let bestX = Infinity;
        let rotate = false;

        for (const fr of this.freeRects) {
            if (fr.w >= piece.width && fr.h >= piece.height) {
                if (fr.y < bestY || (fr.y === bestY && fr.x < bestX)) {
                    bestNode = { x: fr.x, y: fr.y, w: piece.width, h: piece.height };
                    bestY = fr.y;
                    bestX = fr.x;
                    rotate = false;
                }
            }
            if (allowRotation && piece.width !== piece.height) {
                if (fr.w >= piece.height && fr.h >= piece.width) {
                    if (fr.y < bestY || (fr.y === bestY && fr.x < bestX)) {
                        bestNode = { x: fr.x, y: fr.y, w: piece.height, h: piece.width };
                        bestY = fr.y;
                        bestX = fr.x;
                        rotate = true;
                    }
                }
            }
        }

        if (!bestNode) return null;

        const usedRect = { x: bestNode.x, y: bestNode.y, w: bestNode.w + this.kerf, h: bestNode.h + this.kerf };
        const newFreeRects = [];
        for (const fr of this.freeRects) {
            if (this.intersects(fr, usedRect)) {
                if (usedRect.x + usedRect.w < fr.x + fr.w) newFreeRects.push({ x: usedRect.x + usedRect.w, y: fr.y, w: (fr.x + fr.w) - (usedRect.x + usedRect.w), h: fr.h });
                if (usedRect.y + usedRect.h < fr.y + fr.h) newFreeRects.push({ x: fr.x, y: usedRect.y + usedRect.h, w: fr.w, h: (fr.y + fr.h) - (usedRect.y + usedRect.h) });
                if (usedRect.x > fr.x) newFreeRects.push({ x: fr.x, y: fr.y, w: usedRect.x - fr.x, h: fr.h });
                if (usedRect.y > fr.y) newFreeRects.push({ x: fr.x, y: fr.y, w: fr.w, h: usedRect.y - fr.y });
            } else { newFreeRects.push(fr); }
        }
        this.freeRects = this.pruneFreeList(newFreeRects);
        const packed = { ...piece, ...bestNode, rotated: rotate };
        this.packedRects.push(packed);
        return packed;
    }

    intersects(a, b) { return !(b.x >= a.x + a.w || b.x + b.w <= a.x || b.y >= a.y + a.h || b.y + b.h <= a.y); }

    pruneFreeList(list) {
        list = list.filter(r => r.w > 1 && r.h > 1);
        for (let i = list.length - 1; i >= 0; i--) {
            for (let j = 0; j < list.length; j++) {
                if (i !== j && this.contains(list[j], list[i])) {
                    list.splice(i, 1);
                    break;
                }
            }
        }
        return list;
    }

    contains(a, b) { return b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h; }
}

// --- Components ---

const Header = ({ currentView, setView }) => (
    <header className="bg-[#714B67] text-white h-[46px] flex items-center px-4 sticky top-0 z-[60] shadow-md no-print border-b border-white/10">
        <div className="flex items-center w-full">
            <div className="mr-4 cursor-pointer hover:bg-white/10 p-1.5 rounded transition">
                <Icons.Grid className="w-5 h-5 text-white/80" />
            </div>
            <div className="flex items-center space-x-2 mr-6 cursor-pointer" onClick={() => setView('home')}>
                <div className="bg-white/10 p-1.5 rounded-lg">
                    <Icons.Saw className="text-white w-4 h-4" />
                </div>
                <span className="text-sm font-bold tracking-tight">Wood Optimizer</span>
            </div>
            <nav className="flex items-center space-x-1 h-full">
                <button onClick={() => setView('home')} className={`px-4 h-[46px] text-[13px] hover:bg-white/10 transition flex items-center ${currentView === 'home' ? 'bg-white/10 font-bold' : 'opacity-80'}`}>Overview</button>
                <button onClick={() => setView('optimizer')} className={`px-4 h-[46px] text-[13px] hover:bg-white/10 transition flex items-center ${currentView === 'optimizer' ? 'bg-white/10 font-bold' : 'opacity-80'}`}>Optimizer</button>
                <button onClick={() => setView('history')} className={`px-4 h-[46px] text-[13px] hover:bg-white/10 transition flex items-center ${currentView === 'history' ? 'bg-white/10 font-bold' : 'opacity-80'}`}>History</button>
            </nav>
            <div className="ml-auto flex items-center space-x-4">
                <div className="flex flex-col items-end mr-2">
                    <span className="text-[9px] uppercase tracking-tighter opacity-50 leading-none">Database</span>
                    <span className="text-[11px] font-black leading-none">school_db</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-inner group cursor-pointer hover:bg-white/20 transition">
                    <span className="text-[10px] font-black group-hover:scale-110 transition">AD</span>
                </div>
            </div>
        </div>
    </header>
);

const Hero = ({ onStart }) => (
    <section className="py-20 bg-white no-print">
        <div className="container mx-auto px-4 text-center">
            <h2 className="text-5xl font-extrabold wood-text mb-6 uppercase tracking-tight">Optimize Your Wood Cutting with <span className="text-wood-600">WoodCut Pro</span></h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">Professional layout optimization for carpenters. Reduce waste, save money, and get clear step-by-step cutting instructions in seconds.</p>
            <button onClick={onStart} className="wood-gradient text-white px-10 py-4 rounded-full text-lg font-bold hover:scale-105 transition-transform shadow-xl flex items-center space-x-2 mx-auto">
                <span>Start Optimizing</span>
                <Icons.ArrowRight className="w-5 h-5" />
            </button>
            <div className="grid md:grid-cols-3 gap-8 mt-24">
                {[
                    { icon: Icons.Maximize, title: 'Maximize Yield', desc: 'Our advanced algorithm ensures you get the most out of every board.' },
                    { icon: Icons.Scissors, title: 'Precise Cuts', desc: 'Calculated with saw kerf in mind for real-world accuracy.' },
                    { icon: Icons.FileText, title: 'Export Ready', desc: 'Print your cutting plan or export it for your workshop team.' }
                ].map((item, i) => (
                    <div key={i} className="p-8 bg-wood-50 rounded-2xl text-left border border-wood-100 card-shadow hover:border-wood-300 transition">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 border border-wood-200">
                            <item.icon className="text-wood-700 w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold wood-text mb-2">{item.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const Optimizer = ({ setView, customTemplates, setCustomTemplates, history, setHistory, materials, setMaterials, board, setBoard, projectName, setProjectName, pieces, setPieces, loadTemplate }) => {
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [templateSearch, setTemplateSearch] = useState('');
    const [isLibraryFocused, setIsLibraryFocused] = useState(false);
    const [materialSearch, setMaterialSearch] = useState('');
    const [isMaterialFocused, setIsMaterialFocused] = useState(false);
    
    useEffect(() => { localStorage.setItem('woodcut_templates', JSON.stringify(customTemplates)); }, [customTemplates]);
    useEffect(() => { localStorage.setItem('woodcut_materials', JSON.stringify(materials)); }, [materials]);
    useEffect(() => { if (board?.name && !isMaterialFocused) setMaterialSearch(board.name); }, [board?.name]);

    useEffect(() => {
        if (!pieces || pieces.length === 0) { setBoard(prev => ({ ...prev, quantity: 1 })); return; }
        const boardArea = board.width * board.height;
        if (boardArea <= 0) return;
        const totalPiecesArea = pieces.reduce((sum, p) => sum + ((p.width + (board.kerf || 0)) * (p.height + (board.kerf || 0)) * (p.quantity || 1)), 0);
        const estimatedBoards = Math.max(1, Math.ceil((totalPiecesArea * 1.2) / boardArea));
        if (board.quantity !== estimatedBoards) setBoard(prev => ({ ...prev, quantity: estimatedBoards }));
    }, [pieces, board.width, board.height, board.kerf]);

    const addPiece = () => setPieces(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: `Piece ${prev.length + 1}`, width: 80, height: 30, quantity: 4, allowRotation: true, completed: false }]);
    const updatePiece = (id, field, value) => setPieces(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    const removePiece = (id) => setPieces(prev => prev.filter(p => p.id !== id));
    const loadSampleData = () => { setBoard({ material: 'MDF 18mm', name: 'MDF 18mm', width: 244, height: 122, kerf: 0.3, quantity: 5, unit: 'cm' }); setPieces([{ id: '1', name: 'Shelf A', width: 80, height: 30, quantity: 4, allowRotation: true }]); setResults(null); };

    const calculate = () => {
        setError(null);
        const heuristics = [(a, b) => (b.width * b.height) - (a.width * a.height)];
        let bestFullResult = null;
        let maxDensity = -1;
        for (const heuristic of heuristics) {
            let currentRemaining = [];
            pieces.forEach(p => { for (let i = 0; i < p.quantity; i++) currentRemaining.push({ ...p, id: `${p.id}-${i}` }); });
            currentRemaining.sort(heuristic);
            const currentBoards = [];
            let boardsUsed = 0;
            let tempRemaining = [...currentRemaining];
            while (tempRemaining.length > 0 && boardsUsed < (parseInt(board.quantity) || 1)) {
                const packer = new MaxRectsPacker(board.width, board.height, board.kerf);
                const currentBoardPieces = [];
                const nextRemaining = [];
                for (const p of tempRemaining) {
                    const packed = packer.pack(p, p.allowRotation);
                    if (packed) currentBoardPieces.push(packed);
                    else nextRemaining.push(p);
                }
                const usedArea = currentBoardPieces.reduce((sum, p) => sum + (p.w * p.h), 0);
                const totalArea = board.width * board.height;
                currentBoards.push({ boardIndex: boardsUsed + 1, pieces: currentBoardPieces, usedArea, totalArea, wastePercent: ((totalArea - usedArea) / totalArea * 100).toFixed(1) });
                tempRemaining = nextRemaining;
                boardsUsed++;
            }
            const score = (currentRemaining.length - tempRemaining.length); 
            if (score > maxDensity) { maxDensity = score; bestFullResult = { boards: currentBoards, failed: tempRemaining, totalUsedArea: currentBoards.reduce((sum, b) => sum + b.usedArea, 0), totalArea: currentBoards.length * (board.width * board.height) }; }
        }
        setResults(bestFullResult);
        setTimeout(() => document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const markAsFinished = () => {
        if (!results) return;
        const newLog = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            projectName: projectName,
            boardsCount: results.boards.length,
            materialName: board.name,
            boardWidth: board.width,
            boardHeight: board.height,
            unit: board.unit,
            dimensions: `${board?.width}x${board?.height}`,
            totalArea: results?.totalUsedArea,
            waste: results?.totalArea > 0 ? ((results.totalArea - results.totalUsedArea) / results.totalArea * 100).toFixed(1) : 0,
            board: { ...board },
            pieces: (pieces || []).map(p => ({ ...p }))
        };
        const existingIdx = (history || []).findIndex(t => 
            (t?.projectName || t?.name || '').toLowerCase() === projectName.toLowerCase()
        );

        if (existingIdx >= 0) {
            if(!window.confirm(`A project named "${projectName}" already exists in History. Update it with these results?`)) return;
            setHistory(prev => {
                const updated = [...(Array.isArray(prev) ? prev : [])];
                updated[existingIdx] = newLog;
                return updated;
            });
        } else {
            setHistory(prev => [newLog, ...(Array.isArray(prev) ? prev : [])]);
        }
        
        alert('Project Saved to History!');
        setResults(null);
        setPieces([]);
        setProjectName('New Project');
        setView('home');
    };

    const stats = useMemo(() => (customTemplates || []).reduce((s, h) => s + (parseInt(h.boardsCount) || 0), 0), [customTemplates]);

    return (
        <div id="optimizer" className="py-12 bg-wood-50 min-h-screen">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6 no-print">
                        <div className="bg-wood-900 text-white p-6 rounded-2xl card-shadow mb-6">
                            <div className="text-center py-6">
                                <div className="text-6xl font-black wood-300 drop-shadow-sm">{stats || 0}</div>
                                <div className="mt-4 text-[10px] uppercase font-black tracking-[0.2em] opacity-40">Total Boards Used</div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[8px] font-black uppercase opacity-60">
                                <span>Workshop production log</span>
                                <span className="text-wood-300 bg-white/10 px-2 py-0.5 rounded">{(customTemplates || []).length} Projects Saved</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl card-shadow border border-wood-100">
                            <div className="flex items-center space-x-2 mb-4"><Icons.Layout className="text-wood-600 w-5 h-5" /><h3 className="text-lg font-bold wood-text uppercase">Project</h3></div>
                            <div className="mb-6"><label className="text-xs font-semibold text-gray-400 uppercase">Project Name / ID</label><input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none font-bold text-sm" /></div>
                            <div className="pt-4 border-t border-gray-50">
                                <div className="flex items-center space-x-2 mb-4"><Icons.Layers className="text-wood-600 w-5 h-5" /><h3 className="text-lg font-bold wood-text uppercase">Material</h3></div>
                                <div className="mb-4 relative">
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Wood Type</label>
                                    <div className="relative">
                                        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input type="text" value={materialSearch} onChange={e => setMaterialSearch(e.target.value)} onFocus={() => setIsMaterialFocused(true)} onBlur={() => setTimeout(() => setIsMaterialFocused(false), 350)} placeholder="Search Material..." className="w-full mt-1 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none font-bold" />
                                    </div>
                                    {isMaterialFocused && (
                                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-wood-100 rounded-xl shadow-2xl max-h-[250px] overflow-y-auto p-2">
                                            {materials.filter(m => m.name.toLowerCase().includes(materialSearch.toLowerCase())).map((m, i) => (
                                                <button key={i} onMouseDown={() => { setBoard({ ...board, ...m }); setMaterialSearch(m.name); setIsMaterialFocused(false); }} className="w-full text-left px-4 py-2 hover:bg-wood-50 rounded-lg group transition">
                                                    <div className="text-xs font-bold wood-text">{m.name}</div>
                                                    <div className="text-[9px] text-gray-400 uppercase">{m.width} x {m.height} {board.unit}</div>
                                                </button>
                                            ))}
                                            {materialSearch && !materials.some(m => m.name.toLowerCase() === materialSearch.toLowerCase()) && (
                                                <button onMouseDown={() => { const newMat = { name: materialSearch, width: board.width, height: board.height, kerf: board.kerf }; setMaterials(prev => [...prev, newMat]); setBoard({ ...board, name: materialSearch }); setIsMaterialFocused(false); }} className="w-full text-left px-4 py-3 bg-wood-900 text-white rounded-lg hover:bg-black transition mt-2">
                                                    <div className="text-[10px] font-black uppercase">Create New Material:</div>
                                                    <div className="text-xs font-bold">"{materialSearch}"</div>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-semibold text-gray-400 uppercase">Width</label><input type="number" value={board.width} onChange={e => setBoard({...board, width: parseFloat(e.target.value)})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" /></div>
                                    <div><label className="text-xs font-semibold text-gray-400 uppercase">Height</label><input type="number" value={board.height} onChange={e => setBoard({...board, height: parseFloat(e.target.value)})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" /></div>
                                    <div><label className="text-xs font-semibold text-gray-400 uppercase">Kerf</label><input type="number" step="0.1" value={board.kerf} onChange={e => setBoard({...board, kerf: parseFloat(e.target.value)})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" /></div>
                                    <div><label className="text-xs font-semibold text-gray-400 uppercase">Qty (Auto)</label><div className="w-full mt-1 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg font-black wood-text text-center">{board.quantity}</div></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl card-shadow border border-wood-100">
                            <div className="flex justify-between items-center mb-4"><div className="flex items-center space-x-2"><Icons.Component className="text-wood-600 w-5 h-5" /><h3 className="text-lg font-bold wood-text uppercase">Project Pieces</h3></div><button onClick={loadSampleData} className="text-xs font-bold text-wood-600 hover:text-wood-800 underline">Reset to Sample</button></div>
                            <div className="mb-4 relative">
                                <label className="text-xs font-semibold text-gray-400 uppercase">Project Library</label>
                                <div className="relative">
                                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                                    <input type="text" value={templateSearch || ''} onChange={e => setTemplateSearch(e.target.value)} onFocus={() => setIsLibraryFocused(true)} onBlur={() => setTimeout(() => setIsLibraryFocused(false), 400)} placeholder="Search or Create Project..." className="w-full mt-1 pl-10 pr-4 py-2 bg-gray-50 border border-wood-200 rounded-lg focus:ring-2 focus:ring-wood-400 outline-none font-bold" />
                                </div>
                                
                                {projectName && projectName !== 'New Project' && !isLibraryFocused && (
                                    <div className="mt-2 bg-wood-900 text-white rounded-lg px-3 py-2 flex items-center justify-between">
                                        <div className="flex items-center space-x-2 overflow-hidden">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest truncate">{projectName}</span>
                                        </div>
                                        <button onClick={() => { setProjectName('New Project'); setTemplateSearch(''); }} className="text-[10px] text-wood-400 hover:text-red-400 font-bold">×</button>
                                    </div>
                                )}

                                {isLibraryFocused && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-wood-100 rounded-xl shadow-2xl max-h-[250px] overflow-y-auto custom-scrollbar p-2" onMouseDown={(e) => e.preventDefault()}>
                                        {(() => {
                                            const combined = [ ...(customTemplates || []).map(t => ({ ...t, source: 'Library' })), ...(history || []).map(t => ({ ...t, source: 'History' })) ];
                                            const unique = []; const seen = new Set();
                                            combined.forEach(t => { const name = (t?.projectName || t?.name || '').toLowerCase(); if (!seen.has(name)) { seen.add(name); unique.push(t); } });
                                            const filtered = unique.filter(t => (t?.projectName || t?.name || '').toLowerCase().includes((templateSearch || '').toLowerCase()));
                                            const items = [];
                                            filtered.forEach((t, i) => {
                                                items.push(
                                                    <button key={t.id || i} onClick={() => { loadTemplate(t); setTemplateSearch(t?.projectName || t?.name || ''); setIsLibraryFocused(false); }} className="w-full text-left px-4 py-2 hover:bg-wood-50 rounded-lg group transition">
                                                        <div className="flex items-center space-x-2">
                                                            <div className={`text-[7px] px-1 rounded-sm uppercase font-black ${t.source === 'History' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{t.source}</div>
                                                            <span className="text-xs font-bold wood-text truncate">{t?.projectName || t?.name || 'Untitled'}</span>
                                                        </div>
                                                        <div className="text-[9px] text-gray-400 uppercase mt-0.5 ml-1">{t?.materialName || t?.material || 'Custom'} • {t?.dimensions || (t.boardWidth ? `${t.boardWidth}x${t.boardHeight}` : 'N/A')}</div>
                                                    </button>
                                                );
                                            });
                                            if (items.length === 0) { items.push(<div key="empty" className="text-[10px] text-gray-400 text-center py-4 italic">No projects yet. Type a name to create one.</div>); }
                                            return items;
                                        })()}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => { if(!projectName) return; setCustomTemplates(prev => [{ projectName, board, pieces }, ...prev]); alert('Saved!'); }} className="text-[10px] text-wood-400 hover:text-wood-600 font-bold uppercase text-center block w-full border-t border-dashed border-gray-100 pt-2 mb-4">+ Save Current to Library</button>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {pieces.map((p) => (
                                    <div key={p.id} className="p-4 bg-wood-50 rounded-xl border border-wood-100 relative group">
                                        <button onClick={() => removePiece(p.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Icons.X className="w-4 h-4" /></button>
                                        <div className="flex items-center space-x-2 mb-3"><input type="checkbox" checked={p.completed} onChange={e => updatePiece(p.id, 'completed', e.target.checked)} className="accent-green-600" /><input type="text" value={p.name} onChange={e => updatePiece(p.id, 'name', e.target.value)} className="flex-1 bg-transparent border-b border-wood-200 outline-none font-bold text-sm" /></div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <input type="number" value={p.width} onChange={e => updatePiece(p.id, 'width', parseFloat(e.target.value))} className="px-2 py-1 bg-white border rounded text-xs" />
                                            <input type="number" value={p.height} onChange={e => updatePiece(p.id, 'height', parseFloat(e.target.value))} className="px-2 py-1 bg-white border rounded text-xs" />
                                            <input type="number" value={p.quantity} onChange={e => updatePiece(p.id, 'quantity', parseInt(e.target.value))} className="px-2 py-1 bg-white border rounded text-xs" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addPiece} className="w-full mt-4 py-3 border-2 border-dashed border-wood-200 rounded-xl text-wood-400 font-bold hover:bg-wood-50 transition flex items-center justify-center space-x-2"><Icons.Plus className="w-4 h-4" /><span>Add Piece</span></button>
                        </div>

                        <div className="flex space-x-4 mt-4">
                            <button onClick={calculate} className="flex-1 wood-gradient text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-2xl transition flex items-center justify-center space-x-2"><Icons.Calculator className="w-5 h-5" /><span>Calculate</span></button>
                            <button onClick={markAsFinished} disabled={!results} className={`flex-1 py-4 rounded-xl font-bold border transition flex items-center justify-center space-x-2 ${!results ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}><Icons.CheckCircle className="w-5 h-5" /><span>Finish Job</span></button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                        {!results ? (
                            <div className="bg-white rounded-3xl p-12 card-shadow border border-wood-100 flex flex-col items-center justify-center text-center opacity-60 min-h-[400px]">
                                <Icons.Layout className="text-wood-200 w-16 h-16 mb-6" /><h3 className="text-2xl font-bold wood-text mb-2">Ready to Optimize</h3><p className="text-gray-400 max-w-sm">Enter your dimensions and let WoodCut Pro find the best layout for your project.</p>
                            </div>
                        ) : (
                            <div id="results-section" className="space-y-8">
                                {results.boards.map((b, idx) => (
                                    <div key={idx} className="bg-white rounded-3xl p-8 card-shadow border border-wood-100">
                                        <div className="mb-6"><h3 className="text-xl font-bold wood-text uppercase">Board #{b.boardIndex}: {board.name}</h3><div className="text-sm text-gray-400">Efficiency: {(100 - b.wastePercent).toFixed(1)}% | Waste: {b.wastePercent}%</div></div>
                                        <div className="relative bg-[#d7ccc8] border-4 border-wood-900 rounded-lg shadow-2xl overflow-hidden" style={{ aspectRatio: `${board.width} / ${board.height}`, width: '100%' }}>
                                            {b.pieces.map((p, i) => (
                                                <div key={i} className="absolute border border-wood-950 bg-wood-700/80 text-white flex flex-col items-center justify-center" style={{ left: `${(p.x / board.width) * 100}%`, top: `${(p.y / board.height) * 100}%`, width: `${(p.w / board.width) * 100}%`, height: `${(p.h / board.height) * 100}%` }}>
                                                    <div className="text-[10px] font-black truncate px-1">{p.name}</div><div className="text-[8px] opacity-70 font-mono">{p.w}x{p.h}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const HistoryPage = ({ history, setHistory, setView, loadTemplate }) => (
    <div className="py-12 bg-wood-50 min-h-screen">
        <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-12">
                <div><h1 className="text-4xl font-black wood-text tracking-tighter uppercase mb-2">Workshop History</h1><p className="text-gray-400 font-medium">Your permanent record of finished projects</p></div>
                <button onClick={() => setView('optimizer')} className="px-6 py-2 bg-white border border-wood-100 rounded-xl font-bold wood-text hover:bg-wood-50 transition">Back to Optimizer</button>
            </div>
            {(!history || history.length === 0) ? (
                <div className="bg-white rounded-3xl p-20 card-shadow border border-wood-100 flex flex-col items-center justify-center text-center">
                    <Icons.Layers className="text-wood-200 w-20 h-20 mb-6 opacity-30" /><h3 className="text-2xl font-bold wood-text mb-2">No Finished Projects Yet</h3><p className="text-gray-400 max-w-sm mb-8">Once you finish a job in the optimizer, it will be safely archived here forever.</p><button onClick={() => setView('optimizer')} className="px-8 py-3 wood-gradient text-white rounded-xl font-bold shadow-lg">Start First Project</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {history.map((project, i) => (
                        <div key={project.id || i} className="bg-white rounded-3xl overflow-hidden card-shadow border border-wood-100 group transition hover:-translate-y-1">
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-4">
                                    <div><div className="text-[10px] font-black text-wood-400 uppercase tracking-widest mb-1">{project.date ? new Date(project.date).toLocaleDateString() : 'Recent'}</div><h3 className="text-xl font-black wood-text uppercase leading-tight">{project?.projectName || project?.name || 'Untitled Project'}</h3></div>
                                    <button onClick={() => setHistory(prev => prev.filter(p => p.id !== project.id))} className="text-gray-300 hover:text-red-500 transition"><Icons.Trash2 className="w-5 h-5" /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-4 py-4 border-y border-wood-50 mb-4">
                                    <div><div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Material</div><div className="text-xs font-bold wood-text truncate">{project.materialName || 'Custom'}</div></div>
                                    <div><div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Boards Used</div><div className="text-xs font-bold wood-text">{project.boardsCount || 0}</div></div>
                                    <div><div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Waste</div><div className="text-xs font-bold text-red-500">{project.waste || 0}%</div></div>
                                    <div><div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dimensions</div><div className="text-xs font-bold wood-text">{project.boardWidth || 0} x {project.boardHeight || 0} {project.unit || ''}</div></div>
                                </div>
                                <button onClick={() => { loadTemplate(project); setView('optimizer'); }} className="w-full py-3 bg-wood-50 text-wood-700 rounded-xl font-bold hover:bg-wood-900 hover:text-white transition flex items-center justify-center space-x-2"><Icons.Maximize className="w-4 h-4" /><span>Re-open & Edit</span></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

const App = () => {
    const [view, setView] = useState('home');
    const [materials, setMaterials] = useState(() => JSON.parse(localStorage.getItem('woodcut_materials')) || [ { name: 'Oak Plywood', width: 244, height: 122, kerf: 0.3 }, { name: 'MDF 18mm', width: 244, height: 122, kerf: 0.3 } ]);
    const [customTemplates, setCustomTemplates] = useState(() => JSON.parse(localStorage.getItem('woodcut_templates')) || []);
    const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('woodcut_history')) || []);
    const [projectName, setProjectName] = useState('New Project');
    const [board, setBoard] = useState({ ...materials[0], quantity: 1, unit: 'cm', name: materials[0].name });
    const [pieces, setPieces] = useState([ { id: '1', name: 'Shelf A', width: 80, height: 30, quantity: 4, allowRotation: true, completed: false } ]);

    useEffect(() => { localStorage.setItem('woodcut_materials', JSON.stringify(materials)); }, [materials]);
    useEffect(() => { localStorage.setItem('woodcut_templates', JSON.stringify(customTemplates)); }, [customTemplates]);
    useEffect(() => { localStorage.setItem('woodcut_history', JSON.stringify(history)); }, [history]);

    return (
        <div className="min-h-screen flex flex-col">
            <Header currentView={view} setView={setView} />
            <main className="flex-1">
                {view === 'home' && <Hero onStart={() => setView('optimizer')} />}
                {view === 'optimizer' && <Optimizer setView={setView} customTemplates={customTemplates} setCustomTemplates={setCustomTemplates} history={history} setHistory={setHistory} materials={materials} setMaterials={setMaterials} projectName={projectName} setProjectName={setProjectName} board={board} setBoard={setBoard} pieces={pieces} setPieces={setPieces} loadTemplate={(t) => { setProjectName(t.projectName || t.name); setBoard(t.board || board); setPieces(t.pieces || pieces); }} />}
                {view === 'history' && <HistoryPage history={history} setHistory={setHistory} setView={setView} loadTemplate={(t) => { setProjectName(t.projectName || t.name); setBoard(t.board || board); setPieces(t.pieces || pieces); setView('optimizer'); }} />}
            </main>
            <footer className="bg-[#714B67] py-8 text-white/60 text-xs border-t border-white/5 no-print mt-auto">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <Icons.Saw className="w-4 h-4 text-white" />
                        <span className="font-bold text-white">WoodCut Pro <span className="font-normal opacity-50">v2.0</span></span>
                    </div>
                    <div className="flex items-center space-x-8">
                        <span>Powered by <span className="text-white font-bold">Odoo ERP</span> Integration</span>
                        <span>Workshop: <span className="text-white font-bold underline">Main Manufacturing Hub</span></span>
                        <span>System Status: <span className="text-green-400 font-bold">Connected</span></span>
                    </div>
                    <div className="mt-4 md:mt-0 opacity-40">
                        &copy; 2026 Professional Woodworking Solutions
                    </div>
                </div>
            </footer>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
