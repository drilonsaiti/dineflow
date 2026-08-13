import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTableRequestDto {
    @IsString()
    tableToken!: string;

    @IsIn(['CALL_WAITER', 'REQUEST_BILL_CASH'])
    type!: 'CALL_WAITER' | 'REQUEST_BILL_CASH';

    @IsOptional()
    @IsInt()
    @Min(1)
    guestCount?: number;
}