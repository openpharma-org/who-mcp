#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { getDimensions, getDimensionCodes, getHealthData, searchIndicators, getCountryData, getCrossTable } = require('./who-api.js');

const server = new Server(
  {
    name: 'who-mcp-server',
    version: '0.0.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'who-health',
        description: 'Unified tool for WHO Global Health Observatory operations: access health indicators, country statistics, and regional data via the modern OData API. Provides access to comprehensive health data from the World Health Organization covering topics like life expectancy, disease burden, health systems, and risk factors using standard OData query syntax.',
        inputSchema: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              enum: ['get_dimensions', 'get_dimension_codes', 'get_health_data', 'search_indicators', 'get_country_data', 'get_cross_table'],
              description: 'The operation to perform: get_dimensions (list all data dimensions), get_dimension_codes (list codes for a dimension), get_health_data (retrieve indicator data), search_indicators (find health indicators), get_country_data (country-specific data), or get_cross_table (tabular data view)',
              examples: ['get_dimensions', 'search_indicators']
            },
            dimension_code: {
              type: 'string',
              description: 'For get_dimension_codes: The dimension code to retrieve (e.g., "COUNTRY" for countries, "REGION" for WHO regions)',
              examples: ['COUNTRY', 'REGION', 'YEAR', 'SEX']
            },
            indicator_code: {
              type: 'string',
              description: 'For get_health_data, get_country_data, get_cross_table: WHO health indicator code (e.g., "WHOSIS_000001" for life expectancy)',
              examples: ['WHOSIS_000001', 'GHED_CHE_pc_PPP_INT', 'MDG_0000000001']
            },
            keywords: {
              type: 'string', 
              description: 'For search_indicators: Search terms for finding health indicators (e.g., "life expectancy", "mortality", "diabetes", "vaccination")',
              examples: ['life expectancy', 'maternal mortality', 'HIV prevalence', 'vaccination coverage']
            },
            top: {
              type: 'integer',
              description: 'For get_health_data, get_country_data: Maximum number of records to return (OData $top parameter)',
              examples: [10, 100, 1000]
            },
            filter: {
              type: 'string',
              description: 'For get_health_data: OData filter expression to limit results. Supports country/time filtering, disaggregation checks (null/not null), and date functions.',
              examples: ['SpatialDim eq \'USA\' and TimeDim eq 2020', 'Dim1 eq \'MLE\'', 'TimeDim ge 2015 and TimeDim le 2020', 'Dim1 eq \'MLE\' and date(TimeDimensionBegin) ge 2011-01-01 and date(TimeDimensionBegin) lt 2012-01-01', 'Dim1 ne null', 'Dim1 eq null']
            },
            country_code: {
              type: 'string',
              description: 'For get_country_data: ISO 3-letter country code (e.g., "USA", "GBR", "CHN")',
              examples: ['USA', 'GBR', 'CHN', 'BRA', 'IND']
            },
            region_code: {
              type: 'string', 
              description: 'For get_country_data: WHO region code (e.g., "EUR" for Europe, "AMR" for Americas)',
              examples: ['EUR', 'AMR', 'AFR', 'EMR', 'SEAR', 'WPR']
            },
            year: {
              type: 'string',
              description: 'For get_country_data: Specific year or year range for data (e.g., "2020", "2015:2020")',
              examples: ['2020', '2015:2020', '2010']
            },
            countries: {
              type: 'string',
              description: 'For get_cross_table: Comma-separated list of country codes to include',
              examples: ['USA,GBR,CHN', 'DEU,FRA,ITA']
            },
            years: {
              type: 'string',
              description: 'For get_cross_table: Year range (YYYY:YYYY) or specific year (YYYY)',
              examples: ['2015:2020', '2019', '2010:2015']
            },
            sex: {
              type: 'string',
              description: 'For get_cross_table, get_country_data: Sex dimension filter',
              examples: ['MLE', 'FMLE', 'BTSX']
            }
          },
          required: ['method'],
          additionalProperties: false
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== 'who-health') {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    const { method, ...params } = args;

    switch (method) {
      case 'get_dimensions': {
        const results = await getDimensions();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'get_dimension_codes': {
        const { dimension_code } = params;
        if (!dimension_code) {
          throw new Error('dimension_code parameter is required for get_dimension_codes');
        }
        
        const results = await getDimensionCodes(dimension_code);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'get_health_data': {
        const { indicator_code } = params;
        if (!indicator_code) {
          throw new Error('indicator_code parameter is required for get_health_data');
        }
        
        const results = await getHealthData(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'search_indicators': {
        const { keywords } = params;
        if (!keywords) {
          throw new Error('keywords parameter is required for search_indicators');
        }
        
        const results = await searchIndicators(keywords);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'get_country_data': {
        const { indicator_code } = params;
        if (!indicator_code) {
          throw new Error('indicator_code parameter is required for get_country_data');
        }
        
        const results = await getCountryData(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'get_cross_table': {
        const { indicator_code } = params;
        if (!indicator_code) {
          throw new Error('indicator_code parameter is required for get_cross_table');
        }
        
        const results = await getCrossTable(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2)
        }
      ]
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Server running silently
}

main().catch((error) => {
  process.exit(1);
});
