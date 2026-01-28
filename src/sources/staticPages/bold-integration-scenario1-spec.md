# BOLD Integration with DiSSCover: Scenario 1 Technical Specification

## Implementation Guide for BOLD Developers

This document provides a complete technical specification for implementing DiSSCover specimen lookup functionality within the BOLD interface. It is written for developers familiar with the BOLD codebase who need to integrate with DiSSCover's APIs.

---

## 1. Overview

### What This Integration Does
When a user views a specimen record in BOLD, the system queries DiSSCover to check if a corresponding Digital Specimen exists. If found, BOLD displays a panel showing the DiSSCover DOI, specimen metadata, and direct links to the DiSSCover interface.

### Architecture Summary (Backend Proxy Pattern)

This integration uses BOLD's backend as a proxy to DiSSCover's API, avoiding any browser CORS restrictions:

```
┌──────────────────┐                    ┌──────────────────┐                    ┌──────────────────┐
│                  │    AJAX Request    │                  │    HTTPS GET       │                  │
│   BOLD Frontend  │ ─────────────────► │   BOLD Backend   │ ─────────────────► │  DiSSCover API   │
│   (JavaScript)   │                    │   (Proxy)        │                    │  (REST/JSON)     │
│                  │ ◄───────────────── │                  │ ◄───────────────── │                  │
│                  │    JSON Response   │                  │    JSON Response   │                  │
└──────────────────┘                    └──────────────────┘                    └──────────────────┘
```

**Why Use a Backend Proxy?**
- No CORS configuration required from DiSSCo
- BOLD maintains full control over the integration
- Enables request caching, rate limiting, and logging on BOLD's side
- Allows adding business logic (e.g., identifier transformation) in the proxy

### No Authentication Required
DiSSCover's search API is public and read-only. No API keys, OAuth tokens, or authentication headers are required for the proxy to call DiSSCover.

---

## 2. DiSSCover API Endpoint

### Base URLs

| Environment | Base URL |
|-------------|----------|
| Production  | `https://dissco.tech` |
| Development | `https://dev.dissco.tech` |
| Sandbox     | `https://sandbox.dissco.tech` |

**Recommendation**: Use `https://dev.dissco.tech` for initial development and testing, then switch to production for release.

### Search Endpoint

```
GET /api/digital-specimen/v1/search
```

**Full URL Example**:
```
https://dev.dissco.tech/api/digital-specimen/v1/search?q=BOLD:AAA1234
```

---

## 3. Query Parameters

### 3.1 Free-Text Search (`q`)

The most flexible search parameter. Searches across multiple indexed fields including specimen IDs, scientific names, and identifiers.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Free-text search query |

**Usage for BOLD Process IDs**:
```
GET /api/digital-specimen/v1/search?q=BOLD:AAA1234-21
```

### 3.2 Structured Filter Parameters

For more precise queries, use filter parameters as direct query parameters (no prefix):

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `physicalSpecimenId` | string | Exact match on physical specimen ID | `RMNH.INS.12345` |
| `organisationName` | string | Institution name | `Naturalis Biodiversity Center` |
| `collectionCode` | string | Collection code/acronym | `RMNH`, `ZMA` |
| `species` | string | Scientific name at species level | `Apis mellifera` |
| `genus` | string | Genus name | `Apis` |
| `family` | string | Family name | `Apidae` |
| `country` | string | Country of collection | `Netherlands` |
| `topicDiscipline` | string | Discipline filter | `Zoology`, `Botany` |

**Note**: For local identifiers (those unique only within a source system), append the source system ID suffix with a colon: `physicalSpecimenId=RMNH.INS.12345:source-system-id`

### 3.3 Pagination Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pageSize` | integer | 25 | Number of results per page (max 100) |
| `pageNumber` | integer | 1 | Page number (1-indexed) |

---

## 4. Identifier Types for BOLD Queries

BOLD systems can query DiSSCover using various identifier types. Here's how each maps to DiSSCover fields:

### 4.1 BOLD Process ID

BOLD Process IDs (e.g., `AAA1234-21`) may be stored in DiSSCover in several locations:

**Query Strategy** (try in order):
1. Free-text search: `q=BOLD:AAA1234-21`
2. Free-text search without prefix: `q=AAA1234-21`

**Example**:
```http
GET /api/digital-specimen/v1/search?q=BOLD:AAA1234-21&pageSize=10
```

### 4.2 Institution Sample/Catalog Number

Physical specimen IDs from collection management systems are the most reliable link.

**DiSSCover Field**: `ods:physicalSpecimenID` or `ods:normalisedPhysicalSpecimenID`

**Query Examples**:
```http
# Using free-text search
GET /api/digital-specimen/v1/search?q=RMNH.INS.12345

# Using structured filter (exact match)
GET /api/digital-specimen/v1/search?physicalSpecimenId=RMNH.INS.12345
```

### 4.3 Collection Code + Specimen Number

When BOLD stores collection code and specimen number separately:

**Example** (Collection: RMNH, Number: 12345):
```http
GET /api/digital-specimen/v1/search?collectionCode=RMNH&q=12345
```

