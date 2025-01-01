import { LandPlotMemory, LandPlotMetadata } from "./types";

function printLandMemory(memory: LandPlotMemory) {
    const metadata = memory.content.metadata;
    console.log(`
🏗️  Land Plot Memory
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID: ${memory.id}
Name: ${metadata.name}
Rank: ${metadata.rank}
Location: ${metadata.neighborhood}

Properties:
• Plot Size: ${metadata.plotSize}
• Zoning: ${metadata.zoning}
• Building Type: ${metadata.buildingType}
• Plot Area: ${metadata.plotArea}m²

Building Details:
• Floors: ${metadata.building.floors.min}-${metadata.building.floors.max}
• Height: ${metadata.building.height.min}-${metadata.building.height.max}m

Distances:
• Ocean: ${metadata.distances.ocean.meters}m (${metadata.distances.ocean.category})
• Bay: ${metadata.distances.bay.meters}m (${metadata.distances.bay.category})

Description:
${memory.content.text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

export { printLandMemory };