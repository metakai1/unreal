/*
 * Land Database Adapter Design Document
 * ===================================
 * 
 * Overview
 * --------
 * The Land Database Adapter extends Eliza's PostgreSQL adapter to provide specialized 
 * functionality for managing virtual real estate data. It combines vector-based semantic 
 * search with structured metadata queries.
 * 
 * Integration with Eliza Memory System
 * ----------------------------------
 * 1. Memory Structure
 *    - Uses single table: 'land_memories'
 *    - Uses single room: 'global_land'
 *    - Uses single agent: 'land_system'
 * 
 * 2. Memory Format
 *    LandPlotMemory extends Eliza's base Memory type:
 *    {
 *      id: UUID,
 *      roomId: 'global_land',
 *      agentId: 'land_system',
 *      content: {
 *        text: string,           // Semantic description
 *        metadata: {             // Structured data
 *          neighborhood: string,
 *          zoning: ZoningType,
 *          plotSize: PlotSize,
 *          // ... other metadata
 *        }
 *      }
 *    }
 * 
 * Key Components
 * -------------
 * 1. Metadata Search
 *    - Structured queries using PostgreSQL JSON operators
 *    - Filters: neighborhood, zoning, plot size, distances, building specs, rarity
 * 
 * 2. Semantic Search
 *    - Leverages Eliza's vector search capabilities
 *    - Uses text embeddings for similarity matching
 * 
 * 3. Combined Search
 *    - Intersects results from metadata and semantic searches
 *    - Allows natural language queries with structured filters
 * 
 * Usage Patterns
 * -------------
 * 1. Creating Land Records
 *    ```typescript
 *    await landDB.createLandMemory({
 *      content: {
 *        text: "Beachfront property with ocean views...",
 *        metadata: {
 *          neighborhood: "North Shore",
 *          zoning: ZoningType.Residential
 *        }
 *      }
 *    });
 *    ```
 * 
 * 2. Searching Properties
 *    ```typescript
 *    // Metadata search
 *    const beachProperties = await landDB.searchLandByMetadata({
 *      neighborhoods: ["North Shore"],
 *      distances: { ocean: { category: DistanceCategory.Close } }
 *    });
 * 
 *    // Combined search
 *    const results = await landDB.searchLandByCombinedCriteria(
 *      queryEmbedding,
 *      { plotSizes: [PlotSize.Large] }
 *    );
 *    ```
 * 
 * Integration Steps
 * ---------------
 * 1. Initialize Database
 *    ```typescript
 *    const landDB = new LandDatabaseAdapter({
 *      host: 'localhost',
 *      database: 'land_db',
 *      // ... other pg config
 *    });
 *    await landDB.init();
 *    ```
 * 
 * 2. Connect with Memory System
 *    ```typescript
 *    import { MemorySystem } from './memories';
 * 
 *    const memorySystem = new MemorySystem({
 *      database: landDB,
 *      // ... other memory config
 *    });
 *    ```
 * 
 * 3. Use in Land System
 *    ```typescript
 *    class LandSystem {
 *      constructor(
 *        private readonly memorySystem: MemorySystem,
 *        private readonly landDB: LandDatabaseAdapter
 *      ) {}
 * 
 *      async searchProperties(query: string, filters: LandSearchParams) {
 *        const embedding = await this.memorySystem.embedText(query);
 *        return this.landDB.searchLandByCombinedCriteria(embedding, filters);
 *      }
 *    }
 *    ```
 * 
 * Performance Considerations
 * ------------------------
 * 1. Indexing
 *    - Create GiST index for vector similarity search
 *    - Create indexes on frequently queried JSON paths
 * 
 * 2. Query Optimization
 *    - Metadata filters applied before expensive vector operations
 *    - Use appropriate match thresholds for semantic search
 * 
 * Future Enhancements
 * ------------------
 * 1. Multiple Worlds Support
 *    - Add world/realm separation using roomId
 *    - Implement cross-world search capabilities
 * 
 * 2. Property Updates
 *    - Add metadata update functionality
 *    - Implement version tracking
 * 
 * 3. Spatial Search
 *    - Add coordinate-based search
 *    - Implement proximity queries
 */