### 4.4 Taxonomic + Geographic Filters

For broader searches when exact identifiers aren't available:

```http
GET /api/digital-specimen/v1/search?species=Apis%20mellifera&country=Netherlands&pageSize=50
```

---

## 5. API Response Format

### 5.1 Successful Response (HTTP 200)

```json
{
  "data": [
    {
      "id": "20.5000.1025/ABC-123-XYZ",
      "type": "digitalSpecimen",
      "attributes": {
        "@id": "https://doi.org/20.5000.1025/ABC-123-XYZ",
        "@type": "ods:DigitalSpecimen",
        "dcterms:identifier": "https://doi.org/20.5000.1025/ABC-123-XYZ",
        "ods:version": 3,
        "ods:status": "Active",
        "dcterms:modified": "2025-01-15T10:30:00.000Z",
        "dcterms:created": "2024-06-01T08:00:00.000Z",
        "ods:midsLevel": 2,
        "ods:physicalSpecimenID": "RMNH.INS.12345",
        "ods:normalisedPhysicalSpecimenID": "https://data.biodiversitydata.nl/naturalis/specimen/RMNH.INS.12345",
        "ods:physicalSpecimenIDType": "Resolvable",
        "ods:specimenName": "Apis mellifera",
        "ods:organisationID": "https://ror.org/0566bfb96",
        "ods:organisationName": "Naturalis Biodiversity Center",
        "ods:organisationCode": "RMNH",
        "dwc:collectionCode": "INS",
        "dwc:collectionID": "https://www.gbif.org/grscicoll/collection/12345",
        "ods:topicDiscipline": "Zoology",
        "ods:isKnownToContainMedia": true,
        "dcterms:license": "https://creativecommons.org/publicdomain/zero/1.0/",
        "ods:hasIdentifications": [
          {
            "@type": "ods:Identification",
            "ods:hasTaxonIdentifications": [
              {
                "@type": "ods:TaxonIdentification",
                "dwc:scientificName": "Apis mellifera Linnaeus, 1758",
                "dwc:genus": "Apis",
                "dwc:family": "Apidae",
                "dwc:order": "Hymenoptera",
                "dwc:class": "Insecta",
                "dwc:kingdom": "Animalia"
              }
            ]
          }
        ],
        "ods:hasIdentifiers": [
          {
            "@type": "ods:Identifier",
            "dcterms:title": "Catalog Number",
            "dcterms:type": "Locally unique identifier",
            "dcterms:identifier": "RMNH.INS.12345"
          },
          {
            "@type": "ods:Identifier",
            "dcterms:title": "GBIF Occurrence ID",
            "dcterms:type": "URL",
            "dcterms:identifier": "https://www.gbif.org/occurrence/1234567890"
          }
        ]
      }
    }
  ],
  "links": {
    "self": "https://dev.dissco.tech/api/digital-specimen/v1/search?q=RMNH.INS.12345&pageSize=10&pageNumber=1",
    "first": "https://dev.dissco.tech/api/digital-specimen/v1/search?q=RMNH.INS.12345&pageSize=10&pageNumber=1",
    "next": null,
    "previous": null
  },
  "meta": {
    "totalRecords": 1
  }
}
```

### 5.2 No Results (HTTP 200)

When no matching specimens are found:

```json
{
  "data": [],
  "links": {
    "self": "https://dev.dissco.tech/api/digital-specimen/v1/search?q=NONEXISTENT123&pageSize=10&pageNumber=1"
  },
  "meta": {
    "totalRecords": 0
  }
}
```

### 5.3 Error Response (HTTP 4xx/5xx)

```json
{
  "error": {
    "status": 400,
    "title": "Bad Request",
    "detail": "Invalid query parameter format"
  }
}
```

---

## 6. Key Response Fields for BOLD Display

Extract these fields from `data[].attributes` for display in BOLD:

| Field | Type | Description | Display Use |
|-------|------|-------------|-------------|
| `@id` | string | Full DOI URL | Link to DiSSCover page |
| `dcterms:identifier` | string | DOI | Display as badge |
| `ods:midsLevel` | integer (0-3) | Data completeness level | Progress indicator |
| `ods:specimenName` | string | Primary specimen name | Display confirmation |
| `ods:organisationName` | string | Holding institution | Attribution |
| `ods:organisationCode` | string | Institution acronym | Short reference |
| `ods:isKnownToContainMedia` | boolean | Has images/media | Media indicator |
| `ods:hasIdentifiers` | array | All linked identifiers | Cross-reference check |
| `ods:hasIdentifications` | array | Taxonomic determinations | Taxonomy display |

### MIDS Level Interpretation

| Level | Meaning | Typical Data |
|-------|---------|--------------|
| 0 | Minimal | Just the identifier |
| 1 | Basic | + scientific name, institution |
| 2 | Extended | + collection event, geography |
| 3 | Full | + images, sequences, all metadata |

---

## 7. Backend Proxy Implementation

