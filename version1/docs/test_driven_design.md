# Land Memory System - Test Driven Design Plan

## 1. Unit Tests

### 1.1 Types and Validation
```typescript
describe('Land Plot Types', () => {
    describe('LandPlotMetadata', () => {
        test('should validate all required fields', () => {
            const validMetadata: LandPlotMetadata = {
                rank: 1,
                name: 'Test Plot',
                neighborhood: 'Test Area',
                zoning: ZoningType.Residential,
                plotSize: PlotSize.Medium,
                buildingType: BuildingType.LowRise,
                distances: {
                    ocean: {
                        meters: 100,
                        category: DistanceCategory.Close
                    },
                    bay: {
                        meters: 200,
                        category: DistanceCategory.Medium
                    }
                },
                building: {
                    floors: { min: 1, max: 10 },
                    height: { min: 3, max: 30 }
                },
                plotArea: 1000
            };
            expect(validateMetadata(validMetadata)).toBeTruthy();
        });

        test('should reject invalid enum values', () => {
            const invalidMetadata = {
                // ... invalid data
            };
            expect(() => validateMetadata(invalidMetadata)).toThrow();
        });
    });
});
```

### 1.2 Database Adapter
```typescript
describe('LandDatabaseAdapter', () => {
    describe('searchLandByMetadata', () => {
        test('should build correct SQL for neighborhood search', () => {
            const params: LandSearchParams = {
                neighborhoods: ['North Shore']
            };
            const { sql, values } = buildSearchQuery(params);
            expect(sql).toContain("content->'metadata'->>'neighborhood'");
            expect(values).toContain('North Shore');
        });

        test('should handle multiple search criteria', () => {
            const params: LandSearchParams = {
                neighborhoods: ['North Shore'],
                plotSizes: [PlotSize.Large],
                distances: {
                    ocean: { maxMeters: 500 }
                }
            };
            const { sql, values } = buildSearchQuery(params);
            expect(sql).toMatch(/neighborhood.*plotSize.*meters/);
        });
    });

    describe('searchLandByCombinedCriteria', () => {
        test('should combine semantic and metadata results', async () => {
            const embedding = [/* test embedding */];
            const metadata = {
                neighborhoods: ['Test']
            };
            const results = await adapter.searchLandByCombinedCriteria(
                embedding,
                metadata
            );
            expect(results).toSatisfyAll(r => 
                r.content.metadata.neighborhood === 'Test'
            );
        });
    });
});
```

### 1.3 Memory System
```typescript
describe('LandMemorySystem', () => {
    describe('generatePlotDescription', () => {
        test('should generate consistent descriptions', () => {
            const plot = {
                Name: 'Test Plot',
                'Plot Size': 'Large',
                // ... other fields
            };
            const description = system.generatePlotDescription(plot);
            expect(description).toContain('Test Plot');
            expect(description).toContain('Large');
        });
    });

    describe('createLandMemoryFromCSV', () => {
        test('should properly transform CSV data', async () => {
            const csvRow = {
                // ... test data
            };
            await system.createLandMemoryFromCSV(csvRow);
            const stored = await adapter.getMemoryById(/* id */);
            expect(stored.content.metadata).toMatchObject({
                name: csvRow.Name,
                // ... other fields
            });
        });
    });
});
```

## 2. Integration Tests

### 2.1 Database Integration
```typescript
describe('Database Integration', () => {
    let db: LandDatabaseAdapter;
    
    beforeAll(async () => {
        db = new LandDatabaseAdapter(testConfig);
        await db.init();
    });

    test('should handle concurrent operations', async () => {
        const operations = Array(10).fill(null).map(() =>
            db.createLandMemory(testMemory)
        );
        await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    test('should maintain ACID properties', async () => {
        // Start transaction
        const results1 = await db.searchLandByMetadata({ /* params */ });
        await db.createLandMemory(newMemory);
        const results2 = await db.searchLandByMetadata({ /* same params */ });
        expect(results2.length).toBe(results1.length + 1);
    });
});
```

### 2.2 Full System Integration
```typescript
describe('System Integration', () => {
    let system: LandMemorySystem;
    
    beforeAll(async () => {
        const db = await setupTestDatabase();
        const embedder = new TestEmbedder();
        system = new LandMemorySystem(db, embedder);
    });

    test('end-to-end search flow', async () => {
        // Create test data
        const testPlots = [/* test data */];
        for (const plot of testPlots) {
            await system.createLandMemoryFromCSV(plot);
        }

        // Perform search
        const results = await system.searchProperties(
            'waterfront property',
            {
                distances: {
                    ocean: { category: DistanceCategory.Close }
                }
            }
        );

        expect(results).toHaveLength(1);
        expect(results[0].content.metadata.distances.ocean.category)
            .toBe(DistanceCategory.Close);
    });
});
```

## 3. Performance Tests

### 3.1 Load Testing
```typescript
describe('Performance', () => {
    test('should handle large result sets', async () => {
        const start = Date.now();
        const results = await system.searchProperties('common term');
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(1000);
        expect(results).toHaveLength(DEFAULT_MATCH_COUNT);
    });

    test('should handle concurrent searches', async () => {
        const searches = Array(100).fill(null).map(() =>
            system.searchProperties('test', {})
        );
        const start = Date.now();
        await Promise.all(searches);
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(5000);
    });
});
```

### 3.2 Memory Usage
```typescript
describe('Memory Usage', () => {
    test('should not leak memory during searches', async () => {
        const initialMemory = process.memoryUsage().heapUsed;
        for (let i = 0; i < 1000; i++) {
            await system.searchProperties('test');
        }
        const finalMemory = process.memoryUsage().heapUsed;
        expect(finalMemory - initialMemory).toBeLessThan(50 * 1024 * 1024);
    });
});
```

## 4. Error Handling Tests

### 4.1 Invalid Input
```typescript
describe('Error Handling', () => {
    test('should handle invalid metadata', async () => {
        await expect(
            system.searchProperties('test', {
                neighborhoods: [123] // invalid type
            } as any)
        ).rejects.toThrow();
    });

    test('should handle database connection errors', async () => {
        // Simulate DB connection loss
        await expect(
            system.searchProperties('test')
        ).rejects.toThrow('Database connection error');
    });
});
```

### 4.2 Edge Cases
```typescript
describe('Edge Cases', () => {
    test('should handle empty search results', async () => {
        const results = await system.searchProperties(
            'non-existent property'
        );
        expect(results).toHaveLength(0);
    });

    test('should handle maximum value bounds', async () => {
        await expect(
            system.createLandMemoryFromCSV({
                'Plot Area (m²)': Number.MAX_SAFE_INTEGER + 1
            })
        ).rejects.toThrow();
    });
});
```

## 5. Test Data Management

### 5.1 Fixtures
```typescript
// fixtures/testData.ts
export const testPlots = [
    {
        Name: 'Oceanfront Villa',
        'Plot Size': PlotSize.Large,
        'Zoning Type': ZoningType.Residential,
        // ... other fields
    },
    // ... more test data
];
```

### 5.2 Test Helpers
```typescript
// helpers/testUtils.ts
export async function createTestData(system: LandMemorySystem) {
    for (const plot of testPlots) {
        await system.createLandMemoryFromCSV(plot);
    }
}

export function cleanup(db: LandDatabaseAdapter) {
    return db.query('DELETE FROM memories WHERE type = $1', [LAND_TABLE]);
}
```

## 6. Continuous Integration

### 6.1 GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
```

### 6.2 Test Coverage
```typescript
// jest.config.js
module.exports = {
    collectCoverage: true,
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};
```
