import React from "react";

interface TeamBadgeProps {
  team: {
    name?: string;
    shortName?: string;
    logo?: string | null;
    color?: string;
  };
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

export function TeamBadge({ team, size = "md", showName = false }: TeamBadgeProps) {
  const sizes = { 
    sm: "w-8 h-8", 
    md: "w-12 h-12", 
    lg: "w-20 h-20" 
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizes[size]} rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm`}>
        {team?.logo ? (
          <img src={team.logo} alt={team.shortName || team.name} className="w-full h-full object-contain p-1" />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center text-white font-black"
            style={{ backgroundColor: team?.color || "#cbd5e1", fontSize: size === 'lg' ? '24px' : '10px' }}
          >
            {team?.shortName?.slice(0, 3) || team?.name?.slice(0, 3) || "?"}
          </div>
        )}
      </div>
      {showName && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[80px] text-center">{team?.shortName || team?.name}</span>}
    </div>
  );
}
