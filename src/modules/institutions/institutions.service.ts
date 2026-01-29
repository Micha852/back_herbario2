import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class InstitutionsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.institution.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                acronym: true,
            },
            orderBy: { name: 'asc' },
        });
    }
}
