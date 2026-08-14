import {IsIn, IsInt, IsOptional, IsString, Max, Min} from 'class-validator';

export class CreateTableRequestDto {
    @IsString()
    tableToken!: string;

    @IsIn(['CALL_WAITER', 'REQUEST_BILL_CASH'])
    type!: 'CALL_WAITER' | 'REQUEST_BILL_CASH';

    @IsOptional()
    @IsInt()
    @Min(1)
    guestCount?: number;

    @IsString()
    sessionToken!: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    tipPercent?: number;
}