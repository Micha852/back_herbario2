import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class UserEntity {
  @ApiProperty({ description: 'User UUID' })
  id: string;

  @ApiProperty({ description: 'User full name' })
  name: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @Exclude()
  password: string;

  @ApiProperty({ description: 'Is user a collector?' })
  isCollector: boolean;

  @ApiProperty({ description: 'Is user active?' })
  isActive: boolean;

  @ApiProperty({ description: 'Role ID' })
  roleId: string;

  @ApiPropertyOptional({ description: 'Gender ID' })
  genderId?: string;

  @ApiPropertyOptional({ description: 'User type ID' })
  typeId?: string;

  @ApiPropertyOptional({ description: 'Institution ID' })
  institutionId?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'User role details' })
  role?: {
    id: string;
    name: string;
    permissions: string[];
  };

  @ApiPropertyOptional({ description: 'User gender details' })
  gender?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'User type details' })
  type?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'Institution details' })
  institution?: {
    id: string;
    name: string;
  };

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
