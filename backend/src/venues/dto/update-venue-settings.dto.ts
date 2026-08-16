import {
    IsArray,
    IsBoolean,
    IsHexColor,
    IsIn,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    Min
} from 'class-validator';

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

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    taxRatePercent?: number;

    @IsOptional()
    @IsBoolean()
    taxInclusive?: boolean;

    @IsOptional()
    @IsBoolean()
    autoPrintTickets?: boolean;

    @IsOptional()
    @IsUrl({ require_tld: false }) // local network addresses like http://192.168.1.50:10100 have no TLD — a normal @IsUrl() would reject them
    printerBridgeUrl?: string;

    @IsOptional()
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @IsNumber()
    longitude?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    supportedLanguages?: string[];
}