BOLD should implement a backend proxy endpoint that forwards requests to DiSSCover. This approach requires no coordination with the DiSSCo team and gives BOLD full control over the integration.

### 7.1 Proxy Endpoint Design

**BOLD Internal Endpoint**:
```
GET /api/v1/external/disscover/search
```

**Query Parameters** (passed through to DiSSCover):

| Parameter | Description | Example |
|-----------|-------------|---------|
| `q` | Free-text search query | `BOLD:AAA1234-21` |
| `physicalSpecimenId` | Exact specimen ID match | `RMNH.INS.12345` |
| `collectionCode` | Collection code filter | `RMNH` |
| `species` | Species name filter | `Apis mellifera` |
| `pageSize` | Results per page (default 10) | `25` |
| `pageNumber` | Page number | `1` |

### 7.2 Proxy Implementation Examples

#### Python/Flask Backend Proxy

```python
from flask import Flask, request, jsonify
import requests
from functools import lru_cache
import time

app = Flask(__name__)

DISSCOVER_API_BASE = "https://dev.dissco.tech/api"
CACHE_TTL_SECONDS = 3600  # Cache responses for 1 hour

# Simple time-based cache
_cache = {}

def get_cached(key, ttl=CACHE_TTL_SECONDS):
    """Get value from cache if not expired."""
    if key in _cache:
        value, timestamp = _cache[key]
        if time.time() - timestamp < ttl:
            return value
    return None

def set_cached(key, value):
    """Store value in cache with timestamp."""
    _cache[key] = (value, time.time())

@app.route('/api/v1/external/disscover/search', methods=['GET'])
def proxy_disscover_search():
    """
    Proxy endpoint for DiSSCover specimen search.
    
    Forwards requests to DiSSCover API and caches responses.
    """
    # Build query parameters for DiSSCover
    disscover_params = {}
    
    # Map BOLD parameters to DiSSCover parameters
    if request.args.get('q'):
        disscover_params['q'] = request.args.get('q')
    if request.args.get('physicalSpecimenId'):
        disscover_params['physicalSpecimenId'] = request.args.get('physicalSpecimenId')
    if request.args.get('collectionCode'):
        disscover_params['collectionCode'] = request.args.get('collectionCode')
    if request.args.get('species'):
        disscover_params['species'] = request.args.get('species')
    
    # Pagination
    disscover_params['pageSize'] = request.args.get('pageSize', '10')
    disscover_params['pageNumber'] = request.args.get('pageNumber', '1')
    
    # Create cache key from parameters
    cache_key = str(sorted(disscover_params.items()))
    
    # Check cache first
    cached_response = get_cached(cache_key)
    if cached_response:
        return jsonify(cached_response)
    
    # Make request to DiSSCover
    try:
        disscover_url = f"{DISSCOVER_API_BASE}/digital-specimen/v1/search"
        response = requests.get(
            disscover_url,
            params=disscover_params,
            timeout=30,
            headers={'Accept': 'application/json'}
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Cache successful response
        set_cached(cache_key, data)
        
        return jsonify(data)
        
    except requests.Timeout:
        return jsonify({
            'error': 'DiSSCover API timeout',
            'data': [],
            'meta': {'totalRecords': 0}
        }), 504
        
    except requests.RequestException as e:
        return jsonify({
            'error': f'DiSSCover API error: {str(e)}',
            'data': [],
            'meta': {'totalRecords': 0}
        }), 502

# Convenience endpoint for BOLD Process ID lookup
@app.route('/api/v1/external/disscover/lookup/<process_id>', methods=['GET'])
def lookup_by_process_id(process_id):
    """
    Convenience endpoint to look up a specimen by BOLD Process ID.
    Tries multiple search strategies.
    """
    strategies = [
        f"BOLD:{process_id}",  # With BOLD: prefix
        process_id,            # Raw process ID
    ]
    
    for query in strategies:
        cache_key = f"lookup:{query}"
        cached = get_cached(cache_key)
        if cached and cached.get('data'):
            return jsonify(cached)
        
        try:
            response = requests.get(
                f"{DISSCOVER_API_BASE}/digital-specimen/v1/search",
                params={'q': query, 'pageSize': '5'},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get('data'):
                set_cached(cache_key, data)
                return jsonify(data)
                
        except requests.RequestException:
            continue
    
    return jsonify({
        'data': [],
        'meta': {'totalRecords': 0},
        'message': 'No matching specimen found in DiSSCover'
    })
```

#### Node.js/Express Backend Proxy

