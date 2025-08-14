import { gql } from '@apollo/client';

export const CREATE_CHAT_SESSION = gql/* GraphQL */ `
  mutation CreateChatSession($input: ChatSessionInput!) {
    createChatSession(input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const ADD_CHAT_MESSAGE = gql/* GraphQL */ `
  mutation AddChatMessage($input: ChatMessageInput!) {
    addChatMessage(input: $input) {
      id
      content
      role
      createdAt
    }
  }
`;