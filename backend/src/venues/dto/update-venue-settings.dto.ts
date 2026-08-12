import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class UpdateVenueSettingsDto {
    @IsOptional()
    @IsUrl()
    staffAlertWebhookUrl?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    lateOrderThresholdMinutes?: number;
}