import { gql } from '@apollo/client';

// Query for getting a specific component by ID (replaces get_matrix_by_id)
export const GET_COMPONENT_BY_ID = gql/* GraphQL */ `
  query GetComponentById($id: ID!) {
    component(id: $id) {
      id
      name
      kind
      station
      shape
      rowLabels
      colLabels
      ontologyId
      operationType
      domain
      cf14Version
      ufoType
      createdAt
      cells {
        row
        col
        resolved
        rawTerms
        intermediate
        operation
        notes
      }
    }
  }
`;

// Query for getting latest component by station (replaces get_latest_matrix_by_station)
export const GET_LATEST_BY_STATION = gql/* GraphQL */ `
  query GetLatestByStation($station: String!) {
    latestComponentByStation(station: $station) {
      id
      name
      kind
      station
      shape
      rowLabels
      colLabels
      ontologyId
      operationType
      domain
      cf14Version
      ufoType
      createdAt
      cells {
        row
        col
        resolved
        rawTerms
        intermediate
        operation
        notes
      }
    }
  }
`;

// Query for getting all components by station (replaces get_all_by_station)
export const GET_ALL_BY_STATION = gql/* GraphQL */ `
  query GetAllByStation($station: String!, $pagination: ComponentPagination) {
    components(
      filter: { station: $station }
      pagination: $pagination
      sort: { field: CREATED_AT, direction: DESC }
    ) {
      id
      name
      kind
      station
      shape
      rowLabels
      colLabels
      ontologyId
      operationType
      domain
      cf14Version
      ufoType
      createdAt
      cells {
        row
        col
        resolved
        rawTerms
        intermediate
        operation
        notes
      }
    }
  }
`;

// General purpose query with filtering, pagination, and sorting
export const GET_COMPONENTS_WITH_FILTER = gql/* GraphQL */ `
  query GetComponentsWithFilter(
    $filter: ComponentFilter
    $pagination: ComponentPagination
    $sort: ComponentSort
  ) {
    components(filter: $filter, pagination: $pagination, sort: $sort) {
      id
      name
      kind
      station
      shape
      rowLabels
      colLabels
      ontologyId
      operationType
      domain
      cf14Version
      ufoType
      createdAt
      cells {
        row
        col
        resolved
        rawTerms
        intermediate
        operation
        notes
      }
    }
  }
`;

// Query for latest component by station with flexible station parameter
export const LATEST_BY_STATION = gql/* GraphQL */ `
  query LatestByStation($station: String!) {
    latestComponentByStation(station: $station) {
      id
      name
      station
      shape
      rowLabels
      colLabels
      cells(orderBy: [{ row: ASC }, { col: ASC }]) {
        row
        col
        resolved
        rawTerms
        intermediate
      }
    }
  }
`;

// Legacy query for verification matrices (keep for compatibility)
export const LatestVerificationDoc = gql/* GraphQL */ `
  query LatestVerification {
    latestComponentByStation(station: "Requirements") {
      id
      name
      station
      shape
      rowLabels
      colLabels
      cells(orderBy: [{ row: ASC }, { col: ASC }]) {
        row
        col
        resolved
        rawTerms
        intermediate
      }
    }
  }
`;