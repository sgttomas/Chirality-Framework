"use client";
import React from "react";
import { McpListToolsItem } from "@/lib/assistant";

interface Props {
  item: McpListToolsItem;
}

export default function McpToolsList({ item }: Props) {
  return (
    <div className="flex flex-col">
      <div className="flex">
        <div className="mr-4 rounded-[16px] px-4 py-2 md:mr-24 text-black bg-white font-light">
          <div className="font-semibold mb-2">
            {item.server_label} tools list
          </div>
          <div className="space-y-2 text-sm">
            {item.tools.map((tool) => (
              <div key={tool.name}>
                <div className="font-medium">{tool.name}</div>
                {tool.description && (
                  <div className="text-zinc-500 text-xs whitespace-pre-wrap">
                    {tool.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