```javascript
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

const DISSCOVER_API_BASE = 'https://dev.dissco.tech/api';

/**
 * Proxy endpoint for DiSSCover specimen search
 */
app.get('/api/v1/external/disscover/search', async (req, res) => {
  // Build DiSSCover query parameters
  const disscover_params = new URLSearchParams();
  
  if (req.query.q) {
    disscover_params.append('q', req.query.q);
  }
  if (req.query.physicalSpecimenId) {
    disscover_params.append('physicalSpecimenId', req.query.physicalSpecimenId);
  }
  if (req.query.collectionCode) {
    disscover_params.append('collectionCode', req.query.collectionCode);
  }
  if (req.query.species) {
    disscover_params.append('species', req.query.species);
  }
  
  disscover_params.append('pageSize', req.query.pageSize || '10');
  disscover_params.append('pageNumber', req.query.pageNumber || '1');
  
  // Check cache
  const cacheKey = disscover_params.toString();
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    const response = await axios.get(
      `${DISSCOVER_API_BASE}/digital-specimen/v1/search`,
      {
        params: Object.fromEntries(disscover_params),
        timeout: 30000,
        headers: { 'Accept': 'application/json' }
      }
    );
    
    // Cache and return
    cache.set(cacheKey, response.data);
    res.json(response.data);
    
  } catch (error) {
    console.error('DiSSCover proxy error:', error.message);
    res.status(502).json({
      error: 'DiSSCover API error',
      data: [],
      meta: { totalRecords: 0 }
    });
  }
});

/**
 * Convenience endpoint for BOLD Process ID lookup
 */
app.get('/api/v1/external/disscover/lookup/:processId', async (req, res) => {
  const { processId } = req.params;
  const strategies = [`BOLD:${processId}`, processId];
  
  for (const query of strategies) {
    const cacheKey = `lookup:${query}`;
    const cached = cache.get(cacheKey);
    if (cached?.data?.length > 0) {
      return res.json(cached);
    }
    
    try {
      const response = await axios.get(
        `${DISSCOVER_API_BASE}/digital-specimen/v1/search`,
        {
          params: { q: query, pageSize: 5 },
          timeout: 30000
        }
      );
      
      if (response.data?.data?.length > 0) {
        cache.set(cacheKey, response.data);
        return res.json(response.data);
      }
    } catch (error) {
      continue;
    }
  }
  
  res.json({
    data: [],
    meta: { totalRecords: 0 },
    message: 'No matching specimen found in DiSSCover'
  });
});

module.exports = app;
```

#### PHP Backend Proxy

```php
<?php
/**
 * DiSSCover Proxy Controller for BOLD
 * 
 * Add this to your BOLD backend routing.
 */

class DiSSCoverProxyController {
    
    private const DISSCOVER_API_BASE = 'https://dev.dissco.tech/api';
    private const CACHE_TTL = 3600; // 1 hour
    
    /**
     * Proxy search requests to DiSSCover
     * Route: GET /api/v1/external/disscover/search
     */
    public function search() {
        // Build DiSSCover parameters
        $params = [];
        
        if (!empty($_GET['q'])) {
            $params['q'] = $_GET['q'];
        }
        if (!empty($_GET['physicalSpecimenId'])) {
            $params['physicalSpecimenId'] = $_GET['physicalSpecimenId'];
        }
        if (!empty($_GET['collectionCode'])) {
            $params['collectionCode'] = $_GET['collectionCode'];
        }
        if (!empty($_GET['species'])) {
            $params['species'] = $_GET['species'];
        }
        
        $params['pageSize'] = $_GET['pageSize'] ?? '10';
        $params['pageNumber'] = $_GET['pageNumber'] ?? '1';
        
        // Check cache
        $cacheKey = 'disscover_' . md5(serialize($params));
        $cached = $this->getFromCache($cacheKey);
        if ($cached !== null) {
            return $this->jsonResponse($cached);
        }
        
        // Make request to DiSSCover
        $url = self::DISSCOVER_API_BASE . '/digital-specimen/v1/search?' . http_build_query($params);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => ['Accept: application/json']
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error || $httpCode !== 200) {
            return $this->jsonResponse([
                'error' => 'DiSSCover API error',
                'data' => [],
                'meta' => ['totalRecords' => 0]
            ], 502);
        }
        
        $data = json_decode($response, true);
        
        // Cache successful response
        $this->setCache($cacheKey, $data, self::CACHE_TTL);
        
        return $this->jsonResponse($data);
    }
    
    /**
     * Convenience lookup by BOLD Process ID
     * Route: GET /api/v1/external/disscover/lookup/{processId}
     */
    public function lookupByProcessId($processId) {
        $strategies = ["BOLD:$processId", $processId];
        
        foreach ($strategies as $query) {
            $cacheKey = 'disscover_lookup_' . md5($query);
            $cached = $this->getFromCache($cacheKey);
            
            if ($cached !== null && !empty($cached['data'])) {
                return $this->jsonResponse($cached);
            }
            
            $url = self::DISSCOVER_API_BASE . '/digital-specimen/v1/search?' . 
                   http_build_query(['q' => $query, 'pageSize' => 5]);
            
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 30
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200) {
                $data = json_decode($response, true);
                if (!empty($data['data'])) {
                    $this->setCache($cacheKey, $data, self::CACHE_TTL);
                    return $this->jsonResponse($data);
                }
            }
        }
        
        return $this->jsonResponse([
            'data' => [],
            'meta' => ['totalRecords' => 0],
            'message' => 'No matching specimen found in DiSSCover'
        ]);
    }
    
    // Cache helpers (implement with your caching system: Redis, Memcached, etc.)
    private function getFromCache($key) {
        // Example using APCu:
        // return apcu_fetch($key) ?: null;
        return null; // Replace with your cache implementation
    }
    
    private function setCache($key, $value, $ttl) {
        // Example using APCu:
        // apcu_store($key, $value, $ttl);
    }
    
    private function jsonResponse($data, $status = 200) {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
```

