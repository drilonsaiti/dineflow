import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';

class ModifierOptionDto {
    @IsOptional()
    @IsString()
    id?: string; // present on update = existing option, absent = new option

    @IsString()
    @MaxLength(60)
    name!: string;

    @IsInt()
    priceDeltaCents!: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    displayOrder?: number;
}

class ModifierGroupDto {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    @MaxLength(60)
    name!: string;

    @IsBoolean()
    isRequired!: boolean;

    @IsInt()
    @Min(0)
    minSelect!: number;

    @IsInt()
    @Min(1)
    maxSelect!: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    displayOrder?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ModifierOptionDto)
    options!: ModifierOptionDto[];
}

export class CreateMenuItemDto {
    @IsString()
    categoryId!: string;

    @IsString()
    @MaxLength(100)
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    photoUrl?: string;

    @IsInt()
    @Min(0)
    priceCents!: number;

    @IsOptional()
    @IsBoolean()
    isAvailable?: boolean;

    @IsOptional()
    @IsInt()
    displayOrder?: number;

    @IsOptional()
    @IsBoolean()
    dineInOnly?: boolean;

    @IsOptional()
    @IsBoolean()
    takeawayOnly?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tagIds?: string[];

    // Whole modifier-group tree replaces the item's existing groups on
    // create/update — see MenuService.upsertModifierGroups for why a
    // replace-in-place strategy was chosen over diffing.
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ModifierGroupDto)
    modifierGroups?: ModifierGroupDto[];

    @IsOptional()
    @IsInt()
    @Min(0)
    stockCount?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    lowStockThreshold?: number;
}

export class UpdateMenuItemDto extends CreateMenuItemDto {
    // All fields optional on update — Nest's PartialType would need a
    // separate import; simplest to just relax categoryId/name/priceCents here.
    @IsOptional()
    @IsString()
    declare categoryId: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    declare name: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    declare priceCents: number;
}

export class ReorderDto {
    @IsArray()
    @IsString({ each: true })
    orderedIds!: string[];
}