// Annotation type imported from components
export type Annotation = {
  type: "file_citation" | "url_citation" | "container_file_citation";
  fileId?: string;
  containerId?: string;
  url?: string;
  title?: string;
  filename?: string;
  index?: number;
};

// Content chunk type with optional annotations
export type ContentChunk = {
  type: "input_text" | "output_text" | "function_calls" | "function_call_results";
  text?: string;
  function_calls?: any[];
  function_call_results?: any[];
  annotations?: Annotation[];
};

// Types for chat items and messages
export interface Item {
  type: "message" | "mcp_approval_request" | "mcp_list_tools" | "tool_call" | "loading";
  role?: "user" | "assistant";
  content?: ContentChunk[];
  id?: string;
  name?: string;
  arguments?: string;
  result?: any;
  tools?: any[];
  approval_request_id?: string;
}

export interface MessageItem extends Item {
  type: "message";
  role: "user" | "assistant";
  content: ContentChunk[];
}

export interface ToolCallItem extends Item {
  type: "tool_call";
  id: string;
  name: string;
  arguments: string;
  parsedArguments?: any;
  result?: any;
  output?: string;
  code?: string;
  files?: any[];
  tool_type?: string;
  status?: "completed" | "pending" | "error";
}

export interface McpApprovalRequestItem extends Item {
  type: "mcp_approval_request";
  id: string;
  tools: any[];
  server_label?: string;
  name?: string;
}

export interface McpListToolsItem extends Item {
  type: "mcp_list_tools";
  tools: any[];
  server_label?: string;
}

// Process messages function placeholder
export async function processMessages(): Promise<void> {
  // This would contain the logic to process chat messages
  // For now, just a placeholder that can be implemented later
  console.log("Processing messages...");
}