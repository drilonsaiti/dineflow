import {IsEmail, IsEnum, Matches} from 'class-validator';
import {VenueRole} from '@prisma/client';

export class InviteStaffDto {
    @IsEmail()
    email!: string;

    @IsEnum(VenueRole)
    role!: VenueRole;

    // A 4-6 digit PIN the owner sets and tells the employee verbally/on a
    // sticky note — this becomes their Supabase password. Short and numeric
    // on purpose: it's meant to be typed on a phone in three seconds, not
    // memorized as a secure password (the account it protects has no billing
    // access and is scoped to one venue's floor operations).
    @Matches(/^\d{4,6}$/, {message: 'PIN must be 4-6 digits'})
    pin!: string;
}