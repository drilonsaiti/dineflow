import {IsArray, IsInt, IsOptional, IsString, Min} from 'class-validator';

export class AddCartItemDto {
    @IsString()
    tableToken!: string;

    @IsString()
    menuItemId!: string;

    @IsInt()
    @Min(1)
    quantity!: number;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsString()
    addedByLabel?: string;

    @IsArray()
    @IsString({each: true})
    modifierOptionIds!: string[];

    @IsString()
    sessionToken!: string;
}

export class UpdateCartItemDto {
    @IsOptional()
    @IsInt()
    @Min(0) // 0 = remove
    quantity?: number;

    @IsOptional()
    @IsString()
    note?: string;
}