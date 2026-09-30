import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Autentica al usuario si envía un token válido, pero nunca bloquea la petición.
 * Útil en endpoints públicos que muestran más datos a usuarios con ciertos roles.
 * Sin token (o con uno inválido/vencido) `request.user` queda en null.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(_err: unknown, user: TUser): TUser {
    return (user || null) as TUser;
  }
}
