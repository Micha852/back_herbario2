import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MasterPrismaService } from './master-prisma.service';
import { TenantClientsService } from './tenant-clients.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantsService } from './tenants.service';

/** Multitenant: base master, pool de bases por herbario y resolución del herbario */
@Global()
@Module({
  providers: [MasterPrismaService, TenantClientsService, TenantsService],
  exports: [MasterPrismaService, TenantClientsService, TenantsService],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
