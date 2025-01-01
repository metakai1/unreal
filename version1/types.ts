import { Memory, UUID } from "@ai16z/eliza";

export enum PlotSize {
    Nano = 'Nano',
    Micro = 'Micro',
    Small = 'Small',
    Medium = 'Medium',
    Large = 'Large',
    Mega = 'Mega',
    Giga = 'Giga'
}

export enum ZoningType {
    Residential = 'Residential',
    Commercial = 'Commercial',
    Industrial = 'Industrial',
    Mixed = 'Mixed',
    Special = 'Special',
    Legendary = 'Legendary'
}

export enum BuildingType {
    LowRise = 'LowRise',
    MidRise = 'MidRise',
    HighRise = 'HighRise',
    Skyscraper = 'Skyscraper',
    Megascraper = 'Megascraper'
}

export enum DistanceCategory {
    Close = 'Close',
    Medium = 'Medium',
    Far = 'Far'
}

export interface LandPlotMetadata {
    rank: number;
    name: string;
    neighborhood: string;
    zoning: ZoningType;
    plotSize: PlotSize;
    buildingType: BuildingType;
    distances: {
        ocean: {
            meters: number;
            category: DistanceCategory;
        };
        bay: {
            meters: number;
            category: DistanceCategory;
        };
    };
    building: {
        floors: {
            min: number;
            max: number;
        };
        height: {
            min: number;
            max: number;
        };
    };
    plotArea: number;
}

export interface LandPlotMemory extends Memory {
    id: UUID;
    content: {
        text: string;
        metadata: LandPlotMetadata;
    };
}

export interface LandSearchParams {
    neighborhoods?: string[];
    zoningTypes?: ZoningType[];
    plotSizes?: PlotSize[];
    buildingTypes?: BuildingType[];
    distances?: {
        ocean?: {
            maxMeters?: number;
            category?: DistanceCategory;
        };
        bay?: {
            maxMeters?: number;
            category?: DistanceCategory;
        };
    };
    building?: {
        floors?: {
            min?: number;
            max?: number;
        };
        height?: {
            min?: number;
            max?: number;
        };
    };
    rarity?: {
        rankRange?: {
            min?: number;
            max?: number;
        };
    };
}

// Constants
export const AGENT_ID: `${string}-${string}-${string}-${string}-${string}` = '1459b245-2171-02f6-b436-c3c2641848e5';
export const LAND_TABLE = 'land_memories';
export const LAND_ROOM_ID = AGENT_ID;
export const LAND_AGENT_ID = AGENT_ID;
export const DEFAULT_MATCH_THRESHOLD = 0.75;
export const DEFAULT_MATCH_COUNT = 20;
