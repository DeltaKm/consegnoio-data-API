import CreateList from "@/components/create-list";
import FetchComuni from "@/components/fetch-comuni";
import RouteToID from "@/components/route-to-id";



export default function Home() {
  return (
    <div className="max-w-7x1 flex flex-col gap-10 mx-auto p-10">
      <div className="flex justify-between items-center">
        <FetchComuni />       
      </div>    
    </div>
  );
}
