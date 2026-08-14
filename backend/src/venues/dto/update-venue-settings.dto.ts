import { IsHexColor, IsIn, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class UpdateVenueSettingsDto {
    @IsOptional()
    @IsIn(['restaurant', 'cafe', 'bar', 'other'])
    type?: string;

    @IsOptional()
    @IsUrl()
    logoUrl?: string;

    @IsOptional()
    @IsHexColor()
    brandColor?: string;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsString()
    timezone?: string;

    @IsOptional()
    @IsUrl()
    staffAlertWebhookUrl?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    lateOrderThresholdMinutes?: number;
}