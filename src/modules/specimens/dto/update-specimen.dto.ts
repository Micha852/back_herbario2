import { PartialType } from '@nestjs/swagger';
import { CreateSpecimenDto } from './create-specimen.dto';

/**
 * Todos los campos de creación son opcionales al editar.
 * Al ser una clase real, el ValidationPipe la valida (y rechaza campos desconocidos).
 */
export class UpdateSpecimenDto extends PartialType(CreateSpecimenDto) {}
