# BOLD Integration with DiSSCover: Scenario 1 Technical Specification

## Implementation Guide for BOLD Developers

This document provides a complete technical specification for implementing DiSSCover specimen lookup functionality within the BOLD interface. It is written for developers familiar with the BOLD codebase who need to integrate with DiSSCover's APIs.

---

## 1. Overview

### What This Integration Does
When a user views a specimen record in BOLD, the system queries DiSSCover to check if a corresponding Digital Specimen exists. If found, BOLD displays a panel showing the DiSSCover DOI, specimen metadata, and direct links to the DiSSCover interface.

### Architecture Summary
```
┌──────────────────┐         HTTPS GET          ┌──────────────────┐
│                  │ ─────────────────────────► │                  │
│   BOLD Frontend  │                            │  DiSSCover API   │
│   (JavaScript)   │ ◄───────────────────────── │  (REST/JSON)     │
│                  │         JSON Response      │                  │
└──────────────────┘                            └──────────────────┘
```

### No Authentication Required
DiSSCover's search API is public and read-only. No API keys, OAuth tokens, or authentication headers are required for this integration.

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

For more precise queries, use filter parameters prefixed with `$filter.`:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `$filter.physicalSpecimenId` | string | Exact match on physical specimen ID | `RMNH.INS.12345` |
| `$filter.organisationName` | string | Institution name | `Naturalis Biodiversity Center` |
| `$filter.collectionCode` | string | Collection code/acronym | `RMNH`, `ZMA` |
| `$filter.species` | string | Scientific name at species level | `Apis mellifera` |
| `$filter.genus` | string | Genus name | `Apis` |
| `$filter.family` | string | Family name | `Apidae` |
| `$filter.country` | string | Country of collection | `Netherlands` |
| `$filter.topicDiscipline` | string | Discipline filter | `Zoology`, `Botany` |

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
GET /api/digital-specimen/v1/search?$filter.physicalSpecimenId=RMNH.INS.12345
```

### 4.3 Collection Code + Specimen Number

When BOLD stores collection code and specimen number separately:

**Example** (Collection: RMNH, Number: 12345):
```http
GET /api/digital-specimen/v1/search?$filter.collectionCode=RMNH&q=12345
```

### 4.4 Taxonomic + Geographic Filters

For broader searches when exact identifiers aren't available:

```http
GET /api/digital-specimen/v1/search?$filter.species=Apis%20mellifera&$filter.country=Netherlands&pageSize=50
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

## 7. CORS Configuration Request

For BOLD's JavaScript frontend to call DiSSCover directly, CORS headers must permit the BOLD domain.

### Request to DiSSCo Team

Send this request to `support@dissco.eu`:

```
Subject: CORS Access Request for BOLD Systems Integration

Dear DiSSCo Team,

We are implementing DiSSCover specimen lookup functionality in BOLD Systems 
(boldsystems.org). Please add the following origins to your CORS allowed origins:

Production:
- https://boldsystems.org
- https://www.boldsystems.org

Development/Testing:
- https://dev.boldsystems.org
- https://staging.boldsystems.org

The integration will use read-only GET requests to:
- /api/digital-specimen/v1/search

No authentication or write access is required.

Best regards,
[BOLD Development Team]
```

### Alternative: Server-Side Proxy

If CORS cannot be configured, BOLD can proxy requests through its backend:

```
BOLD Frontend → BOLD Backend Proxy → DiSSCover API
```

**BOLD Backend Proxy Endpoint Example**:
```
GET /api/v1/external/disscover/search?q={query}
```

The proxy simply forwards the request to DiSSCover and returns the response.

---

## 8. Implementation Code Examples

### 8.1 JavaScript/TypeScript (Frontend)

```typescript
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
}

interface DiSSCoverLookupResult {
  found: boolean;
  specimen?: DiSSCoverSpecimen;
  doi?: string;
  url?: string;
  error?: string;
}

const DISSCOVER_BASE_URL = 'https://dev.dissco.tech/api';

/**
 * Search DiSSCover for a specimen matching the given identifier
 * @param identifier - BOLD Process ID, catalog number, or other specimen identifier
 * @returns Lookup result with specimen data if found
 */
async function searchDiSSCover(identifier: string): Promise<DiSSCoverLookupResult> {
  const encodedQuery = encodeURIComponent(identifier);
  const url = `${DISSCOVER_BASE_URL}/digital-specimen/v1/search?q=${encodedQuery}&pageSize=10`;
  
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
    
    if (data.data.length === 0) {
      return { found: false };
    }
    
    // Return the first (best) match
    const specimen = data.data[0].attributes;
    const doi = specimen["dcterms:identifier"];
    
    return {
      found: true,
      specimen,
      doi,
      url: specimen["@id"]  // This is the clickable URL
    };
    
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Search using multiple identifier strategies
 * Tries BOLD Process ID format first, then raw identifier
 */
async function findDiSSCoverSpecimen(
  boldProcessId?: string,
  catalogNumber?: string,
  collectionCode?: string
): Promise<DiSSCoverLookupResult> {
  
  // Strategy 1: Try BOLD Process ID with prefix
  if (boldProcessId) {
    const result = await searchDiSSCover(`BOLD:${boldProcessId}`);
    if (result.found) return result;
    
    // Try without prefix
    const result2 = await searchDiSSCover(boldProcessId);
    if (result2.found) return result2;
  }
  
  // Strategy 2: Try catalog number
  if (catalogNumber) {
    const result = await searchDiSSCover(catalogNumber);
    if (result.found) return result;
  }
  
  // Strategy 3: Try collection code + catalog number combined
  if (collectionCode && catalogNumber) {
    const combined = `${collectionCode}.${catalogNumber}`;
    const result = await searchDiSSCover(combined);
    if (result.found) return result;
  }
  
  return { found: false };
}

// Example usage in BOLD specimen view component
async function loadDiSSCoverPanel(specimenData: {
  processId: string;
  catalogNum?: string;
  institution?: string;
}) {
  const result = await findDiSSCoverSpecimen(
    specimenData.processId,
    specimenData.catalogNum,
    specimenData.institution
  );
  
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
  
  return { show: false };
}
```

