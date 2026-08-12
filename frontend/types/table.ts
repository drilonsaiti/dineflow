export interface Area {
    id: string;
    name: string;
}

export interface TableRow {
    id: string;
    label: string;
    areaId: string | null;
    area: Area | null;
    isActive: boolean;
    token: string;
    orderingUrl: string;
    qrDataUrl: string;
}