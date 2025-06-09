"use client";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { McpApprovalRequestItem } from "@/lib/assistant";

interface Props {
  item: McpApprovalRequestItem;
  onRespond: (approve: boolean, id: string) => void;
}

export default function McpApproval({ item, onRespond }: Props) {
  const [disabled, setDisabled] = useState(false);

  const handle = (approve: boolean) => {
    setDisabled(true);
    onRespond(approve, item.id);
  };

  return (
    <div className="flex flex-col">
      <div className="flex">
        <div className="mr-4 rounded-[16px] px-4 py-2 md:mr-24 text-black bg-white font-light">
          <div className="mb-2 text-sm">
            {item.server_label}: Execute tool {item.name}
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={disabled} onClick={() => handle(true)}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={disabled}
              onClick={() => handle(false)}
            >
              Decline
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
