import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TissueProperties } from '../types';

interface RelaxationChartProps {
  tissues: TissueProperties[];
  currentTime: number; 
  isScanning: boolean;
}

const RelaxationChart: React.FC<RelaxationChartProps> = ({ tissues, currentTime, isScanning }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 350;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 20, left: 40 };
    const chartHeight = (height - margin.top - margin.bottom) / 2 - 20; // Split into two charts

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Scale (Time)
    const xScale = d3.scaleLinear().domain([0, 3000]).range([0, width - margin.left - margin.right]);
    
    // Y Scale (Magnetization)
    const yScale = d3.scaleLinear().domain([0, 1]).range([chartHeight, 0]);

    // --- CHART 1: Longitudinal Magnetization (Mz) ---
    const gT1 = g.append("g");
    
    // Axis
    gT1.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(xScale).ticks(0));
    gT1.append("g").call(d3.axisLeft(yScale).ticks(3));
    
    // Label
    gT1.append("text")
       .attr("x", 10).attr("y", -5)
       .text("Mz (Longitudinal) - Repousse T1")
       .attr("fill", "#cbd5e1").attr("font-size", "10px").attr("font-weight", "bold");

    // --- CHART 2: Transverse Magnetization (Mxy) ---
    const gT2 = g.append("g").attr("transform", `translate(0, ${chartHeight + 30})`);
    
    // Axis
    gT2.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}ms`));
    gT2.append("g").call(d3.axisLeft(yScale).ticks(3));

    // Label
    gT2.append("text")
       .attr("x", 10).attr("y", -5)
       .text("Mxy (Transversal) - Décroissance T2")
       .attr("fill", "#cbd5e1").attr("font-size", "10px").attr("font-weight", "bold");

    // --- DRAW CURVES ---
    const lineT1 = d3.line<{t: number, val: number}>().x(d => xScale(d.t)).y(d => yScale(d.val)).curve(d3.curveBasis);
    const lineT2 = d3.line<{t: number, val: number}>().x(d => xScale(d.t)).y(d => yScale(d.val)).curve(d3.curveBasis);

    tissues.forEach(tissue => {
        const dataT1 = [];
        const dataT2 = [];
        
        for (let t = 0; t <= 3000; t += 50) {
            // Mz = 1 - e^(-t/T1)
            dataT1.push({ t, val: 1 - Math.exp(-t / tissue.t1) });
            // Mxy = e^(-t/T2)
            dataT2.push({ t, val: Math.exp(-t / tissue.t2) });
        }

        gT1.append("path")
           .datum(dataT1).attr("fill", "none").attr("stroke", tissue.color).attr("stroke-width", 2).attr("d", lineT1).style("opacity", 0.7);
           
        gT2.append("path")
           .datum(dataT2).attr("fill", "none").attr("stroke", tissue.color).attr("stroke-width", 2).attr("d", lineT2).style("opacity", 0.7);
    });

    // --- DRAW LIVE TIME CURSOR ---
    if (isScanning) {
        const cursorX = xScale(Math.min(3000, currentTime));
        
        // Vertical line spanning both charts
        g.append("line")
            .attr("x1", cursorX).attr("y1", 0)
            .attr("x2", cursorX).attr("y2", height)
            .attr("stroke", "#fff")
            .attr("stroke-dasharray", "2,2")
            .attr("opacity", 0.5);
    }

  }, [tissues, currentTime, isScanning]);

  return (
    <div className="w-full h-full bg-slate-900/50 p-2 rounded-lg border border-slate-800">
      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 350 300" preserveAspectRatio="xMidYMid meet"></svg>
    </div>
  );
};

export default RelaxationChart;