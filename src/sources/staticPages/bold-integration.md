# BOLD-DiSSCover Integration Scenarios

This document describes suggested implementation scenarios for how BOLD (Barcode of Life Data System, boldsystems.org) could interact with DiSSCover to provide API-based interoperability for "sample data brokering and tracking services". These scenarios enable users to see the connection between BOLD and DiSSCover directly in the BOLD interface.

## Background

### About DiSSCover
DiSSCover is a platform for curating and annotating digital specimens, which serve as digital surrogates for physical specimens. It provides access to all specimen-related data, including metadata (where, when, by whom), digital media and derived or related data. DiSSCover uses persistent DOI identifiers and supports the openDS data model for digital specimens.

### About BOLD
BOLD (Barcode of Life Data System) is a cloud-based data storage and analysis platform that provides an integrated environment for the assembly and use of DNA barcode data. It supports all stages of the analytical pathway, from specimen collection to validated barcode library.

### Integration Opportunity
Both systems deal with specimen data and sample tracking. BOLD tracks biological samples through the DNA barcoding pipeline, while DiSSCover manages digital specimens with persistent identifiers. Integrating these systems would create a seamless workflow for researchers who need to:
- Link DNA barcodes to physical specimens
- Track samples across institutional boundaries
- Maintain provenance records for molecular work

---

## Scenario 1: BOLD Process ID Linking to DiSSCover Specimens

> **📋 Full Technical Specification Available**: A detailed implementation guide for BOLD developers is available at [Scenario 1 Technical Specification](/bold-integration-scenario1-spec). This comprehensive document includes complete API documentation, code examples in JavaScript/TypeScript, Python, and PHP, UI component specifications, and testing checklists suitable for implementation by coding agents.

### Summary

This scenario enables BOLD to query DiSSCover's public search API to discover if a Digital Specimen record exists for a given sample. **This can be implemented entirely on the BOLD side** using DiSSCover's existing read-only API endpoints—the only DiSSCover-side requirement is CORS header configuration.

### User Story
As a researcher using BOLD, I want to see when a sample I'm working with has a corresponding Digital Specimen in DiSSCover, so I can access additional metadata, media, and annotations associated with the physical specimen.

### Key Integration Points

| Aspect | Details |
|--------|---------|
| **API Endpoint** | `GET https://dev.dissco.tech/api/digital-specimen/v1/search` |
| **Authentication** | None required (public read-only API) |
| **Query Parameters** | `q` (free-text), `$filter.physicalSpecimenId`, `$filter.collectionCode`, etc. |
| **Response Format** | JSON with `data[]`, `links`, and `meta` objects |

### Identifier Query Strategies

BOLD can query DiSSCover using multiple identifier types:

1. **BOLD Process ID**: `?q=BOLD:AAA1234-21` or `?q=AAA1234-21`
2. **Catalog Number**: `?q=RMNH.INS.12345` or `?$filter.physicalSpecimenId=RMNH.INS.12345`
3. **Collection + Number**: `?$filter.collectionCode=RMNH&q=12345`
4. **Taxonomic Search**: `?$filter.species=Apis%20mellifera&$filter.country=Netherlands`

### BOLD Interface Addition

```
┌─────────────────────────────────────────────────────────────────────┐
│  DiSSCover Digital Specimen Link                                [?] │
├─────────────────────────────────────────────────────────────────────┤
│  ✓ Digital Specimen Found                                           │
│                                                                     │
│  DOI: 20.5000.1025/ABC-123-XYZ                                     │
│  MIDS Level: 2  ██████████░░░░░░  (67%)                            │
│  Institution: Naturalis Biodiversity Center (RMNH)                  │
│  Media Available: Yes 📷                                            │
│                                                                     │
│  [View in DiSSCover]  [Copy DOI]                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### CORS Access Request

To enable browser-based JavaScript calls from BOLD to DiSSCover, send this request to `support@dissco.eu`:

```
Subject: CORS Access Request for BOLD Systems Integration

Please add the following origins to your CORS allowed origins:
- https://boldsystems.org
- https://www.boldsystems.org
- https://dev.boldsystems.org

