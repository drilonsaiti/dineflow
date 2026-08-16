import {
    BadRequestException,
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/public.decorator';
import { IsEmail, IsString } from 'class-validator';

class StaffLoginDto {
    @IsEmail()
    email!: string;

    @IsString()
    pin!: string;
}

const LOCKOUT_WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;

@Controller('auth/staff-login')
export class StaffAuthController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {}

    @Public()
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @Post()
    async login(@Body() dto: StaffLoginDto) {
        const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60_000);
        const recentFailures = await this.prisma.staffLoginAttempt.count({
            where: { email: dto.email, success: false, createdAt: { gte: windowStart } },
        });

        if (recentFailures >= MAX_ATTEMPTS) {
            throw new HttpException(
                `Too many failed attempts. Try again in ${LOCKOUT_WINDOW_MINUTES} minutes, or ask an owner to reset your PIN.`,
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        const supabase = createClient(this.config.getOrThrow('SUPABASE_URL'), this.config.getOrThrow('SUPABASE_ANON_KEY'));
        const { data, error } = await supabase.auth.signInWithPassword({ email: dto.email, password: dto.pin });

        await this.prisma.staffLoginAttempt.create({ data: { email: dto.email, success: !error } });

        if (error || !data.session) {
            throw new BadRequestException('Email or PIN not recognized.');
        }

        return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
    }
}