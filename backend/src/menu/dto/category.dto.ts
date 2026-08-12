import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
    @IsString()
    @MaxLength(80)
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    displayOrder?: number;
}

export class UpdateCategoryDto {
    @IsOptional()
    @IsString()
    @MaxLength(80)
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    displayOrder?: number;
}