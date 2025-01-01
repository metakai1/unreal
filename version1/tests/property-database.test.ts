import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { LandDatabaseAdapter } from "../land_database_adapter";
import { LandMemorySystem } from "../land_memory_system";
import {
    LandPlotMemory,
    LandPlotMetadata,
    ZoningType,
    PlotSize,
    BuildingType,
    DistanceCategory,
    LAND_TABLE,
    LAND_ROOM_ID,
    LAND_AGENT_ID
} from "../types";
import { stringToUuid } from "@ai16z/eliza";
import { printLandMemory } from "../logging";

describe('Land Plot Database Operations', () => {
    let db: LandDatabaseAdapter;
    let memorySystem: LandMemorySystem;

    // Mock embedder for testing
    const mockEmbedder = {
        embedText: async (text: string) => {
            return new Array(1536).fill(0); // Mock embedding vector
        }
    };

    beforeAll(async () => {
        // Initialize database
        db = new LandDatabaseAdapter({
            connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/test',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        await db.init();

        // Initialize memory system
        memorySystem = new LandMemorySystem(db, mockEmbedder);
    });

    afterAll(async () => {
        await db.close();
    });

    describe('Land Plot Creation', () => {
        test('should create valid land plot memory', async () => {
            const testMetadata: LandPlotMetadata = {
                rank: 1,
                name: 'Oceanview Residence',
                neighborhood: 'Coastal District',
                zoning: ZoningType.Residential,
                plotSize: PlotSize.Large,
                buildingType: BuildingType.MidRise,
                distances: {
                    ocean: {
                        meters: 150,
                        category: DistanceCategory.Close
                    },
                    bay: {
                        meters: 2000,
                        category: DistanceCategory.Far
                    }
                },
                building: {
                    floors: { min: 5, max: 8 },
                    height: { min: 15, max: 24 }
                },
                plotArea: 2500
            };

            const landMemory: LandPlotMemory = {
                id: stringToUuid(`LAND_AGENT_ID-${Date.now()}`), //stringToUuid(Date.getTime()), //LAND_AGENT_ID,  // TODO: stringToUuid(`LAND_AGENT_ID-${testMetadata.name}-${testMetadata.neighborhood}`),
                userId: LAND_AGENT_ID,
                roomId: LAND_ROOM_ID,
                agentId: LAND_AGENT_ID,
                content: {
                    text: `${testMetadata.name} is a ${testMetadata.plotSize} ${testMetadata.zoning} plot in ${testMetadata.neighborhood}`,
                    metadata: testMetadata
                },
                embedding: await mockEmbedder.embedText(testMetadata.name),
            };

            await db.createLandMemory(landMemory);

            // Verify creation
            const result = await db.getLandMemoryById(landMemory.id);
            printLandMemory(result as LandPlotMemory);

            expect(result).toBeDefined();
            expect(result?.content.metadata.name).toBe('Oceanview Residence');
            expect(result?.content.metadata.plotSize).toBe(PlotSize.Large);
        });
    });

    describe('Land Plot Search', () => {
        test('should find plots by neighborhood', async () => {
            const searchParams = {
                neighborhoods: ['Coastal District']
            };

            const results = await db.searchLandByMetadata(searchParams);

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].content.metadata.neighborhood).toBe('Coastal District');
        });

        test('should find plots by combined criteria', async () => {
            const searchParams = {
                neighborhoods: ['Coastal District'],
                plotSizes: [PlotSize.Large],
                distances: {
                    ocean: {
                        maxMeters: 200,
                        category: DistanceCategory.Close
                    }
                }
            };

            const results = await db.searchLandByMetadata(searchParams);

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.content.metadata.neighborhood).toBe('Coastal District');
                expect(result.content.metadata.plotSize).toBe(PlotSize.Large);
                expect(result.content.metadata.distances.ocean.meters).toBeLessThanOrEqual(200);
            });
        });

        test('should find plots by semantic search', async () => {
            const query = "Large residential plot near the ocean";
            const results = await memorySystem.searchProperties(query);

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.content.metadata.plotSize).toBe(PlotSize.Large);
                expect(result.content.metadata.zoning).toBe(ZoningType.Residential);
                expect(result.content.metadata.distances.ocean.category).toBe(DistanceCategory.Close);
            });
        });
    });

});