The integration will use read-only GET requests to /api/digital-specimen/v1/search
```

### Implementation Effort

| BOLD-side Tasks | DiSSCo-side Tasks |
|-----------------|-------------------|
| Implement API client | Configure CORS headers |
| Add UI component | (No code changes needed) |
| Cache results | |
| Handle errors | |

**Estimated BOLD development time**: 2-3 days for experienced developer

---

## Scenario 2: Bidirectional Sample Tracking Workflow

### User Story
As a collection manager, I want to track samples that are sent for DNA barcoding and receive updates when barcode results are available, so I can maintain complete provenance records in DiSSCover.

### Implementation Overview

This scenario establishes a bidirectional tracking system where:
1. DiSSCover can initiate sample tracking requests to BOLD
2. BOLD can push updates back to DiSSCover via the Annotation API
3. Both systems maintain linked records with persistent identifiers

#### BOLD Interface Addition
Add a "DiSSCover Tracking" section in the BOLD project management view:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BOLD Project: European Bees                       │
├─────────────────────────────────────────────────────────────────────┤
│  DiSSCover Sample Tracking                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  📊 Tracked Samples Overview                                 │   │
│  │  ├─ Total Tracked: 156                                       │   │
│  │  ├─ Barcoding Complete: 142                                  │   │
│  │  ├─ Pending: 14                                              │   │
│  │  └─ Failed: 0                                                │   │
│  │                                                               │   │
│  │  Recent Updates:                                              │   │
│  │  ┌─────────────────────────────────────────────────────────┐ │   │
│  │  │ ✓ BOLD:BBB5678 → DOI:10.3535/ABC-123 - Barcode added    │ │   │
│  │  │ ✓ BOLD:BBB5679 → DOI:10.3535/ABC-124 - Barcode added    │ │   │
│  │  │ ⏳ BOLD:BBB5680 → DOI:10.3535/ABC-125 - In progress     │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  │                                                               │   │
│  │  [Push Updates to DiSSCover]  [View Tracking History]        │   │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

#### API Workflow

**Step 1: DiSSCover Initiates Tracking Request**

When a specimen is sent for barcoding, DiSSCover creates an Entity Relationship:

```json
{
  "@type": "ods:EntityRelationship",
  "dwc:relationshipOfResource": "hasDerivative",
  "dwc:relationshipOfResourceID": "https://rs.tdwg.org/dwc/terms/ResourceRelationship",
  "dwc:relatedResourceID": "BOLD:PROJECT:12345",
  "ods:relatedResourceURI": "https://boldsystems.org/index.php/MAS_Management_DataConsole?codes=PROJECT:12345",
  "dwc:relationshipRemarks": "Sample sent to BOLD for DNA barcoding",
  "ods:hasAgents": [{
    "@type": "schema:Organization",
    "schema:name": "BOLD Systems",
    "schema:identifier": "https://boldsystems.org"
  }]
}
```

**Step 2: BOLD Sends Progress Updates via DiSSCover Annotation API**

```http
POST /annotation/v1
Content-Type: application/json
Authorization: Bearer {BOLD_SERVICE_TOKEN}