### 7.3 Proxy Benefits

| Benefit | Description |
|---------|-------------|
| **No External Dependencies** | No need to request CORS changes from DiSSCo |
| **Caching** | Reduce load on DiSSCover by caching responses |
| **Rate Limiting** | Implement your own rate limits to protect DiSSCover |
| **Logging** | Track DiSSCover usage patterns in your own logs |
| **Error Handling** | Customize error responses for your frontend |
| **Identifier Transformation** | Add logic to transform BOLD IDs before querying |

---

## 8. Frontend Code Examples

### 8.1 JavaScript/TypeScript (Calling BOLD's Proxy)

```typescript
/**
 * DiSSCover Integration for BOLD Frontend
 * 
 * This code calls BOLD's backend proxy (not DiSSCover directly).
 * No CORS configuration is required.
 */

interface DiSSCoverSpecimen {
  "@id": string;
  "dcterms:identifier": string;
  "ods:midsLevel": number;
  "ods:specimenName"?: string;
  "ods:organisationName"?: string;
  "ods:organisationCode"?: string;
  "ods:isKnownToContainMedia"?: boolean;
}

interface DiSSCoverResponse {
  data: Array<{
    id: string;
    type: string;
    attributes: DiSSCoverSpecimen;
  }>;
  meta: {
    totalRecords: number;
  };
  error?: string;
  message?: string;
}

interface DiSSCoverLookupResult {
  found: boolean;
  specimen?: DiSSCoverSpecimen;
  doi?: string;
  url?: string;
  error?: string;
}

// Use BOLD's own backend proxy - no CORS issues
const BOLD_DISSCOVER_PROXY = '/api/v1/external/disscover';

/**
 * Look up a specimen in DiSSCover using BOLD's backend proxy.
 * Uses the convenience endpoint that tries multiple search strategies.
 * 
 * @param processId - BOLD Process ID (e.g., "AAA1234-21")
 * @returns Lookup result with specimen data if found
 */
async function lookupByProcessId(processId: string): Promise<DiSSCoverLookupResult> {
  const url = `${BOLD_DISSCOVER_PROXY}/lookup/${encodeURIComponent(processId)}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return {
        found: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    const data: DiSSCoverResponse = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return { found: false };
    }
    
    // Return the first (best) match
    const specimen = data.data[0].attributes;
    const doi = specimen["dcterms:identifier"];
    
    return {
      found: true,
      specimen,
      doi,
      url: specimen["@id"]  // This is the clickable URL to DiSSCover
    };
    
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Search DiSSCover using BOLD's proxy with custom parameters.
 * 
 * @param params - Search parameters
 * @returns DiSSCover response
 */
async function searchDiSSCover(params: {
  q?: string;
  physicalSpecimenId?: string;
  collectionCode?: string;
  species?: string;
  pageSize?: number;
}): Promise<DiSSCoverResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.q) searchParams.append('q', params.q);
  if (params.physicalSpecimenId) searchParams.append('physicalSpecimenId', params.physicalSpecimenId);
  if (params.collectionCode) searchParams.append('collectionCode', params.collectionCode);
  if (params.species) searchParams.append('species', params.species);
  if (params.pageSize) searchParams.append('pageSize', String(params.pageSize));
  
  const url = `${BOLD_DISSCOVER_PROXY}/search?${searchParams.toString()}`;
  
  const response = await fetch(url);
  return response.json();
}

/**
 * Example: Load DiSSCover panel data for a specimen view
 */
async function loadDiSSCoverPanel(specimenData: {
  processId: string;
  catalogNum?: string;
  institution?: string;
}): Promise<{
  show: boolean;
  doi?: string;
  url?: string;
  midsLevel?: number;
  specimenName?: string;
  organisation?: string;
  hasMedia?: boolean;
}> {
  // Primary strategy: lookup by process ID (proxy handles fallback strategies)
  const result = await lookupByProcessId(specimenData.processId);
  
  if (result.found && result.specimen) {
    return {
      show: true,
      doi: result.doi,
      url: result.url,
      midsLevel: result.specimen["ods:midsLevel"],
      specimenName: result.specimen["ods:specimenName"],
      organisation: result.specimen["ods:organisationName"],
      hasMedia: result.specimen["ods:isKnownToContainMedia"] ?? false
    };
  }
  
  // Fallback: try catalog number if process ID didn't match
  if (specimenData.catalogNum) {
    const searchResult = await searchDiSSCover({
      q: specimenData.catalogNum,
      pageSize: 5
    });
    
    if (searchResult.data?.length > 0) {
      const specimen = searchResult.data[0].attributes;
      return {
        show: true,
        doi: specimen["dcterms:identifier"],
        url: specimen["@id"],
        midsLevel: specimen["ods:midsLevel"],
        specimenName: specimen["ods:specimenName"],
        organisation: specimen["ods:organisationName"],
        hasMedia: specimen["ods:isKnownToContainMedia"] ?? false
      };
    }
  }
  
  return { show: false };
}

