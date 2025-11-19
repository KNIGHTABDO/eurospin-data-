
import React from 'react';
import { BodyRegion, MRISequence, SimulationState } from '../types';
import { TISSUES } from '../constants';

interface SliceSimulatorProps {
  region: BodyRegion;
  sequence: MRISequence;
  simulationState: SimulationState;
}

const SliceSimulator: React.FC<SliceSimulatorProps> = ({ region, sequence, simulationState }) => {
  
  // --- PHYSICS & CONTRAST LOGIC ---
  const getBrightness = (tissueName: string) => {
    const t = TISSUES[tissueName];
    if (!t) return 0;
    
    let val = 0;
    if (sequence === MRISequence.T1) {
        // T1: Fat is bright (short T1), Water/CSF is dark (long T1)
        if (t.name === 'Fat') val = 240;
        else if (t.name === 'CSF') val = 15;
        else if (t.name === 'White Matter') val = 180;
        else if (t.name === 'Gray Matter') val = 110;
        else val = Math.max(0, 255 - (t.t1 * 0.2));
    } else if (sequence === MRISequence.T2) {
        // T2: Water/CSF is bright (long T2), Fat is intermediate
        if (t.name === 'CSF') val = 255;
        else if (t.name === 'Fat') val = 100; 
        else if (t.name === 'White Matter') val = 80;
        else if (t.name === 'Gray Matter') val = 120;
        else val = t.t2 * 2.5;
    } else if (sequence === MRISequence.FLAIR) {
        // T2 w/ CSF nulled
        val = t.t2 * 2.5;
        if (t.name === 'CSF') val = 0; 
        if (t.name === 'White Matter') val = 70;
    } else {
        // PD
        val = t.pd * 240;
    }
    return Math.min(255, Math.max(5, val));
  };

  const c = (name: string) => {
      const b = getBrightness(name);
      return `rgb(${b},${b},${b})`;
  };

  const getBrainImage = () => {
      const prefix = region === BodyRegion.BRAIN ? 'brain' :
                     region === BodyRegion.SPINE ? 'spine' :
                     region === BodyRegion.KNEE ? 'knee' :
                     region === BodyRegion.ABDOMEN ? 'abdomen' : 'brain';
                     
      switch (sequence) {
          case MRISequence.T1: return `/assets/${prefix}_t1.png`;
          case MRISequence.T2: return `/assets/${prefix}_t2.png`;
          case MRISequence.FLAIR: return `/assets/${prefix}_flair.png`;
          case MRISequence.PD: return `/assets/${prefix}_pd.png`;
          default: return `/assets/${prefix}_t1.png`;
      }
  };

  // --- ANATOMICAL PATHS (Detailed Axial Brain Slice) ---
  const renderBrain = () => (
      <g transform="translate(150, 150) scale(2.5)">
          {/* Scalp (Subcutaneous Fat) - Outer Ellipse */}
          <path d="M0,-55 C32,-55 55,-32 55,0 C55,35 32,60 0,60 C-32,60 -55,35 -55,0 C-55,-32 -32,-55 0,-55 Z" 
                fill={c('FAT')} stroke="none" />
          
          {/* Skull (Cortical Bone - Signal Void) - Slightly smaller Ellipse */}
          <path d="M0,-50 C29,-50 50,-29 50,0 C50,32 29,55 0,55 C-29,55 -50,32 -50,0 C-50,-29 -29,-50 0,-50 Z" 
                fill={c('BONE')} stroke="none" />

          {/* Meninges/CSF Space - Inner boundary of skull */}
          <path d="M0,-47 C27,-47 47,-27 47,0 C47,30 27,52 0,52 C-27,52 -47,30 -47,0 C-47,-27 -27,-47 0,-47 Z" 
                fill={c('CSF')} stroke="none" />

          {/* Gray Matter (Cortex) - Complex Gyrified Shape */}
          {/* Simulated using a rough path with bumps */}
          <path d="M0,-45 
                   C 10,-45 15,-40 20,-42 
                   C 25,-44 30,-35 35,-30 
                   C 40,-25 45,-15 45,0 
                   C 45,15 40,25 35,35 
                   C 30,45 20,48 0,48 
                   C -20,48 -30,45 -35,35 
                   C -40,25 -45,15 -45,0 
                   C -45,-15 -40,-25 -35,-30 
                   C -30,-35 -25,-44 -20,-42 
                   C -15,-40 -10,-45 0,-45 Z" 
                fill={c('GM')} stroke="none" />

          {/* White Matter - Inner branching structure */}
          <path d="M0,-35 
                   C 8,-35 12,-30 15,-25 
                   C 20,-18 25,-10 25,0 
                   C 25,10 20,20 15,30 
                   C 10,38 5,40 0,40 
                   C -5,40 -10,38 -15,30 
                   C -20,20 -25,10 -25,0 
                   C -25,-10 -20,-18 -15,-25 
                   C -12,-30 -8,-35 0,-35 Z" 
                fill={c('WM')} stroke="none" />

          {/* Lateral Ventricles (CSF) - Butterfly Shape */}
          <path d="M-3,-15 
                   Q -8,-25 -15,-15 
                   Q -12,-5 -5,0 
                   Q -2,15 -8,25 
                   Q 0,22 3,10 
                   Q 6,22 14,25 
                   Q 8,15 11,0 
                   Q 18,-5 21,-15 
                   Q 14,-25 9,-15 
                   Q 4,-5 0,-10 
                   Q -4,-5 -3,-15 Z" 
                fill={c('CSF')} stroke="none" />
          
          {/* Third Ventricle */}
          <rect x="-1" y="-5" width="2" height="10" fill={c('CSF')} rx="1" />
      </g>
  );

  // --- K-SPACE & RECONSTRUCTION SIMULATION ---
  
  // Simulate Linear Phase Encoding (Top to Bottom filling)
  // In a real spin echo, we fill one line per TR.
  const TOTAL_LINES = 64;
  // Map simulation progress (0-100%) to lines filled (0-64)
  const linesFilled = Math.floor((simulationState.progress / 100) * TOTAL_LINES);
  const centerLine = TOTAL_LINES / 2;
  
  // Physics: Center of K-Space = Contrast (Signal Power). Periphery = Resolution (Edges).
  // We calculate how "close" the scan is to having acquired the center lines.
  const distFromCenter = Math.abs(linesFilled - centerLine);
  const hasCrossedCenter = linesFilled > centerLine;
  
  // Blur calculation:
  // If we haven't crossed center, image is basically noise/ghosts (simulated by max blur).
  // Once we cross center, contrast appears, then blur reduces as we fill the rest.
  let blurAmount = 20; // Start very blurry
  let contrastOpacity = 0.3; // Start faint
  
  if (simulationState.isScanning || simulationState.progress > 0) {
      if (!hasCrossedCenter) {
          // Approaching center: Blur high, opacity increasing slightly
          // As we approach line 32, opacity goes up.
          blurAmount = 15 - (linesFilled / centerLine) * 5; 
          contrastOpacity = 0.3 + (linesFilled / centerLine) * 0.2;
      } else {
          // Crossed center: Contrast is locked, Resolution improving (Blur decreasing)
          // Filling from 32 to 64
          const remainingLines = TOTAL_LINES - linesFilled;
          // Blur goes from ~10 down to 0
          blurAmount = (remainingLines / centerLine) * 10; 
          contrastOpacity = 1;
      }
  } else {
     // Idle state: Show full quality if we finished, or reset if at 0
     blurAmount = simulationState.progress === 100 ? 0 : 0;
     contrastOpacity = 1;
  }

  return (
    <div className="flex flex-col w-full h-full gap-4 p-2">
        
        {/* VISUALIZATION ROW */}
        <div className="flex flex-row justify-center gap-6 items-center h-[300px]">
            
            {/* K-SPACE (FREQUENCY DOMAIN) */}
            <div className="relative w-[260px] h-[260px] bg-black border border-slate-700 shadow-lg overflow-hidden">
                <div className="absolute top-2 left-2 text-[10px] font-mono text-blue-300 bg-black/70 px-1 rounded z-10 border border-blue-900/50">
                    ESPACE-K (DONNÉES BRUTES)
                </div>
                
                {/* Background Pattern (Noise) */}
                <div className="absolute inset-0 opacity-30" 
                     style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '4px 4px' }} />

                {/* Central bright spot (DC component) - Always faintly visible */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white blur-sm rounded-full opacity-50" />

                {/* Phase Encoding Lines Filling */}
                <div className="absolute inset-0 flex flex-col">
                    {Array.from({ length: TOTAL_LINES }).map((_, i) => {
                        const isAcquired = i < linesFilled;
                        // Center lines are brighter in K-space (more signal energy)
                        const intensity = 1 - (Math.abs(i - 32) / 32); 
                        
                        return (
                            <div key={i} className="flex-1 w-full flex justify-center items-center">
                                <div 
                                    className={`h-[1px] w-full transition-all duration-75 ${isAcquired ? 'bg-white' : 'bg-transparent'}`}
                                    style={{ opacity: isAcquired ? intensity * 0.8 + 0.2 : 0 }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Active Line Cursor */}
                {simulationState.isScanning && (
                    <div className="absolute w-full h-[2px] bg-yellow-400 shadow-[0_0_8px_yellow] z-20 transition-all duration-75"
                         style={{ top: `${(linesFilled / TOTAL_LINES) * 100}%` }} />
                )}
                
                <div className="absolute bottom-2 right-2 text-[9px] text-slate-500 font-mono">
                    ligne ky: {linesFilled}/{TOTAL_LINES}
                </div>
            </div>

            {/* TRANSFORMATION ARROW */}
            <div className="flex flex-col items-center gap-1 opacity-50">
                <span className="text-[9px] text-slate-400 font-mono">2D FFT</span>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                    <path d="M17 12l-10 0" />
                    <path d="M13 8l4 4l-4 4" />
                </svg>
            </div>

            {/* IMAGE SPACE (RECONSTRUCTION) */}
            <div className="relative w-[260px] h-[260px] bg-black border border-slate-700 shadow-lg overflow-hidden group">
                <div className="absolute top-2 left-2 text-[10px] font-mono text-green-300 bg-black/70 px-1 rounded z-10 border border-green-900/50">
                    RECONSTRUCTION
                </div>

                {/* The Actual Brain Image */}
                {/* We blur this based on K-space completeness to simulate resolution recovery */}
                <div style={{ 
                    filter: `blur(${blurAmount}px)`, 
                    opacity: contrastOpacity,
                    transition: 'filter 0.2s ease-out, opacity 0.2s ease-out'
                }} className="w-full h-full flex items-center justify-center bg-black">
                    <img 
                        src={getBrainImage()} 
                        alt="MRI Scan" 
                        className="w-full h-full object-contain"
                    />
                </div>
                
                {/* Info Overlay */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>Seq: {sequence.split(' ')[0]}</span>
                    <span>Res: {linesFilled > 32 ? 'HIGH' : 'LOW'}</span>
                </div>
            </div>
        </div>

        {/* PULSE SEQUENCE DIAGRAM (TIMING) */}
        <div className="flex-1 bg-slate-900/80 rounded-lg border border-slate-800 p-3 relative overflow-hidden flex flex-col">
             <div className="text-[10px] text-slate-500 font-bold mb-2 flex justify-between">
                <span>DIAGRAMME DE SÉQUENCE (PSD)</span>
                <span>TR: Temps de Répétition</span>
             </div>

             {/* Channels Container */}
             <div className="flex-1 flex flex-col justify-between relative">
                
                {/* Vertical Time Marker - Simulates the scanner time progression */}
                {simulationState.isScanning && (
                    <div className="absolute top-0 bottom-0 w-[1px] bg-yellow-500/50 z-10"
                         style={{ left: `${(simulationState.timeMs % 500) / 5}%` /* 500ms visual loop matches App.tsx loop */ }} />
                )}

                {/* RF CHANNEL */}
                <div className="flex items-center h-8 border-b border-slate-800/50 relative">
                    <span className="w-8 text-[9px] text-red-400 font-mono">RF</span>
                    <svg className="flex-1 h-full overflow-visible">
                        {/* 90 degree pulse */}
                        <path d="M10,25 L20,25 L20,5 L30,5 L30,25 L100,25" stroke="#f87171" fill="none" strokeWidth="1.5" />
                        {/* 180 degree pulse */}
                        <path d="M120,25 L130,25 L130,0 L145,0 L145,25 L200,25" stroke="#f87171" fill="none" strokeWidth="1.5" />
                        {/* Echo */}
                        <path d="M220,25 Q240,5 260,25 Q280,45 300,25" stroke="#60a5fa" fill="none" strokeWidth="1" strokeDasharray="2,2" />
                    </svg>
                </div>

                {/* SLICE SELECT (Gz) */}
                <div className="flex items-center h-8 border-b border-slate-800/50 relative">
                    <span className="w-8 text-[9px] text-blue-400 font-mono">Gz</span>
                    <svg className="flex-1 h-full overflow-visible">
                        {/* Slice select during 90 */}
                        <path d="M10,20 L20,20 L22,10 L28,10 L30,20 L120,20 L122,10 L153,10 L155,20 L200,20" stroke="#60a5fa" fill="none" strokeWidth="1.5" />
                    </svg>
                </div>

                {/* PHASE ENCODE (Gy) - THE IMPORTANT ONE FOR THIS VIEW */}
                <div className="flex items-center h-8 border-b border-slate-800/50 relative">
                    <span className="w-8 text-[9px] text-green-400 font-mono">Gy</span>
                    <svg className="flex-1 h-full overflow-visible">
                         {/* Ladder effect showing varying amplitudes for each line */}
                         <g opacity="0.3">
                            <path d="M50,20 L60,20 L65,5 L85,5 L90,20 L150,20" stroke="#4ade80" fill="none" />
                            <path d="M50,20 L60,20 L65,35 L85,35 L90,20 L150,20" stroke="#4ade80" fill="none" />
                         </g>
                         {/* Active Step - Changes based on which K-space line we are filling */}
                         {simulationState.isScanning && (
                             <path 
                                d={`M50,20 L60,20 L65,${20 - ((linesFilled - 32)/32)*15} L85,${20 - ((linesFilled - 32)/32)*15} L90,20 L150,20`} 
                                stroke="#22c55e" fill="none" strokeWidth="2" 
                             />
                         )}
                    </svg>
                </div>

                {/* FREQUENCY ENCODE (Gx) */}
                <div className="flex items-center h-8 relative">
                    <span className="w-8 text-[9px] text-purple-400 font-mono">Gx</span>
                    <svg className="flex-1 h-full overflow-visible">
                        {/* Pre-phase and Readout */}
                        <path d="M50,20 L60,20 L65,25 L85,25 L90,20 L210,20 L215,10 L305,10 L310,20" stroke="#c084fc" fill="none" strokeWidth="1.5" />
                        {/* ADC ON Window */}
                        <rect x="215" y="8" width="90" height="14" fill="rgba(168, 85, 247, 0.2)" stroke="none" />
                        <text x="240" y="18" fontSize="8" fill="#a855f7">ADC ON</text>
                    </svg>
                </div>
             </div>
        </div>
    </div>
  );
};

export default SliceSimulator;