import { PostgresDatabaseAdapter } from "@ai16z/adapter-postgres";
import { UUID, Memory, elizaLogger } from "@ai16z/eliza";
import { LandPlotMemory, LandPlotMetadata, DistanceCategory, PlotSize, ZoningType, BuildingType } from "./v2_land_memorysystem";

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

export class LandDatabaseAdapter extends PostgresDatabaseAdapter {
    private readonly LAND_TABLE = 'land_memories';

    constructor(connectionConfig: any) {
        super(connectionConfig);
    }

    async createLandMemory(memory: LandPlotMemory): Promise<void> {
        await this.createMemory(memory, this.LAND_TABLE);
    }

    async searchLandByMetadata(params: LandSearchParams): Promise<LandPlotMemory[]> {
        let sql = `
            SELECT * FROM memories 
            WHERE type = $1 
            AND content IS NOT NULL
        `;
        const values: any[] = [this.LAND_TABLE];
        let paramCount = 1;

        if (params.neighborhoods?.length) {
            paramCount++;
            sql += ` AND content->'metadata'->>'neighborhood' = ANY($${paramCount}::text[])`;
            values.push(params.neighborhoods);
        }

        if (params.zoningTypes?.length) {
            paramCount++;
            sql += ` AND content->'metadata'->>'zoning' = ANY($${paramCount}::text[])`;
            values.push(params.zoningTypes);
        }

        if (params.plotSizes?.length) {
            paramCount++;
            sql += ` AND content->'metadata'->>'plotSize' = ANY($${paramCount}::text[])`;
            values.push(params.plotSizes);
        }

        if (params.distances?.ocean) {
            if (params.distances.ocean.maxMeters) {
                paramCount++;
                sql += ` AND (content->'metadata'->'distances'->'ocean'->>'meters')::int <= $${paramCount}`;
                values.push(params.distances.ocean.maxMeters);
            }
            if (params.distances.ocean.category) {
                paramCount++;
                sql += ` AND content->'metadata'->'distances'->'ocean'->>'category' = $${paramCount}`;
                values.push(params.distances.ocean.category);
            }
        }

        if (params.building?.floors) {
            if (params.building.floors.min) {
                paramCount++;
                sql += ` AND (content->'metadata'->'building'->'floors'->>'min')::int >= $${paramCount}`;
                values.push(params.building.floors.min);
            }
            if (params.building.floors.max) {
                paramCount++;
                sql += ` AND (content->'metadata'->'building'->'floors'->>'max')::int <= $${paramCount}`;
                values.push(params.building.floors.max);
            }
        }

        if (params.rarity?.rankRange) {
            if (params.rarity.rankRange.min) {
                paramCount++;
                sql += ` AND (content->'metadata'->'rarity'->>'rank')::int >= $${paramCount}`;
                values.push(params.rarity.rankRange.min);
            }
            if (params.rarity.rankRange.max) {
                paramCount++;
                sql += ` AND (content->'metadata'->'rarity'->>'rank')::int <= $${paramCount}`;
                values.push(params.rarity.rankRange.max);
            }
        }

        try {
            const { rows } = await this.query(sql, values);
            return rows.map(row => ({
                ...row,
                content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content
            }));
        } catch (error) {
            elizaLogger.error('Error in searchLandByMetadata:', {
                error: error instanceof Error ? error.message : String(error),
                params
            });
            throw error;
        }
    }

    async searchLandByCombinedCriteria(
        embedding: number[],
        metadata: Partial<LandSearchParams>,
        similarity_threshold: number = 0.7
    ): Promise<LandPlotMemory[]> {
        // First get semantic search results
        const semanticResults = await this.searchMemoriesByEmbedding(embedding, {
            tableName: this.LAND_TABLE,
            match_threshold: similarity_threshold
        });

        // If no metadata filters, return semantic results
        if (Object.keys(metadata).length === 0) {
            return semanticResults as LandPlotMemory[];
        }

        // Get metadata search results
        const metadataResults = await this.searchLandByMetadata(metadata);

        // Find intersection of results based on memory IDs
        const semanticIds = new Set(semanticResults.map(r => r.id));
        return metadataResults.filter(r => semanticIds.has(r.id));
    }

    async getPropertiesByRarityRange(
        minRank: number,
        maxRank: number
    ): Promise<LandPlotMemory[]> {
        return this.searchLandByMetadata({
            rarity: {
                rankRange: {
                    min: minRank,
                    max: maxRank
                }
            }
        });
    }
}