// React component example
function DiSSCoverPanel({ processId, catalogNum, institution }: {
  processId: string;
  catalogNum?: string;
  institution?: string;
}) {
  const [panelData, setPanelData] = React.useState<{
    loading: boolean;
    show: boolean;
    doi?: string;
    url?: string;
    midsLevel?: number;
    specimenName?: string;
    organisation?: string;
    hasMedia?: boolean;
    error?: string;
  }>({ loading: true, show: false });
  
  React.useEffect(() => {
    loadDiSSCoverPanel({ processId, catalogNum, institution })
      .then(result => setPanelData({ ...result, loading: false }))
      .catch(error => setPanelData({ 
        loading: false, 
        show: false, 
        error: error.message 
      }));
  }, [processId, catalogNum, institution]);
  
  if (panelData.loading) {
    return <div className="disscover-panel loading">Checking DiSSCover...</div>;
  }
  
  if (!panelData.show) {
    return (
      <div className="disscover-panel not-found">
        <p>No Digital Specimen found in DiSSCover</p>
        <a href={`https://dev.dissco.tech/search?q=${encodeURIComponent(processId)}`} 
           target="_blank" rel="noopener noreferrer">
          Search DiSSCover manually
        </a>
      </div>
    );
  }
  
  return (
    <div className="disscover-panel found">
      <h4>✓ Digital Specimen Found</h4>
      <p><strong>DOI:</strong> {panelData.doi}</p>
      <p><strong>MIDS Level:</strong> {panelData.midsLevel}/3</p>
      {panelData.specimenName && <p><strong>Name:</strong> {panelData.specimenName}</p>}
      {panelData.organisation && <p><strong>Institution:</strong> {panelData.organisation}</p>}
      {panelData.hasMedia && <p>📷 Media available</p>}
      <a href={panelData.url} target="_blank" rel="noopener noreferrer" className="btn">
        View in DiSSCover
      </a>
    </div>
  );
}
```

### 8.2 Python (Batch Processing)

Use this for batch processing large numbers of BOLD specimens to find DiSSCover matches:

```python
"""
Batch DiSSCover lookup for BOLD specimens.
This script can be run as a scheduled job to pre-populate DiSSCover links.
"""
import requests
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
import csv
import time

# Use your BOLD backend proxy, or DiSSCover directly for batch jobs
DISSCOVER_API = "https://dev.dissco.tech/api"

@dataclass
class DiSSCoverMatch:
    bold_process_id: str
    found: bool
    doi: Optional[str] = None
    url: Optional[str] = None
    specimen_name: Optional[str] = None
    organisation: Optional[str] = None
    mids_level: Optional[int] = None
    error: Optional[str] = None

def lookup_single(process_id: str) -> DiSSCoverMatch:
    """Look up a single BOLD Process ID in DiSSCover."""
    strategies = [f"BOLD:{process_id}", process_id]
    
    for query in strategies:
        try:
            response = requests.get(
                f"{DISSCOVER_API}/digital-specimen/v1/search",
                params={"q": query, "pageSize": 5},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("data"):
                attrs = data["data"][0]["attributes"]
                return DiSSCoverMatch(
                    bold_process_id=process_id,
                    found=True,
                    doi=attrs.get("dcterms:identifier"),
                    url=attrs.get("@id"),
                    specimen_name=attrs.get("ods:specimenName"),
                    organisation=attrs.get("ods:organisationName"),
                    mids_level=attrs.get("ods:midsLevel")
                )
        except requests.RequestException as e:
            continue
    
    return DiSSCoverMatch(bold_process_id=process_id, found=False)

def batch_lookup(process_ids: List[str], delay: float = 0.5) -> List[DiSSCoverMatch]:
    """
    Batch lookup for multiple BOLD Process IDs.
    Includes rate limiting to be respectful to DiSSCover API.
    """
    results = []
    total = len(process_ids)
    
    for i, pid in enumerate(process_ids, 1):
        result = lookup_single(pid)
        results.append(result)
        
        if result.found:
            print(f"[{i}/{total}] ✓ {pid} → {result.doi}")
        else:
            print(f"[{i}/{total}] ✗ {pid} not found")
        
        # Rate limiting
        if i < total:
            time.sleep(delay)
    
    return results

def export_results_csv(results: List[DiSSCoverMatch], filename: str):
    """Export batch results to CSV."""
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            'bold_process_id', 'found', 'disscover_doi', 
            'disscover_url', 'specimen_name', 'organisation', 'mids_level'
        ])
        for r in results:
            writer.writerow([
                r.bold_process_id, r.found, r.doi or '',
                r.url or '', r.specimen_name or '', 
                r.organisation or '', r.mids_level or ''
            ])

