import { IsIn, IsString } from 'class-validator';

export class CreateTableRequestDto {
    @IsString()
    tableToken!: string;

    @IsIn(['CALL_WAITER', 'REQUEST_BILL_CASH'])
    type!: 'CALL_WAITER' | 'REQUEST_BILL_CASH';
}