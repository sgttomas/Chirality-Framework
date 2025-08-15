import { gql } from '@apollo/client';

export const CELL_PREVIEW = gql`
  query CellPreview($station: String!, $matrix: String!, $row: Int!, $col: Int!) {
    valley {
      name
      stations {
        id
        name
        index
      }
    }
    matrix(id: $matrix, station: $station) {
      rowLabels
      colLabels
      cell(row: $row, col: $col) {
        row
        col
        stage
        version
        value
        labels {
          rowLabel
          colLabel
        }
      }
    }
  }
`;

export const CELL_INSPECTOR = gql`
  query CellInspector($station: String!, $matrix: String!, $row: Int!, $col: Int!) {
    valley {
      id
      name
      version
      stations {
        id
        name
        index
      }
    }
    station(id: $station) {
      id
      name
      index
      ontology {
        curie
        label
        definition
      }
    }
    matrix(id: $matrix, station: $station) {
      id
      name
      rowLabels
      colLabels
      ontology {
        curie
        label
      }
      cell(row: $row, col: $col) {
        row
        col
        stage
        version
        value
        labels {
          rowLabel
          colLabel
        }
        anchors {
          id
          kind
          text
        }
        traces {
          phase
          promptHash
          modelId
          latencyMs
          createdAt
        }
        ontology {
          curie
          label
          definition
        }
      }
    }
    ontologies {
      jsonldContext
      entities {
        curie
        label
        source
      }
    }
  }
`;

export const UFO_CLAIMS = gql`
  query UFOClaims($status: String, $minConfidence: Float, $first: Int) {
    ufoClaims(status: $status, minConfidence: $minConfidence, first: $first) {
      nodes {
        id
        status
        confidence
        relation
        ufoRef {
          curie
          label
        }
        subject {
          __typename
          ... on Cell {
            row
            col
          }
          ... on Station {
            name
          }
          ... on Matrix {
            id
            name
          }
        }
        evidence {
          id
          kind
          source
          createdAt
        }
      }
    }
  }
`;

export const PROPOSE_UFO = gql`
  mutation ProposeUFO($input: ProposeUFOClaimInput!) {
    proposeUFOClaim(input: $input) {
      id
      status
      confidence
      ufoRef {
        curie
        label
      }
    }
  }
`;

export const ADJUDICATE_UFO = gql`
  mutation AdjudicateUFO($id: ID!, $status: String!, $note: String) {
    adjudicateUFOClaim(id: $id, status: $status, note: $note) {
      id
      status
      note
      adjudicatedBy
      adjudicatedAt
    }
  }
`;