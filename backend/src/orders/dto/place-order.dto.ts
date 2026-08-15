import {IsOptional, IsString} from 'class-validator';

export class PlaceOrderDto {
    @IsString()
    tableToken!: string;

    @IsOptional()
    @IsString()
    customerName?: string;

    @IsOptional()
    @IsString()
    customerPhone?: string;

    @IsOptional()
    @IsString()
    note?: string;

    @IsString()
    sessionToken!: string;
}