# Example usage
if __name__ == "__main__":
    # List of BOLD Process IDs to look up
    process_ids = [
        "AAA1234-21",
        "BBB5678-22",
        "CCC9012-23",
        # ... add more
    ]
    
    print(f"Looking up {len(process_ids)} specimens in DiSSCover...")
    results = batch_lookup(process_ids, delay=0.5)
    
    found_count = sum(1 for r in results if r.found)
    print(f"\nResults: {found_count}/{len(results)} found in DiSSCover")
    
    # Export to CSV
    export_results_csv(results, "disscover_matches.csv")
    print(f"Results exported to disscover_matches.csv")
```

### 8.3 PHP (Frontend Helper)

This is a simple PHP helper class for calling BOLD's proxy from PHP templates:

```php
<?php
/**
 * DiSSCover lookup helper for BOLD PHP templates.
 * Calls BOLD's internal proxy endpoint.
 */
class DiSSCoverLookup {
    
    private string $proxyBaseUrl;
    
    public function __construct(string $proxyBaseUrl = '/api/v1/external/disscover') {
        $this->proxyBaseUrl = $proxyBaseUrl;
    }
    
    /**
     * Look up a specimen by BOLD Process ID
     * 
     * @param string $processId BOLD Process ID (e.g., "AAA1234-21")
     * @return array{found: bool, doi?: string, url?: string, specimenName?: string, organisation?: string, midsLevel?: int, hasMedia?: bool}
     */
    public function lookup(string $processId): array {
        $url = $this->proxyBaseUrl . '/lookup/' . urlencode($processId);
        
        $response = file_get_contents($url);
        if ($response === false) {
            return ['found' => false, 'error' => 'Failed to contact proxy'];
        }
        
        $data = json_decode($response, true);
        
        if (empty($data['data'])) {
            return ['found' => false];
        }
        
        $attrs = $data['data'][0]['attributes'];
        
        return [
            'found' => true,
            'doi' => $attrs['dcterms:identifier'] ?? '',
            'url' => $attrs['@id'] ?? '',
            'specimenName' => $attrs['ods:specimenName'] ?? null,
            'organisation' => $attrs['ods:organisationName'] ?? null,
            'midsLevel' => $attrs['ods:midsLevel'] ?? 0,
            'hasMedia' => $attrs['ods:isKnownToContainMedia'] ?? false
        ];
    }
}

// Usage in a template
$lookup = new DiSSCoverLookup();
$result = $lookup->lookup($boldProcessId);

if ($result['found']): ?>
    <div class="disscover-panel found">
        <h4>✓ Digital Specimen Found</h4>
        <p><strong>DOI:</strong> <?= htmlspecialchars($result['doi']) ?></p>
        <p><strong>MIDS Level:</strong> <?= $result['midsLevel'] ?>/3</p>
        <?php if ($result['specimenName']): ?>
            <p><strong>Name:</strong> <?= htmlspecialchars($result['specimenName']) ?></p>
        <?php endif; ?>
        <?php if ($result['organisation']): ?>
            <p><strong>Institution:</strong> <?= htmlspecialchars($result['organisation']) ?></p>
        <?php endif; ?>
        <?php if ($result['hasMedia']): ?>
            <p>📷 Media available</p>
        <?php endif; ?>
        <a href="<?= htmlspecialchars($result['url']) ?>" target="_blank" class="btn">
            View in DiSSCover
        </a>
    </div>
<?php else: ?>
    <div class="disscover-panel not-found">
        <p>No Digital Specimen found in DiSSCover</p>
        <a href="https://dev.dissco.tech/search?q=<?= urlencode($boldProcessId) ?>" target="_blank">
            Search DiSSCover manually
        </a>
    </div>
