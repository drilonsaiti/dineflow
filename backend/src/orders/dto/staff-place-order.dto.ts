import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class StaffOrderItemModifierDto {
    @IsString()
    modifierOptionId!: string;
}

class StaffOrderItemDto {
    @IsString()
    menuItemId!: string;

    @IsInt()
    @Min(1)
    quantity!: number;

    @IsOptional()
    @IsString()
    note?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StaffOrderItemModifierDto)
    modifiers!: StaffOrderItemModifierDto[];
}

// No sessionToken, no tableToken — the staff member is authenticated and
// venue-scoped already (VenueScopeGuard), and picks the table directly by
// id rather than resolving it from a scanned QR link.
export class StaffPlaceOrderDto {
    @IsString()
    tableId!: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => StaffOrderItemDto)
    items!: StaffOrderItemDto[];

    @IsOptional()
    @IsString()
    customerName?: string;

    @IsOptional()
    @IsString()
    note?: string;
}