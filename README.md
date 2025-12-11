# WHO MCP Server

[![npm version](https://badge.fury.io/js/%40uh-joan%2Fwho-mcp-server.svg)](https://badge.fury.io/js/%40uh-joan%2Fwho-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that provides access to the World Health Organization's Global Health Observatory (GHO) data via the OData API. This server enables AI assistants and applications to search, retrieve, and analyze comprehensive health indicators, country statistics, and regional data from WHO's extensive health database.

## Features

- 🌍 **Global Health Data**: Access WHO's comprehensive health indicators and statistics
- 📊 **Rich Health Metrics**: Life expectancy, mortality rates, disease burden, health systems data
- 🔍 **Advanced Search**: Find health indicators by keywords and topics
- 🏥 **Country-Specific Data**: Retrieve health data for specific countries and regions
- 📈 **Time Series Data**: Access historical health trends and time-based analysis
- 🌐 **WHO Regions**: Filter data by WHO regional classifications
- ⚡ **OData Protocol**: Built on WHO's modern OData API for efficient data access
- 🔌 **MCP Compatible**: Works seamlessly with Claude Desktop and other MCP clients

## Installation

### From NPM

```bash
npm install -g @uh-joan/who-mcp-server
```

### From Source

```bash
git clone https://github.com/uh-joan/who-mcp-server.git
cd who-mcp-server
npm install
```

## Usage

### Claude Desktop Integration

Add this server to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "who-health": {
      "command": "npx",
      "args": ["@uh-joan/who-mcp-server"]
    }
  }
}
```

### Direct Usage

Run the server directly:

```bash
npx @uh-joan/who-mcp-server
```

## API Reference

The server provides a single unified tool `who-health` with six methods for accessing WHO health data:

### 1. Get Dimensions (`get_dimensions`)

List all available data dimensions in the WHO database.

**Parameters:**
- `method`: `"get_dimensions"`

**Example:**
```json
{
  "method": "get_dimensions"
}
```

### 2. Get Dimension Codes (`get_dimension_codes`)

Retrieve codes for a specific dimension (countries, regions, years, etc.).

**Parameters:**
- `method`: `"get_dimension_codes"`
- `dimension_code` (required): Dimension to retrieve (e.g., "COUNTRY", "REGION")

**Example:**
```json
{
  "method": "get_dimension_codes",
  "dimension_code": "COUNTRY"
}
```

### 3. Search Indicators (`search_indicators`)

Find health indicators using keywords and natural language queries.

**Parameters:**
- `method`: `"search_indicators"`
- `keywords` (required): Search terms for health indicators

**Example:**
```json
{
  "method": "search_indicators",
  "keywords": "life expectancy maternal mortality"
}
```

### 4. Get Health Data (`get_health_data`)

Retrieve comprehensive health indicator data with filtering options.

**Parameters:**
- `method`: `"get_health_data"`
- `indicator_code` (required): WHO health indicator code
- `top` (optional): Maximum number of records to return
- `filter` (optional): OData filter expression for advanced filtering

**Example:**
```json
{
  "method": "get_health_data",
  "indicator_code": "WHOSIS_000001",
  "filter": "SpatialDim eq 'USA' and TimeDim eq 2020",
  "top": 100
}
```

### 5. Get Country Data (`get_country_data`)

Retrieve health data for specific countries, regions, or time periods.

**Parameters:**
- `method`: `"get_country_data"`
- `indicator_code` (required): WHO health indicator code
- `country_code` (optional): ISO 3-letter country code
- `region_code` (optional): WHO region code
- `year` (optional): Specific year or year range
- `sex` (optional): Sex dimension filter
- `top` (optional): Maximum number of records

**Example:**
```json
{
  "method": "get_country_data",
  "indicator_code": "WHOSIS_000001",
  "country_code": "USA",
  "year": "2015:2020"
}
```

### 6. Get Cross Table (`get_cross_table`)

Generate tabular views of health data across countries and time periods.

**Parameters:**
- `method`: `"get_cross_table"`
- `indicator_code` (required): WHO health indicator code
- `countries` (optional): Comma-separated list of country codes
- `years` (optional): Year range or specific year
- `sex` (optional): Sex dimension filter

**Example:**
```json
{
  "method": "get_cross_table",
  "indicator_code": "WHOSIS_000001",
  "countries": "USA,GBR,CHN",
  "years": "2015:2020"
}
```

## Health Indicators

The WHO database contains hundreds of health indicators covering:

- **Demographics**: Life expectancy, population statistics, mortality rates
- **Disease Burden**: HIV/AIDS, tuberculosis, malaria, non-communicable diseases
- **Health Systems**: Health expenditure, health workforce, hospital beds
- **Risk Factors**: Tobacco use, alcohol consumption, obesity, air pollution
- **Maternal & Child Health**: Maternal mortality, infant mortality, vaccination coverage
- **Mental Health**: Suicide rates, mental health services
- **Environmental Health**: Water, sanitation, air quality

### Common Indicator Codes

- `WHOSIS_000001`: Life expectancy at birth
- `MDG_0000000001`: Maternal mortality ratio
- `GHED_CHE_pc_PPP_INT`: Current health expenditure per capita
- `M_Est_smk_curr_std`: Smoking prevalence
- `SA_0000001688`: Suicide mortality rate

## WHO Regions

The system supports WHO's six regional classifications:

- **AFR**: African Region
- **AMR**: Region of the Americas  
- **SEAR**: South-East Asia Region
- **EUR**: European Region
- **EMR**: Eastern Mediterranean Region
- **WPR**: Western Pacific Region

## OData Query Examples

### Basic Filtering
```
SpatialDim eq 'USA' and TimeDim eq 2020
```

### Time Range Filtering
```
TimeDim ge 2015 and TimeDim le 2020
```

### Sex Disaggregation
```
Dim1 eq 'MLE'  // Male
Dim1 eq 'FMLE' // Female
Dim1 eq 'BTSX' // Both sexes
```

### Date Functions
```
date(TimeDimensionBegin) ge 2011-01-01 and date(TimeDimensionBegin) lt 2012-01-01
```

### Null Checks
```
Dim1 ne null  // Has disaggregation data
Dim1 eq null  // No disaggregation data
```

## Development

### Requirements

- Node.js ≥ 18.0.0
- npm or yarn

### Setup

```bash
git clone https://github.com/uh-joan/who-mcp-server.git
cd who-mcp-server
npm install
```

### Running Locally

```bash
npm start
```

### Project Structure

```
who-mcp-server/
├── src/
│   ├── index.js     # MCP server implementation
│   └── who-api.js   # WHO OData API interaction
├── package.json
└── README.md
```

## Data Sources

This server accesses data from:

- **WHO Global Health Observatory**: Primary source for health statistics
- **OData API**: Modern REST API with standardized querying
- **Official WHO Data**: Verified and quality-assured health indicators
- **Real-time Updates**: Data synchronized with WHO releases

## Rate Limits & Guidelines

- Respect WHO's API rate limits and usage policies
- Cache responses when appropriate to reduce API calls
- Use appropriate `$top` parameters to limit large data sets
- Monitor API performance and adjust queries as needed

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on [WHO Global Health Observatory](https://www.who.int/data/gho) data
- Uses the [OData Protocol](https://www.odata.org/) for standardized API access
- Built with the [Model Context Protocol](https://modelcontextprotocol.io/) specification
- Thanks to the WHO team for maintaining this invaluable global health resource

## Support

- 🐛 [Report Issues](https://github.com/uh-joan/who-mcp-server/issues)
- 📖 [Documentation](https://github.com/uh-joan/who-mcp-server)
- 💬 [Discussions](https://github.com/uh-joan/who-mcp-server/discussions)
- 🌍 [WHO GHO Data](https://www.who.int/data/gho)

---

**Note**: This is an unofficial tool. Please respect WHO's data usage guidelines and terms of service when using this server.