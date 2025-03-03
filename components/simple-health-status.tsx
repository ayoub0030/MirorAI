"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, XCircle, Loader2, RefreshCw } from "lucide-react";

interface SimpleHealthStatusProps {
  status: "healthy" | "warning" | "error" | null;
  isLoading: boolean;
}

export function SimpleHealthStatus({ status, isLoading }: SimpleHealthStatusProps) {
  // Define styles based on status
  let icon;
  let text;
  let bgColor;
  let textColor;

  if (isLoading) {
    icon = <Loader2 className="h-4 w-4 animate-spin" />;
    text = "Checking";
    bgColor = "bg-zinc-800";
    textColor = "text-zinc-400";
  } else if (status === "healthy") {
    icon = <CheckCircle className="h-4 w-4" />;
    text = "Healthy";
    bgColor = "bg-green-900/40";
    textColor = "text-green-400";
  } else if (status === "warning") {
    icon = <AlertTriangle className="h-4 w-4" />;
    text = "Warning";
    bgColor = "bg-yellow-900/40";
    textColor = "text-yellow-400";
  } else if (status === "error") {
    icon = <XCircle className="h-4 w-4" />;
    text = "Error";
    bgColor = "bg-red-900/40";
    textColor = "text-red-400";
  } else {
    icon = <AlertTriangle className="h-4 w-4" />;
    text = "Unknown";
    bgColor = "bg-zinc-800";
    textColor = "text-zinc-400";
  }

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${bgColor}`}>
      <span className={textColor}>{icon}</span>
      <span className={`text-xs font-medium ${textColor}`}>{text}</span>
    </div>
  );
}

export function SimpleHealthStatusContainer() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:3030/health");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch health data: ${response.status}`);
      }
      
      const data = await response.json();
      setHealth(data);
    } catch (err) {
      let errorMessage = "Connection refused. The health endpoint is unreachable.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  // Helper function to determine status
  const getStatus = () => {
    if (loading) {
      return { status: null, isLoading: true };
    }
    
    if (error) {
      return { status: "error" as const, isLoading: false };
    }
    
    if (!health) {
      return { status: null, isLoading: false };
    }
    
    // Get the status from the health data
    const status = health.status?.toLowerCase();
    
    // Match the same cases as the original component
    if (["healthy", "ok", "up", "running"].includes(status)) {
      return { status: "healthy" as const, isLoading: false };
    } else if (["warning", "degraded"].includes(status)) {
      return { status: "warning" as const, isLoading: false };
    } else if (["error", "down", "critical"].includes(status)) {
      return { status: "error" as const, isLoading: false };
    } else {
      return { status: null, isLoading: false };
    }
  };

  const statusData = getStatus();

  return (
    <div className="w-full max-w-4xl">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-200">System Status</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchHealth} 
            disabled={loading}
            className="flex items-center gap-1 text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        <SimpleHealthStatus status={statusData.status} isLoading={statusData.isLoading} />
      </div>
    </div>
  );
}
