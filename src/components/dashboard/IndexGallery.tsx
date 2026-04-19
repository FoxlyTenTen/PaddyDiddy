import { indices } from "@/data/mockData";
import { IndexCard } from "./IndexCard";

export function IndexGallery() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {indices.map((info) => (
        <IndexCard key={info.key} info={info} />
      ))}
    </div>
  );
}
