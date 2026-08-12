export interface ModifierOption {
    id: string;
    name: string;
    priceDeltaCents: number;
    displayOrder: number;
}

export interface ModifierGroup {
    id: string;
    name: string;
    isRequired: boolean;
    minSelect: number;
    maxSelect: number;
    displayOrder: number;
    options: ModifierOption[];
}