{
  "data": {
    "type": "ods:Annotation",
    "attributes": {
      "oa:motivation": "ods:adding",
      "oa:motivatedBy": "Sample tracking update from BOLD",
      "oa:hasTarget": {
        "@id": "https://doi.org/10.3535/TEST-DOI-123",
        "@type": "ods:DigitalSpecimen",
        "dcterms:identifier": "https://doi.org/10.3535/TEST-DOI-123",
        "ods:fdoType": "https://doi.org/21.T11148/894b1e6cad57e921764e",
        "oa:hasSelector": {
          "@type": "ods:ClassSelector",
          "ods:class": "$.ods:hasEntityRelationships"
        }
      },
      "oa:hasBody": {
        "oa:value": [{
          "@type": "ods:EntityRelationship",
          "dwc:relationshipOfResource": "hasSequence",
          "dwc:relatedResourceID": "BOLD:AAA1234-21",
          "ods:relatedResourceURI": "https://boldsystems.org/index.php/Public_RecordView?processid=AAA1234-21",
          "dwc:relationshipRemarks": "COI-5P barcode sequence",
          "dwc:relationshipEstablishedDate": "2025-01-28T12:00:00.000Z"
        }]
      }
    }
  }
}
```

**Step 3: DiSSCover Accepts Annotation and Updates Specimen Record**

Upon annotation approval, the Digital Specimen is enriched with:
- Link to BOLD barcode record
- Sequence metadata (when available)
- Provenance information

#### Implementation Requirements

For BOLD:
1. Implement OAuth2 client credentials flow for DiSSCover API access
2. Add sample tracking dashboard with DiSSCover integration
3. Implement batch update functionality for project-level operations
4. Store DiSSCover DOIs as linked identifiers

For DiSSCover:
1. Create BOLD as a trusted annotation source (service account)
2. Support automated annotation approval for verified BOLD updates
3. Implement webhook notifications for tracking status changes

---

## Scenario 3: BOLD Integration via Machine Annotation Service (MAS)

### User Story
As a DiSSCover user viewing a specimen, I want to automatically discover if DNA barcode data exists in BOLD for this specimen, so I can link molecular data without manual searching.

### Implementation Overview

DiSSCover's Machine Annotation Service (MAS) architecture allows automated services to enrich specimen data. A BOLD MAS would:
1. Receive specimen data from DiSSCover
2. Query BOLD for matching barcode records
3. Return annotations with discovered links

#### DiSSCover Interface Display

```
┌─────────────────────────────────────────────────────────────────────┐
│  Digital Specimen: Apis mellifera                                    │
│  DOI: 10.3535/TEST-DOI-123                                          │
├─────────────────────────────────────────────────────────────────────┤
│  🤖 Machine Annotation Services                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  BOLD Barcode Linker                                    [Run]│   │
│  │  Searches BOLD Systems for matching DNA barcode records      │   │
│  │                                                               │   │
│  │  Last Run: 2025-01-15 14:30                                  │   │
│  │  Status: ✓ 2 barcode records found                          │   │
│  │                                                               │   │
│  │  Results:                                                    │   │
│  │  ┌─────────────────────────────────────────────────────────┐│   │
│  │  │ 🧬 BOLD:AAA1234-21                                      ││   │
│  │  │ Species: Apis mellifera                                 ││   │
│  │  │ Marker: COI-5P | Length: 658bp                         ││   │
│  │  │ [View in BOLD] [Accept as Annotation]                  ││   │
│  │  ├─────────────────────────────────────────────────────────┤│   │
│  │  │ 🧬 BOLD:AAA1234-22                                      ││   │
│  │  │ Species: Apis mellifera                                 ││   │
│  │  │ Marker: ITS2 | Length: 412bp                           ││   │
│  │  │ [View in BOLD] [Accept as Annotation]                  ││   │
│  │  └─────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

#### MAS Configuration

**BOLD Barcode Linker MAS Definition:**
```json
{
  "@type": "ods:MachineAnnotationService",
  "schema:name": "BOLD Barcode Linker",
  "schema:description": "Searches BOLD Systems for DNA barcode records matching the specimen identifiers and taxonomy. Links discovered barcode records as Entity Relationships.",
  "ods:containerImage": "registry.dissco.eu/bold-barcode-linker",
  "ods:containerTag": "1.0.0",
  "ods:hasTargetDigitalObjectFilter": {
    "$['ods:topicDiscipline']": ["Zoology", "Botany", "Microbiology"],
    "$['ods:hasIdentifications'][*]['ods:hasTaxonIdentifications'][*]['dwc:scientificName']": ["*"]
  },
  "ods:batchingPermitted": true,
  "ods:timeToLive": 3600000,
  "schema:codeRepository": "https://github.com/dissco/bold-barcode-linker",
  "schema:programmingLanguage": "Python",
  "schema:license": "https://spdx.org/licenses/Apache-2.0",
  "ods:hasEnvironmentalVariables": [
    {
      "schema:name": "BOLD_API_BASE_URL",
      "schema:value": "https://boldsystems.org/index.php/API_Public"
    }
  ],
  "ods:hasSecretVariables": [
    {
      "schema:name": "BOLD_API_KEY",
      "ods:secretKeyRef": "bold-api-key"
    }
  ]
}
```

#### MAS Processing Logic

