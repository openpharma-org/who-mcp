const axios = require('axios');
const xml2js = require('xml2js');
const { promisify } = require('util');

const parseXML = promisify(xml2js.parseString);

const WHO_ODATA_BASE_URL = 'https://ghoapi.azureedge.net/api';

/**
 * Generate WHO GHO OData API URL for different operations
 * @param {string} endpoint - The API endpoint (e.g., 'Dimension', 'Indicator', indicator code)
 * @param {Object} params - Query parameters for OData
 * @returns {string} Complete API URL
 */
function generateWhoODataUrl(endpoint = '', params = {}) {
  let url = `${WHO_ODATA_BASE_URL}`;
  
  if (endpoint) {
    url += `/${endpoint}`;
  }
  
  // Handle OData-specific parameters
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });
  
  const queryString = queryParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
}

/**
 * Make HTTP request to WHO GHO OData API with proper error handling
 * @param {string} url - API URL to request
 * @param {string} expectedFormat - Expected response format (json, xml)
 * @returns {Promise<Object>} Response data
 */
async function makeWhoODataRequest(url, expectedFormat = 'json') {
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'WHO-MCP-Server/0.0.1',
        'Accept': expectedFormat === 'json' ? 'application/json' : 'application/xml'
      }
    });

    if (expectedFormat === 'json') {
      return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } else {
      // Parse XML response for OData
      const result = await parseXML(response.data);
      return result;
    }
  } catch (error) {
    throw new Error(`WHO OData API request failed: ${error.message}`);
  }
}

/**
 * Get list of available dimensions in the WHO GHO database using OData API
 * @returns {Promise<Object>} List of dimensions with their codes and descriptions
 */
async function getDimensions() {
  const url = generateWhoODataUrl('Dimension');
  const result = await makeWhoODataRequest(url, 'json');
  
  // Parse dimensions from OData JSON response
  const dimensions = [];
  if (result?.value) {
    for (const dim of result.value) {
      dimensions.push({
        code: dim.Code || '',
        title: dim.Title || '',
        description: dim.Description || ''
      });
    }
  }
  
  return {
    dimensions,
    total_count: dimensions.length,
    source: 'WHO Global Health Observatory (OData API)',
    api_url: url
  };
}

/**
 * Get list of codes for a specific dimension using OData API
 * @param {string} dimensionCode - The dimension code (e.g., 'COUNTRY', 'REGION')
 * @returns {Promise<Object>} List of codes within the specified dimension
 */
async function getDimensionCodes(dimensionCode) {
  const url = generateWhoODataUrl(`DIMENSION/${dimensionCode}/DimensionValues`);
  const result = await makeWhoODataRequest(url, 'json');
  
  // Parse dimension codes from OData JSON response
  const codes = [];
  if (result?.value) {
    for (const code of result.value) {
      codes.push({
        code: code.Code || '',
        title: code.Title || '',
        description: code.Description || '',
        parent_code: code.ParentCode || null
      });
    }
  }
  
  return {
    dimension: dimensionCode,
    codes,
    total_count: codes.length,
    source: 'WHO Global Health Observatory (OData API)',
    api_url: url
  };
}

/**
 * Retrieve health data for a specific indicator using OData API
 * @param {Object} params - Query parameters
 * @param {string} params.indicator_code - WHO indicator code
 * @param {string} [params.filter] - OData filter expression (e.g., "SpatialDim eq 'USA' and TimeDim eq 2020")
 * @param {number} [params.top] - Number of records to return (OData $top)
 * @param {string} [params.orderby] - OData ordering (e.g., "TimeDim desc")
 * @returns {Promise<Object>} Health data matching the query
 */
async function getHealthData(params) {
  const { indicator_code, filter, top, orderby } = params;
  
  if (!indicator_code) {
    throw new Error('indicator_code parameter is required');
  }
  
  const queryParams = {};
  if (filter) queryParams['$filter'] = filter;
  if (top) queryParams['$top'] = top;
  if (orderby) queryParams['$orderby'] = orderby;
  
  const url = generateWhoODataUrl(indicator_code, queryParams);
  const result = await makeWhoODataRequest(url, 'json');
  
  // Parse OData JSON response
  const healthData = [];
  if (result?.value) {
    for (const fact of result.value) {
      const dataPoint = {
        indicator: indicator_code,
        value: fact.Value || fact.NumericValue || '',
        numeric_value: fact.NumericValue || null,
        display_value: fact.Value || '',
        spatial_dim: fact.SpatialDim || '', // Country/Region code
        time_dim: fact.TimeDim || '', // Year
        time_dim_begin: fact.TimeDimensionBegin || '',
        time_dim_end: fact.TimeDimensionEnd || '',
        dim1: fact.Dim1 || '', // Sex or other dimension
        dim2: fact.Dim2 || '', // Additional dimension
        dim3: fact.Dim3 || '', // Additional dimension
        comments: fact.Comments || '',
        data_source_code: fact.DataSourceCode || ''
      };
      
      healthData.push(dataPoint);
    }
  }
  
  return {
    indicator: indicator_code,
    data: healthData,
    total_count: healthData.length,
    source: 'WHO Global Health Observatory (OData API)',
    api_url: url
  };
}

