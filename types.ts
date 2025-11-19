export enum BodyRegion {
  BRAIN = 'Cerveau',
  SPINE = 'Rachis',
  KNEE = 'Genou',
  ABDOMEN = 'Abdomen'
}

export enum MRISequence {
  T1 = 'Pondération T1 (Anatomie)',
  T2 = 'Pondération T2 (Pathologie)',
  FLAIR = 'FLAIR',
  PD = 'Densité de Protons'
}

export type PhysicsPhase = 'random' | 'alignment' | 'excitation' | 'precession' | 'relaxation';

export interface SimulationState {
  isScanning: boolean;
  magnetOn: boolean;
  b0FieldStrength: number; // Tesla (1.5 or 3.0)
  phase: PhysicsPhase;
  progress: number; // 0-100
  timeMs: number; // Simulation time in ms
}

export interface TissueProperties {
  name: string;
  t1: number; // ms
  t2: number; // ms
  pd: number; // relative proton density 0-1
  color: string;
}