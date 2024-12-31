import { Memory, UUID } from "@ai16z/eliza";

// Enums for our categorical data
export enum PlotSize {
    Nano = "Nano",
    Micro = "Micro",
    Mid = "Mid",
    Mega = "Mega",
    Mammoth = "Mammoth",
    Giga = "Giga"
}

export enum ZoningType {
    Legendary = "Legendary",
    MixedUse = "Mixed Use",
    Industrial = "Industrial",
    Residential = "Residential",
    Commercial = "Commercial"
}

export enum BuildingType {
    Lowrise = "Lowrise",
    Highrise = "Highrise",
    Tall = "Tall",
    Megatall = "Megatall"
}

export enum DistanceCategory {
    Close = "Close",
    Medium = "Medium",
    Far = "Far"
}

// Interface for our property metadata
export interface LandPlotMetadata {
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
    plot: {
        area: number;
        coordinates: {
            x: number;
            y: number;
        };
    };
    rarity: {
        rank: number;
        category: string;
    };
}

// Interface that extends Memory with our metadata
export interface LandPlotMemory extends Memory {
    id: UUID;
    content: {
        text: string;
        metadata: LandPlotMetadata;
    };
}

// Helper function to generate description from metadata
export function generateDescription(plot: LandPlotMetadata): string {
    return `${plot.plotSize} ${plot.zoning} plot in ${plot.neighborhood}. ` +
           `It is a ${plot.buildingType} building. ` +
           `Located ${plot.distances.ocean.category} from ocean and ${plot.distances.bay.category} from bay.`;
}

// Helper function to create a LandPlotMemory
export function createLandPlotMemory(
    id: UUID,
    metadata: LandPlotMetadata,
    agentId: UUID,
    roomId: UUID
): LandPlotMemory {
    return {
        id,
        agentId,
        roomId,
        userId: agentId, // Using agentId as userId for consistency
        content: {
            text: generateDescription(metadata),
            metadata
        }
    };
}

// Helper function to categorize distance
export function categorizeDistance(meters: number): DistanceCategory {
    if (meters <= 300) return DistanceCategory.Close;
    if (meters <= 700) return DistanceCategory.Medium;
    return DistanceCategory.Far;
}

// Helper function to categorize rarity
export function categorizeRarity(rank: number): string {
    if (rank <= 100) return "Ultra Premium";
    if (rank <= 500) return "Premium";
    if (rank <= 2000) return "Standard";
    if (rank <= 3000) return "Value";
    return "Entry Level";
}

// Example usage:
const plotMetadata: LandPlotMetadata = {
    neighborhood: "North Star",
    zoning: ZoningType.Residential,
    plotSize: PlotSize.Nano,
    buildingType: BuildingType.Lowrise,
    distances: {
        ocean: {
            meters: 250,
            category: DistanceCategory.Close
        },
        bay: {
            meters: 500,
            category: DistanceCategory.Medium
        }
    },
    building: {
        floors: { min: 1, max: 20 },
        height: { min: 4, max: 80 }
    },
    plot: {
        area: 1000,
        coordinates: { x: 250, y: 500 }
    },
    rarity: {
        rank: 299,
        category: "Premium"
    }
};

const landPlotMemory = createLandPlotMemory(
    "some-uuid",
    plotMetadata,
    "agent-uuid",
    "room-uuid"
);