**Input: DiSSCover Specimen Message**
```json
{
  "digitalSpecimen": {
    "@id": "https://doi.org/10.3535/TEST-DOI-123",
    "ods:physicalSpecimenID": "RMNH.INS.12345",
    "ods:specimenName": "Apis mellifera",
    "ods:hasIdentifications": [{
      "ods:hasTaxonIdentifications": [{
        "dwc:scientificName": "Apis mellifera",
        "dwc:genus": "Apis",
        "dwc:family": "Apidae"
      }]
    }],
    "ods:hasIdentifiers": [{
      "dcterms:title": "Catalog Number",
      "dcterms:identifier": "RMNH.INS.12345"
    }]
  }
}
```

**MAS Query to BOLD:**
```http
GET https://boldsystems.org/index.php/API_Public/specimen?taxon=Apis%20mellifera&container=RMNH&format=json
```

**Output: Annotation Batch**
```json
{
  "annotations": [
    {
      "oa:motivation": "ods:adding",
      "oa:motivatedBy": "Automated BOLD barcode discovery",
      "oa:hasTarget": {
        "@id": "https://doi.org/10.3535/TEST-DOI-123",
        "@type": "ods:DigitalSpecimen",
        "oa:hasSelector": {
          "@type": "ods:ClassSelector",
          "ods:class": "$.ods:hasEntityRelationships"
        }
      },
      "oa:hasBody": {
        "oa:value": [{
          "@type": "ods:EntityRelationship",
          "dwc:relationshipOfResource": "hasSequence",
          "dwc:relatedResourceID": "BOLD:AAA1234-21",
          "ods:relatedResourceURI": "https://boldsystems.org/index.php/Public_RecordView?processid=AAA1234-21",
          "dwc:relationshipRemarks": "COI-5P barcode (658bp), 100% identity match"
        }]
      }
    }
  ],
  "batchMetadata": {
    "searchCriteria": "taxon=Apis mellifera, container=RMNH",
    "recordsSearched": 1247,
    "matchesFound": 2
  }
}
```

#### Implementation Requirements

For BOLD:
1. Provide API access for specimen/sequence queries
2. Support searching by:
   - Catalog numbers (institution codes)
   - Scientific names (including synonyms)
   - Collector names
   - Geographic coordinates (proximity search)
3. Return comprehensive metadata for matching records

For DiSSCover:
1. Register BOLD Barcode Linker as approved MAS
2. Configure BOLD API credentials in secrets management
3. Enable batch annotation processing for BOLD results
4. Implement annotation review workflow for BOLD discoveries

---

## Implementation Roadmap

### Phase 1: Read-Only Integration (3 months)
- Implement Scenario 1: BOLD Process ID linking
- BOLD adds DiSSCover lookup panel
- DiSSCover ensures API compatibility

### Phase 2: Sample Tracking (6 months)
- Implement Scenario 2: Bidirectional tracking
- OAuth2 service account setup
- Tracking dashboard in BOLD
- Notification system in DiSSCover

### Phase 3: Automated Discovery (9 months)
- Implement Scenario 3: BOLD MAS
- Deploy containerized service
- Integration testing with production data
- User interface refinements

---

## Technical Considerations

### Authentication
- BOLD should use OAuth2 client credentials for write operations
- Read operations can use API keys with rate limiting
- DiSSCover should implement CORS for BOLD domains

### Data Standards
- Both systems should use Darwin Core terms where applicable
- Entity relationships should follow TDWG ResourceRelationship standards
- Identifiers should include type classification (DOI, BOLD Process ID, etc.)

### Error Handling
- Implement retry logic for transient failures
- Provide meaningful error messages in both interfaces
- Log integration events for audit purposes

### Performance
- Cache lookup results on both sides
- Use batch operations where possible
- Implement pagination for large result sets

---

## Conclusion

These three integration scenarios provide a comprehensive framework for BOLD-DiSSCover interoperability:

1. **Scenario 1** enables immediate value by linking existing records
2. **Scenario 2** establishes operational workflows for ongoing sample tracking
3. **Scenario 3** automates discovery to reduce manual effort

Together, these implementations would create a seamless experience for researchers working with both physical specimens and DNA barcode data, supporting the broader goal of interconnected biodiversity data infrastructure.

For questions or implementation support, please contact:
- DiSSCo: support@dissco.eu
- BOLD: support@boldsystems.org
