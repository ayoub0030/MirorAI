"use client";

import { useState } from "react";
import Link from "next/link";
import { HealthStatus } from "./ready-to-use-examples/health-status";
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";

export function Navbar() {
  const [healthData, setHealthData] = useState<any>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const handleHealthDataChange = (data: any, error: string | null) => {
    setHealthData(data);
    setHealthError(error);
  };

  // Helper function to determine status display for the navbar
  const getStatusDisplay = () => {
    if (healthError) {
      return {
        icon: <XCircle className="h-4 w-4" />,
        text: "Error",
        bgColor: "bg-red-900/40",
        textColor: "text-red-400"
      };
    }
    
    if (!healthData) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: "Checking",
        bgColor: "bg-zinc-800",
        textColor: "text-zinc-400"
      };
    }
    
    const status = healthData.status?.toLowerCase();
    
    if (["healthy", "ok", "up", "running"].includes(status)) {
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        text: "Healthy",
        bgColor: "bg-green-900/40",
        textColor: "text-green-400"
      };
    } else if (["warning", "degraded"].includes(status)) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        text: "Warning",
        bgColor: "bg-yellow-900/40",
        textColor: "text-yellow-400"
      };
    } else {
      return {
        icon: <XCircle className="h-4 w-4" />,
        text: "Error",
        bgColor: "bg-red-900/40",
        textColor: "text-red-400"
      };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link 
            href="/" 
            className="flex items-center gap-1 font-semibold text-white"
          >
            <span>Pomodoro 🍎</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <Link 
            href="/about" 
            className="text-sm font-medium text-zinc-300 hover:text-white"
          >
            About us
          </Link>
          
          {/* Compact health status display for navbar */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${statusDisplay.bgColor}`}>
            <span className={statusDisplay.textColor}>{statusDisplay.icon}</span>
            <span className={`text-xs font-medium ${statusDisplay.textColor}`}>{statusDisplay.text}</span>
          </div>

          {/* Hidden component to handle the health status fetching */}
          <div className="hidden">
            <HealthStatus 
              onDataChange={handleHealthDataChange}
              endpoint="http://localhost:3030/health"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
