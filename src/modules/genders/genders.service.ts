import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class GendersService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.gender.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
            },
            orderBy: { name: 'asc' },
        });
    }
}
