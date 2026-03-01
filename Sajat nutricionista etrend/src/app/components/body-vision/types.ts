/**
 * BodyVision - Shared Types
 * All type definitions used across BodyVision sub-components.
 */

export interface BodyImages {
  front: string;
  side: string;
  back: string;
  sideAlt: string;
}

export interface ImageValidation {
  front: ValidationStatus;
  side: ValidationStatus;
  back: ValidationStatus;
  sideAlt: ValidationStatus;
}

export type ValidationStatus = 'pending' | 'analyzing' | 'valid' | 'invalid';

export interface ArchivedSession {
  id: string;
  date: string;
  bodyImages: BodyImages;
  monthsInvested: number;
  fatLoss: number;
  muscleGain: number;
  weightChange: number;
  label: string;
}

export type ViewType = 'front' | 'side' | 'back' | 'sideAlt';

export const POSITION_LABELS: Record<keyof BodyImages, string> = {
  front: 'Elolnezet',
  side: 'Jobb oldal',
  back: 'Hatulnezet',
  sideAlt: 'Bal oldal',
};

export const POSITIONS: (keyof BodyImages)[] = ['front', 'side', 'back', 'sideAlt'];
