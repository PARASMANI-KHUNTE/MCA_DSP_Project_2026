const TECHNOLOGIES = [
  { name: "Python", category: "Core Pipeline" },
  { name: "FastAPI", category: "Backend API" },
  { name: "React 19", category: "Interactive UI" },
  { name: "Vite", category: "Build Tool" },
  { name: "Tailwind CSS", category: "Styling System" },
  { name: "Pandas & NumPy", category: "Data Harmonization" },
  { name: "Scikit-Learn", category: "K-Means Clustering" },
  { name: "SVG Map", category: "Spatial Display" },
  { name: "Pytest", category: "Automated Checks" }
];

export default function TechStack() {
  return (
    <div className="border-b border-[#E5E5E5] py-4 sm:py-5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-[#999999]">
          Technology Stack
        </span>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {TECHNOLOGIES.map(tech => (
            <span
              key={tech.name}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] px-2.5 py-1 text-xs font-medium text-[#222222] transition-colors hover:border-[#D4D4D4] hover:bg-white"
            >
              <span className="h-1 w-1 rounded-full bg-[#B51F3B]" />
              <span>{tech.name}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
