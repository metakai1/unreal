import { PostgresDatabaseAdapter } from "@ai16z/adapter-postgres";
import { elizaLogger, UUID } from "@ai16z/eliza";
import {
    LandPlotMemory,
    LandSearchParams,
    LAND_TABLE,
    LAND_ROOM_ID,
    LAND_AGENT_ID,
    DEFAULT_MATCH_THRESHOLD
} from "./types";

export class LandDatabaseAdapter extends PostgresDatabaseAdapter {
    constructor(connectionConfig: any) {
        super(connectionConfig);
    }

    async init(): Promise<void> {
        await super.init();
        // Add any additional initialization specific to LandDatabaseAdapter if needed
    }

    async createLandMemory(memory: LandPlotMemory): Promise<void> {
        await this.createMemory(memory, LAND_TABLE);
    }

    async getLandMemoryById(id: UUID): Promise<LandPlotMemory | undefined> {
        const memory = await super.getMemoryById(id);
        if (!memory) return undefined;
        return memory as LandPlotMemory;
    }

    async searchLandByMetadata(params: LandSearchParams): Promise<LandPlotMemory[]> {
        let sql = `
            SELECT * FROM memories
            WHERE type = $1
            AND content IS NOT NULL
        `;
        const values: any[] = [LAND_TABLE];
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

        if (params.buildingTypes?.length) {
            paramCount++;
            sql += ` AND content->'metadata'->>'buildingType' = ANY($${paramCount}::text[])`;
            values.push(params.buildingTypes);
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
                sql += ` AND (content->'metadata'->>'rank')::int >= $${paramCount}`;
                values.push(params.rarity.rankRange.min);
            }
            if (params.rarity.rankRange.max) {
                paramCount++;
                sql += ` AND (content->'metadata'->>'rank')::int <= $${paramCount}`;
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
        similarity_threshold: number = DEFAULT_MATCH_THRESHOLD
    ): Promise<LandPlotMemory[]> {
        const semanticResults = await this.searchMemoriesByEmbedding(embedding, {
            tableName: LAND_TABLE,
            roomId: LAND_ROOM_ID,
            agentId: LAND_AGENT_ID,
            match_threshold: similarity_threshold
        });

        if (Object.keys(metadata).length === 0) {
            return semanticResults as LandPlotMemory[];
        }

        const metadataResults = await this.searchLandByMetadata(metadata);
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
