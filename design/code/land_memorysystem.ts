/**
 * Land Plot Memory System Design
 * 
 * This system converts land plot data into searchable memories and provides
 * a natural language interface for querying the data.
 */

interface LandPlotContent {
    text: string;          // Searchable description of the plot
    metadata: {
        rank: number;
        name: string;
        neighborhood: string;
        zoningType: string;
        plotSize: string;
        buildingSize: string;
        oceanProximity: string;
        bayProximity: string;
        floorRange: [number, number];
        plotArea: number;
        buildingHeightRange: [number, number];
        distances: {
            ocean: number;
            bay: number;
        };
    };
}

interface LandPlotMemory extends Memory {
    content: LandPlotContent;
}

/**
 * Converts a CSV row into a natural language description for embedding
 */
function generatePlotDescription(plot: any): string {
    return `${plot.Name} is a ${plot['Plot Size']} ${plot['Zoning Type']} plot in ${plot.Neighborhood}. ` +
           `It is a ${plot['Building Size']} building with ${plot['Min # of Floors']} to ${plot['Max # of Floors']} floors. ` +
           `The plot area is ${plot['Plot Area (m²)']}m² with building heights from ${plot['Min Building Height (m)']}m to ${plot['Max Building Height (m)']}m. ` +
           `Located ${plot['Distance to Ocean']} from ocean (${plot['Distance to Ocean (m)']}m) and ${plot['Distance to Bay']} from bay (${plot['Distance to Bay (m)']}m).`;
}

/**
 * System Prompt for Query Processing
 */
const LAND_QUERY_SYSTEM_PROMPT = `
You are a real estate search assistant for a futuristic city. Convert natural language queries into structured search parameters.

Given a user query, respond with a JSON object containing:
1. A natural language description for embedding matching
2. Search metadata parameters

Example Response Format:
{
    "searchText": "Large plot in Nexus neighborhood close to ocean with tall building potential",
    "metadata": {
        "neighborhood": "Nexus",
        "minPlotArea": 5000,
        "maxOceanDistance": 500,
        "minFloors": 50
    }
}

Keep the searchText natural and descriptive while being specific about requirements.
`;

/**
 * Implementation Strategy:
 * 
 * 1. Data Ingestion:
 *    - Parse CSV rows
 *    - Generate natural language descriptions
 *    - Create Memory objects with embeddings
 *    - Store in memory database
 * 
 * 2. Query Processing:
 *    - Use system prompt to convert user query to search parameters
 *    - Generate embedding for search text
 *    - Use searchMemoriesByEmbedding() with metadata filtering
 * 
 * 3. Memory Structure:
 *    - Table name: "land_plots"
 *    - Each record is a LandPlotMemory
 *    - Embedding generated from description
 *    - Metadata stored in content.metadata
 * 
 * 4. Search Flow:
 *    a. User submits natural language query
 *    b. Query processor converts to search parameters
 *    c. Generate embedding for search text
 *    d. Perform embedding search with metadata filters
 *    e. Rank and return results
 */

// Usage example:
interface SearchQuery {
    searchText: string;
    metadata: {
        neighborhood?: string;
        minPlotArea?: number;
        maxPlotArea?: number;
        minFloors?: number;
        maxFloors?: number;
        maxOceanDistance?: number;
        maxBayDistance?: number;
        zoningType?: string;
        buildingSize?: string;
    };
}

// Memory table configuration
const LAND_PLOTS_TABLE = "land_plots";
const MATCH_THRESHOLD = 0.75;
const DEFAULT_MATCH_COUNT = 20;