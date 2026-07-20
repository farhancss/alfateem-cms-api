import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'editor@alfateemacademy.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Aisha Khan' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'Strong_Passw0rd!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: Role, default: Role.EDITOR })
  @IsEnum(Role)
  role: Role = Role.EDITOR;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
