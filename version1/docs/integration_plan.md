# Land Memory System - Integration Plan

## Phase 1: Database Setup

### 1.1 Schema Migration
```sql
-- Create extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memories table
CREATE TABLE memories (
    id UUID PRIMARY KEY,
    type TEXT NOT NULL,
    room_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    content JSONB,
    embedding vector(1536)
);

-- Create indexes
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_content ON memories USING gin(content);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);
```

### 1.2 Configuration Setup
```typescript
// config.ts
export const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'land_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
};
```

## Phase 2: Core System Integration

### 2.1 Initialize Components
```typescript
// Initialize database adapter
const landDB = new LandDatabaseAdapter(dbConfig);
await landDB.init();

// Initialize embedder
const embedder = new TextEmbedder();

// Initialize memory system
const landMemory = new LandMemorySystem(landDB, embedder);
```

### 2.2 Data Migration
```typescript
// CSV processor
import csv from 'csv-parser';
import fs from 'fs';

async function importCSVData(filePath: string) {
    const stream = fs.createReadStream(filePath).pipe(csv());
    
    for await (const row of stream) {
        await landMemory.createLandMemoryFromCSV(row);
    }
}
```

## Phase 3: API Integration

### 3.1 REST Endpoints
```typescript
// Search endpoint
app.post('/api/land/search', async (req, res) => {
    const { query, metadata, limit } = req.body;
    const results = await landMemory.searchProperties(query, metadata, limit);
    res.json(results);
});

// Property details endpoint
app.get('/api/land/:id', async (req, res) => {
    const property = await landDB.getMemoryById(req.params.id);
    res.json(property);
});
```

### 3.2 GraphQL Schema
```graphql
type LandPlot {
    id: ID!
    name: String!
    neighborhood: String!
    zoning: ZoningType!
    plotSize: PlotSize!
    # ...other fields
}

type Query {
    searchLandPlots(query: String!, metadata: LandSearchInput): [LandPlot!]!
    getLandPlotById(id: ID!): LandPlot
}
```

## Phase 4: Testing Integration

### 4.1 Test Database Setup
```typescript
// test/setup.ts
export async function setupTestDatabase() {
    const testDB = new LandDatabaseAdapter({
        ...dbConfig,
        database: 'land_test_db'
    });
    await testDB.init();
    return testDB;
}
```

### 4.2 Integration Tests
```typescript
describe('Land Memory System Integration', () => {
    let landDB: LandDatabaseAdapter;
    let landMemory: LandMemorySystem;

    beforeAll(async () => {
        landDB = await setupTestDatabase();
        landMemory = new LandMemorySystem(landDB, new MockEmbedder());
    });

    test('End-to-end search flow', async () => {
        // Create test data
        await landMemory.createLandMemoryFromCSV(testData);

        // Perform search
        const results = await landMemory.searchProperties(
            'beachfront property',
            { neighborhoods: ['North Shore'] }
        );

        expect(results).toHaveLength(1);
        expect(results[0].content.metadata.neighborhood).toBe('North Shore');
    });
});
```

## Phase 5: Monitoring Integration

### 5.1 Metrics Setup
```typescript
// Prometheus metrics
const searchLatency = new prometheus.Histogram({
    name: 'land_search_duration_seconds',
    help: 'Land search operation duration'
});

// Wrap search method
const originalSearch = landMemory.searchProperties;
landMemory.searchProperties = async (...args) => {
    const timer = searchLatency.startTimer();
    try {
        return await originalSearch.apply(landMemory, args);
    } finally {
        timer();
    }
};
```

### 5.2 Logging Integration
```typescript
// Winston logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'land-memory' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});
```

## Phase 6: Deployment Strategy

### 6.1 Database Migration
1. Backup existing data
2. Apply schema changes
3. Verify indexes
4. Load initial data

### 6.2 Application Deployment
1. Deploy database changes
2. Deploy application updates
3. Run smoke tests
4. Enable monitoring

### 6.3 Rollback Plan
1. Database restore procedure
2. Application version rollback
3. Monitoring verification

## Phase 7: Documentation

### 7.1 API Documentation
```typescript
/**
 * @api {post} /api/land/search Search Land Plots
 * @apiName SearchLandPlots
 * @apiGroup Land
 *
 * @apiParam {String} query Search query
 * @apiParam {Object} [metadata] Search filters
 * @apiParam {Number} [limit=20] Maximum results
 *
 * @apiSuccess {Array} results Matching land plots
 */
```

### 7.2 Integration Guide
1. Setup instructions
2. Configuration guide
3. API examples
4. Common issues

## Phase 8: Maintenance Plan

### 8.1 Monitoring Checklist
- [ ] Query performance
- [ ] Error rates
- [ ] Memory usage
- [ ] API latency

### 8.2 Backup Strategy
- Daily database backups
- Weekly full system backups
- Monthly archive backups

### 8.3 Update Procedure
1. Test in staging
2. Deploy to production
3. Monitor metrics
4. Verify functionality