### 8.2 Python (Backend Proxy or Batch Processing)

```python
import requests
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from urllib.parse import urlencode, quote

DISSCOVER_BASE_URL = "https://dev.dissco.tech/api"

@dataclass
class DiSSCoverSpecimen:
    doi: str
    url: str
    mids_level: int
    specimen_name: Optional[str]
    organisation_name: Optional[str]
    organisation_code: Optional[str]
    has_media: bool
    raw_data: Dict[str, Any]

@dataclass  
class LookupResult:
    found: bool
    specimen: Optional[DiSSCoverSpecimen] = None
    error: Optional[str] = None

def search_disscover(query: str, page_size: int = 10) -> LookupResult:
    """
    Search DiSSCover for specimens matching the query.
    
    Args:
        query: Search string (BOLD Process ID, catalog number, etc.)
        page_size: Maximum results to return
        
    Returns:
        LookupResult with specimen data if found
    """
    url = f"{DISSCOVER_BASE_URL}/digital-specimen/v1/search"
    params = {
        "q": query,
        "pageSize": page_size
    }
    
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("data"):
            return LookupResult(found=False)
        
        # Get first match
        attrs = data["data"][0]["attributes"]
        
        specimen = DiSSCoverSpecimen(
            doi=attrs.get("dcterms:identifier", ""),
            url=attrs.get("@id", ""),
            mids_level=attrs.get("ods:midsLevel", 0),
            specimen_name=attrs.get("ods:specimenName"),
            organisation_name=attrs.get("ods:organisationName"),
            organisation_code=attrs.get("ods:organisationCode"),
            has_media=attrs.get("ods:isKnownToContainMedia", False),
            raw_data=attrs
        )
        
        return LookupResult(found=True, specimen=specimen)
        
    except requests.RequestException as e:
        return LookupResult(found=False, error=str(e))

def find_disscover_specimen(
    bold_process_id: Optional[str] = None,
    catalog_number: Optional[str] = None,
    collection_code: Optional[str] = None
) -> LookupResult:
    """
    Search for a DiSSCover specimen using multiple identifier strategies.
    
    Args:
        bold_process_id: BOLD Process ID (e.g., "AAA1234-21")
        catalog_number: Institution catalog number
        collection_code: Collection/institution code
        
    Returns:
        LookupResult with first matching specimen
    """
    # Strategy 1: BOLD Process ID with prefix
    if bold_process_id:
        result = search_disscover(f"BOLD:{bold_process_id}")
        if result.found:
            return result
        
        # Try without prefix
        result = search_disscover(bold_process_id)
        if result.found:
            return result
    
    # Strategy 2: Catalog number
    if catalog_number:
        result = search_disscover(catalog_number)
        if result.found:
            return result
    
    # Strategy 3: Combined collection code + catalog number
    if collection_code and catalog_number:
        combined = f"{collection_code}.{catalog_number}"
        result = search_disscover(combined)
        if result.found:
            return result
    
    return LookupResult(found=False)

# Batch processing example
def batch_lookup_specimens(identifiers: List[str]) -> Dict[str, LookupResult]:
    """
    Look up multiple specimens in DiSSCover.
    
    Args:
        identifiers: List of specimen identifiers to look up
        
    Returns:
        Dictionary mapping identifiers to their lookup results
    """
    results = {}
    for identifier in identifiers:
        results[identifier] = search_disscover(identifier)
    return results

# Example usage
if __name__ == "__main__":
    # Single lookup
    result = find_disscover_specimen(
        bold_process_id="AAA1234-21",
        catalog_number="RMNH.INS.12345",
        collection_code="RMNH"
    )
    
    if result.found:
        print(f"Found: {result.specimen.doi}")
        print(f"  Name: {result.specimen.specimen_name}")
        print(f"  MIDS Level: {result.specimen.mids_level}")
        print(f"  Institution: {result.specimen.organisation_name}")
        print(f"  Has Media: {result.specimen.has_media}")
        print(f"  URL: {result.specimen.url}")
    else:
        print(f"Not found. Error: {result.error}")
```

