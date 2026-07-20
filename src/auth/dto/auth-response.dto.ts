import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: Role }) role!: Role;
}

export class TokenPairDto {
  @ApiProperty({ description: 'Short-lived JWT for the Authorization: Bearer header' })
  accessToken!: string;

  @ApiProperty({ description: 'Longer-lived JWT used only against POST /auth/refresh' })
  refreshToken!: string;

  @ApiProperty() expiresIn!: number;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
