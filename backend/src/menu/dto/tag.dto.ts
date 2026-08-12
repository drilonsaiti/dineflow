import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTagDto {
    @IsString()
    @MaxLength(40)
    label!: string;

    @IsOptional()
    @IsIn(['dietary', 'allergen', 'other'])
    kind?: string;
}