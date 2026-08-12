import { IsHexColor, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateVenueDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  // slug is derived server-side from name by default but can be overridden;
  // constrained to URL-safe chars since it's used directly in the public
  // menu path /r/:slug.
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, hyphens only' })
  slug?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsHexColor()
  brandColor?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
