import {Tag} from "@/types/tag";
import {ModifierGroup} from "@/types/modifier";

export interface MenuItem {
    id: string;
    categoryId: string;
    name: string;
    description: string | null;
    photoUrl: string | null;
    priceCents: number;
    isAvailable: boolean;
    displayOrder: number;
    tags: { tag: Tag }[];
    modifierGroups: ModifierGroup[];
}

export interface MenuCategory {
    id: string;
    name: string;
    description: string | null;
    displayOrder: number;
    items: MenuItem[];
}

export interface PublicMenu {
    venue: {
        name: string;
        currency: string;
    };
    categories: {
        id: string;
        name: string;
        description: string | null;
        items: PublicMenuItem[];
    }[];
}

export interface PublicMenuItem {
    id: string;
    name: string;
    description: string | null;
    photoUrl: string | null;
    priceCents: number;
    isAvailable: boolean;

    tags: {
        tag: {
            id: string;
            label: string;
            kind: string;
        };
    }[];

    modifierGroups: {
        id: string;
        name: string;
        isRequired: boolean;
        minSelect: number;
        maxSelect: number;
        options: {
            id: string;
            name: string;
            priceDeltaCents: number;
        }[];
    }[];
}