<?php endif; ?>
```

---

## 9. UI Component Specification

### 9.1 Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  DiSSCover Digital Specimen Link                            [?] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ✓ Digital Specimen Found                               │   │
│  │                                                          │   │
│  │  DOI: 20.5000.1025/ABC-123-XYZ                          │   │
│  │                                                          │   │
│  │  ┌──────────────────┐                                   │   │
│  │  │ MIDS Level: 2    │  ██████████░░░░░░  (67%)          │   │
│  │  └──────────────────┘                                   │   │
│  │                                                          │   │
│  │  Institution: Naturalis Biodiversity Center (RMNH)      │   │
│  │  Specimen: Apis mellifera                               │   │
│  │  Media Available: Yes 📷                                 │   │
│  │                                                          │   │
│  │  ┌──────────────────┐  ┌────────────────────────────┐   │   │
│  │  │ View in DiSSCover │  │ Copy DOI                   │   │   │
│  │  └──────────────────┘  └────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

When no specimen found:
┌─────────────────────────────────────────────────────────────────┐
│  DiSSCover Digital Specimen Link                            [?] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ○ No Digital Specimen Found                            │   │
│  │                                                          │   │
│  │  This sample does not have a corresponding record in    │   │
│  │  DiSSCover. The physical specimen may not yet be        │   │
│  │  digitized or registered in the DiSSCo infrastructure.  │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────┐     │   │
│  │  │ Search DiSSCover Manually                      │     │   │
│  │  └────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Component States

| State | Trigger | Display |
|-------|---------|---------|
| Loading | API request in progress | Spinner with "Checking DiSSCover..." |
| Found | `data.length > 0` | Full specimen panel with details |
| Not Found | `data.length === 0` | Informational message with manual search link |
| Error | Network/HTTP error | Error message with retry button |
| Disabled | Feature flag off | Hidden or collapsed |

### 9.3 Links to DiSSCover

**Specimen Detail Page**:
```
https://dev.dissco.tech/ds/{DOI_SUFFIX}
```

Where `{DOI_SUFFIX}` is extracted from the DOI. For DOI `20.5000.1025/ABC-123-XYZ`:
```
https://dev.dissco.tech/ds/20.5000.1025/ABC-123-XYZ
```

**Manual Search Page**:
```
https://dev.dissco.tech/search?q={QUERY}
```

---

## 10. Caching Strategy

### Recommended Cache Configuration

| Cache Level | TTL | Storage |
|-------------|-----|---------|
| Browser/Client | 1 hour | localStorage or sessionStorage |
| Server-side | 4 hours | Redis/Memcached |
| CDN (if applicable) | 15 minutes | Edge cache |

### Cache Key Format
```
disscover:specimen:{identifier_hash}
```

### Cache Invalidation
- Time-based expiry (TTL)
- No active invalidation needed (DiSSCover data changes infrequently)

---

## 11. Error Handling

### Error Types and Responses

| Error | HTTP Status | BOLD Action |
|-------|-------------|-------------|
| Network timeout | - | Show "Service unavailable", offer retry |
| Proxy error | 502 | Log error, show "DiSSCover temporarily unavailable" |
| Rate limited | 429 | Back off, show "Please try again later" |
| Server error | 500 | Log error, show generic message |
| Invalid response | - | Log error, treat as "not found" |

### Rate Limiting

DiSSCover does not currently impose strict rate limits, but BOLD should implement throttling in the proxy:

- Maximum 10 requests per second to DiSSCover
- Implement exponential backoff on errors
- Use caching to reduce repeated requests
- Batch queries where possible

---

## 12. Testing Checklist

### Functional Tests

- [ ] Proxy endpoint is accessible at `/api/v1/external/disscover/search`
- [ ] Lookup endpoint is accessible at `/api/v1/external/disscover/lookup/{processId}`
- [ ] Search returns results for known DiSSCover specimens
- [ ] Search returns empty for non-existent specimens
- [ ] BOLD Process ID format is correctly URL-encoded
- [ ] Catalog numbers with special characters work
- [ ] Multiple search strategies are tried in order by the proxy
- [ ] Frontend component displays all fields correctly
- [ ] Links to DiSSCover open correct pages
- [ ] Copy DOI button works

### Edge Cases

- [ ] Very long specimen identifiers
- [ ] Special characters in identifiers (`.`, `/`, `:`, `#`)
- [ ] Unicode characters in specimen names
- [ ] Missing optional fields in response
- [ ] Multiple matches (verify first/best is selected)

### Performance Tests

- [ ] Proxy response time < 3 seconds (including DiSSCover call)
- [ ] Cached responses return < 100ms
- [ ] Component renders within 100ms of data receipt
- [ ] Caching reduces redundant API calls
- [ ] Page load not blocked by DiSSCover lookup

### Error Handling Tests

- [ ] Network timeout shows appropriate message
- [ ] Proxy errors (502) display user-friendly message
- [ ] Invalid JSON responses don't crash component
- [ ] Failed requests can be retried

---

## 13. Appendix: DiSSCover Data Model Reference

### Digital Specimen Type (`ods:DigitalSpecimen`)

Full schema documentation: https://schemas.dissco.tech/

Key field paths for BOLD integration:

```
@id                           → DOI URL (clickable link)
dcterms:identifier            → DOI string
ods:version                   → Record version number
ods:midsLevel                 → Data completeness (0-3)
ods:physicalSpecimenID        → Primary physical specimen ID
ods:normalisedPhysicalSpecimenID → Standardized specimen ID
ods:specimenName              → Accepted scientific name
ods:organisationID            → ROR ID of institution
ods:organisationName          → Institution full name
ods:organisationCode          → Institution acronym
dwc:collectionCode            → Collection code
ods:topicDiscipline           → Zoology/Botany/etc.
ods:isKnownToContainMedia     → Has images/media
ods:hasIdentifications[]      → Taxonomic determinations
ods:hasIdentifiers[]          → All linked identifiers
```

---

## 14. Support Contacts

| Topic | Contact |
|-------|---------|
| DiSSCover API issues | support@dissco.eu |
| API documentation | https://dev.dissco.tech/api-docs |
| Schema documentation | https://schemas.dissco.tech |
| DiSSCover user guide | https://dev.dissco.tech/about |

---

*Document Version: 1.1*
*Last Updated: January 2026*
*Authors: DiSSCo Technical Team*
