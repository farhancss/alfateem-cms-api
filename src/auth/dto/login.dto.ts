import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@alfateemacademy.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'ChangeMe_Strong_Passw0rd!' })
  @IsString()
  @MinLength(8)
  password!: string;
}
