"use client";

import { Check, CheckCheck, Clock, AlertTriangle, RefreshCw } from "lucide-react";

interface MessageStatusIconProps {
  status: number;
}

export function MessageStatusIcon({ status }: MessageStatusIconProps) {
  const iconProps = { className: "w-4 h-4 ml-1" };

  switch (status) {
    case 1: // new
      return <Clock {...iconProps} className={`${iconProps.className} text-muted-foreground`} />;
    case 2: // sent
      return <Check {...iconProps} className={`${iconProps.className} text-muted-foreground`} />;
    case 3: // delivered
      return <CheckCheck {...iconProps} className={`${iconProps.className} text-muted-foreground`} />;
    case 4: // opened
      return <CheckCheck {...iconProps} className={`${iconProps.className} text-blue-500`} />;
    case 5: // redirected
      return <RefreshCw {...iconProps} className={`${iconProps.className} text-muted-foreground`} />;
    case 6: // rejected
      return <AlertTriangle {...iconProps} className={`${iconProps.className} text-destructive`} />;
    default:
      return null;
  }
}
