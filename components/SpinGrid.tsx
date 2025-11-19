import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SimulationState } from '../types';
import { GYROMAGNETIC_RATIO_HYDROGEN } from '../constants';

interface SpinGridProps {
  simulationState: SimulationState;
}

const SpinGrid: React.FC<SpinGridProps> = ({ simulationState }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // 3D Projection Constants
  const PROJECTION_ANGLE = 30 * (Math.PI / 180); // Isometric-ish view
  const GRID_SIZE = 5;
  const SPACING = 45;
  
  // Project 3D (x,y,z) to 2D (screenX, screenY)
  const project = (x: number, y: number, z: number) => {
    // Simple cabinet/isometric projection
    // x goes right, y goes deep (diagonal), z goes up
    const screenX = x - (y * Math.cos(PROJECTION_ANGLE));
    const screenY = -z + (y * Math.sin(PROJECTION_ANGLE));
    return { x: screenX, y: screenY };
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const width = 400;
    const height = 350;
    const centerX = width / 2;
    const centerY = height / 1.5;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // Define Arrow Marker
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#38bdf8");

    // Draw B0 Field Vector (The "Z" Axis)
    const b0Start = project(180, -50, -50);
    const b0End = project(180, -50, 150);
    
    const fieldGroup = svg.append("g").attr("transform", `translate(${centerX}, ${centerY})`);
    
    // B0 Indicator
    if (simulationState.magnetOn) {
        fieldGroup.append("line")
            .attr("x1", b0Start.x).attr("y1", b0Start.y)
            .attr("x2", b0End.x).attr("y2", b0End.y)
            .attr("stroke", "#6366f1")
            .attr("stroke-width", 4)
            .attr("opacity", 0.5)
            .attr("marker-end", "url(#arrowhead)");
        
        fieldGroup.append("text")
            .attr("x", b0End.x).attr("y", b0End.y - 10)
            .text(`B0 (${simulationState.b0FieldStrength}T)`)
            .attr("fill", "#6366f1")
            .attr("font-size", 12)
            .attr("font-family", "monospace")
            .attr("text-anchor", "middle");
    }

    // Create Protons
    const protons = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        // Center the grid
        const offsetX = (x - GRID_SIZE / 2) * SPACING;
        const offsetY = (y - GRID_SIZE / 2) * SPACING;
        protons.push({ id: `${x}-${y}`, x: offsetX, y: offsetY, z: 0, basePhase: Math.random() * Math.PI * 2 });
      }
    }

    const g = svg.append("g").attr("transform", `translate(${centerX}, ${centerY})`);

    // Sort protons by depth (painter's algorithm) for rough 3D occlusion
    protons.sort((a, b) => b.y - a.y);

    // Render Loop
    let animationFrameId: number;

    const animate = () => {
      const now = Date.now();
      const t = now * 0.001; // Time in seconds

      // Larmor frequency simulation (scaled down for visual perception)
      // Real: 63 MHz at 1.5T. Visually: We just make it spin fast.
      const visualFrequency = simulationState.b0FieldStrength * 2; 

      // Clear existing protons
      g.selectAll(".proton").remove();

      protons.forEach((p, i) => {
        let theta = 0; // Angle from Z axis (0 is Up, 90 is XY plane, 180 is Down)
        let phi = p.basePhase; // Precession phase angle

        // --- PHYSICS LOGIC ---

        if (!simulationState.magnetOn) {
            // STATE: Random Thermal Motion
            // Direction changes slowly and randomly
            theta = (Math.sin(t * 0.5 + p.basePhase) * Math.PI); 
            phi = (Math.cos(t * 0.2 + i) * Math.PI * 2);
        } 
        else if (simulationState.phase === 'alignment') {
            // STATE: Precession around B0
            // Most align parallel (low energy, theta near 0), some anti-parallel.
            // We show Net Magnetization visually by making most point UP.
            const wobble = Math.sin(t * visualFrequency + p.basePhase) * 0.1; // Small wobble
            theta = wobble + 0.1; // Slight tilt
            phi = -(t * visualFrequency * Math.PI * 2) + p.basePhase; // Larmor Precession
        }
        else if (simulationState.phase === 'excitation') {
            // STATE: RF Pulse (B1)
            // Tip from Z axis (0) to XY plane (90 deg / PI/2)
            // AND enforce Phase Coherence (all phi become equal)
            
            theta = Math.PI / 2; // 90 degrees
            
            // Force phase coherence:
            // Current visual phase aligns with the "RF Pulse" direction
            const rfFrequency = visualFrequency; 
            phi = -(t * rfFrequency * Math.PI * 2); 
        }
        else if (simulationState.phase === 'relaxation') {
            // STATE: T1 Recovery and T2 Decay
            const timeSinceExcitation = simulationState.timeMs / 1000; // approx
            
            // T1 Recovery: Theta goes from 90 (PI/2) back to 0
            // Approx T1 of 1000ms for viz
            const t1Factor = Math.exp(-timeSinceExcitation / 1.5); 
            theta = (Math.PI / 2) * t1Factor;

            // T2 Decay: Phi spreads out (dephasing)
            // We add a unique offset to each proton that grows over time
            const dephasingSpeed = (i % 3 === 0 ? 1 : -1) * (i * 0.1);
            const dephasing = dephasingSpeed * timeSinceExcitation * 5;
            
            phi = -(t * visualFrequency * Math.PI * 2) + dephasing;
        }

        // Calculate vector tip position
        const vecLen = 25;
        const tipX = Math.sin(theta) * Math.cos(phi) * vecLen;
        const tipY = Math.sin(theta) * Math.sin(phi) * vecLen;
        const tipZ = Math.cos(theta) * vecLen;

        // Project base and tip
        const basePos = project(p.x, p.y, 0);
        const tipPos = project(p.x + tipX, p.y + tipY, tipZ);

        // Draw Proton Anchor (Atom)
        g.append("circle")
            .attr("cx", basePos.x)
            .attr("cy", basePos.y)
            .attr("r", 3)
            .attr("fill", "#475569")
            .attr("class", "proton");

        // Draw Vector
        const color = theta > 1 ? "#fca5a5" : "#38bdf8"; // Red if tipped (high energy), Blue if relaxed

        g.append("line")
            .attr("x1", basePos.x)
            .attr("y1", basePos.y)
            .attr("x2", tipPos.x)
            .attr("y2", tipPos.y)
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("class", "proton");
        
        // Draw Arrowhead manually for 3D feel
        g.append("circle")
            .attr("cx", tipPos.x)
            .attr("cy", tipPos.y)
            .attr("r", 2)
            .attr("fill", color)
            .attr("class", "proton");

      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [simulationState]);

  // Physics Dashboard
  const larmorFreq = (GYROMAGNETIC_RATIO_HYDROGEN * simulationState.b0FieldStrength).toFixed(2);

  return (
    <div className="flex flex-col gap-4 h-full">
        <div className="relative flex-1 bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                <div className="bg-black/60 backdrop-blur px-2 py-1 rounded border border-slate-600 text-xs font-mono text-green-400">
                    ω₀ = γB₀
                </div>
                <div className="bg-black/60 backdrop-blur px-2 py-1 rounded border border-slate-600 text-xs font-mono text-slate-300">
                    {GYROMAGNETIC_RATIO_HYDROGEN} × {simulationState.b0FieldStrength.toFixed(1)} = <span className="text-white font-bold">{larmorFreq} MHz</span>
                </div>
            </div>
            
            <svg ref={svgRef} className="w-full h-full"></svg>
            
            <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    !simulationState.magnetOn ? "bg-red-900/50 text-red-300" :
                    simulationState.phase === 'excitation' ? "bg-yellow-900/50 text-yellow-300 border border-yellow-500 animate-pulse" :
                    "bg-blue-900/50 text-blue-300 border border-blue-500"
                }`}>
                    {!simulationState.magnetOn ? "PAS DE CHAMP EXTERNE (ALÉATOIRE)" : 
                     simulationState.phase === 'alignment' ? "ALIGNEMENT LONGITUDINAL (Mz MAX)" :
                     simulationState.phase === 'excitation' ? "IMPULSION RF: BASCULE 90° (Mz → Mxy)" :
                     "RELAXATION: REPOUSSE T1 & DÉPHASAGE T2"}
                </span>
            </div>
        </div>
    </div>
  );
};

export default SpinGrid;