/**
 * Search for health indicators by keywords using OData API
 * @param {string} keywords - Search terms for indicator names/descriptions
 * @returns {Promise<Object>} List of matching indicators
 */
async function searchIndicators(keywords) {
  // Use OData $filter with contains() function to search indicators
  const filter = `contains(IndicatorName,'${keywords}')`;
  const queryParams = { '$filter': filter };
  
  const url = generateWhoODataUrl('Indicator', queryParams);
  const result = await makeWhoODataRequest(url, 'json');
  
  // Parse indicators from OData JSON response
  const indicators = [];
  if (result?.value) {
    for (const indicator of result.value) {
      indicators.push({
        code: indicator.IndicatorCode || '',
        name: indicator.IndicatorName || '',
        category: indicator.Category || '',
        definition: indicator.Definition || '',
        method: indicator.Method || '',
        interpretation: indicator.Interpretation || ''
      });
    }
  }
  
  return {
    keywords,
    indicators,
    total_count: indicators.length,
    source: 'WHO Global Health Observatory (OData API)',
    api_url: url
  };
}

/**
 * Get country data for a specific indicator using OData API
 * @param {Object} params - Query parameters
 * @param {string} params.indicator_code - WHO indicator code
 * @param {string} [params.country_code] - Specific country code (ISO 3-letter)
 * @param {string} [params.year] - Specific year
 * @param {string} [params.sex] - Sex dimension (e.g., 'MLE', 'FMLE', 'BTSX')
 * @param {number} [params.top] - Number of records to return
 * @returns {Promise<Object>} Country-specific health data
 */
async function getCountryData(params) {
  const { indicator_code, country_code, year, sex, top } = params;
  
  if (!indicator_code) {
    throw new Error('indicator_code parameter is required');
  }
  
  // Build OData filter expression
  const filters = [];
  
  if (country_code) {
    filters.push(`SpatialDim eq '${country_code}'`);
  }
  if (year) {
    filters.push(`TimeDim eq ${year}`);
  }
  if (sex) {
    filters.push(`Dim1 eq '${sex}'`);
  }
  
  const filterString = filters.length > 0 ? filters.join(' and ') : null;
  
  return await getHealthData({
    indicator_code,
    filter: filterString,
    top,
    orderby: 'TimeDim desc'
  });
}

/**
 * Get structured data for table generation using OData API
 * @param {Object} params - Query parameters
 * @param {string} params.indicator_code - WHO indicator code
 * @param {string} [params.countries] - Comma-separated list of country codes
 * @param {string} [params.years] - Year range or specific years
 * @param {string} [params.sex] - Sex dimension filter
 * @param {number} [params.top] - Maximum number of records
 * @returns {Promise<Object>} Structured health data suitable for table generation
 */
async function getCrossTable(params) {
  const { 
    indicator_code, 
    countries,
    years,
    sex,
    top = 1000
  } = params;
  
  if (!indicator_code) {
    throw new Error('indicator_code parameter is required');
  }
  
  // Build OData filter
  const filters = [];
  
  if (countries) {
    const countryList = countries.split(',').map(c => `'${c.trim()}'`).join(',');
    filters.push(`SpatialDim in (${countryList})`);
  }
  
  if (years) {
    if (years.includes(':')) {
      const [startYear, endYear] = years.split(':');
      filters.push(`TimeDim ge ${startYear} and TimeDim le ${endYear}`);
    } else {
      filters.push(`TimeDim eq ${years}`);
    }
  }
  
  if (sex) {
    filters.push(`Dim1 eq '${sex}'`);
  }
  
  const filterString = filters.length > 0 ? filters.join(' and ') : null;
  
  const healthData = await getHealthData({
    indicator_code,
    filter: filterString,
    top,
    orderby: 'SpatialDim, TimeDim desc'
  });
  
  // Structure data for easy table generation
  const tableData = {
    indicator: indicator_code,
    structured_data: healthData.data,
    summary: {
      unique_countries: [...new Set(healthData.data.map(d => d.spatial_dim))].length,
      unique_years: [...new Set(healthData.data.map(d => d.time_dim))].length,
      total_records: healthData.data.length
    },
    source: 'WHO Global Health Observatory (OData API)',
    api_url: healthData.api_url
  };
  
  return tableData;
}

module.exports = {
  getDimensions,
  getDimensionCodes,
  getHealthData,
  searchIndicators,
  getCountryData,
  getCrossTable
};
