import { TissueProperties, BodyRegion } from './types';

// Physics Constants
export const GYROMAGNETIC_RATIO_HYDROGEN = 42.58; // MHz/Tesla

// Approximate T1 and T2 values at 1.5T (in ms)
export const TISSUES: Record<string, TissueProperties> = {
  CSF: { name: 'LCR (Liquide Céphalo-Rachidien)', t1: 2400, t2: 160, pd: 1.0, color: '#60a5fa' }, // Long T1, Long T2
  WM: { name: 'Matière Blanche', t1: 600, t2: 80, pd: 0.7, color: '#f1f5f9' }, // Short T1
  GM: { name: 'Matière Grise', t1: 950, t2: 100, pd: 0.8, color: '#94a3b8' },
  FAT: { name: 'Graisse', t1: 250, t2: 60, pd: 0.9, color: '#fbbf24' }, // Very Short T1
  MUSCLE: { name: 'Muscle', t1: 900, t2: 50, pd: 0.75, color: '#ef4444' },
  BONE: { name: 'Os Cortical', t1: 1, t2: 1, pd: 0.05, color: '#1e293b' }, // Signal void (approximated as near 0)
};

export const REGION_TISSUES: Record<BodyRegion, string[]> = {
  [BodyRegion.BRAIN]: ['CSF', 'WM', 'GM', 'FAT', 'BONE'],
  [BodyRegion.SPINE]: ['CSF', 'FAT', 'MUSCLE', 'BONE', 'WM'],
  [BodyRegion.KNEE]: ['FAT', 'MUSCLE', 'BONE', 'CSF'],
  [BodyRegion.ABDOMEN]: ['FAT', 'MUSCLE', 'BONE', 'GM'],
};

export const PROTON_GRID_SIZE = 6; // Reduced for 3D performance

export const APP_VERSION = '1.0.0';