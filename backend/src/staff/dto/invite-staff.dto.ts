import { IsEmail, IsEnum } from 'class-validator';
import { VenueRole } from '@prisma/client';

export class InviteStaffDto {
    @IsEmail()
    email!: string;

    @IsEnum(VenueRole)
    role!: VenueRole;
}