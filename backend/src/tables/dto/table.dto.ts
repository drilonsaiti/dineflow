import {IsOptional, IsString, MaxLength} from 'class-validator';

export class CreateAreaDto {
    @IsString()
    @MaxLength(60)
    name!: string;
}

export class CreateTableDto {
    @IsString()
    @MaxLength(40)
    label!: string;

    @IsOptional()
    @IsString()
    areaId?: string;
}

export class UpdateTableDto {
    @IsOptional()
    @IsString()
    @MaxLength(40)
    label?: string;

    @IsOptional()
    @IsString()
    areaId?: string | null;
}