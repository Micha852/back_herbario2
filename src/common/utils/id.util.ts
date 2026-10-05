/**
 * Identificadores de la base: siempre con forma de UUID (8-4-4-4-12 hexadecimales), pero no
 * todos son UUID "válidos" de alguna versión: los datos iniciales de la migración
 * 20260125025500_seed_initial_data usan IDs fijos como 00000000-0000-0000-0002-000000000004.
 * @IsUUID() / ParseUUIDPipe los rechazan (en producción: "genderId must be a UUID" al editar
 * el perfil, catálogos que no se podían editar…). Por eso se valida la forma, sin versión.
 * Usar siempre IsId / isId / ParseIdPipe para IDs, nunca IsUUID / ParseUUIDPipe.
 */

import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { IsUUID, isUUID, ValidationOptions } from 'class-validator';

const ID_FORMAT = 'loose' as const;

export const isId = (value: unknown): value is string =>
  typeof value === 'string' && isUUID(value, ID_FORMAT);

/** Para los DTO: el campo es un ID (de un catálogo, usuario, proyecto…) */
export const IsId = (options?: ValidationOptions) =>
  IsUUID(ID_FORMAT, { message: 'Identificador no válido', ...options });

/** Para los parámetros de la URL (:id) */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isId(value)) {
      throw new BadRequestException('Identificador no válido');
    }
    return value;
  }
}
