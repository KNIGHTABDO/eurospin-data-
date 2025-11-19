import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Brain, 
  Zap, 
  Play, 
  RefreshCw, 
  Info,
  Power
} from 'lucide-react';
import SpinGrid from './components/SpinGrid';
import RelaxationChart from './components/RelaxationChart';
import SliceSimulator from './components/SliceSimulator';
import LicenseModal from './components/LicenseModal';
import UpdateNotification from './components/UpdateNotification';
import { fetchMRIExplanation } from './services/geminiService';
import { checkForUpdates, UpdateInfo } from './services/updateService';
import { BodyRegion, MRISequence, SimulationState } from './types';
import { TISSUES, REGION_TISSUES, APP_VERSION } from './constants';

const App: React.FC = () => {
  const [isLicensed, setIsLicensed] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion>(BodyRegion.BRAIN);
  const [selectedSequence, setSelectedSequence] = useState<MRISequence>(MRISequence.T1);
  const [explanation, setExplanation] = useState<string>("");
  const [loadingExplanation, setLoadingExplanation] = useState<boolean>(false);
  
  const [simState, setSimState] = useState<SimulationState>({
    isScanning: false,
    magnetOn: true,
    b0FieldStrength: 3.0, // Tesla
    phase: 'alignment',
    progress: 0,
    timeMs: 0
  });

  // UPDATE CHECK
  useEffect(() => {
    const check = async () => {
      try {
        const info = await checkForUpdates(APP_VERSION);
        if (info && info.hasUpdate) {
          setUpdateInfo(info);
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    };
    check();
  }, []);

  // MAGNET CONTROL
  useEffect(() => {
    if (!simState.magnetOn) {
        setSimState(prev => ({ ...prev, phase: 'random', isScanning: false, progress: 0 }));
    } else if (simState.phase === 'random') {
        setSimState(prev => ({ ...prev, phase: 'alignment' }));
    }
  }, [simState.magnetOn]);

  // SIMULATION PHYSICS LOOP
  useEffect(() => {
    if (!simState.isScanning) return;

    let startTime = Date.now();
    let animationFrame: number;

    // Visual Constants for the loop
    // We want the scan to take about 5 seconds for educational patience
    // This means filling 64 K-space lines in 5 seconds.
    const SCAN_DURATION_MS = 5000; 
    
    const loop = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / SCAN_DURATION_MS) * 100);
        
        // Logic for Physics Phase (for SpinGrid & PSD)
        // We simulate a short TR (e.g., 500ms) repeating multiple times
        const visualTR = 500; // ms
        const timeInVisualTR = elapsed % visualTR;
        let currentPhase: SimulationState['phase'] = 'relaxation';
        
        // Visual sync with the PSD drawn in SliceSimulator
        // 0-50ms: RF Pulse
        // 50-150ms: Gradients
        // 150ms+: Relaxation
        if (timeInVisualTR < 50) {
            currentPhase = 'excitation';
        } else {
            currentPhase = 'relaxation';
        }

        if (elapsed >= SCAN_DURATION_MS) {
            setSimState(prev => ({ 
                ...prev, 
                isScanning: false, 
                phase: 'alignment', 
                progress: 100,
                timeMs: elapsed 
            }));
            return;
        }

        setSimState(prev => ({
            ...prev,
            phase: currentPhase,
            progress: progress,
            timeMs: elapsed
        }));

        animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, [simState.isScanning]);

  // Gemini Logic
  useEffect(() => {
    const getExplanation = async () => {
      setLoadingExplanation(true);
      const text = await fetchMRIExplanation(selectedRegion, selectedSequence);
      setExplanation(text);
      setLoadingExplanation(false);
    };
    getExplanation();
  }, [selectedRegion, selectedSequence]);


  const handleStartScan = () => {
     if (!simState.magnetOn) return;
     setSimState(prev => ({ ...prev, isScanning: true, progress: 0, timeMs: 0 }));
  };

  const toggleMagnet = () => {
     setSimState(prev => ({ ...prev, magnetOn: !prev.magnetOn, isScanning: false }));
  };

  return (
    <div className="min-h-screen bg-medical-900 text-slate-200 font-sans selection:bg-medical-500 selection:text-white flex flex-col lg:flex-row overflow-hidden">
      
      {!isLicensed && <LicenseModal onLicenseVerified={() => setIsLicensed(true)} />}
      {updateInfo && <UpdateNotification updateInfo={updateInfo} onClose={() => setUpdateInfo(null)} />}

      {/* SIDEBAR */}
      <aside className="w-full lg:w-80 bg-medical-800 border-r border-medical-700 flex flex-col h-auto lg:h-screen z-10 shadow-xl shrink-0">
        <div className="p-6 border-b border-medical-700">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-medical-500 rounded-lg shadow-lg shadow-medical-500/20">
               <Activity className="text-white w-6 h-6" />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white">NeuroSpin</h1>
                <div className="text-[10px] text-medical-400 font-mono">TUTEUR DE PHYSIQUE V{APP_VERSION}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Magnet Control */}
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
             <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Champ Principal B0</label>
                <span className={`text-xs font-mono ${simState.magnetOn ? 'text-green-400' : 'text-red-400'}`}>
                    {simState.magnetOn ? 'ON (SUPRACONDUCTEUR)' : 'OFF (QUENCH)'}
                </span>
             </div>
             <button 
                onClick={toggleMagnet}
                className={`w-full py-2 rounded flex items-center justify-center gap-2 font-bold text-xs transition-colors ${simState.magnetOn ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
             >
                <Power className="w-3 h-3" /> {simState.magnetOn ? 'QUENCHER L\'AIMANT' : 'MONTER LE CHAMP'}
             </button>
             {simState.magnetOn && (
                 <div className="mt-3 flex gap-2">
                    {[1.5, 3.0].map(t => (
                        <button 
                            key={t}
                            onClick={() => !simState.isScanning && setSimState(p => ({...p, b0FieldStrength: t}))}
                            className={`flex-1 py-1 text-xs rounded border ${simState.b0FieldStrength === t ? 'bg-medical-500 text-white border-medical-500' : 'bg-transparent border-slate-600 text-slate-500'}`}
                        >
                            {t.toFixed(1)} Tesla
                        </button>
                    ))}
                 </div>
             )}
          </div>

          {/* Region Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-medical-400 uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-3 h-3" /> Région
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(BodyRegion).map((region) => (
                <button
                  key={region}
                  onClick={() => !simState.isScanning && setSelectedRegion(region)}
                  className={`px-3 py-2 text-sm rounded-md transition-all duration-200 text-left border ${
                    selectedRegion === region
                      ? 'bg-medical-500/10 border-medical-500 text-medical-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  } ${simState.isScanning ? 'opacity-50' : ''}`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          {/* Sequence Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-medical-400 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-3 h-3" /> Séquence d'Impulsion
            </label>
            <div className="flex flex-col gap-2">
              {Object.values(MRISequence).map((seq) => (
                <button
                  key={seq}
                  onClick={() => !simState.isScanning && setSelectedSequence(seq)}
                  className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-all border ${
                    selectedSequence === seq
                      ? 'bg-medical-accent/10 border-medical-accent text-medical-accent'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  } ${simState.isScanning ? 'opacity-50' : ''}`}
                >
                  <span>{seq}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleStartScan}
            disabled={simState.isScanning || !simState.magnetOn}
            className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all duration-300 shadow-lg ${
              simState.isScanning
                ? 'bg-slate-700 text-slate-500 cursor-wait'
                : !simState.magnetOn 
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-medical-500 to-medical-accent text-white hover:shadow-medical-500/25 hover:scale-[1.02]'
            }`}
          >
             {simState.isScanning ? (
               <>
                 <RefreshCw className="w-4 h-4 animate-spin" /> Acquisition des lignes K...
               </>
             ) : (
               <>
                 <Play className="w-4 h-4 fill-current" /> Acquérir l'Espace-K
               </>
             )}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-black relative">
        {/* Header */}
        <header className="h-12 bg-black/50 backdrop-blur border-b border-white/10 flex items-center justify-between px-6 z-20">
           <div className="flex items-center gap-4 text-xs font-mono">
             <span className="text-slate-500">STATUT: <span className="text-white">{simState.isScanning ? 'ACQUISITION' : 'PRÊT'}</span></span>
             <span className="text-slate-500">PHASE: <span className="text-white">{simState.phase.toUpperCase()}</span></span>
           </div>
           <div className="flex items-center gap-4 font-mono text-xs text-slate-400">
             <span>TR: {selectedSequence.includes('T1') ? '500ms' : '2000ms'}</span>
             <span>TE: {selectedSequence.includes('T1') ? '15ms' : '100ms'}</span>
           </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* PHYSICS COLUMN */}
          <section className="flex-[1.2] p-4 flex flex-col gap-4 overflow-y-auto border-r border-white/5 bg-slate-900/20">
             
             {/* Row 1: Spin Grid & Charts */}
             <div className="flex flex-col lg:flex-row gap-4 h-[420px]">
                {/* 3D Spin Grid */}
                <div className="flex-1 h-full min-h-[300px]">
                   <div className="mb-2 flex items-center gap-2 text-medical-400">
                      <Zap className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase">Vecteur d'Aimantation Nette (NMV)</h3>
                   </div>
                   <SpinGrid simulationState={simState} />
                </div>

                {/* Relaxation Curves */}
                <div className="flex-1 h-full flex flex-col">
                   <div className="mb-2 flex items-center gap-2 text-medical-400">
                      <Activity className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase">Évolution du Signal (T1 & T2)</h3>
                   </div>
                   <div className="flex-1">
                     <RelaxationChart 
                        tissues={REGION_TISSUES[selectedRegion].map(name => TISSUES[name]).filter(Boolean)} 
                        currentTime={simState.timeMs % 3000} 
                        isScanning={simState.isScanning}
                     />
                   </div>
                </div>
             </div>

             {/* Row 2: AI Explanation */}
             <div className="flex-1 bg-slate-900/40 rounded-xl border border-slate-800 p-4 overflow-y-auto relative min-h-[200px]">
                <div className="absolute top-4 left-4 flex items-center gap-2 text-medical-accent">
                   <Info className="w-4 h-4" />
                   <span className="text-xs font-bold uppercase">Notes du Professeur</span>
                </div>
                <div className="mt-8 prose prose-invert prose-sm max-w-none text-slate-300 text-sm leading-relaxed">
                  {loadingExplanation ? (
                    <div className="space-y-2 animate-pulse">
                       <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                       <div className="h-4 bg-slate-800 rounded w-full"></div>
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ 
                        __html: explanation
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-medical-400">$1</strong>')
                        .replace(/^\* /gm, '• ') 
                        .replace(/\n/g, '<br/>')
                    }} />
                  )}
                </div>
             </div>
          </section>

          {/* IMAGING COLUMN */}
          <section className="flex-[1.4] bg-black flex flex-col p-6 relative border-l border-white/5">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/20 to-black pointer-events-none" />
             
             <div className="relative z-10 flex flex-col h-full items-center justify-start gap-4">
                <div className="w-full text-center">
                   <span className="text-xs font-bold text-white bg-medical-600 px-3 py-1 rounded-full shadow-lg shadow-medical-600/20">
                      K-SPACE & RECONSTRUCTION
                   </span>
                </div>

                <div className="w-full flex-1 flex items-center justify-center">
                    <SliceSimulator 
                    region={selectedRegion} 
                    sequence={selectedSequence} 
                    simulationState={simState} 
                    />
                </div>
             </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;