### 8.3 PHP (WordPress/Legacy Integration)

```php
<?php

class DiSSCoverClient {
    private const BASE_URL = 'https://dev.dissco.tech/api';
    private const TIMEOUT = 30;
    
    /**
     * Search DiSSCover for specimens
     * 
     * @param string $query Search query
     * @param int $pageSize Max results
     * @return array{found: bool, specimen?: array, error?: string}
     */
    public function search(string $query, int $pageSize = 10): array {
        $url = self::BASE_URL . '/digital-specimen/v1/search?' . http_build_query([
            'q' => $query,
            'pageSize' => $pageSize
        ]);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => self::TIMEOUT,
            CURLOPT_HTTPHEADER => ['Accept: application/json']
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            return ['found' => false, 'error' => $error];
        }
        
        if ($httpCode !== 200) {
            return ['found' => false, 'error' => "HTTP $httpCode"];
        }
        
        $data = json_decode($response, true);
        
        if (empty($data['data'])) {
            return ['found' => false];
        }
        
        $attrs = $data['data'][0]['attributes'];
        
        return [
            'found' => true,
            'specimen' => [
                'doi' => $attrs['dcterms:identifier'] ?? '',
                'url' => $attrs['@id'] ?? '',
                'midsLevel' => $attrs['ods:midsLevel'] ?? 0,
                'specimenName' => $attrs['ods:specimenName'] ?? null,
                'organisationName' => $attrs['ods:organisationName'] ?? null,
                'hasMedia' => $attrs['ods:isKnownToContainMedia'] ?? false
            ]
        ];
    }
    
    /**
     * Find specimen using multiple identifier strategies
     */
    public function findSpecimen(
        ?string $boldProcessId = null,
        ?string $catalogNumber = null,
        ?string $collectionCode = null
    ): array {
        // Try BOLD Process ID
        if ($boldProcessId) {
            $result = $this->search("BOLD:$boldProcessId");
            if ($result['found']) return $result;
            
            $result = $this->search($boldProcessId);
            if ($result['found']) return $result;
        }
        
        // Try catalog number
        if ($catalogNumber) {
            $result = $this->search($catalogNumber);
            if ($result['found']) return $result;
        }
        
        // Try combined
        if ($collectionCode && $catalogNumber) {
            $result = $this->search("$collectionCode.$catalogNumber");
            if ($result['found']) return $result;
        }
        
        return ['found' => false];
    }
}

// Usage example
$client = new DiSSCoverClient();
$result = $client->findSpecimen(
    boldProcessId: 'AAA1234-21',
    catalogNumber: 'RMNH.INS.12345',
    collectionCode: 'RMNH'
);

if ($result['found']) {
    echo "Found: " . $result['specimen']['doi'] . "\n";
}
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
| Rate limited | 429 | Back off, show "Please try again later" |
| Server error | 500 | Log error, show generic message |
| Invalid response | - | Log error, treat as "not found" |
| CORS blocked | - | Fall back to proxy or hide panel |

### Rate Limiting

DiSSCover does not currently impose strict rate limits, but BOLD should implement client-side throttling:

- Maximum 10 requests per second per client
- Implement exponential backoff on errors
- Batch queries where possible

---

## 12. Testing Checklist

### Functional Tests

- [ ] Search returns results for known DiSSCover specimens
- [ ] Search returns empty for non-existent specimens
- [ ] BOLD Process ID format is correctly URL-encoded
- [ ] Catalog numbers with special characters work
- [ ] Multiple search strategies are tried in order
- [ ] Component displays all fields correctly
- [ ] Links to DiSSCover open correct pages
- [ ] Copy DOI button works

### Edge Cases

- [ ] Very long specimen identifiers
- [ ] Special characters in identifiers (`.`, `/`, `:`, `#`)
- [ ] Unicode characters in specimen names
- [ ] Missing optional fields in response
- [ ] Multiple matches (verify first/best is selected)

### Performance Tests

- [ ] API response time < 2 seconds
- [ ] Component renders within 100ms of data receipt
- [ ] Caching reduces redundant API calls
- [ ] Page load not blocked by DiSSCover lookup

### Error Handling Tests

- [ ] Network timeout shows appropriate message
- [ ] HTTP errors are caught and displayed
- [ ] Invalid JSON responses don't crash component
- [ ] CORS errors are handled gracefully

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
| CORS access requests | support@dissco.eu |
| API documentation | https://dev.dissco.tech/api-docs |
| Schema documentation | https://schemas.dissco.tech |
| DiSSCover user guide | https://dev.dissco.tech/about |

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Authors: DiSSCo Technical Team*
