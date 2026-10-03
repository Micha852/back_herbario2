import { BadRequestException } from '@nestjs/common';

interface SpecimenValues {
  latitude?: number | null;
  longitude?: number | null;
  minElevation?: number | null;
  maxElevation?: number | null;
}

/** Problemas de coherencia entre campos (vacío = válido) */
export function specimenCoherenceErrors(values: SpecimenValues): string[] {
  const has = (v: number | null | undefined) => v !== null && v !== undefined;
  const errors: string[] = [];
  if (has(values.latitude) !== has(values.longitude)) {
    errors.push('La latitud y la longitud deben ir juntas');
  }
  if (
    has(values.minElevation) &&
    has(values.maxElevation) &&
    values.minElevation! > values.maxElevation!
  ) {
    errors.push('La elevación mínima no puede ser mayor que la máxima');
  }
  return errors;
}

export function assertSpecimenCoherence(values: SpecimenValues): void {
  const errors = specimenCoherenceErrors(values);
  if (errors.length) throw new BadRequestException(errors);
}
